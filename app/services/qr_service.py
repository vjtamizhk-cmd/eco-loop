import json
import base64
import io
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from qrcode.image.styles.colormasks import SolidFillColorMask
from app.models import User

def generate_qr_payload(user: User) -> str:
    """Generate standardized JSON payload to encode inside the Citizen QR code."""
    data = {
        "app": "EcoLoop",
        "ver": "1.0",
        "citizen_id": user.citizen_id,
        "token": user.qr_token,
        "name": user.full_name,
        "ward": user.ward,
        "email": user.email
    }
    return json.dumps(data)

def generate_qr_base64(user: User) -> str:
    """Generate stylized base64 PNG QR code for user profile."""
    payload = generate_qr_payload(user)
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=3,
    )
    qr.add_data(payload)
    qr.make(fit=True)

    # Emerald dark green color fill (#047857) with white background
    img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(),
        color_mask=SolidFillColorMask(
            back_color=(255, 255, 255),
            front_color=(4, 120, 87)
        )
    )

    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{img_str}"

def parse_qr_payload(payload_str: str) -> dict:
    """Parse and validate scanned QR payload or raw Citizen ID."""
    payload_str = payload_str.strip()
    if payload_str.startswith("{") and payload_str.endswith("}"):
        try:
            return json.loads(payload_str)
        except Exception:
            pass
    # If raw citizen ID was scanned or typed
    return {"citizen_id": payload_str}
