# 🌿 Eco Loop - Smart Waste Management & AI Surveillance Platform

Eco Loop is a full-stack smart waste management ecosystem that unites citizens, doorstep waste collectors, and municipal administrators into a closed-loop system.

---

## 🌟 Key Capabilities

### 1. 👤 Citizen Portal & Google Account Sync
- **Google / Gmail Sign-In**: Seamless authentication linking citizen profile, contact info, and municipal ward.
- **Dynamic Eco-Pass QR Card**:
  - Automatically generated high-resolution dynamic QR code containing the citizen's unique cryptographic token and Citizen ID (`ECO-CTZ-XXXX`).
  - Downloadable as PNG or printable for display at the citizen's doorstep.
- **Littering Penalty Tracker**:
  - Automatically receives violations detected by municipal CCTVs (road dumping, public littering, non-segregated dumping, open plastic burning).
  - High-resolution optical CCTV evidence viewer with AI object bounding boxes and timestamps.
  - Built-in payment gateway simulation with instant clearance receipts.
  - Citizen dispute appeal filing system.
- **EcoCredits Wallet & Reward Marketplace**:
  - Earns credits for every kilogram of segregated waste given to collectors.
  - Tier progression: *Bronze Eco-Citizen*, *Silver Eco-Advocate*, *Gold Eco-Warrior*, *Diamond Eco-Guardian*.
  - Redeem accumulated credits for:
    - 💧 Municipal Water Bill Rebates (15% off)
    - 🚌 30-Day City Metro & Green Bus Passes
    - 🛒 Organic Farm Supermarket Vouchers
    - 🪴 Home Compost Starter Kits + Bio-Enzymes
    - 🌳 Geo-tagged fruit tree planting adoption certificates
    - 🏛️ 20% Property Tax Green Rebates

### 2. 🚛 Waste Collector Field Portal
- **Live Camera QR Code Scanner**: Scan citizen Eco-Passes directly using device camera or manual citizen lookup.
- **Dynamic Waste Weighing & Crediting**:
  - Select category (Recyclable Plastic, Organic Wet Waste, Paper & Cardboard, Metal, E-Waste, Glass).
  - Input scale weight (kg) -> System dynamically computes credits -> Instantly transfers EcoCredits to the citizen's balance.
- **Collection Logs & Route Summaries**: Daily and all-time collection records with total kilograms collected.

### 3. 🛡️ Administrator Command Center
- **CCTV Surveillance Network Health**:
  - Interactive Leaflet map displaying real-time camera statuses across municipal wards.
  - Live status indicators: `OPERATIONAL (Green)`, `DAMAGED (Red)`, `OFFLINE (Yellow)`.
  - Camera diagnostics, maintenance ticket dispatcher, and 1-click repair resolution.
- **AI Optical Detection Simulator**:
  - Interactive simulation suite allowing administrators and testers to select any surveillance camera, target a citizen/suspect, pick a violation type, and fire an AI optical detection event.
  - Automatically creates violation codes, attaches evidence snapshots, and allots the penalty to the user in real-time!
- **Penalty Defaulter Watchlist**:
  - Tracks citizens who have unpaid or delayed penalties (> 7 days, > 14 days).
  - Automated late fee calculation engine (+5% late surcharge for each overdue period).
  - 📩 **"Dispatch Statutory Warning Notice"** tool: Generates and dispatches formal municipal notices via simulated SMS and Email alerts.
- **Waste Analytics & Rate Manager**:
  - Real-time Chart.js doughnut chart breaking down city waste composition.
  - Configurable credit-per-kg reward rates for all waste streams.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.12+ (installed)

### 1-Click Launch (Windows)
Double-click `run.bat` or run:
```powershell
.\run.ps1
```

### Manual Start
```bash
# 1. Activate virtual environment
.\.venv\Scripts\activate

# 2. Run database setup & asset generator (if first time)
python app\generate_assets.py

# 3. Launch server
python main.py
```

Open your browser and navigate to: **[http://localhost:8000](http://localhost:8000)**

---

## 🧪 Testing Personas (1-Click Persona Switcher)

| Name | Role | Email | Highlights |
| :--- | :--- | :--- | :--- |
| **Johnathan Doe** | Citizen | `john.citizen@gmail.com` | Has 340 EcoCredits, 1 Overdue Penalty (Road Dumping), 1 Active Unpaid Penalty |
| **Priya Patel** | Citizen | `priya.patel@gmail.com` | Has 620 EcoCredits, 1 Settled/Paid Penalty, 1 Active Redeemed Voucher |
| **Alex Turner** | Collector | `alex.collector@ecoloop.org` | Lead field collector with QR scanning and credit awarding tools |
| **Sarah Jenkins** | Administrator | `sarah.admin@ecoloop.gov` | Ward 4 municipal officer overseeing CCTV health and penalty defaulters |
| **Director Kumar** | Super Admin | `director.kumar@ecoloop.gov` | Municipal commissioner with city-wide oversight |
