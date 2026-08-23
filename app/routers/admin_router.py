from typing import List, Optional
import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import (
    CCTVCamera, MaintenanceTicket, Penalty, WasteCollection,
    User, WasteRateConfig, Reward
)
from app.schemas import (
    CCTVCameraOut, MaintenanceTicketOut, MaintenanceTicketCreate,
    TicketResolveRequest, CameraStatusUpdate, RateConfigUpdate
)
from app.services.penalty_service import calculate_penalty_totals, generate_defaulter_notice
from app.services.cctv_service import report_camera_issue, resolve_maintenance_ticket
from app.routers.citizen_router import format_penalty_out

router = APIRouter(prefix="/api/admin", tags=["Administrator Command Center"])

@router.get("/overview")
def get_admin_overview(ward: Optional[str] = None, db: Session = Depends(get_db)):
    """Fetch citywide or ward-specific waste, CCTV, and penalty metrics."""
    # CCTV stats
    cam_query = db.query(CCTVCamera)
    if ward and ward != "All":
        cam_query = cam_query.filter(CCTVCamera.ward == ward)
    
    all_cams = cam_query.all()
    total_cams = len(all_cams)
    damaged_cams = sum(1 for c in all_cams if c.status == "damaged")
    offline_cams = sum(1 for c in all_cams if c.status == "offline")
    operational_cams = sum(1 for c in all_cams if c.status == "operational")

    # Penalties stats
    pen_query = db.query(Penalty)
    if ward and ward != "All":
        pen_query = pen_query.filter(Penalty.location.contains(ward))
    
    all_pens = pen_query.all()
    formatted_pens = [format_penalty_out(p) for p in all_pens]

    unpaid_count = sum(1 for p in formatted_pens if p["status"] == "UNPAID")
    delayed_count = sum(1 for p in formatted_pens if p["status"] == "DELAYED")
    paid_count = sum(1 for p in formatted_pens if p["status"] == "PAID")
    
    total_fines_levied = sum(p["fine_amount"] for p in formatted_pens)
    total_fines_collected = sum(p["fine_amount"] for p in formatted_pens if p["status"] == "PAID")
    total_default_amount = sum(p["total_payable"] for p in formatted_pens if p["status"] == "DELAYED")

    recovery_rate = round((total_fines_collected / total_fines_levied * 100) if total_fines_levied > 0 else 100.0, 1)

    # Waste Collections stats
    collections = db.query(WasteCollection).all()
    total_waste_kg = sum(c.weight_kg for c in collections)
    total_credits_given = sum(c.credits_awarded for c in collections)

    # Open Tickets
    open_tickets = db.query(MaintenanceTicket).filter(MaintenanceTicket.status.in_(["OPEN", "IN_PROGRESS"])).count()

    return {
        "cctv_metrics": {
            "total_cameras": total_cams,
            "operational": operational_cams,
            "damaged": damaged_cams,
            "offline": offline_cams,
            "health_percentage": round((operational_cams / total_cams * 100) if total_cams > 0 else 100, 1),
            "open_tickets": open_tickets
        },
        "penalty_metrics": {
            "total_violations": len(formatted_pens),
            "unpaid_count": unpaid_count,
            "delayed_count": delayed_count,
            "paid_count": paid_count,
            "total_fines_levied": round(total_fines_levied, 2),
            "total_fines_collected": round(total_fines_collected, 2),
            "total_default_amount": round(total_default_amount, 2),
            "recovery_rate_pct": recovery_rate
        },
        "waste_metrics": {
            "total_recycled_kg": round(total_waste_kg, 2),
            "total_recycled_tons": round(total_waste_kg / 1000, 3),
            "total_credits_distributed": round(total_credits_given, 2),
            "co2_reduction_kg": round(total_waste_kg * 1.85, 2)
        }
    }

@router.get("/cameras", response_model=List[CCTVCameraOut])
def list_cctv_cameras(
    status: Optional[str] = None,
    ward: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List surveillance cameras with optional status or ward filters."""
    query = db.query(CCTVCamera)
    if status and status != "all":
        query = query.filter(CCTVCamera.status == status)
    if ward and ward != "All":
        query = query.filter(CCTVCamera.ward == ward)
    return query.order_by(CCTVCamera.camera_code.asc()).all()

@router.put("/cameras/{camera_id}/status")
def update_camera_status(
    camera_id: int,
    payload: CameraStatusUpdate,
    db: Session = Depends(get_db)
):
    """Directly update camera status (operational, damaged, offline, obstructed)."""
    camera = db.query(CCTVCamera).filter(CCTVCamera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    camera.status = payload.status
    if payload.fault_description:
        camera.fault_description = payload.fault_description
    if payload.status == "operational":
        camera.fault_description = ""
        camera.last_ping = datetime.datetime.utcnow()

    db.commit()
    db.refresh(camera)
    return camera

@router.post("/cameras/{camera_id}/report-issue", response_model=MaintenanceTicketOut)
def report_damaged_camera(
    camera_id: int,
    payload: MaintenanceTicketCreate,
    reported_by_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Report a broken or offline CCTV camera and create a maintenance ticket."""
    try:
        ticket = report_camera_issue(
            db=db,
            camera_id=camera_id,
            reported_by_id=reported_by_id or 5,  # Default to admin Sarah
            issue_category=payload.issue_category,
            description=payload.description,
            priority=payload.priority
        )
        return {
            "id": ticket.id,
            "ticket_code": ticket.ticket_code,
            "camera_id": ticket.camera_id,
            "reported_by_id": ticket.reported_by_id,
            "issue_category": ticket.issue_category,
            "description": ticket.description,
            "priority": ticket.priority,
            "status": ticket.status,
            "created_at": ticket.created_at,
            "resolved_at": ticket.resolved_at,
            "technician_notes": ticket.technician_notes,
            "camera_name": ticket.camera.name,
            "camera_code": ticket.camera.camera_code,
            "ward": ticket.camera.ward
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/tickets", response_model=List[MaintenanceTicketOut])
def list_maintenance_tickets(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List maintenance and repair tickets for CCTV cameras."""
    query = db.query(MaintenanceTicket)
    if status and status != "all":
        query = query.filter(MaintenanceTicket.status == status)
    
    tickets = query.order_by(MaintenanceTicket.created_at.desc()).all()
    results = []
    for t in tickets:
        results.append({
            "id": t.id,
            "ticket_code": t.ticket_code,
            "camera_id": t.camera_id,
            "reported_by_id": t.reported_by_id,
            "issue_category": t.issue_category,
            "description": t.description,
            "priority": t.priority,
            "status": t.status,
            "created_at": t.created_at,
            "resolved_at": t.resolved_at,
            "technician_notes": t.technician_notes,
            "camera_name": t.camera.name if t.camera else "Camera",
            "camera_code": t.camera.camera_code if t.camera else "CAM-N/A",
            "ward": t.camera.ward if t.camera else ""
        })
    return results

@router.post("/tickets/{ticket_id}/resolve")
def resolve_ticket(
    ticket_id: int,
    payload: TicketResolveRequest,
    db: Session = Depends(get_db)
):
    """Resolve a maintenance ticket, restoring camera status to operational."""
    try:
        ticket = resolve_maintenance_ticket(
            db=db,
            ticket_id=ticket_id,
            technician_notes=payload.technician_notes
        )
        return {
            "success": True,
            "message": f"Ticket {ticket.ticket_code} resolved. Camera {ticket.camera.camera_code} restored to OPERATIONAL.",
            "ticket_id": ticket.id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/penalties")
def list_all_penalties(
    status: Optional[str] = None,
    ward: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all littering violations across the municipality."""
    query = db.query(Penalty)
    if ward and ward != "All":
        query = query.filter(Penalty.location.contains(ward))
    
    penalties = query.order_by(Penalty.created_at.desc()).all()
    formatted = [format_penalty_out(p) for p in penalties]

    if status and status != "all":
        formatted = [p for p in formatted if p["status"].upper() == status.upper()]

    return formatted

@router.get("/defaulters")
def list_penalty_defaulters(db: Session = Depends(get_db)):
    """List all citizens with DELAYED / OVERDUE penalties for administrative follow-up."""
    penalties = db.query(Penalty).filter(Penalty.status.in_(["UNPAID", "DELAYED"])).all()
    formatted = [format_penalty_out(p) for p in penalties]
    
    # Filter to only overdue
    defaulters = [p for p in formatted if p["days_overdue"] > 0 or p["status"] == "DELAYED"]
    
    # Sort by longest overdue first
    defaulters.sort(key=lambda x: x["days_overdue"], reverse=True)

    # Attach generated warning notice for each
    results = []
    for d in defaulters:
        penalty_obj = db.query(Penalty).filter(Penalty.id == d["id"]).first()
        notice = generate_defaulter_notice(penalty_obj)
        results.append({
            **d,
            "notice": notice
        })

    return results

@router.post("/defaulters/{penalty_id}/send-notice")
def send_defaulter_warning(penalty_id: int, db: Session = Depends(get_db)):
    """Simulate dispatching an official municipal warning notice via SMS / Email."""
    penalty = db.query(Penalty).filter(Penalty.id == penalty_id).first()
    if not penalty:
        raise HTTPException(status_code=404, detail="Penalty not found")

    notice = generate_defaulter_notice(penalty)
    return {
        "success": True,
        "message": f"Statutory warning notice dispatched to {notice['citizen_name']} ({notice['email']}).",
        "notice": notice
    }

@router.get("/analytics/waste-chart")
def get_waste_chart_data(db: Session = Depends(get_db)):
    """Get aggregated data for Chart.js waste breakdown."""
    collections = db.query(WasteCollection).all()
    breakdown = {}
    for c in collections:
        breakdown[c.waste_type] = round(breakdown.get(c.waste_type, 0.0) + c.weight_kg, 2)

    return {
        "labels": list(breakdown.keys()),
        "data": list(breakdown.values()),
        "total_kg": sum(breakdown.values())
    }

@router.get("/rates")
def list_waste_rates(db: Session = Depends(get_db)):
    """List all waste reward rates."""
    return db.query(WasteRateConfig).all()

@router.post("/rates")
def update_waste_rate(payload: RateConfigUpdate, db: Session = Depends(get_db)):
    """Update reward credits per kg for a specific waste type."""
    config = db.query(WasteRateConfig).filter(WasteRateConfig.waste_type == payload.waste_type).first()
    if not config:
        config = WasteRateConfig(
            waste_type=payload.waste_type,
            credits_per_kg=payload.credits_per_kg,
            description=f"Municipal credit rate for {payload.waste_type}"
        )
        db.add(config)
    else:
        config.credits_per_kg = payload.credits_per_kg

    db.commit()
    db.refresh(config)
    return {"success": True, "config": config}
