import uuid
import datetime
from sqlalchemy.orm import Session
from app.models import CCTVCamera, MaintenanceTicket, User, Penalty
from app.services.penalty_service import create_penalty

# Curated evidence image simulations for camera detection
VIOLATION_EVIDENCE_MAP = {
    "Road Dumping": {
        "image": "/static/images/evidence/road_dumping.jpg",
        "caption": "AI CCTV Frame #8491: Heavy domestic waste sack dumped on public road lane"
    },
    "Public Littering": {
        "image": "/static/images/evidence/public_littering.jpg",
        "caption": "AI CCTV Optical Track: Citizen discarded plastic beverage container on public pathway"
    },
    "Non-Segregated Dumping": {
        "image": "/static/images/evidence/mixed_waste.jpg",
        "caption": "AI Vision Classification: Mixed unsegregated hazardous waste discarded at bin perimeter"
    },
    "Plastic Burning": {
        "image": "/static/images/evidence/plastic_burning.jpg",
        "caption": "Thermal + Optical AI Alert: Unauthorized open flame and synthetic plastic incineration"
    },
    "Unauthorized Waste Discard": {
        "image": "/static/images/evidence/unauthorized_discard.jpg",
        "caption": "Motion AI Alert: Commercial packaging discarded in unauthorized residential sector"
    }
}

def report_camera_issue(
    db: Session,
    camera_id: int,
    reported_by_id: int,
    issue_category: str,
    description: str,
    priority: str = "HIGH"
) -> MaintenanceTicket:
    """Report a damaged or malfunctioning CCTV and create a maintenance ticket."""
    camera = db.query(CCTVCamera).filter(CCTVCamera.id == camera_id).first()
    if not camera:
        raise ValueError("CCTV Camera not found")

    # Update camera status based on issue
    if "Damage" in issue_category or "Broken" in issue_category:
        camera.status = "damaged"
    elif "Offline" in issue_category or "Connection" in issue_category:
        camera.status = "offline"
    elif "Obstructed" in issue_category:
        camera.status = "obstructed"
    else:
        camera.status = "damaged"

    camera.fault_description = description

    now = datetime.datetime.utcnow()
    ticket_code = f"TKT-CAM-{now.year}-{uuid.uuid4().hex[:5].upper()}"

    ticket = MaintenanceTicket(
        ticket_code=ticket_code,
        camera_id=camera.id,
        reported_by_id=reported_by_id,
        issue_category=issue_category,
        description=description,
        priority=priority,
        status="OPEN",
        created_at=now
    )

    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    db.refresh(camera)
    return ticket

def resolve_maintenance_ticket(
    db: Session,
    ticket_id: int,
    technician_notes: str
) -> MaintenanceTicket:
    """Resolve a maintenance ticket and mark camera as operational."""
    ticket = db.query(MaintenanceTicket).filter(MaintenanceTicket.id == ticket_id).first()
    if not ticket:
        raise ValueError("Maintenance ticket not found")

    now = datetime.datetime.utcnow()
    ticket.status = "RESOLVED"
    ticket.resolved_at = now
    ticket.technician_notes = technician_notes

    # Restore camera status
    if ticket.camera:
        ticket.camera.status = "operational"
        ticket.camera.fault_description = ""
        ticket.camera.last_ping = now

    db.commit()
    db.refresh(ticket)
    return ticket

def simulate_ai_detection(
    db: Session,
    camera_id: int,
    user_id: int,
    violation_type: str = "Road Dumping",
    custom_notes: str = "",
    fine_amount: float = None
) -> Penalty:
    """Simulate a real-time CCTV optical detection event assigning a penalty to a citizen."""
    camera = db.query(CCTVCamera).filter(CCTVCamera.id == camera_id).first()
    if not camera:
        raise ValueError("CCTV Camera not found")

    if camera.status in ["damaged", "offline"]:
        raise ValueError(f"Cannot capture AI detection: Camera {camera.camera_code} is currently '{camera.status}' and requires maintenance!")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("Citizen record not found")

    evidence_info = VIOLATION_EVIDENCE_MAP.get(violation_type, {
        "image": "/static/images/evidence/road_dumping.jpg",
        "caption": f"AI CCTV Flagged: {violation_type} at {camera.location_name}"
    })

    penalty = create_penalty(
        db=db,
        user_id=user.id,
        camera_id=camera.id,
        violation_type=violation_type,
        location=f"{camera.ward} - {camera.location_name}",
        fine_amount=fine_amount,
        evidence_image_url=evidence_info["image"],
        evidence_caption=f"{evidence_info['caption']} | Cam: {camera.camera_code}",
        notes=custom_notes or f"Simulated detection processed on {camera.name}"
    )

    # Update camera last_ping
    camera.last_ping = datetime.datetime.utcnow()
    db.commit()

    return penalty
