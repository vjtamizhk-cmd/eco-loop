# Walkthrough - Eco Loop (Strict RBAC & On-Demand Waste Pickup)

**Eco Loop** has been updated with **Strict Role-Based Access Control (RBAC)** and a real-time **Citizen On-Demand Waste Pickup Calling System**.

---

## 🔒 Strict Role-Based Access Control (RBAC)

1. **Citizen Accounts (e.g. Johnathan Doe, Priya Patel, Google Logins)**:
   - Access is strictly locked to the **Citizen Portal ONLY**.
   - Collector and Administrator interfaces are completely hidden and inaccessible.
   - Citizens can view their Eco-Pass QR, pay penalties, redeem EcoCredits, and call doorstep collectors.
2. **Collector Accounts (e.g. Alex Turner)**:
   - Access is strictly locked to the **Collector Field Scanner ONLY**.
   - Receives incoming citizen doorstep pickup calls in real-time, scans citizen QR codes, weighs segregated waste, and transfers EcoCredits.
3. **Administrator Accounts (e.g. Sarah Jenkins, Director Kumar)**:
   - Access is strictly locked to the **Administrator Command Center ONLY**.
   - Monitors CCTV health on interactive maps, triggers AI detection simulations, and tracks penalty defaulters.

---

## 📞 "Call for Waste Collector" (On-Demand Doorstep Pickup)

1. **Citizen Flow**:
   - In the Citizen Portal, click **"📞 Call Waste Collector Now"**.
   - Choose waste category (*Recyclable Plastic*, *Organic Wet Waste*, *Paper*, *E-Waste*, *Metal*, *Glass*), estimated weight (e.g. `5.0 kg`), urgency (*Immediate within 30 mins*, *Today Afternoon*, *Scheduled*), and doorstep instructions.
   - Click **Confirm & Dispatch Collector**.
   - An **Active Pickup Live Status Tracker** appears on the citizen's dashboard showing real-time dispatch status (`DISPATCHED 🟡` ➔ `COLLECTOR EN ROUTE 🟢` ➔ `COMPLETED 🔵`) with the assigned collector's name and a cancel button.

2. **Collector Flow**:
   - The field collector logged into that ward receives the call in their **"Citizen On-Demand Pickup Calls"** live queue.
   - Collector sees the resident's name, exact address, contact phone, waste type, and urgency.
   - Clicking **"Accept & Weigh"**:
     - Automatically updates request status to `EN ROUTE`.
     - Pre-selects the citizen in the weighing scale form with the category and estimated weight pre-filled.
     - Collector confirms the measured scale weight, clicks **Confirm Handover**, and credits the citizen's wallet immediately!

---

## 🧪 Automated Test Verification

All 12 automated test suites in [`tests/test_api.py`](file:///c:/Users/Peran/OneDrive/Desktop/Eco%20Loop/tests/test_api.py) passed with **100% success rate**:

```text
tests/test_api.py::test_health_check PASSED                              [  8%]
tests/test_api.py::test_list_users PASSED                                [ 16%]
tests/test_api.py::test_google_login_new_user PASSED                     [ 25%]
tests/test_api.py::test_get_citizen_qr_code PASSED                       [ 33%]
tests/test_api.py::test_citizen_dashboard PASSED                         [ 41%]
tests/test_api.py::test_waste_collection_and_credit_award PASSED         [ 50%]
tests/test_api.py::test_reward_redemption PASSED                         [ 58%]
tests/test_api.py::test_pay_penalty PASSED                               [ 66%]
tests/test_api.py::test_cctv_maintenance_and_reporting PASSED            [ 75%]
tests/test_api.py::test_ai_detection_simulation PASSED                   [ 83%]
tests/test_api.py::test_admin_defaulters_and_warning PASSED              [ 91%]
tests/test_api.py::test_citizen_call_waste_collector_and_accept PASSED   [100%]

======================= 12 passed in 1.69s =======================
```

---

## 🌐 Localhost Server is Live

The server is active and running in the background:

👉 **[http://localhost:8000](http://localhost:8000)**
