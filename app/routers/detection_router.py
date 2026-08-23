from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import AIDetectionSimulationRequest
from app.services.cctv_service import simulate_ai_detection
from app.routers.citizen_router import format_penalty_out

router = APIRouter(prefix="/api/detection", tags=["AI CCTV Detection Simulator"])

@router.post("/simulate")
def trigger_ai_detection_simulation(
    payload: AIDetectionSimulationRequest,
    db: Session = Depends(get_db)
):
    """
    Simulates a live public CCTV Camera AI detection.
    Detects illegal littering/dumping, identifies citizen, flags evidence photo, and issues penalty.
    """
    try:
        penalty = simulate_ai_detection(
            db=db,
            camera_id=payload.camera_id,
            user_id=payload.user_id,
            violation_type=payload.violation_type,
            custom_notes=payload.custom_notes,
            fine_amount=payload.fine_amount
        )

        return {
            "success": True,
            "message": f"AI Optical Detection flagged: '{penalty.violation_type}' by CCTV #{penalty.camera.camera_code}. Violation penalty ₹{penalty.fine_amount} allotted to {penalty.user.full_name}!",
            "penalty": format_penalty_out(penalty)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
