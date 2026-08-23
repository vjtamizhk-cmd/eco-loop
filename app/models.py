import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    citizen_id = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    avatar_url = Column(String(255), default="/static/images/avatars/default.png")
    phone = Column(String(20), default="")
    address = Column(String(255), default="124 Green Valley Road")
    ward = Column(String(100), default="Ward 4 - Green Meadows")
    role = Column(String(20), default="citizen")  # citizen, collector, admin, superadmin
    qr_token = Column(String(100), unique=True, index=True, nullable=False)
    eco_credits = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Relationships
    penalties = relationship("Penalty", back_populates="user", cascade="all, delete-orphan")
    collections = relationship("WasteCollection", foreign_keys="WasteCollection.user_id", back_populates="user")
    collected_jobs = relationship("WasteCollection", foreign_keys="WasteCollection.collector_id", back_populates="collector")
    redemptions = relationship("RewardRedemption", back_populates="user")
    pickup_requests = relationship("WastePickupRequest", foreign_keys="WastePickupRequest.user_id", back_populates="citizen")
    assigned_pickups = relationship("WastePickupRequest", foreign_keys="WastePickupRequest.collector_id", back_populates="collector")


class CCTVCamera(Base):
    __tablename__ = "cctv_cameras"

    id = Column(Integer, primary_key=True, index=True)
    camera_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    ward = Column(String(100), nullable=False)
    location_name = Column(String(200), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String(30), default="operational")  # operational, damaged, offline, obstructed
    resolution = Column(String(50), default="4K AI Ultra HD")
    ai_detection_enabled = Column(Boolean, default=True)
    last_ping = Column(DateTime, default=datetime.datetime.utcnow)
    fault_description = Column(Text, default="")
    installed_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    penalties = relationship("Penalty", back_populates="camera")
    maintenance_tickets = relationship("MaintenanceTicket", back_populates="camera")


class Penalty(Base):
    __tablename__ = "penalties"

    id = Column(Integer, primary_key=True, index=True)
    violation_code = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    camera_id = Column(Integer, ForeignKey("cctv_cameras.id"), nullable=False)
    violation_type = Column(String(100), nullable=False)  # Road Dumping, Public Littering, Non-Segregated Dumping, Plastic Burning
    location = Column(String(200), nullable=False)
    fine_amount = Column(Float, nullable=False, default=500.0)
    late_fee = Column(Float, default=0.0)
    status = Column(String(30), default="UNPAID")  # UNPAID, DELAYED, PAID, DISPUTED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    due_date = Column(DateTime, nullable=False)
    paid_at = Column(DateTime, nullable=True)
    payment_method = Column(String(50), nullable=True)
    payment_ref = Column(String(100), nullable=True)
    evidence_image_url = Column(String(255), default="/static/images/evidence/default_litter.jpg")
    evidence_caption = Column(String(255), default="AI CCTV Optical Detection: Waste discarded outside municipal bin")
    dispute_reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="penalties")
    camera = relationship("CCTVCamera", back_populates="penalties")


class WasteCollection(Base):
    __tablename__ = "waste_collections"

    id = Column(Integer, primary_key=True, index=True)
    collection_code = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    collector_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    waste_type = Column(String(100), nullable=False)  # Organic, Plastic, Paper, E-Waste, Metal, Glass
    weight_kg = Column(Float, nullable=False)
    rate_per_kg = Column(Float, nullable=False)
    credits_awarded = Column(Float, nullable=False)
    collected_at = Column(DateTime, default=datetime.datetime.utcnow)
    notes = Column(String(255), default="")

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="collections")
    collector = relationship("User", foreign_keys=[collector_id], back_populates="collected_jobs")


class Reward(Base):
    __tablename__ = "rewards"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    category = Column(String(50), nullable=False)  # Rebate, Transit, Grocery, Eco Product, Tree
    description = Column(Text, nullable=False)
    credit_cost = Column(Float, nullable=False)
    value_label = Column(String(100), nullable=False)
    icon = Column(String(50), default="gift")
    is_active = Column(Boolean, default=True)

    # Relationships
    redemptions = relationship("RewardRedemption", back_populates="reward")


class RewardRedemption(Base):
    __tablename__ = "reward_redemptions"

    id = Column(Integer, primary_key=True, index=True)
    redemption_code = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reward_id = Column(Integer, ForeignKey("rewards.id"), nullable=False)
    credits_spent = Column(Float, nullable=False)
    redeemed_at = Column(DateTime, default=datetime.datetime.utcnow)
    voucher_code = Column(String(100), nullable=False)
    status = Column(String(30), default="ACTIVE")  # ACTIVE, REDEEMED, EXPIRED

    # Relationships
    user = relationship("User", back_populates="redemptions")
    reward = relationship("Reward", back_populates="redemptions")


class MaintenanceTicket(Base):
    __tablename__ = "maintenance_tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_code = Column(String(50), unique=True, index=True, nullable=False)
    camera_id = Column(Integer, ForeignKey("cctv_cameras.id"), nullable=False)
    reported_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    issue_category = Column(String(100), nullable=False)  # Physical Damage, Lens Obstructed, Connection Offline, Power Failure
    description = Column(Text, nullable=False)
    priority = Column(String(20), default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW
    status = Column(String(30), default="OPEN")  # OPEN, IN_PROGRESS, RESOLVED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    technician_notes = Column(Text, nullable=True)

    # Relationships
    camera = relationship("CCTVCamera", back_populates="maintenance_tickets")


class WasteRateConfig(Base):
    __tablename__ = "waste_rate_configs"

    id = Column(Integer, primary_key=True, index=True)
    waste_type = Column(String(100), unique=True, nullable=False)
    credits_per_kg = Column(Float, nullable=False)
    description = Column(String(255), default="")


class WastePickupRequest(Base):
    __tablename__ = "waste_pickup_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_code = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    collector_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    ward = Column(String(100), nullable=False)
    address = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    waste_category = Column(String(100), nullable=False)
    estimated_weight_kg = Column(Float, default=5.0)
    actual_weight_kg = Column(Float, nullable=True)
    credits_awarded = Column(Float, nullable=True)
    urgency = Column(String(50), default="Immediate (Within 30 mins)")
    notes = Column(Text, default="")
    status = Column(String(30), default="DISPATCHED")  # DISPATCHED, ACCEPTED, ARRIVED, COMPLETED, CANCELLED
    dismissed_by_citizen = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    citizen = relationship("User", foreign_keys=[user_id], back_populates="pickup_requests")
    collector = relationship("User", foreign_keys=[collector_id], back_populates="assigned_pickups")


