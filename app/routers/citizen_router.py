from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Penalty, WasteCollection, Reward, RewardRedemption
from app.schemas import (
    PenaltyOut, PenaltyPayRequest, PenaltyDisputeRequest,
    RewardOut, RewardRedeemRequest, RewardRedemptionOut, WasteCollectionOut
)
from app.services.penalty_service import calculate_penalty_totals, pay_penalty, dispute_penalty
from app.services.reward_service import redeem_reward
from app.services.qr_service import generate_qr_base64

router = APIRouter(prefix="/api/citizen", tags=["Citizen Portal"])

def format_penalty_out(penalty: Penalty) -> dict:
    """Format penalty model into PenaltyOut dictionary with dynamic overdue stats."""
    totals = calculate_penalty_totals(penalty)
    return {
        "id": penalty.id,
        "violation_code": penalty.violation_code,
        "user_id": penalty.user_id,
        "camera_id": penalty.camera_id,
        "violation_type": penalty.violation_type,
        "location": penalty.location,
        "fine_amount": penalty.fine_amount,
        "late_fee": totals["late_fee"],
        "total_payable": totals["total_payable"],
        "status": totals["status"],
        "created_at": penalty.created_at,
        "due_date": penalty.due_date,
        "paid_at": penalty.paid_at,
        "payment_method": penalty.payment_method,
        "payment_ref": penalty.payment_ref,
        "evidence_image_url": penalty.evidence_image_url,
        "evidence_caption": penalty.evidence_caption,
        "dispute_reason": penalty.dispute_reason,
        "user_name": penalty.user.full_name if penalty.user else "",
        "user_email": penalty.user.email if penalty.user else "",
        "camera_name": penalty.camera.name if penalty.camera else "",
        "ward": penalty.location,
        "days_overdue": totals["days_overdue"]
    }

@router.get("/{user_id}/dashboard")
def get_citizen_dashboard(user_id: int, db: Session = Depends(get_db)):
    """Fetch complete citizen overview: profile, QR, credits, penalties, and stats."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Citizen not found")

    # Penalties
    penalties = db.query(Penalty).filter(Penalty.user_id == user_id).order_by(Penalty.created_at.desc()).all()
    formatted_penalties = [format_penalty_out(p) for p in penalties]

    unpaid_count = sum(1 for p in formatted_penalties if p["status"] in ["UNPAID", "DELAYED"])
    total_due = sum(p["total_payable"] for p in formatted_penalties if p["status"] in ["UNPAID", "DELAYED"])

    # Collections
    collections = db.query(WasteCollection).filter(WasteCollection.user_id == user_id).order_by(WasteCollection.collected_at.desc()).all()
    total_waste_kg = sum(c.weight_kg for c in collections)
    total_credits_earned = sum(c.credits_awarded for c in collections)

    # Redemptions
    redemptions = db.query(RewardRedemption).filter(RewardRedemption.user_id == user_id).order_by(RewardRedemption.redeemed_at.desc()).all()
    formatted_redemptions = []
    for r in redemptions:
        formatted_redemptions.append({
            "id": r.id,
            "redemption_code": r.redemption_code,
            "voucher_code": r.voucher_code,
            "credits_spent": r.credits_spent,
            "redeemed_at": r.redeemed_at,
            "status": r.status,
            "reward_title": r.reward.title if r.reward else "EcoReward",
            "value_label": r.reward.value_label if r.reward else "",
            "icon": r.reward.icon if r.reward else "gift"
        })

    qr_image = generate_qr_base64(user)

    return {
        "user": {
            "id": user.id,
            "citizen_id": user.citizen_id,
            "full_name": user.full_name,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "phone": user.phone,
            "address": user.address,
            "ward": user.ward,
            "role": user.role,
            "qr_token": user.qr_token,
            "eco_credits": user.eco_credits
        },
        "qr_image": qr_image,
        "metrics": {
            "unpaid_penalties_count": unpaid_count,
            "total_fines_due": round(total_due, 2),
            "total_waste_recycled_kg": round(total_waste_kg, 2),
            "total_credits_earned": round(total_credits_earned, 2),
            "co2_offset_kg": round(total_waste_kg * 1.85, 2)  # 1.85kg CO2 saved per kg waste diverted
        },
        "penalties": formatted_penalties,
        "recent_collections": [
            {
                "id": c.id,
                "collection_code": c.collection_code,
                "waste_type": c.waste_type,
                "weight_kg": c.weight_kg,
                "rate_per_kg": c.rate_per_kg,
                "credits_awarded": c.credits_awarded,
                "collected_at": c.collected_at,
                "collector_name": c.collector.full_name if c.collector else "Municipal Collector",
                "notes": c.notes
            } for c in collections[:10]
        ],
        "redemptions": formatted_redemptions
    }

@router.get("/{user_id}/penalties")
def get_user_penalties(user_id: int, db: Session = Depends(get_db)):
    """Fetch user's penalties with overdue and late fee updates."""
    penalties = db.query(Penalty).filter(Penalty.user_id == user_id).order_by(Penalty.created_at.desc()).all()
    return [format_penalty_out(p) for p in penalties]

@router.post("/penalties/{penalty_id}/pay")
def process_penalty_payment(penalty_id: int, payload: PenaltyPayRequest, db: Session = Depends(get_db)):
    """Pay an outstanding or overdue penalty."""
    try:
        penalty = pay_penalty(
            db=db,
            penalty_id=penalty_id,
            payment_method=payload.payment_method
        )
        return {
            "success": True,
            "message": "Penalty payment processed successfully. Violation status updated to PAID.",
            "penalty": format_penalty_out(penalty)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/penalties/{penalty_id}/dispute")
def dispute_citizen_penalty(penalty_id: int, payload: PenaltyDisputeRequest, db: Session = Depends(get_db)):
    """Submit an appeal/dispute against a CCTV penalty."""
    try:
        penalty = dispute_penalty(
            db=db,
            penalty_id=penalty_id,
            dispute_reason=payload.dispute_reason
        )
        return {
            "success": True,
            "message": "Dispute request submitted to the Municipal Review Board.",
            "penalty": format_penalty_out(penalty)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/rewards", response_model=List[RewardOut])
def list_available_rewards(db: Session = Depends(get_db)):
    """Get active items in the Reward Marketplace."""
    return db.query(Reward).filter(Reward.is_active == True).all()

@router.post("/rewards/redeem", response_model=RewardRedemptionOut)
def redeem_citizen_reward(user_id: int, payload: RewardRedeemRequest, db: Session = Depends(get_db)):
    """Redeem reward credits for vouchers / utility discounts."""
    try:
        redemption = redeem_reward(
            db=db,
            user_id=user_id,
            reward_id=payload.reward_id
        )
        return {
            "id": redemption.id,
            "redemption_code": redemption.redemption_code,
            "user_id": redemption.user_id,
            "reward_id": redemption.reward_id,
            "credits_spent": redemption.credits_spent,
            "redeemed_at": redemption.redeemed_at,
            "voucher_code": redemption.voucher_code,
            "status": redemption.status,
            "reward_title": redemption.reward.title,
            "reward_category": redemption.reward.category,
            "value_label": redemption.reward.value_label
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/pickup-request")
def create_waste_pickup_request(payload: dict, db: Session = Depends(get_db)):
    """Citizen creates an on-demand waste collection call for field collectors."""
    import uuid
    import datetime
    from app.models import WastePickupRequest

    user_id = payload.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Citizen not found")

    now = datetime.datetime.utcnow()
    request_code = f"REQ-{now.year}-{uuid.uuid4().hex[:6].upper()}"

    pickup = WastePickupRequest(
        request_code=request_code,
        user_id=user.id,
        ward=user.ward,
        address=payload.get("address") or user.address,
        phone=payload.get("phone") or user.phone,
        waste_category=payload.get("waste_category", "Recyclable Plastic"),
        estimated_weight_kg=float(payload.get("estimated_weight_kg", 5.0)),
        urgency=payload.get("urgency", "Immediate (Within 30 mins)"),
        notes=payload.get("notes", ""),
        status="DISPATCHED",
        created_at=now
    )

    db.add(pickup)

    # Try to assign an available collector in the same ward (best-effort)
    from app.models import User as UserModel
    assigned_collector = db.query(UserModel).filter(
        UserModel.role == 'collector',
        UserModel.ward == user.ward,
        UserModel.is_active == True
    ).first()

    if assigned_collector:
        pickup.collector_id = assigned_collector.id

    db.commit()
    db.refresh(pickup)

    pickup_info = {
        "id": pickup.id,
        "request_code": pickup.request_code,
        "citizen_name": user.full_name,
        "ward": pickup.ward,
        "address": pickup.address,
        "phone": pickup.phone,
        "waste_category": pickup.waste_category,
        "estimated_weight_kg": pickup.estimated_weight_kg,
        "urgency": pickup.urgency,
        "status": pickup.status,
        "created_at": pickup.created_at
    }

    # If we assigned a collector, include a little summary so the citizen can see who's coming
    if assigned_collector:
        pickup_info["collector"] = {
            "id": assigned_collector.id,
            "full_name": assigned_collector.full_name,
            "phone": assigned_collector.phone,
            "is_active": assigned_collector.is_active
        }

    return {
        "success": True,
        "message": f"Waste Collector call dispatched! Collector for {user.ward} has been alerted.",
        "pickup_request": pickup_info
    }

@router.get("/{user_id}/pickup-requests")
def list_citizen_pickup_requests(user_id: int, db: Session = Depends(get_db)):
    """List citizen's active and previous waste pickup calls."""
    from app.models import WastePickupRequest
    pickups = db.query(WastePickupRequest).filter(
        WastePickupRequest.user_id == user_id
    ).order_by(WastePickupRequest.created_at.desc()).all()

    return [
        {
            "id": p.id,
            "request_code": p.request_code,
            "ward": p.ward,
            "address": p.address,
            "phone": p.phone,
            "waste_category": p.waste_category,
            "estimated_weight_kg": p.estimated_weight_kg,
            "urgency": p.urgency,
            "notes": p.notes,
            "status": p.status,
            "created_at": p.created_at,
            "collector_name": p.collector.full_name if p.collector else "Assigned Field Collector"
        } for p in pickups
    ]

@router.post("/pickup-request/{request_id}/cancel")
def cancel_pickup_request(request_id: int, db: Session = Depends(get_db)):
    """Cancel a pending waste collection request."""
    from app.models import WastePickupRequest
    pickup = db.query(WastePickupRequest).filter(WastePickupRequest.id == request_id).first()
    if not pickup:
        raise HTTPException(status_code=404, detail="Pickup request not found")

    if pickup.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="Cannot cancel an already completed collection")

    pickup.status = "CANCELLED"
    db.commit()
    return {"success": True, "message": "Pickup request cancelled."}

