import os
import uuid
from typing import List
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserOut, GoogleLoginRequest, SwitchRoleRequest
from app.services.qr_service import generate_qr_base64

router = APIRouter(prefix="/api/auth", tags=["Authentication & User Profiles"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()


def _resolve_google_profile(payload: GoogleLoginRequest):
    """Return a normalized Google profile from either a credential token or the legacy demo payload."""
    if payload.credential:
        try:
            response = httpx.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": payload.credential},
                timeout=10,
            )
            response.raise_for_status()
            token_data = response.json()
        except Exception as exc:
            raise HTTPException(status_code=401, detail=f"Invalid Google credential: {str(exc)}") from exc

        if GOOGLE_CLIENT_ID and token_data.get("aud") and token_data.get("aud") != GOOGLE_CLIENT_ID:
            raise HTTPException(status_code=401, detail="Google credential audience mismatch")

        email = token_data.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="Google credential did not include an email")

        name = payload.name or token_data.get("name") or email.split("@", 1)[0]
        avatar_url = payload.avatar_url or payload.picture or token_data.get("picture")
        sub = payload.sub or token_data.get("sub")
        return {
            "name": name,
            "email": email,
            "avatar_url": avatar_url,
            "sub": sub,
        }

    if not payload.email:
        raise HTTPException(status_code=400, detail="Google login requires an email address")

    return {
        "name": payload.name or payload.email.split("@", 1)[0],
        "email": str(payload.email),
        "avatar_url": payload.avatar_url or payload.picture,
        "sub": payload.sub,
    }

@router.get("/users", response_model=List[UserOut])
def list_demo_users(db: Session = Depends(get_db)):
    """List all registered users for quick role switching and testing."""
    return db.query(User).filter(User.is_active == True).all()

@router.get("/user/{user_id}", response_model=UserOut)
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    """Fetch user profile details by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/google-login", response_model=UserOut)
def google_sign_in_or_register(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    """
    Handles Google Account / Gmail sign-in.
    Finds existing user by email, or creates a new citizen account with custom QR code token.
    Supports either a real Google id_token or the legacy demo payload used for simulation.
    """
    google_profile = _resolve_google_profile(payload)
    email = google_profile["email"]
    name = google_profile["name"]
    avatar_url = google_profile["avatar_url"] or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"

    user = db.query(User).filter(User.email == email).first()
    if not user:
        citizen_count = db.query(User).count() + 1001
        citizen_id = f"ECO-CTZ-{citizen_count}"
        qr_token = f"TOKEN-CTZ-{uuid.uuid4().hex[:8].upper()}"

        user = User(
            citizen_id=citizen_id,
            email=email,
            full_name=name,
            avatar_url=avatar_url,
            phone="+1 (555) 000-1234",
            address="124 Green Valley Road",
            ward="Ward 4 - Green Meadows",
            role="citizen",
            qr_token=qr_token,
            eco_credits=50.0
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.full_name = name
        user.avatar_url = avatar_url
        db.commit()
        db.refresh(user)

    return user

@router.get("/user/{user_id}/qr-code")
def get_user_qr_code(user_id: int, db: Session = Depends(get_db)):
    """Generate and return stylized dynamic QR code in base64 data URI format."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    qr_base64 = generate_qr_base64(user)
    return {
        "citizen_id": user.citizen_id,
        "full_name": user.full_name,
        "ward": user.ward,
        "qr_token": user.qr_token,
        "qr_image": qr_base64
    }
