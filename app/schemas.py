from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = ""
    address: Optional[str] = "124 Green Valley Road"
    ward: Optional[str] = "Ward 4 - Green Meadows"
    role: Optional[str] = "citizen"

class UserCreate(UserBase):
    pass

class GoogleLoginRequest(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    picture: Optional[str] = None
    credential: Optional[str] = None
    sub: Optional[str] = None

class SwitchRoleRequest(BaseModel):
    user_id: int

class UserOut(UserBase):
    id: int
    citizen_id: str
    avatar_url: str
    qr_token: str
    eco_credits: float
    created_at: datetime
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


# CCTV Schemas
class CCTVCameraBase(BaseModel):
    camera_code: str
    name: str
    ward: str
    location_name: str
    latitude: float
    longitude: float
    status: str
    resolution: str
    ai_detection_enabled: bool

class CCTVCameraOut(CCTVCameraBase):
    id: int
    last_ping: datetime
    fault_description: Optional[str] = ""
    installed_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CameraStatusUpdate(BaseModel):
    status: str
    fault_description: Optional[str] = ""


# Penalty Schemas
class PenaltyBase(BaseModel):
    user_id: int
    camera_id: int
    violation_type: str
    location: str
    fine_amount: float
    evidence_image_url: Optional[str] = None
    evidence_caption: Optional[str] = None

class PenaltyCreate(PenaltyBase):
    pass

class PenaltyPayRequest(BaseModel):
    payment_method: str = "CARD"
    card_number: Optional[str] = None
    upi_id: Optional[str] = None

class PenaltyDisputeRequest(BaseModel):
    dispute_reason: str

class PenaltyOut(BaseModel):
    id: int
    violation_code: str
    user_id: int
    camera_id: int
    violation_type: str
    location: str
    fine_amount: float
    late_fee: float
    total_payable: float
    status: str
    created_at: datetime
    due_date: datetime
    paid_at: Optional[datetime] = None
    payment_method: Optional[str] = None
    payment_ref: Optional[str] = None
    evidence_image_url: str
    evidence_caption: str
    dispute_reason: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    camera_name: Optional[str] = None
    ward: Optional[str] = None
    days_overdue: int = 0

    model_config = ConfigDict(from_attributes=True)


# Waste Collection Schemas
class WasteCollectionCreate(BaseModel):
    citizen_qr_or_id: str
    collector_id: int
    waste_type: str
    weight_kg: float
    notes: Optional[str] = ""

class WasteCollectionOut(BaseModel):
    id: int
    collection_code: str
    user_id: int
    collector_id: int
    waste_type: str
    weight_kg: float
    rate_per_kg: float
    credits_awarded: float
    collected_at: datetime
    notes: Optional[str] = ""
    citizen_name: Optional[str] = None
    citizen_id: Optional[str] = None
    collector_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# Reward Schemas
class RewardBase(BaseModel):
    title: str
    category: str
    description: str
    credit_cost: float
    value_label: str
    icon: str

class RewardOut(RewardBase):
    id: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class RewardRedeemRequest(BaseModel):
    reward_id: int

class RewardRedemptionOut(BaseModel):
    id: int
    redemption_code: str
    user_id: int
    reward_id: int
    credits_spent: float
    redeemed_at: datetime
    voucher_code: str
    status: str
    reward_title: Optional[str] = None
    reward_category: Optional[str] = None
    value_label: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# Maintenance Ticket Schemas
class MaintenanceTicketCreate(BaseModel):
    camera_id: int
    issue_category: str
    description: str
    priority: str = "HIGH"

class MaintenanceTicketOut(BaseModel):
    id: int
    ticket_code: str
    camera_id: int
    reported_by_id: Optional[int] = None
    issue_category: str
    description: str
    priority: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    technician_notes: Optional[str] = None
    camera_name: Optional[str] = None
    camera_code: Optional[str] = None
    ward: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class TicketResolveRequest(BaseModel):
    technician_notes: str


# AI Detection Simulation Schema
class AIDetectionSimulationRequest(BaseModel):
    camera_id: int
    user_id: int
    violation_type: str = "Road Dumping"
    custom_notes: Optional[str] = ""
    fine_amount: Optional[float] = None


# Rate Config Schemas
class RateConfigUpdate(BaseModel):
    waste_type: str
    credits_per_kg: float


# Waste Pickup Request Schemas
class WastePickupRequestCreate(BaseModel):
    user_id: int
    waste_category: str = "Recyclable Plastic"
    estimated_weight_kg: Optional[float] = 5.0
    preferred_time: Optional[str] = "Immediate (Within 30 mins)"
    address: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = ""

class WastePickupRequestOut(BaseModel):
    id: int
    request_code: str
    user_id: int
    collector_id: Optional[int] = None
    ward: str
    address: str
    phone: str
    waste_category: str
    estimated_weight_kg: float
    urgency: str
    notes: Optional[str] = ""
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    citizen_name: Optional[str] = None
    citizen_id: Optional[str] = None
    collector_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

