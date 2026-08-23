import uuid
import datetime
from sqlalchemy.orm import Session
from app.models import User, WasteCollection, Reward, RewardRedemption, WasteRateConfig

DEFAULT_WASTE_RATES = {
    "Organic / Wet Waste": 5.0,
    "Recyclable Plastic": 15.0,
    "Paper & Cardboard": 8.0,
    "Metal & Aluminum": 25.0,
    "E-Waste": 50.0,
    "Glass & Bottles": 10.0,
    "Hazardous Waste": 20.0
}

def get_waste_rate(db: Session, waste_type: str) -> float:
    """Get current credit rate per kg for a given waste type."""
    config = db.query(WasteRateConfig).filter(WasteRateConfig.waste_type == waste_type).first()
    if config:
        return config.credits_per_kg
    return DEFAULT_WASTE_RATES.get(waste_type, 10.0)

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
    credits_awarded = round(weight_kg * rate_per_kg, 2)

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

    # Deduct credits
    user.eco_credits = round(user.eco_credits - reward.credit_cost, 2)

    db.add(redemption)
    db.commit()
    db.refresh(redemption)
    db.refresh(user)
    return redemption
