import uuid
import datetime
from sqlalchemy.orm import Session
from app.models import Penalty, User, CCTVCamera

DEFAULT_FINE_RATES = {
    "Road Dumping": 750.0,
    "Public Littering": 500.0,
    "Non-Segregated Dumping": 400.0,
    "Plastic Burning": 1500.0,
    "Unauthorized Waste Discard": 600.0
}

def calculate_penalty_totals(penalty: Penalty) -> dict:
    """Calculate late fees and days overdue."""
    now = datetime.datetime.utcnow()
    days_overdue = 0
    late_fee = 0.0

    if penalty.status in ["UNPAID", "DELAYED"]:
        if now > penalty.due_date:
            delta = now - penalty.due_date
            days_overdue = delta.days + 1
            # Late fee: 5% of base fine for each 5 days overdue
            late_periods = max(1, days_overdue // 5)
            late_fee = round(penalty.fine_amount * 0.05 * late_periods, 2)
            penalty.status = "DELAYED"
            penalty.late_fee = late_fee
    
    total_payable = round(penalty.fine_amount + penalty.late_fee, 2)
    return {
        "days_overdue": days_overdue,
        "late_fee": late_fee,
        "total_payable": total_payable,
        "status": penalty.status
    }

def create_penalty(
    db: Session,
    user_id: int,
    camera_id: int,
    violation_type: str,
    location: str,
    fine_amount: float = None,
    evidence_image_url: str = None,
    evidence_caption: str = None,
    notes: str = None
) -> Penalty:
    """Create a new CCTV-detected littering violation."""
    if not fine_amount:
        fine_amount = DEFAULT_FINE_RATES.get(violation_type, 500.0)

    now = datetime.datetime.utcnow()
    due_date = now + datetime.timedelta(days=7)
    violation_code = f"VIO-{now.year}-{uuid.uuid4().hex[:6].upper()}"

    if not evidence_image_url:
        evidence_image_url = "/static/images/evidence/road_dumping_sample.jpg"

    if not evidence_caption:
        evidence_caption = f"AI Vision Flagged: {violation_type} at {location}"

    penalty = Penalty(
        violation_code=violation_code,
        user_id=user_id,
        camera_id=camera_id,
        violation_type=violation_type,
        location=location,
        fine_amount=fine_amount,
        late_fee=0.0,
        status="UNPAID",
        created_at=now,
        due_date=due_date,
        evidence_image_url=evidence_image_url,
        evidence_caption=evidence_caption,
        notes=notes
    )

    db.add(penalty)
    db.commit()
    db.refresh(penalty)
    return penalty

def pay_penalty(
    db: Session,
    penalty_id: int,
    payment_method: str = "CARD",
    payment_ref: str = None
) -> Penalty:
    """Process payment for an outstanding penalty."""
    penalty = db.query(Penalty).filter(Penalty.id == penalty_id).first()
    if not penalty:
        raise ValueError("Penalty record not found")
    
    if penalty.status == "PAID":
        raise ValueError("Penalty has already been paid")

    now = datetime.datetime.utcnow()
    penalty.status = "PAID"
    penalty.paid_at = now
    penalty.payment_method = payment_method
    penalty.payment_ref = payment_ref or f"TXN-{uuid.uuid4().hex[:8].upper()}"

    db.commit()
    db.refresh(penalty)
    return penalty

def dispute_penalty(
    db: Session,
    penalty_id: int,
    dispute_reason: str
) -> Penalty:
    """Submit a citizen dispute against a penalty."""
    penalty = db.query(Penalty).filter(Penalty.id == penalty_id).first()
    if not penalty:
        raise ValueError("Penalty record not found")
    
    penalty.status = "DISPUTED"
    penalty.dispute_reason = dispute_reason
    db.commit()
    db.refresh(penalty)
    return penalty

def generate_defaulter_notice(penalty: Penalty) -> dict:
    """Generate a formal municipal warning notice text for delayed payments."""
    totals = calculate_penalty_totals(penalty)
    user = penalty.user
    camera = penalty.camera
    
    return {
        "notice_number": f"WARN-{penalty.violation_code}",
        "date_issued": datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        "citizen_name": user.full_name if user else "Citizen",
        "citizen_id": user.citizen_id if user else "N/A",
        "email": user.email if user else "N/A",
        "ward": penalty.location,
        "violation_type": penalty.violation_type,
        "camera_code": camera.camera_code if camera else "CAM-N/A",
        "days_overdue": totals["days_overdue"],
        "base_fine": penalty.fine_amount,
        "late_penalty": totals["late_fee"],
        "total_amount_due": totals["total_payable"],
        "warning_text": (
            f"URGENT NOTICE: Your penalty ({penalty.violation_code}) for '{penalty.violation_type}' "
            f"recorded by surveillance camera {camera.camera_code if camera else ''} is currently "
            f"{totals['days_overdue']} days OVERDUE. Failure to settle the outstanding dues of "
            f"₹{totals['total_payable']} within 48 hours will lead to escalation to Municipal Legal Ward."
        )
    }
