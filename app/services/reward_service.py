import uuid
import datetime
from sqlalchemy.orm import Session
from app.models import User, WasteCollection, Reward, RewardRedemption, WasteRateConfig, Penalty, MonthlyFinePool, CreditLedger

DEFAULT_WASTE_RATES = {
    "mixed_unsegregated": 0.2,
    "wet_organic_segregated": 1.0,
    "dry_non_recyclable_segregated": 0.6,
    "dry_recyclable_segregated": 2.0,
    "metal_ewaste": 0.0
}

REWARD_POOL_PCT = 0.65
ENFORCEMENT_PCT = 0.25
RESERVE_PCT = 0.10
CREDIT_VALUE_FLOOR_INR = 0.15
CREDIT_VALUE_CEILING_INR = 0.40
BLENDED_CREDITS_PER_KG = 1.0
MONTHLY_KG_CAP = 50.0
TIER_1_KG_LIMIT = 20.0
TIER_2_KG_LIMIT = 30.0

def get_waste_rate(db: Session, waste_type: str) -> float:
    """Get current credit rate per kg for a given waste type."""
    config = db.query(WasteRateConfig).filter(WasteRateConfig.waste_type == waste_type).first()
    if config and config.waste_type in DEFAULT_WASTE_RATES:
        return config.credits_per_kg
    return DEFAULT_WASTE_RATES.get(waste_type, 0.0)


def get_current_credit_value(db: Session, now=None) -> float:
    now = now or datetime.datetime.utcnow()
    month_year = now.strftime("%Y-%m")
    pool = db.query(MonthlyFinePool).filter(MonthlyFinePool.month_year == month_year).first()
    if pool:
        return pool.final_credit_value_inr

    fines_collected = db.query(Penalty).filter(
        Penalty.status == "PAID",
        Penalty.paid_at >= now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    ).with_entities(Penalty.fine_amount).all()
    fines_total = sum(row[0] or 0.0 for row in fines_collected)
    households = db.query(WasteCollection.user_id).filter(
        WasteCollection.collected_at >= now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    ).distinct().count()
    waste_kg = db.query(WasteCollection.weight_kg).filter(
        WasteCollection.collected_at >= now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    ).all()
    average_kg = (sum(row[0] or 0.0 for row in waste_kg) / households) if households else 0.0
    total_credits = households * average_kg * BLENDED_CREDITS_PER_KG
    reward_pool = fines_total * REWARD_POOL_PCT
    raw_value = reward_pool / total_credits if total_credits else 0.0
    final_value = max(CREDIT_VALUE_FLOOR_INR, min(CREDIT_VALUE_CEILING_INR, raw_value))
    pool = MonthlyFinePool(
        month_year=month_year,
        fines_collected_inr=fines_total,
        reward_pool_inr=reward_pool,
        total_credits_issued=total_credits,
        raw_credit_value_inr=raw_value,
        final_credit_value_inr=final_value
    )
    db.add(pool)
    db.commit()
    return final_value

def record_waste_collection(
    db: Session,
    citizen_qr_or_id: str,
    collector_id: int,
    waste_type: str,
    weight_kg: float,
    notes: str = ""
) -> WasteCollection:
    """Log waste collected by a field collector and instantly credit the citizen."""
    if weight_kg <= 0:
        raise ValueError("Waste weight must be greater than 0 kg")

    # Resolve citizen by QR token, citizen_id, or email
    clean_id = citizen_qr_or_id.strip()
    citizen = db.query(User).filter(
        (User.citizen_id == clean_id) |
        (User.qr_token == clean_id) |
        (User.email == clean_id)
    ).first()

    if not citizen:
        raise ValueError(f"Citizen not found for identifier: '{clean_id}'")

    collector = db.query(User).filter(User.id == collector_id).first()
    if not collector:
        raise ValueError("Collector profile not found")

    rate_per_kg = get_waste_rate(db, waste_type)
    month_start = datetime.datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_kg = db.query(WasteCollection.weight_kg).filter(
        WasteCollection.user_id == citizen.id,
        WasteCollection.collected_at >= month_start
    ).all()
    cumulative_kg = sum(row[0] or 0.0 for row in month_kg)
    eligible_kg = max(0.0, min(weight_kg, MONTHLY_KG_CAP - cumulative_kg))
    full_rate_kg = max(0.0, min(eligible_kg, TIER_1_KG_LIMIT - cumulative_kg))
    reduced_rate_kg = max(0.0, eligible_kg - full_rate_kg)
    credits_awarded = round((full_rate_kg * rate_per_kg) + (reduced_rate_kg * rate_per_kg * 0.5), 2)

    now = datetime.datetime.utcnow()
    collection_code = f"COL-{now.year}-{uuid.uuid4().hex[:6].upper()}"

    collection = WasteCollection(
        collection_code=collection_code,
        user_id=citizen.id,
        collector_id=collector.id,
        waste_type=waste_type,
        weight_kg=round(weight_kg, 2),
        rate_per_kg=rate_per_kg,
        credits_awarded=credits_awarded,
        collected_at=now,
        notes=notes
    )

    # Award credits to citizen balance
    citizen.eco_credits = round(citizen.eco_credits + credits_awarded, 2)

    # Auto-complete any active doorstep pickup requests for this citizen
    from app.models import WastePickupRequest
    active_pickups = db.query(WastePickupRequest).filter(
        WastePickupRequest.user_id == citizen.id,
        WastePickupRequest.status.in_(["DISPATCHED", "ACCEPTED", "ARRIVED"])
    ).all()
    for req in active_pickups:
        req.status = "COMPLETED"
        req.completed_at = now
        req.actual_weight_kg = round(weight_kg, 2)
        req.credits_awarded = credits_awarded
        if not req.collector_id:
            req.collector_id = collector.id

    db.add(collection)
    db.add(CreditLedger(
        user_id=citizen.id,
        transaction_type="earn",
        credits=credits_awarded,
        inr_value_at_transaction=round(credits_awarded * get_current_credit_value(db, now), 2)
    ))
    db.commit()
    db.refresh(collection)
    db.refresh(citizen)
    return collection

def redeem_reward(
    db: Session,
    user_id: int,
    reward_id: int
) -> RewardRedemption:
    """Redeem an EcoReward using accumulated credits."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("User not found")

    reward = db.query(Reward).filter(Reward.id == reward_id, Reward.is_active == True).first()
    if not reward:
        raise ValueError("Reward not found or currently unavailable")

    if user.eco_credits < reward.credit_cost:
        raise ValueError(
            f"Insufficient EcoCredits. You have {user.eco_credits} credits, but {reward.credit_cost} are required."
        )

    now = datetime.datetime.utcnow()
    voucher_code = f"ECO-{reward.category[:3].upper()}-{uuid.uuid4().hex[:8].upper()}"
    redemption_code = f"RDM-{now.year}-{uuid.uuid4().hex[:6].upper()}"

    redemption = RewardRedemption(
        redemption_code=redemption_code,
        user_id=user.id,
        reward_id=reward.id,
        credits_spent=reward.credit_cost,
        redeemed_at=now,
        voucher_code=voucher_code,
        status="ACTIVE"
    )

    # Deduct credits using the current monthly exchange value.
    user.eco_credits = round(user.eco_credits - reward.credit_cost, 2)

    db.add(redemption)
    db.add(CreditLedger(
        user_id=user.id,
        transaction_type="redeem",
        credits=-reward.credit_cost,
        inr_value_at_transaction=round(reward.credit_cost * get_current_credit_value(db, now), 2)
    ))
    db.commit()
    db.refresh(redemption)
    db.refresh(user)
    return redemption
