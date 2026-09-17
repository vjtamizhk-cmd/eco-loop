from typing import List, Optional
import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, WasteCollection, WasteRateConfig
from app.schemas import WasteCollectionCreate, WasteCollectionOut
from app.services.reward_service import record_waste_collection, DEFAULT_WASTE_RATES
from app.services.qr_service import parse_qr_payload

router = APIRouter(prefix="/api/collector", tags=["Waste Collector Field Portal"])

@router.post("/scan")
def verify_scanned_qr(payload: dict, db: Session = Depends(get_db)):
    """
    Validate scanned citizen QR code payload or raw Citizen ID.
    Returns citizen profile, current credit balance, and ward.
    """
    raw_input = payload.get("raw_data") or payload.get("citizen_id") or ""
    if not raw_input:
        raise HTTPException(status_code=400, detail="No QR data or Citizen ID provided")

    parsed = parse_qr_payload(raw_input)
    identifier = parsed.get("citizen_id") or parsed.get("token") or raw_input.strip()

    citizen = db.query(User).filter(
        (User.citizen_id == identifier) |
        (User.qr_token == identifier) |
        (User.email == identifier)
    ).first()

    if not citizen:
        raise HTTPException(status_code=404, detail=f"No citizen found matching: '{raw_input}'")

    return {
        "success": True,
        "citizen": {
            "id": citizen.id,
            "citizen_id": citizen.citizen_id,
            "full_name": citizen.full_name,
            "email": citizen.email,
            "avatar_url": citizen.avatar_url,
            "ward": citizen.ward,
            "address": citizen.address,
            "eco_credits": citizen.eco_credits
        }
    }

@router.get("/rates")
def get_waste_categories_and_rates(db: Session = Depends(get_db)):
    """Get active waste categories and credits awarded per kg."""
    configs = db.query(WasteRateConfig).filter(WasteRateConfig.waste_type.in_(DEFAULT_WASTE_RATES.keys())).all()
    if configs:
        return [
            {
                "waste_type": c.waste_type,
                "credits_per_kg": c.credits_per_kg,
                "description": c.description
            } for c in configs
        ]
    
    return [
        {
            "waste_type": k,
            "credits_per_kg": v,
            "description": f"Credit rate for {k}"
        } for k, v in DEFAULT_WASTE_RATES.items()
    ]

@router.post("/collect")
def log_waste_collection_and_award_credits(
    payload: WasteCollectionCreate,
    db: Session = Depends(get_db)
):
    """
    Log waste collected from citizen and immediately credit their wallet with EcoCredits.
    """
    try:
        collection = record_waste_collection(
            db=db,
            citizen_qr_or_id=payload.citizen_qr_or_id,
            collector_id=payload.collector_id,
            waste_type=payload.waste_type,
            weight_kg=payload.weight_kg,
            notes=payload.notes or ""
        )

        return {
            "success": True,
            "message": f"Successfully logged {payload.weight_kg}kg of {payload.waste_type}. Credited {collection.credits_awarded} EcoCredits to {collection.user.full_name}!",
            "collection": {
                "id": collection.id,
                "collection_code": collection.collection_code,
                "citizen_name": collection.user.full_name,
                "citizen_id": collection.user.citizen_id,
                "waste_type": collection.waste_type,
                "weight_kg": collection.weight_kg,
                "rate_per_kg": collection.rate_per_kg,
                "credits_awarded": collection.credits_awarded,
                "collected_at": collection.collected_at,
                "citizen_new_balance": collection.user.eco_credits,
                "notes": collection.notes
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{collector_id}/logs")
def get_collector_logs(collector_id: int, db: Session = Depends(get_db)):
    """Fetch collection activity logs for the logged-in collector."""
    collector = db.query(User).filter(User.id == collector_id).first()
    if not collector:
        raise HTTPException(status_code=404, detail="Collector not found")

    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    today_collections = db.query(WasteCollection).filter(
        WasteCollection.collector_id == collector_id,
        WasteCollection.collected_at >= today_start
    ).order_by(WasteCollection.collected_at.desc()).all()

    all_collections = db.query(WasteCollection).filter(
        WasteCollection.collector_id == collector_id
    ).order_by(WasteCollection.collected_at.desc()).all()

    today_weight = sum(c.weight_kg for c in today_collections)
    today_credits = sum(c.credits_awarded for c in today_collections)
    total_weight = sum(c.weight_kg for c in all_collections)

    return {
        "stats": {
            "today_collections_count": len(today_collections),
            "today_total_kg": round(today_weight, 2),
            "today_credits_distributed": round(today_credits, 2),
            "all_time_kg": round(total_weight, 2),
            "total_pickups": len(all_collections)
        },
        "recent_logs": [
            {
                "id": c.id,
                "collection_code": c.collection_code,
                "citizen_name": c.user.full_name if c.user else "Citizen",
                "citizen_id": c.user.citizen_id if c.user else "N/A",
                "ward": c.user.ward if c.user else "",
                "waste_type": c.waste_type,
                "weight_kg": c.weight_kg,
                "credits_awarded": c.credits_awarded,
                "collected_at": c.collected_at,
                "notes": c.notes
            } for c in all_collections[:25]
        ]
    }

@router.get("/{collector_id}/pickup-requests")
def get_collector_pickup_requests(collector_id: int, db: Session = Depends(get_db)):
    """Fetch active and pending doorstep pickup requests in collector's ward."""
    from app.models import WastePickupRequest
    collector = db.query(User).filter(User.id == collector_id).first()
    if not collector:
        raise HTTPException(status_code=404, detail="Collector not found")

    # Match by active statuses (DISPATCHED, ACCEPTED, ARRIVED)
    # Return requests either in the collector's ward OR already assigned to this collector.
    pickups = db.query(WastePickupRequest).filter(
        WastePickupRequest.status.in_(["DISPATCHED", "ACCEPTED", "ARRIVED"]),
        (WastePickupRequest.ward == collector.ward) | (WastePickupRequest.collector_id == collector_id)
    ).order_by(WastePickupRequest.created_at.desc()).all()

    return [
        {
            "id": p.id,
            "request_code": p.request_code,
            "citizen_name": p.citizen.full_name if p.citizen else "Resident",
            "citizen_id": p.citizen.citizen_id if p.citizen else "ECO-CTZ-0000",
            "ward": p.ward,
            "address": p.address,
            "phone": p.phone,
            "waste_category": p.waste_category,
            "estimated_weight_kg": p.estimated_weight_kg,
            "urgency": p.urgency,
            "notes": p.notes,
            "status": p.status,
            "collector_id": p.collector_id,
            "created_at": p.created_at
        } for p in pickups
    ]

@router.post("/pickup-request/{request_id}/accept")
def accept_pickup_request(request_id: int, payload: dict, db: Session = Depends(get_db)):
    """Collector accepts a citizen pickup call and sets status to ACCEPTED."""
    from app.models import WastePickupRequest
    collector_id = payload.get("collector_id")
    pickup = db.query(WastePickupRequest).filter(WastePickupRequest.id == request_id).first()
    if not pickup:
        raise HTTPException(status_code=404, detail="Request not found")

    pickup.status = "ACCEPTED"
    pickup.collector_id = collector_id
    db.commit()
    return {"success": True, "message": "Pickup request accepted. Collector is now EN ROUTE to citizen."}

@router.post("/pickup-request/{request_id}/arrived")
def mark_collector_arrived(request_id: int, db: Session = Depends(get_db)):
    """Collector marks arrival at citizen doorstep."""
    from app.models import WastePickupRequest
    pickup = db.query(WastePickupRequest).filter(WastePickupRequest.id == request_id).first()
    if not pickup:
        raise HTTPException(status_code=404, detail="Request not found")

    pickup.status = "ARRIVED"
    db.commit()
    return {"success": True, "message": "Status updated: Collector arrived at resident doorstep."}

@router.post("/pickup-request/{request_id}/complete")
def complete_pickup_request(request_id: int, db: Session = Depends(get_db)):
    """Explicitly mark pickup request as completed."""
    import datetime
    from app.models import WastePickupRequest
    pickup = db.query(WastePickupRequest).filter(WastePickupRequest.id == request_id).first()
    if not pickup:
        raise HTTPException(status_code=404, detail="Request not found")

    pickup.status = "COMPLETED"
    pickup.completed_at = datetime.datetime.utcnow()
    db.commit()
    return {"success": True, "message": "Pickup call completed and cleared from queue."}


