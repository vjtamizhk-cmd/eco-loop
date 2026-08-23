import uuid
import datetime
from sqlalchemy.orm import Session
from app.models import (
    User, CCTVCamera, Penalty, WasteCollection, Reward,
    RewardRedemption, MaintenanceTicket, WasteRateConfig, WastePickupRequest
)
from app.services.penalty_service import DEFAULT_FINE_RATES
from app.services.reward_service import DEFAULT_WASTE_RATES

def seed_database(db: Session):
    """Seed initial data for demonstration and testing if tables are empty."""
    if db.query(User).first():
        return  # Database already seeded

    print(">>> Seeding Eco Loop Database with initial data...")

    # 1. Waste Rate Configurations
    for w_type, rate in DEFAULT_WASTE_RATES.items():
        db.add(WasteRateConfig(waste_type=w_type, credits_per_kg=rate, description=f"Standard municipal credit rate for {w_type}"))
    db.commit()

    # 2. Users (Citizens, Collectors, Admins)
    users_data = [
        {
            "citizen_id": "ECO-CTZ-1001",
            "email": "john.citizen@gmail.com",
            "full_name": "Johnathan Doe",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            "phone": "+1 (555) 234-5678",
            "address": "124 Green Valley Road, Apt 4B",
            "ward": "Ward 4 - Green Meadows",
            "role": "citizen",
            "qr_token": "TOKEN-JOHN-1001-XYZ",
            "eco_credits": 340.0
        },
        {
            "citizen_id": "ECO-CTZ-1002",
            "email": "priya.patel@gmail.com",
            "full_name": "Priya Patel",
            "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
            "phone": "+1 (555) 876-5432",
            "address": "88 Lotus Boulevard, Ward 4",
            "ward": "Ward 4 - Green Meadows",
            "role": "citizen",
            "qr_token": "TOKEN-PRIYA-1002-ABC",
            "eco_credits": 620.0
        },
        {
            "citizen_id": "ECO-CTZ-1003",
            "email": "marcus.vance@gmail.com",
            "full_name": "Marcus Vance",
            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
            "phone": "+1 (555) 345-9876",
            "address": "402 Silicon Ave, Ward 7",
            "ward": "Ward 7 - Tech Corridor",
            "role": "citizen",
            "qr_token": "TOKEN-MARCUS-1003-DEF",
            "eco_credits": 150.0
        },
        {
            "citizen_id": "ECO-COL-501",
            "email": "alex.collector@ecoloop.org",
            "full_name": "Alex Turner (Field Collector)",
            "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
            "phone": "+1 (555) 901-2233",
            "address": "Municipal Sanitation Depot #4",
            "ward": "Ward 4 - Green Meadows",
            "role": "collector",
            "qr_token": "TOKEN-ALEX-COL-501",
            "eco_credits": 80.0
        },
        {
            "citizen_id": "ECO-ADM-901",
            "email": "sarah.admin@ecoloop.gov",
            "full_name": "Sarah Jenkins (Ward Officer)",
            "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
            "phone": "+1 (555) 444-9988",
            "address": "Ward 4 Municipal Administrative Center",
            "ward": "Ward 4 - Green Meadows",
            "role": "admin",
            "qr_token": "TOKEN-ADMIN-SARAH-901",
            "eco_credits": 0.0
        },
        {
            "citizen_id": "ECO-ADM-999",
            "email": "director.kumar@ecoloop.gov",
            "full_name": "Director Rajesh Kumar",
            "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
            "phone": "+1 (555) 999-0000",
            "address": "Central Municipal Waste Command Center",
            "ward": "City-Wide",
            "role": "superadmin",
            "qr_token": "TOKEN-SUPERADMIN-999",
            "eco_credits": 0.0
        }
    ]

    users = {}
    for u in users_data:
        user_obj = User(**u)
        db.add(user_obj)
        users[u["email"]] = user_obj
    db.commit()

    # 3. CCTV Cameras
    cameras_data = [
        {
            "camera_code": "CAM-W4-01",
            "name": "Green Meadows Main Junction Camera #1",
            "ward": "Ward 4 - Green Meadows",
            "location_name": "Corner of 4th Ave & Pine St",
            "latitude": 37.7749,
            "longitude": -122.4194,
            "status": "operational",
            "resolution": "4K Ultra HD AI Vision",
            "ai_detection_enabled": True
        },
        {
            "camera_code": "CAM-W4-02",
            "name": "North Ring Road Dustbin Perimeter Cam",
            "ward": "Ward 4 - Green Meadows",
            "location_name": "North Ring Road Sector 8",
            "latitude": 37.7790,
            "longitude": -122.4230,
            "status": "damaged",
            "resolution": "1080p Optical Tracking",
            "ai_detection_enabled": False,
            "fault_description": "Optical sensor lens cracked due to storm debris. Requires technician replacement."
        },
        {
            "camera_code": "CAM-W4-03",
            "name": "Central Community Park Walkway Camera",
            "ward": "Ward 4 - Green Meadows",
            "location_name": "Central Park South Promenade",
            "latitude": 37.7712,
            "longitude": -122.4150,
            "status": "operational",
            "resolution": "4K Ultra HD AI Vision",
            "ai_detection_enabled": True
        },
        {
            "camera_code": "CAM-W4-04",
            "name": "Market Street Commercial Bin Camera",
            "ward": "Ward 4 - Green Meadows",
            "location_name": "Market St Commercial Lane 3",
            "latitude": 37.7765,
            "longitude": -122.4100,
            "status": "offline",
            "resolution": "1080p AI Vision",
            "ai_detection_enabled": False,
            "fault_description": "Network telemetry disconnected. Fiber cable switch failure reported."
        },
        {
            "camera_code": "CAM-W7-01",
            "name": "Silicon Boulevard Transit Hub CCTV",
            "ward": "Ward 7 - Tech Corridor",
            "location_name": "Silicon Blvd & Cyber Way",
            "latitude": 37.7830,
            "longitude": -122.4080,
            "status": "operational",
            "resolution": "4K Ultra HD AI Vision",
            "ai_detection_enabled": True
        },
        {
            "camera_code": "CAM-W7-02",
            "name": "Lakeview Eco-Trail North Overlook",
            "ward": "Ward 7 - Tech Corridor",
            "location_name": "Eco Trail Overlook #2",
            "latitude": 37.7870,
            "longitude": -122.4130,
            "status": "operational",
            "resolution": "4K Ultra HD AI Vision",
            "ai_detection_enabled": True
        }
    ]

    cameras = {}
    for c in cameras_data:
        cam_obj = CCTVCamera(**c)
        db.add(cam_obj)
        cameras[c["camera_code"]] = cam_obj
    db.commit()

    # 4. Maintenance Tickets
    tkt1 = MaintenanceTicket(
        ticket_code="TKT-CAM-2026-081",
        camera_id=cameras["CAM-W4-02"].id,
        reported_by_id=users["sarah.admin@ecoloop.gov"].id,
        issue_category="Physical Damage / Broken Lens",
        description="Camera lens shattered by storm branch. AI model failing to detect objects due to blur.",
        priority="CRITICAL",
        status="OPEN",
        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=2)
    )
    tkt2 = MaintenanceTicket(
        ticket_code="TKT-CAM-2026-082",
        camera_id=cameras["CAM-W4-04"].id,
        reported_by_id=users["sarah.admin@ecoloop.gov"].id,
        issue_category="Connection / Network Offline",
        description="Loss of RTSP live feed. Switch port offline.",
        priority="HIGH",
        status="IN_PROGRESS",
        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1),
        technician_notes="Technician dispatched to inspection box."
    )
    db.add_all([tkt1, tkt2])
    db.commit()

    # 5. Penalties (Violations)
    now = datetime.datetime.utcnow()

    # Overdue / Delayed Penalty for John
    p1 = Penalty(
        violation_code="VIO-2026-7810",
        user_id=users["john.citizen@gmail.com"].id,
        camera_id=cameras["CAM-W4-01"].id,
        violation_type="Road Dumping",
        location="Ward 4 - Green Meadows (4th Ave & Pine St)",
        fine_amount=750.0,
        late_fee=75.0,
        status="DELAYED",
        created_at=now - datetime.timedelta(days=16),
        due_date=now - datetime.timedelta(days=9),
        evidence_image_url="/static/images/evidence/road_dumping.jpg",
        evidence_caption="AI Optical Trace: Domestic garbage sack tossed onto road asphalt outside bin zone.",
        notes="Citizen has missed statutory payment deadline by 9 days. First warning notice dispatched."
    )

    # Active Unpaid Penalty for John
    p2 = Penalty(
        violation_code="VIO-2026-8942",
        user_id=users["john.citizen@gmail.com"].id,
        camera_id=cameras["CAM-W4-03"].id,
        violation_type="Public Littering",
        location="Ward 4 - Central Park South Promenade",
        fine_amount=500.0,
        late_fee=0.0,
        status="UNPAID",
        created_at=now - datetime.timedelta(days=2),
        due_date=now + datetime.timedelta(days=5),
        evidence_image_url="/static/images/evidence/public_littering.jpg",
        evidence_caption="AI CCTV Event: Beverage can and plastic packaging dropped on grass lawn.",
        notes="5 days remaining until due date."
    )

    # Paid Penalty for Priya
    p3 = Penalty(
        violation_code="VIO-2026-5120",
        user_id=users["priya.patel@gmail.com"].id,
        camera_id=cameras["CAM-W4-01"].id,
        violation_type="Non-Segregated Dumping",
        location="Ward 4 - 4th Ave & Pine St",
        fine_amount=400.0,
        late_fee=0.0,
        status="PAID",
        created_at=now - datetime.timedelta(days=10),
        due_date=now - datetime.timedelta(days=3),
        paid_at=now - datetime.timedelta(days=8),
        payment_method="UPI",
        payment_ref="UPI-TXN-88492019",
        evidence_image_url="/static/images/evidence/mixed_waste.jpg",
        evidence_caption="AI Detection: Mixed non-segregated waste bin placement.",
        notes="Settled within 48 hours. Clean record maintained."
    )

    # Overdue Penalty for Marcus
    p4 = Penalty(
        violation_code="VIO-2026-9901",
        user_id=users["marcus.vance@gmail.com"].id,
        camera_id=cameras["CAM-W7-01"].id,
        violation_type="Plastic Burning",
        location="Ward 7 - Silicon Blvd & Cyber Way",
        fine_amount=1500.0,
        late_fee=150.0,
        status="DELAYED",
        created_at=now - datetime.timedelta(days=20),
        due_date=now - datetime.timedelta(days=13),
        evidence_image_url="/static/images/evidence/plastic_burning.jpg",
        evidence_caption="Thermal Sensor: Toxic polymer open flame detected behind commercial fence.",
        notes="Urgent legal summons pending dispatch."
    )

    db.add_all([p1, p2, p3, p4])
    db.commit()

    # 6. Waste Collection Records
    c1 = WasteCollection(
        collection_code="COL-2026-0012",
        user_id=users["john.citizen@gmail.com"].id,
        collector_id=users["alex.collector@ecoloop.org"].id,
        waste_type="Recyclable Plastic",
        weight_kg=8.5,
        rate_per_kg=15.0,
        credits_awarded=127.5,
        collected_at=now - datetime.timedelta(days=4),
        notes="Clean segregated HDPE bottles and milk cartons."
    )
    c2 = WasteCollection(
        collection_code="COL-2026-0019",
        user_id=users["john.citizen@gmail.com"].id,
        collector_id=users["alex.collector@ecoloop.org"].id,
        waste_type="Organic / Wet Waste",
        weight_kg=14.0,
        rate_per_kg=5.0,
        credits_awarded=70.0,
        collected_at=now - datetime.timedelta(days=2),
        notes="Vegetable scraps and compostable leaves."
    )
    c3 = WasteCollection(
        collection_code="COL-2026-0034",
        user_id=users["priya.patel@gmail.com"].id,
        collector_id=users["alex.collector@ecoloop.org"].id,
        waste_type="E-Waste",
        weight_kg=4.2,
        rate_per_kg=50.0,
        credits_awarded=210.0,
        collected_at=now - datetime.timedelta(days=6),
        notes="Old computer power supply, cables, and broken tablet."
    )
    c4 = WasteCollection(
        collection_code="COL-2026-0040",
        user_id=users["priya.patel@gmail.com"].id,
        collector_id=users["alex.collector@ecoloop.org"].id,
        waste_type="Paper & Cardboard",
        weight_kg=25.0,
        rate_per_kg=8.0,
        credits_awarded=200.0,
        collected_at=now - datetime.timedelta(days=1),
        notes="Flattened cardboard shipping boxes."
    )

    db.add_all([c1, c2, c3, c4])
    db.commit()

    # 7. Rewards Catalog
    rewards_data = [
        {
            "title": "Municipal Water Bill Rebate (15% Off)",
            "category": "Tax Rebate",
            "description": "Receive an official 15% discount credit applied directly to your quarterly city water utility bill.",
            "credit_cost": 150.0,
            "value_label": "₹350 / $15 Utility Credit",
            "icon": "droplet"
        },
        {
            "title": "1-Month City Metro & Green Bus Pass",
            "category": "Transit",
            "description": "Unlimited travel on all municipal electric buses and rapid metro trains for 30 consecutive days.",
            "credit_cost": 300.0,
            "value_label": "Free 30-Day Transit Pass",
            "icon": "bus"
        },
        {
            "title": "Organic Farm Fresh Supermarket Voucher",
            "category": "Grocery",
            "description": "Redeemable at GreenMarket, Nature's Basket, and partner eco-grocers for fresh organic produce.",
            "credit_cost": 250.0,
            "value_label": "₹500 Grocery Voucher",
            "icon": "shopping-bag"
        },
        {
            "title": "Home Kitchen Compost Kit + Microbes",
            "category": "Eco Product",
            "description": "A high-efficiency odor-free bokashi kitchen composter with 1kg bio-enzymes to recycle your wet kitchen waste.",
            "credit_cost": 400.0,
            "value_label": "Composter Kit Delivered",
            "icon": "recycle"
        },
        {
            "title": "Adopt & Plant a Native Tree in Your Ward",
            "category": "Community",
            "description": "The municipality will plant a geo-tagged fruit tree in Ward 4 bearing your personalized digital certificate.",
            "credit_cost": 200.0,
            "value_label": "Geo-Tagged Tree Certificate",
            "icon": "trees"
        },
        {
            "title": "Property Tax 20% Green Citizen Rebate",
            "category": "Tax Rebate",
            "description": "Earn a municipal credit certificate granting 20% waiver on upcoming annual residential property tax.",
            "credit_cost": 800.0,
            "value_label": "20% Tax Waiver Certificate",
            "icon": "landmark"
        }
    ]

    for r in rewards_data:
        db.add(Reward(**r))
    db.commit()

    # 8. Past Reward Redemption for Priya
    rdm = RewardRedemption(
        redemption_code="RDM-2026-0089",
        user_id=users["priya.patel@gmail.com"].id,
        reward_id=1,
        credits_spent=150.0,
        redeemed_at=now - datetime.timedelta(days=3),
        voucher_code="ECO-TAX-WTR-882940",
        status="ACTIVE"
    )
    db.add(rdm)
    db.commit()

    # 9. Active On-Demand Waste Pickup Request from Johnathan Doe
    req1 = WastePickupRequest(
        request_code="REQ-2026-0091",
        user_id=users["john.citizen@gmail.com"].id,
        collector_id=users["alex.collector@ecoloop.org"].id,
        ward="Ward 4 - Green Meadows",
        address="124 Green Valley Road, Apt 4B",
        phone="+1 (555) 234-5678",
        waste_category="Recyclable Plastic",
        estimated_weight_kg=8.0,
        urgency="Immediate (Within 30 mins)",
        notes="3 large bags of segregated clean plastic milk cartons and bottles ready at door.",
        status="DISPATCHED",
        created_at=now - datetime.timedelta(minutes=15)
    )
    db.add(req1)
    db.commit()

    print(">>> Eco Loop Database seeded successfully!")
