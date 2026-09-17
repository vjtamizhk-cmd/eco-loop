// ============================================================
// Firestore Seed Data Initializer (Realistic Scaled Demo Dataset)
// Eco Loop - Smart Waste Management & AI Surveillance Network
// ============================================================

const SEED_WASTE_RATES = {
  "mixed_unsegregated": 0.2,
  "wet_organic_segregated": 1.0,
  "dry_non_recyclable_segregated": 0.6,
  "dry_recyclable_segregated": 2.0,
  "metal_ewaste": 0.0
};

const SEED_FINE_RATES = {
  "Road Dumping": 750.0,
  "Public Littering": 500.0,
  "Non-Segregated Dumping": 400.0,
  "Plastic Burning": 1500.0,
  "Unauthorized Waste Discard": 600.0
};

const SEED_CAMERAS = [
  {
    camera_code: "CAM-W4-01",
    name: "Ward 4 - Market Street Junction",
    ward: "Ward 4 - Green Meadows",
    location_desc: "Intersection of Market St & 3rd Ave",
    latitude: 13.0827,
    longitude: 80.2707,
    status: "operational",
    ai_detection_enabled: true,
    total_violations_detected: 14,
    fault_description: ""
  },
  {
    camera_code: "CAM-W4-02",
    name: "Ward 4 - Central Public Park",
    ward: "Ward 4 - Green Meadows",
    location_desc: "North Gate Boulevard, beside fountain",
    latitude: 13.0878,
    longitude: 80.2785,
    status: "operational",
    ai_detection_enabled: true,
    total_violations_detected: 8,
    fault_description: ""
  },
  {
    camera_code: "CAM-W4-03",
    name: "Ward 4 - Residential Lane 7",
    ward: "Ward 4 - Green Meadows",
    location_desc: "Corner of Oak St & 7th Cross",
    latitude: 13.0765,
    longitude: 80.2642,
    status: "operational",
    ai_detection_enabled: true,
    total_violations_detected: 3,
    fault_description: ""
  },
  {
    camera_code: "CAM-W4-04",
    name: "Ward 4 - Community Dustbin Hub",
    ward: "Ward 4 - Green Meadows",
    location_desc: "Behind Municipal Community Hall",
    latitude: 13.0891,
    longitude: 80.2676,
    status: "damaged",
    ai_detection_enabled: false,
    total_violations_detected: 19,
    fault_description: "Optical sensor glitch: IR illuminator disconnected after storm"
  },
  {
    camera_code: "CAM-W7-01",
    name: "Ward 7 - Tech Park Promenade",
    ward: "Ward 7 - Silicon Heights",
    location_desc: "Silicon Blvd & Cyber Way",
    latitude: 13.0648,
    longitude: 80.2834,
    status: "operational",
    ai_detection_enabled: true,
    total_violations_detected: 22,
    fault_description: ""
  },
  {
    camera_code: "CAM-W7-02",
    name: "Ward 7 - Metro Station Exit 2",
    ward: "Ward 7 - Silicon Heights",
    location_desc: "Metro Pillar 142, Pedestrian Plaza",
    latitude: 13.0475,
    longitude: 80.2824,
    status: "operational",
    ai_detection_enabled: true,
    total_violations_detected: 31,
    fault_description: ""
  },
  {
    camera_code: "CAM-W7-03",
    name: "Ward 7 - Commercial Food Street",
    ward: "Ward 7 - Silicon Heights",
    location_desc: "Opposite Food Court Block C",
    latitude: 13.1012,
    longitude: 80.2917,
    status: "obstructed",
    ai_detection_enabled: false,
    total_violations_detected: 11,
    fault_description: "Overhanging tree branch partially blocking lens frame"
  },
  {
    camera_code: "CAM-W7-04",
    name: "Ward 7 - Outer Ring Flyover Underpass",
    ward: "Ward 7 - Silicon Heights",
    location_desc: "Service Road Underpass km 12",
    latitude: 13.1185,
    longitude: 80.2978,
    status: "operational",
    ai_detection_enabled: true,
    total_violations_detected: 7,
    fault_description: ""
  }
];

const SEED_REWARDS = [
  {
    reward_code: "RWD-WATER-BILL",
    title: "💧 Municipal Water Bill Waiver (₹150 Subsidy)",
    category: "Municipal Utilities",
    description: "Get a direct ₹150 credit waiver deducted from your quarterly municipal water utility bill.",
    credit_cost: 35.0,
    value_label: "₹150 Utility Subsidy",
    icon: "droplet"
  },
  {
    reward_code: "RWD-POWER-BILL",
    title: "⚡ Clean Power & Electricity Rebate (₹200 Off)",
    category: "Municipal Utilities",
    description: "Direct tariff rebate on city solar-grid residential electricity consumption.",
    credit_cost: 50.0,
    value_label: "₹200 Power Bill Discount",
    icon: "zap"
  },
  {
    reward_code: "RWD-SMART-WATCH",
    title: "⌚ Eco-Step Smart Fitness Tracker Watch (₹500 Off)",
    category: "Smart Watches & Tech",
    description: "Digital discount coupon for an eco-friendly solar-powered heart rate & step tracker watch.",
    credit_cost: 75.0,
    value_label: "₹500 Smart Watch Voucher",
    icon: "watch"
  },
  {
    reward_code: "RWD-SOLAR-CHRONO",
    title: "⌚ Solar Pulse Chronograph Watch (₹800 Off Coupon)",
    category: "Smart Watches & Tech",
    description: "Exclusive municipal discount certificate for certified titanium zero-carbon solar watch.",
    credit_cost: 100.0,
    value_label: "₹800 Watch Voucher",
    icon: "clock"
  },
  {
    reward_code: "RWD-METRO-PASS",
    title: "🚌 City Metro & Electric Bus 7-Day Pass",
    category: "Public Transport",
    description: "Unlimited 7-day municipal smart transit card valid on all electric buses and metro lines.",
    credit_cost: 30.0,
    value_label: "7-Day Transit Pass",
    icon: "train"
  },
  {
    reward_code: "RWD-GROCERY-100",
    title: "🛒 ₹100 Zero-Waste Organic Market Coupon",
    category: "Groceries",
    description: "Redeemable at local organic farmers co-ops and zero-single-use packaging bulk groceries.",
    credit_cost: 20.0,
    value_label: "₹100 Organic Shopping",
    icon: "shopping-bag"
  },
  {
    reward_code: "RWD-COMPOST-KIT",
    title: "🏡 Home Kitchen Aerobic Composting Bin (50% Off)",
    category: "Sustainability",
    description: "Complete odor-free kitchen food waste composter with microbial starter brick.",
    credit_cost: 45.0,
    value_label: "50% Off Starter Kit",
    icon: "sprout"
  },
  {
    reward_code: "RWD-TREE-PLANT",
    title: "🌳 Adopt & Geotag an Urban Tree Sapling",
    category: "Green Initiative",
    description: "A native flowering tree planted in your municipal park with digital geotagged certificate.",
    credit_cost: 15.0,
    value_label: "Geotagged Tree Certificate",
    icon: "trees"
  },
  {
    reward_code: "RWD-TAX-REBATE",
    title: "🏛️ 10% Municipal Property Tax Waiver",
    category: "Tax Rebate",
    description: "Official municipal certificate granting 10% concession on annual residential property taxes.",
    credit_cost: 90.0,
    value_label: "10% Tax Concession",
    icon: "landmark"
  }
];

const TRANSIT_REWARDS = [
  {
    reward_code: "RWD-BUS-PASS",
    title: "City Electric Bus Pass",
    category: "Public Transport",
    description: "Unlimited travel on municipal electric buses for 7 consecutive days.",
    credit_cost: 30.0,
    value_label: "7-Day Bus Pass",
    icon: "bus"
  },
  {
    reward_code: "RWD-METRO-PASS",
    title: "City Metro Pass",
    category: "Public Transport",
    description: "Unlimited travel on the city metro network for 7 consecutive days.",
    credit_cost: 30.0,
    value_label: "7-Day Metro Pass",
    icon: "train"
  }
];

const SEED_USERS = [
  {
    uid: "guest_demo_citizen",
    citizen_id: "ECO-CTZ-1001",
    email: "guest.citizen@ecoloop.demo",
    full_name: "Guest Resident (Preview)",
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    phone: "+1 (555) 234-5678",
    address: "124 Green Valley Road, Apt 4B",
    ward: "Ward 4 - Green Meadows",
    role: "citizen",
    qr_token: "ECO-CTZ-1001",
    eco_credits: 25.0,
    is_active: true,
    is_demo: true
  },
  {
    uid: "demo_alex_collector",
    citizen_id: "ECO-COL-2001",
    email: "alex.collector@ecoloop.org",
    full_name: "Alex Turner (Field Collector)",
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    phone: "+1 (555) 987-6543",
    address: "Municipal Sanitation Depot 4",
    ward: "Ward 4 - Green Meadows",
    role: "collector",
    qr_token: "ECO-COL-2001",
    eco_credits: 0.0,
    is_active: true,
    is_demo: true
  },
  {
    uid: "demo_sarah_admin",
    citizen_id: "ECO-ADM-3001",
    email: "sarah.admin@ecoloop.org",
    full_name: "Sarah Jenkins (Ward Officer)",
    avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
    phone: "+1 (555) 111-2222",
    address: "City Hall Municipal Command Center",
    ward: "Citywide Operations",
    role: "admin",
    qr_token: "ECO-ADM-3001",
    eco_credits: 0.0,
    is_active: true,
    is_demo: true
  },
  {
    uid: "demo_director_kumar",
    citizen_id: "ECO-ADM-3002",
    email: "director.kumar@ecoloop.org",
    full_name: "Director Rajesh Kumar (Chief Commissioner)",
    avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    phone: "+1 (555) 999-0000",
    address: "Municipal Corporation HQ",
    ward: "Central Headquarters",
    role: "admin",
    qr_token: "ECO-ADM-3002",
    eco_credits: 0.0,
    is_active: true,
    is_demo: true
  }
];

const SEED_PENALTIES = [
  {
    violation_code: "VIO-2026-1048",
    user_uid: "seed_john_citizen",
    citizen_name: "Johnathan Doe",
    citizen_id: "ECO-CTZ-1001",
    camera_code: "CAM-W4-01",
    camera_name: "Ward 4 - Market Street Junction",
    violation_type: "Illegal Road Dumping",
    location: "Ward 4 - Market St & 3rd Ave",
    fine_amount: 500.0,
    late_fee: 50.0,
    status: "DELAYED",
    evidence_image_url: "/static/images/evidence/road_dumping.jpg",
    evidence_caption: "Optical Detection: Black polythene waste sack dropped on sidewalk curb from moving vehicle.",
    notes: "Overdue by 8 days. Late statutory fee applied.",
    days_overdue: 8,
    created_at_days_ago: 15,
    due_date_days_ago: 8
  },
  {
    violation_code: "VIO-2026-3391",
    user_uid: "seed_john_citizen",
    citizen_name: "Johnathan Doe",
    citizen_id: "ECO-CTZ-1001",
    camera_code: "CAM-W4-02",
    camera_name: "Ward 4 - Central Public Park",
    violation_type: "Public Littering",
    location: "Ward 4 - Central Public Park (North Gate)",
    fine_amount: 250.0,
    late_fee: 0.0,
    status: "UNPAID",
    evidence_image_url: "/static/images/evidence/public_littering.jpg",
    evidence_caption: "AI CCTV Event: Beverage can and plastic packaging dropped on grass lawn.",
    notes: "5 days remaining until due date.",
    days_overdue: 0,
    created_at_days_ago: 2,
    due_date_days_ago: -5
  },
  {
    violation_code: "VIO-2026-7812",
    user_uid: "seed_priya_patel",
    citizen_name: "Priya Patel",
    citizen_id: "ECO-CTZ-1002",
    camera_code: "CAM-W4-01",
    camera_name: "Ward 4 - Market Street Junction",
    violation_type: "Non-Segregated Dumping",
    location: "Ward 4 - 4th Ave & Pine St",
    fine_amount: 400.0,
    late_fee: 0.0,
    status: "PAID",
    payment_method: "UPI",
    payment_ref: "UPI-TXN-88492019",
    evidence_image_url: "/static/images/evidence/mixed_waste.jpg",
    evidence_caption: "AI Detection: Mixed non-segregated waste bin placement.",
    notes: "Settled within 48 hours. Clean record maintained.",
    days_overdue: 0,
    created_at_days_ago: 10,
    due_date_days_ago: 3
  },
  {
    violation_code: "VIO-2026-9901",
    user_uid: "seed_marcus_vance",
    citizen_name: "Marcus Vance",
    citizen_id: "ECO-CTZ-1003",
    camera_code: "CAM-W7-01",
    camera_name: "Ward 7 - Tech Park Promenade",
    violation_type: "Plastic Burning",
    location: "Ward 7 - Silicon Blvd & Cyber Way",
    fine_amount: 1500.0,
    late_fee: 150.0,
    status: "DELAYED",
    evidence_image_url: "/static/images/evidence/plastic_burning.jpg",
    evidence_caption: "Thermal Sensor: Toxic polymer open flame detected behind commercial fence.",
    notes: "Urgent statutory warning notice pending dispatch.",
    days_overdue: 13,
    created_at_days_ago: 20,
    due_date_days_ago: 13
  }
];

const SEED_COLLECTIONS = [
  {
    collection_code: "COL-2026-0012",
    user_uid: "seed_john_citizen",
    citizen_name: "Johnathan Doe",
    citizen_id: "ECO-CTZ-1001",
    collector_uid: "seed_alex_collector",
    collector_name: "Alex Turner",
    ward: "Ward 4 - Green Meadows",
    waste_type: "Recyclable Plastic",
    weight_kg: 2.5,
    rate_per_kg: 10.0,
    credits_awarded: 25.0,
    notes: "Clean segregated plastic bottles and milk cartons.",
    created_at_days_ago: 4
  },
  {
    collection_code: "COL-2026-0019",
    user_uid: "seed_john_citizen",
    citizen_name: "Johnathan Doe",
    citizen_id: "ECO-CTZ-1001",
    collector_uid: "seed_alex_collector",
    collector_name: "Alex Turner",
    ward: "Ward 4 - Green Meadows",
    waste_type: "Paper & Cardboard",
    weight_kg: 4.0,
    rate_per_kg: 8.0,
    credits_awarded: 32.0,
    notes: "Corrugated packaging boxes flattened neatly.",
    created_at_days_ago: 1
  },
  {
    collection_code: "COL-2026-0024",
    user_uid: "seed_priya_patel",
    citizen_name: "Priya Patel",
    citizen_id: "ECO-CTZ-1002",
    collector_uid: "seed_alex_collector",
    collector_name: "Alex Turner",
    ward: "Ward 4 - Green Meadows",
    waste_type: "E-Waste",
    weight_kg: 2.0,
    rate_per_kg: 25.0,
    credits_awarded: 50.0,
    notes: "Old router and charging cables.",
    created_at_days_ago: 2
  }
];

const SEED_PICKUP_REQUESTS = [
  {
    request_code: "REQ-2026-1082",
    user_uid: "seed_priya_patel",
    citizen_name: "Priya Patel",
    citizen_id: "ECO-CTZ-1002",
    collector_uid: "seed_alex_collector",
    collector_name: "Alex Turner",
    ward: "Ward 4 - Green Meadows",
    address: "78 Lotus Avenue, Villa 12",
    phone: "+1 (555) 345-6789",
    waste_category: "E-Waste",
    estimated_weight_kg: 3.5,
    urgency: "Immediate (Within 30 mins)",
    notes: "Old electronics, laptop charger, and batteries kept in box",
    status: "DISPATCHED",
    created_at_days_ago: 0
  },
  {
    request_code: "REQ-2026-1099",
    user_uid: "seed_marcus_vance",
    citizen_name: "Marcus Vance",
    citizen_id: "ECO-CTZ-1003",
    collector_uid: "seed_alex_collector",
    collector_name: "Alex Turner",
    ward: "Ward 7 - Silicon Heights",
    address: "512 Cyber Boulevard, Tower B",
    phone: "+1 (555) 456-7890",
    waste_category: "Paper & Cardboard",
    estimated_weight_kg: 4.0,
    urgency: "Today Afternoon",
    notes: "Office packing boxes stacked in hallway",
    status: "DISPATCHED",
    created_at_days_ago: 0
  }
];

const SEED_TICKETS = [
  {
    ticket_code: "TCK-2026-101",
    camera_code: "CAM-W4-04",
    camera_name: "Ward 4 - Community Dustbin Hub",
    ward: "Ward 4 - Green Meadows",
    issue_category: "Lens Damaged / Glitch",
    description: "Optical sensor glitch: IR illuminator disconnected after storm.",
    priority: "HIGH",
    status: "OPEN",
    created_at_days_ago: 3
  },
  {
    ticket_code: "TCK-2026-102",
    camera_code: "CAM-W7-03",
    camera_name: "Ward 7 - Commercial Food Street",
    ward: "Ward 7 - Silicon Heights",
    issue_category: "Camera Lens Obstructed",
    description: "Overhanging tree branch partially blocking lens frame.",
    priority: "MEDIUM",
    status: "OPEN",
    created_at_days_ago: 1
  }
];

// Seed Firestore Function
async function checkAndSeedFirestore(forceReset = false) {
  try {
    const configRef = db.collection("config").doc("rates");
    const configSnap = await configRef.get();
    const resetHistory = forceReset || !configSnap.exists || configSnap.data().schema_version !== 3;

    if (resetHistory) {
      console.log("🌱 Seeding initial municipal dataset to Firestore...");

      if (resetHistory) {
        // Reset credit history without disturbing cameras, penalties, rewards, or tickets.
        for (const collectionName of ["collections", "redemptions", "pickup_requests"]) {
          const historySnap = await db.collection(collectionName).get();
          const batch = db.batch();
          historySnap.docs.forEach(doc => batch.delete(doc.ref));
          if (!historySnap.empty) await batch.commit();
        }
      }

      // 1. Seed Config Rates
      await configRef.set({
        waste_rates: SEED_WASTE_RATES,
        fine_rates: SEED_FINE_RATES,
        schema_version: 3,
        final_credit_value_inr: 0.15,
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      });

      // 2. Seed Cameras
      for (const cam of SEED_CAMERAS) {
        await db.collection("cameras").doc(cam.camera_code).set({
          ...cam,
          created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      // 4. Seed Personas
      for (const usr of SEED_USERS) {
        await db.collection("users").doc(usr.uid).set({
          id: usr.uid,
          ...usr,
          eco_credits: 0,
          created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      // 5. Seed Penalties
      for (const pen of SEED_PENALTIES) {
        const cDate = new Date();
        cDate.setDate(cDate.getDate() - (pen.created_at_days_ago || 0));
        const dDate = new Date();
        dDate.setDate(dDate.getDate() - (pen.due_date_days_ago || 0));

        await db.collection("penalties").doc(pen.violation_code).set({
          ...pen,
          created_at: firebase.firestore.Timestamp.fromDate(cDate),
          due_date: firebase.firestore.Timestamp.fromDate(dDate)
        });
      }

      // 6. Seed Maintenance Tickets
      for (const tck of SEED_TICKETS) {
        await db.collection("tickets").doc(tck.ticket_code).set({
          ...tck,
          created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      console.log("✅ Firestore seeding completed successfully!");
    }

    const rewardsSnap = await db.collection("rewards").get();
    const deactivateBatch = db.batch();
    rewardsSnap.docs.forEach(doc => deactivateBatch.update(doc.ref, { is_active: false }));
    if (!rewardsSnap.empty) await deactivateBatch.commit();
    for (const rwd of TRANSIT_REWARDS) {
      await db.collection("rewards").doc(rwd.reward_code).set({
        ...rwd,
        is_active: true,
        created_at: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (err) {
    console.warn("Firestore seeding notice (using local seed memory):", err);
  }
}
