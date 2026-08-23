import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient

# Ensure test DB is clean
os.environ["ECO_LOOP_DB"] = "test_ecoloop.db"

from main import app
from app.database import Base, engine, SessionLocal
from app.seed_data import seed_database
from app.models import User, CCTVCamera, Penalty, WasteCollection, Reward

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    # Re-create tables and seed
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("test_ecoloop.db"):
        try:
            os.remove("test_ecoloop.db")
        except Exception:
            pass

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_list_users():
    response = client.get("/api/auth/users")
    assert response.status_code == 200
    users = response.json()
    assert len(users) >= 4
    emails = [u["email"] for u in users]
    assert "john.citizen@gmail.com" in emails
    assert "alex.collector@ecoloop.org" in emails
    assert "sarah.admin@ecoloop.gov" in emails

def test_google_login_new_user():
    payload = {
        "name": "Ananya Sharma",
        "email": "ananya.sharma@gmail.com",
        "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"
    }
    response = client.post("/api/auth/google-login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "ananya.sharma@gmail.com"
    assert data["citizen_id"].startswith("ECO-CTZ-")
    assert data["qr_token"].startswith("TOKEN-CTZ-")
    assert data["eco_credits"] == 50.0  # Welcome bonus

def test_get_citizen_qr_code():
    # User 1 is Johnathan Doe
    response = client.get("/api/auth/user/1/qr-code")
    assert response.status_code == 200
    data = response.json()
    assert data["citizen_id"] == "ECO-CTZ-1001"
    assert "qr_image" in data
    assert data["qr_image"].startswith("data:image/png;base64,")

def test_citizen_dashboard():
    response = client.get("/api/citizen/1/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["citizen_id"] == "ECO-CTZ-1001"
    assert "penalties" in data
    assert "metrics" in data
    assert data["metrics"]["unpaid_penalties_count"] >= 1

def test_waste_collection_and_credit_award():
    # Collector logs 10 kg of Recyclable Plastic (15 cr/kg) for John (User 1)
    collector = client.get("/api/auth/users").json()[3]  # Alex Turner
    
    # Get John's initial credits
    john_initial = client.get("/api/auth/user/1").json()["eco_credits"]

    payload = {
        "citizen_qr_or_id": "ECO-CTZ-1001",
        "collector_id": collector["id"],
        "waste_type": "Recyclable Plastic",
        "weight_kg": 10.0,
        "notes": "Segregated clean plastic containers"
    }
    response = client.post("/api/collector/collect", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["collection"]["credits_awarded"] == 150.0  # 10 * 15

    # Check updated balance
    john_after = client.get("/api/auth/user/1").json()["eco_credits"]
    assert round(john_after - john_initial, 1) == 150.0

def test_reward_redemption():
    # Priya Patel (User 2) has 620 credits
    priya = client.get("/api/auth/user/2").json()
    initial_credits = priya["eco_credits"]

    # Redeem 15% Water bill rebate (Cost: 150 credits)
    response = client.post(f"/api/citizen/rewards/redeem?user_id={priya['id']}", json={"reward_id": 1})
    assert response.status_code == 200
    rdm = response.json()
    assert rdm["credits_spent"] == 150.0
    assert rdm["voucher_code"].startswith("ECO-TAX-")

    # Verify balance was deducted
    priya_after = client.get("/api/auth/user/2").json()
    assert round(initial_credits - priya_after["eco_credits"], 1) == 150.0

def test_pay_penalty():
    # Find an unpaid penalty for John (User 1)
    pens = client.get("/api/citizen/1/penalties").json()
    unpaid = next(p for p in pens if p["status"] in ["UNPAID", "DELAYED"])
    
    pay_response = client.post(f"/api/citizen/penalties/{unpaid['id']}/pay", json={"payment_method": "CARD"})
    assert pay_response.status_code == 200
    res = pay_response.json()
    assert res["success"] is True
    assert res["penalty"]["status"] == "PAID"
    assert res["penalty"]["payment_ref"].startswith("TXN-")

def test_cctv_maintenance_and_reporting():
    # Report issue on CAM-W4-01 (Camera 1)
    payload = {
        "camera_id": 1,
        "issue_category": "Camera Lens Obstructed",
        "description": "Tree branch hanging over optical sensor",
        "priority": "HIGH"
    }
    rep_res = client.post("/api/admin/cameras/1/report-issue", json=payload)
    assert rep_res.status_code == 200
    ticket = rep_res.json()
    assert ticket["status"] == "OPEN"

    # Verify camera status is now obstructed/damaged
    cams = client.get("/api/admin/cameras").json()
    cam1 = next(c for c in cams if c["id"] == 1)
    assert cam1["status"] in ["damaged", "obstructed"]

    # Resolve ticket
    res_ticket = client.post(f"/api/admin/tickets/{ticket['id']}/resolve", json={"technician_notes": "Branch trimmed."})
    assert res_ticket.status_code == 200
    
    # Camera should be restored to operational
    cam1_restored = next(c for c in client.get("/api/admin/cameras").json() if c["id"] == 1)
    assert cam1_restored["status"] == "operational"

def test_ai_detection_simulation():
    # Simulate AI detection on Camera 1 for User 1
    payload = {
        "camera_id": 1,
        "user_id": 1,
        "violation_type": "Road Dumping",
        "custom_notes": "Automated test optical AI trigger"
    }
    response = client.post("/api/detection/simulate", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["penalty"]["violation_type"] == "Road Dumping"
    assert res["penalty"]["fine_amount"] == 750.0
    assert res["penalty"]["status"] == "UNPAID"

def test_admin_defaulters_and_warning():
    response = client.get("/api/admin/defaulters")
    assert response.status_code == 200
    defaulters = response.json()
    assert len(defaulters) >= 1
    
    # Dispatch warning notice
    d_id = defaulters[0]["id"]
    warn_res = client.post(f"/api/admin/defaulters/{d_id}/send-notice")
    assert warn_res.status_code == 200
    warn_data = warn_res.json()
    assert warn_data["success"] is True
    assert "warning_text" in warn_data["notice"]

def test_citizen_call_waste_collector_and_accept():
    # 1. Citizen creates pickup request
    payload = {
        "user_id": 1,
        "waste_category": "Recyclable Plastic",
        "estimated_weight_kg": 6.0,
        "urgency": "Immediate (Within 30 mins)",
        "address": "124 Green Valley Road, Apt 4B",
        "phone": "+1 (555) 234-5678",
        "notes": "2 bags of plastic bottles ready at doorstep"
    }
    create_res = client.post("/api/citizen/pickup-request", json=payload)
    assert create_res.status_code == 200
    req = create_res.json()["pickup_request"]
    assert req["status"] == "DISPATCHED"
    assert req["request_code"].startswith("REQ-")

    # 2. Collector views queue
    queue_res = client.get("/api/collector/4/pickup-requests")
    assert queue_res.status_code == 200
    queue = queue_res.json()
    assert len(queue) >= 1
    target_req = next(q for q in queue if q["id"] == req["id"])
    assert target_req["citizen_name"] == "Johnathan Doe"

    # 3. Collector accepts pickup call
    accept_res = client.post(f"/api/collector/pickup-request/{req['id']}/accept", json={"collector_id": 4})
    assert accept_res.status_code == 200
    assert accept_res.json()["success"] is True

