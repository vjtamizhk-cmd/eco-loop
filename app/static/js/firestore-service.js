// ============================================================
// Firestore Data Access Layer (Client Service with Resilient Fallbacks)
// Eco Loop - Smart Waste Management Platform
// ============================================================

const FirestoreService = {

  // ------------------------------------------------------------
  // Configuration & Rates
  // ------------------------------------------------------------
  async getRates() {
    try {
      const snap = await db.collection("config").doc("rates").get();
      if (snap.exists) {
        return snap.data();
      }
    } catch (e) {
      console.warn("Rates fetch fallback:", e);
    }
    return {
      waste_rates: typeof SEED_WASTE_RATES !== 'undefined' ? SEED_WASTE_RATES : {},
      fine_rates: typeof SEED_FINE_RATES !== 'undefined' ? SEED_FINE_RATES : {}
    };
  },

  async getCurrentCreditValue() {
    try {
      const snap = await db.collection("config").doc("rates").get();
      if (snap.exists && Number.isFinite(Number(snap.data().final_credit_value_inr))) {
        return Number(snap.data().final_credit_value_inr);
      }
    } catch (e) {
      console.warn("Credit value fetch fallback:", e);
    }
    return 0.15;
  },

  // ------------------------------------------------------------
  // User & Citizen Operations
  // ------------------------------------------------------------
  async getAllUsers() {
    try {
      const snap = await db.collection("users").get();
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (e) {
      console.warn("Users fetch fallback:", e);
    }
    return typeof SEED_USERS !== 'undefined' ? SEED_USERS : [];
  },

  maskEmail(email) {
    if (!email || typeof email !== 'string') return "🔒 Protected Citizen Profile";
    const parts = email.split("@");
    if (parts.length !== 2) return "🔒 Protected";
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return `${name[0]}***@${domain}`;
    return `${name.slice(0, 2)}***@${domain}`;
  },

  maskPhone(phone) {
    if (!phone || typeof phone !== 'string') return "🔒 Protected";
    if (phone.length <= 6) return "🔒 Protected";
    return phone.slice(0, 6) + "****" + phone.slice(-2);
  },

  async getUserByIdOrUid(identifier) {
    if (!identifier) return null;
    let clean = String(identifier).trim();

    // 0. Parse JSON if encoded as JSON string (e.g. from custom QR scanners)
    if (clean.startsWith("{") && clean.endsWith("}")) {
      try {
        const parsed = JSON.parse(clean);
        if (parsed.citizen_id) clean = String(parsed.citizen_id).trim();
        else if (parsed.uid) clean = String(parsed.uid).trim();
      } catch (e) {}
    }

    // Strip common prefixes
    if (clean.toUpperCase().startsWith("ECO:")) {
      clean = clean.substring(4).trim();
    }

    try {
      // 1. Check direct doc ID / UID
      let snap = await db.collection("users").doc(clean).get();
      if (snap.exists) return { id: snap.id, ...snap.data() };

      // 2. Check by exact citizen_id
      let q = await db.collection("users").where("citizen_id", "==", clean).limit(1).get();
      if (!q.empty) return { id: q.docs[0].id, ...q.docs[0].data() };

      // 2b. Check by uppercase citizen_id
      q = await db.collection("users").where("citizen_id", "==", clean.toUpperCase()).limit(1).get();
      if (!q.empty) return { id: q.docs[0].id, ...q.docs[0].data() };

      // 3. Check by qr_token
      q = await db.collection("users").where("qr_token", "==", clean).limit(1).get();
      if (!q.empty) return { id: q.docs[0].id, ...q.docs[0].data() };

      // 4. Check by email
      q = await db.collection("users").where("email", "==", clean.toLowerCase()).limit(1).get();
      if (!q.empty) return { id: q.docs[0].id, ...q.docs[0].data() };

      // 5. In-memory check across all users in collection
      const allUsers = await this.getAllUsers();
      const found = allUsers.find(u =>
        (u.citizen_id && u.citizen_id.toUpperCase() === clean.toUpperCase()) ||
        (u.uid && u.uid === clean) ||
        (u.id && u.id === clean) ||
        (u.qr_token && u.qr_token.toUpperCase() === clean.toUpperCase()) ||
        (u.email && u.email.toLowerCase() === clean.toLowerCase())
      );
      if (found) return found;

    } catch (e) {
      console.warn("getUserByIdOrUid Firestore error:", e);
    }

    // Fallback to local SEED_USERS
    if (typeof SEED_USERS !== 'undefined') {
      return SEED_USERS.find(u => 
        (u.citizen_id && u.citizen_id.toUpperCase() === clean.toUpperCase()) ||
        (u.uid && u.uid === clean) ||
        (u.qr_token && u.qr_token.toUpperCase() === clean.toUpperCase()) ||
        (u.email && u.email.toLowerCase() === clean.toLowerCase())
      ) || null;
    }
    return null;
  },

  async getCitizenDashboard(user) {
    const uid = user.uid || user.id;
    let penalties = [];
    let collections = [];
    let redemptions = [];

    try {
      // Fetch user penalties
      const penaltiesSnap = await db.collection("penalties")
        .where("user_uid", "==", uid)
        .get();
      penalties = penaltiesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Fetch user collections
      const collectionsSnap = await db.collection("collections")
        .where("user_uid", "==", uid)
        .get();
      collections = collectionsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.collected_at?.toMillis?.() || 0) - (a.collected_at?.toMillis?.() || 0));

      // Fetch user redemptions
      const redemptionsSnap = await db.collection("redemptions")
        .where("user_uid", "==", uid)
        .get();
      redemptions = redemptionsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.redeemed_at?.toMillis?.() || 0) - (a.redeemed_at?.toMillis?.() || 0));
    } catch (e) {
      console.warn("Citizen dashboard Firestore fallback:", e);
    }

    // If Firestore returned empty and user is a seed user, provide seed fallback
    if (penalties.length === 0 && typeof SEED_PENALTIES !== 'undefined') {
      penalties = SEED_PENALTIES.filter(p => p.user_uid === uid || p.citizen_id === user.citizen_id);
    }
    // Calculate metrics
    let totalWasteKg = 0;
    collections.forEach(c => { totalWasteKg += (c.weight_kg || 0); });

    let totalFinesDue = 0;
    let unpaidCount = 0;
    penalties.forEach(p => {
      if (p.status === "UNPAID" || p.status === "DELAYED") {
        totalFinesDue += (p.fine_amount || 0) + (p.late_fee || 0);
        unpaidCount++;
      }
    });

    const co2OffsetKg = +(totalWasteKg * 1.85).toFixed(1);

    // QR Image: Encode clean standardized Citizen ID for reliable optical scanning
    const qrData = user.citizen_id || user.qr_token || user.uid;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}&color=022c22&bgcolor=ffffff&margin=8`;

    return {
      user: {
        ...user
      },
      metrics: {
        total_waste_recycled_kg: +totalWasteKg.toFixed(1),
        co2_offset_kg: co2OffsetKg,
        unpaid_penalties_count: unpaidCount,
        total_fines_due: totalFinesDue
      },
      qr_image: qrImageUrl,
      penalties: penalties,
      recent_collections: collections.slice(0, 10),
      redemptions: redemptions
    };
  },

  // ------------------------------------------------------------
  // Citizen On-Demand Pickup Requests
  // ------------------------------------------------------------
  async createPickupRequest(user, data) {
    const requestCode = `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRequest = {
      request_code: requestCode,
      user_uid: user.uid || user.id,
      citizen_name: user.full_name || "Resident",
      citizen_id: user.citizen_id || "ECO-CTZ-1001",
      collector_uid: null,
      collector_name: "Ward 4 Squad",
      ward: user.ward || "Ward 4 - Green Meadows",
      address: data.address || user.address || "124 Green Valley Road",
      phone: data.phone || user.phone || "+1 (555) 234-5678",
      waste_category: data.waste_category || "Recyclable Plastic",
      estimated_weight_kg: parseFloat(data.estimated_weight_kg) || 5.0,
      urgency: data.urgency || "Immediate (Within 30 mins)",
      notes: data.notes || "",
      status: "DISPATCHED",
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection("pickup_requests").add(newRequest);
    return { id: docRef.id, ...newRequest };
  },

  async getCitizenPickupRequests(userUid) {
    try {
      const snap = await db.collection("pickup_requests")
        .where("user_uid", "==", userUid)
        .get();
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0));
      }
    } catch (e) {
      console.warn("getCitizenPickupRequests fallback:", e);
    }
    if (typeof SEED_PICKUP_REQUESTS !== 'undefined') {
      return SEED_PICKUP_REQUESTS.filter(r => r.user_uid === userUid);
    }
    return [];
  },

  async cancelPickupRequest(requestId) {
    try {
      await db.collection("pickup_requests").doc(requestId).update({
        status: "CANCELLED",
        cancelled_at: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.warn("Cancel pickup Firestore error:", e);
    }
    return { success: true };
  },

  subscribeToUserDoc(userUid, callback) {
    try {
      return db.collection("users").doc(userUid)
        .onSnapshot((doc) => {
          if (doc.exists) {
            callback({ id: doc.id, ...doc.data() });
          }
        }, err => console.warn("User doc listener error:", err));
    } catch (e) {
      console.warn("User subscription error:", e);
      return () => {};
    }
  },

  subscribeToCitizenCollections(userUid, callback) {
    try {
      return db.collection("collections")
        .where("user_uid", "==", userUid)
        .onSnapshot((snap) => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.collected_at?.toMillis?.() || 0) - (a.collected_at?.toMillis?.() || 0));
          callback(list);
        }, err => console.warn("Collections listener error:", err));
    } catch (e) {
      console.warn("Collections subscription error:", e);
      return () => {};
    }
  },

  subscribeToCitizenPickups(userUid, callback) {
    try {
      return db.collection("pickup_requests")
        .where("user_uid", "==", userUid)
        .onSnapshot((snap) => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0));
          callback(list);
        }, err => {
          console.warn("Pickup listener error, using fallback:", err);
          if (typeof SEED_PICKUP_REQUESTS !== 'undefined') {
            callback(SEED_PICKUP_REQUESTS.filter(r => r.user_uid === userUid));
          }
        });
    } catch (e) {
      console.warn("Subscription error:", e);
      return () => {};
    }
  },

  // ------------------------------------------------------------
  // Penalties, Disputes, & Payment
  // ------------------------------------------------------------
  async payPenalty(penaltyId, paymentMethod = "UPI") {
    const paymentRef = `${paymentMethod.toUpperCase()}-TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;
    try {
      const penRef = db.collection("penalties").doc(penaltyId);
      await penRef.update({
        status: "PAID",
        paid_at: firebase.firestore.FieldValue.serverTimestamp(),
        payment_method: paymentMethod,
        payment_ref: paymentRef,
        late_fee: 0
      });
      const updated = await penRef.get();
      return { success: true, penalty: { id: updated.id, ...updated.data() } };
    } catch (e) {
      console.warn("payPenalty fallback:", e);
      return { success: true, penalty: { id: penaltyId, status: "PAID", payment_ref: paymentRef } };
    }
  },

  async disputePenalty(penaltyId, reason) {
    try {
      const penRef = db.collection("penalties").doc(penaltyId);
      await penRef.update({
        status: "DISPUTED",
        dispute_reason: reason,
        disputed_at: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.warn("disputePenalty fallback:", e);
    }
    return { success: true };
  },

  // ------------------------------------------------------------
  // Rewards Catalog & Redemption
  // ------------------------------------------------------------
  async getRewardsCatalog() {
    try {
      const snap = await db.collection("rewards").where("is_active", "==", true).get();
      if (!snap.empty) {
        const rewards = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(reward => /bus|metro/i.test(`${reward.reward_code} ${reward.title}`));
        const metro = rewards.find(reward => /metro/i.test(`${reward.reward_code} ${reward.title}`));
        const bus = rewards.find(reward => /bus/i.test(`${reward.reward_code} ${reward.title}`));
        const makePass = (source, type, icon) => ({
          ...(source || {}),
          id: source?.id || `RWD-${type.toUpperCase()}-PASS`,
          reward_code: `RWD-${type.toUpperCase()}-PASS`,
          title: `City ${type} Pass`,
          category: 'Public Transport',
          description: `Unlimited travel on the city ${type.toLowerCase()} network for 30 consecutive days.`,
          value_label: `30-Day ${type} Pass`,
          icon
        });
        return [makePass(bus, 'Bus', 'bus'), makePass(metro, 'Metro', 'train')];
      }
    } catch (e) {
      console.warn("Rewards fetch fallback:", e);
    }
    return typeof TRANSIT_REWARDS !== 'undefined'
      ? TRANSIT_REWARDS.map(reward => ({ id: reward.reward_code, ...reward }))
      : [];
  },

  async redeemReward(user, rewardId) {
    const voucherCode = `ECO-RWD-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      const userRef = db.collection("users").doc(user.uid || user.id);
      const rewardRef = db.collection("rewards").doc(rewardId);

      await db.runTransaction(async (transaction) => {
        const userSnap = await transaction.get(userRef);
        const rewardSnap = await transaction.get(rewardRef);

        const userData = userSnap.exists ? userSnap.data() : user;
        const rewardData = rewardSnap.exists ? rewardSnap.data() : { title: "Municipal Reward", category: "Benefit", credit_cost: 100 };

        const newCredits = Math.max(0, Math.round(((userData.eco_credits || user.eco_credits || 0) - rewardData.credit_cost) * 100) / 100);
        if (userSnap.exists) {
          transaction.update(userRef, { eco_credits: newCredits });
        }

        const redemptionRef = db.collection("redemptions").doc();
        transaction.set(redemptionRef, {
          redemption_code: `RDM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          user_uid: user.uid || user.id,
          reward_id: rewardId,
          reward_title: rewardData.title,
          reward_category: rewardData.category,
          credits_spent: rewardData.credit_cost,
          voucher_code: voucherCode,
          status: "ACTIVE",
          redeemed_at: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
    } catch (e) {
      console.warn("redeemReward transaction fallback:", e);
    }

    const currentBal = user.eco_credits || 0;
    const newBal = Math.max(0, currentBal - 100);
    return { success: true, voucher_code: voucherCode, new_balance: newBal };
  },

  // ------------------------------------------------------------
  // Collector Services
  // ------------------------------------------------------------
  async getCollectorDashboard(collector) {
    const uid = collector.uid || collector.id;
    let allCollections = [];

    try {
      const colSnap = await db.collection("collections")
        .where("collector_uid", "==", uid)
        .get();
      allCollections = colSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.collected_at?.toMillis?.() || 0) - (a.collected_at?.toMillis?.() || 0));
    } catch (e) {
      console.warn("Collector dashboard fallback:", e);
    }

    let todayKg = 0;
    let todayCredits = 0;
    let todayCount = 0;
    let allTimeKg = 0;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    allCollections.forEach(c => {
      const kg = c.weight_kg || 0;
      const cr = c.credits_awarded || 0;
      allTimeKg += kg;

      const cDate = c.collected_at?.toDate ? c.collected_at.toDate() : new Date(c.collected_at || Date.now());
      if (cDate >= startOfToday) {
        todayKg += kg;
        todayCredits += cr;
        todayCount++;
      }
    });

    return {
      stats: {
        today_total_kg: +todayKg.toFixed(1),
        today_credits_distributed: +todayCredits.toFixed(1),
        today_collections_count: todayCount,
        all_time_kg: +allTimeKg.toFixed(1)
      },
      recent_logs: allCollections.slice(0, 25)
    };
  },

  async getCollectorPickupRequests() {
    try {
      const snap = await db.collection("pickup_requests")
        .where("status", "in", ["DISPATCHED", "ACCEPTED", "ARRIVED"])
        .get();
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0));
      }
    } catch (e) {
      console.warn("Collector queue fallback:", e);
    }
    return typeof SEED_PICKUP_REQUESTS !== 'undefined' ? SEED_PICKUP_REQUESTS : [];
  },

  subscribeToCollectorQueue(callback) {
    try {
      return db.collection("pickup_requests")
        .where("status", "in", ["DISPATCHED", "ACCEPTED", "ARRIVED"])
        .onSnapshot((snap) => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0));
          callback(list);
        }, err => {
          console.warn("Collector queue listener error, using fallback:", err);
          if (typeof SEED_PICKUP_REQUESTS !== 'undefined') {
            callback(SEED_PICKUP_REQUESTS);
          }
        });
    } catch (e) {
      console.warn("Subscription error:", e);
      return () => {};
    }
  },

  async acceptPickupRequest(requestId, collector) {
    try {
      await db.collection("pickup_requests").doc(requestId).update({
        status: "ACCEPTED",
        collector_uid: collector.uid || collector.id,
        collector_name: collector.full_name || "Alex Turner",
        accepted_at: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.warn("acceptPickupRequest fallback:", e);
    }
    return { success: true };
  },

  async markCollectorArrived(requestId) {
    try {
      await db.collection("pickup_requests").doc(requestId).update({
        status: "ARRIVED",
        arrived_at: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.warn("markCollectorArrived fallback:", e);
    }
    return { success: true };
  },

  async recordWasteCollection(collector, citizenIdentifier, wasteType, weightKg, notes = "") {
    if (weightKg <= 0) throw new Error("Measured weight must be greater than 0 kg");

    const citizen = await this.getUserByIdOrUid(citizenIdentifier);
    if (!citizen) throw new Error(`Citizen not found for code: "${citizenIdentifier}". Please re-scan QR code or select a citizen.`);

    const rates = await this.getRates();
    const ratePerKg = rates.waste_rates[wasteType] || 10.0;
    const creditsAwarded = Math.round(weightKg * ratePerKg * 100) / 100;

    const collectionCode = `COL-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const citizenDocId = citizen.uid || citizen.id;

    const collectionData = {
      collection_code: collectionCode,
      user_uid: citizenDocId,
      citizen_name: citizen.full_name || "Citizen",
      citizen_id: citizen.citizen_id || citizenIdentifier,
      collector_uid: collector.uid || collector.id || "collector_alex",
      collector_name: collector.full_name || "Alex Turner",
      ward: citizen.ward || "Ward 4",
      waste_type: wasteType,
      weight_kg: weightKg,
      rate_per_kg: ratePerKg,
      credits_awarded: creditsAwarded,
      notes: notes,
      collected_at: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      // 1. Create collection record doc in Firestore
      await db.collection("collections").doc(collectionCode).set(collectionData);

      // 2. Award credits to citizen profile in Firestore (merge: true guarantees update)
      const citizenRef = db.collection("users").doc(citizenDocId);
      await citizenRef.set({
        eco_credits: firebase.firestore.FieldValue.increment(creditsAwarded)
      }, { merge: true });

      // 3. Auto-complete any active pickup requests for this citizen
      const activePickupsSnap = await db.collection("pickup_requests")
        .where("user_uid", "==", citizenDocId)
        .where("status", "in", ["DISPATCHED", "ACCEPTED", "ARRIVED"])
        .get();

      if (!activePickupsSnap.empty) {
        const batch = db.batch();
        activePickupsSnap.docs.forEach(doc => {
          batch.update(doc.ref, {
            status: "COMPLETED",
            completed_at: firebase.firestore.FieldValue.serverTimestamp(),
            actual_weight_kg: weightKg,
            credits_awarded: creditsAwarded,
            collector_uid: collector.uid || collector.id || "collector_alex",
            collector_name: collector.full_name || "Alex Turner"
          });
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn("recordWasteCollection Firestore sync error:", e);
    }

    // Update in-memory citizen credit balance
    citizen.eco_credits = (citizen.eco_credits || 0) + creditsAwarded;

    return {
      success: true,
      collection: collectionData,
      citizen: citizen,
      credits_awarded: creditsAwarded,
      citizen_new_credits: citizen.eco_credits
    };
  },

  // ------------------------------------------------------------
  // Administrator Command Center
  // ------------------------------------------------------------
  async getCameras() {
    try {
      const snap = await db.collection("cameras").get();
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (e) {
      console.warn("getCameras fallback:", e);
    }
    return typeof SEED_CAMERAS !== 'undefined' ? SEED_CAMERAS : [];
  },

  async updateCameraStatus(cameraCode, status, faultDescription = "") {
    try {
      await db.collection("cameras").doc(cameraCode).update({
        status: status,
        fault_description: faultDescription,
        last_ping: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.warn("updateCameraStatus fallback:", e);
    }
    return { success: true };
  },

  async reportCameraIssue(cameraCode, cameraName, ward, issueCategory, description, priority) {
    const ticketCode = `TCK-2026-${Math.floor(100 + Math.random() * 900)}`;

    try {
      await db.collection("tickets").doc(ticketCode).set({
        ticket_code: ticketCode,
        camera_code: cameraCode,
        camera_name: cameraName,
        ward: ward,
        issue_category: issueCategory,
        description: description,
        priority: priority,
        status: "OPEN",
        created_at: firebase.firestore.FieldValue.serverTimestamp()
      });

      const newStatus = issueCategory.includes("Obstruct") ? "obstructed" : "damaged";
      await this.updateCameraStatus(cameraCode, newStatus, description);
    } catch (e) {
      console.warn("reportCameraIssue fallback:", e);
    }

    return { success: true, ticket_code: ticketCode };
  },

  async reportCommunityIssue(reporter, data) {
    const ticketCode = `TCK-2026-${Math.floor(100 + Math.random() * 900)}`;
    const ticketDoc = {
      ticket_code: ticketCode,
      camera_code: data.camera_code || "CAM-GENERAL",
      camera_name: data.camera_name || "Community Reported Issue",
      ward: data.ward || reporter?.ward || "Ward 4 - Green Meadows",
      reported_by_name: reporter?.full_name || "Resident Citizen",
      reported_by_id: reporter?.citizen_id || "ECO-CTZ-1001",
      issue_category: data.issue_category,
      problem_title: data.problem_title || data.issue_category,
      description: data.description || "Reported via resident community portal.",
      location_landmark: data.location_landmark || data.ward || "Ward 4",
      priority: data.priority || "MEDIUM",
      status: "OPEN",
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      await db.collection("tickets").doc(ticketCode).set(ticketDoc);
      if (data.camera_code && data.camera_code !== "CAM-GENERAL") {
        const newStatus = data.issue_category.toLowerCase().includes("obstruct") ? "obstructed" : "damaged";
        await this.updateCameraStatus(data.camera_code, newStatus, data.description);
      }
    } catch (e) {
      console.warn("reportCommunityIssue fallback:", e);
    }

    return { success: true, ticket: ticketDoc };
  },

  async resolveTicket(ticketId, cameraCode, technicianNotes = "") {
    try {
      await db.collection("tickets").doc(ticketId).update({
        status: "RESOLVED",
        technician_notes: technicianNotes,
        resolved_at: firebase.firestore.FieldValue.serverTimestamp()
      });

      if (cameraCode) {
        await this.updateCameraStatus(cameraCode, "operational", "");
      }
    } catch (e) {
      console.warn("resolveTicket fallback:", e);
    }
    return { success: true };
  },

  async getAdminDashboard() {
    let cameras = [];
    let allPenalties = [];
    let allCollections = [];
    let allTickets = [];

    try {
      cameras = await this.getCameras();

      const penaltiesSnap = await db.collection("penalties").get();
      allPenalties = penaltiesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0));

      const collectionsSnap = await db.collection("collections").get();
      allCollections = collectionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const ticketsSnap = await db.collection("tickets").get();
      allTickets = ticketsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn("Admin dashboard fallback:", e);
    }

    if (cameras.length === 0 && typeof SEED_CAMERAS !== 'undefined') cameras = SEED_CAMERAS;
    if (allPenalties.length === 0 && typeof SEED_PENALTIES !== 'undefined') allPenalties = SEED_PENALTIES;
    // Camera Stats
    let operationalCams = 0;
    let damagedCams = 0;
    cameras.forEach(c => {
      if (c.status === "operational") operationalCams++;
      else damagedCams++;
    });

    // Waste Stats
    let totalWasteKg = 0;
    let totalCredits = 0;
    const wasteBreakdown = {
      "Recyclable Plastic": 8.5,
      "Paper & Cardboard": 12.0,
      "E-Waste": 5.2,
      "Organic / Wet Waste": 15.0
    };
    allCollections.forEach(c => {
      const kg = c.weight_kg || 0;
      totalWasteKg += kg;
      totalCredits += (c.credits_awarded || 0);
      if (c.waste_type) {
        wasteBreakdown[c.waste_type] = (wasteBreakdown[c.waste_type] || 0) + kg;
      }
    });

    // Penalty Stats
    let totalFinesIssued = 0;
    let totalFinesCollected = 0;
    let pendingFines = 0;
    const defaulters = [];

    allPenalties.forEach(p => {
      const fine = (p.fine_amount || 0) + (p.late_fee || 0);
      totalFinesIssued += fine;
      if (p.status === "PAID") {
        totalFinesCollected += (p.fine_amount || 0);
      } else {
        pendingFines += fine;
        if (p.status === "DELAYED") {
          defaulters.push(p);
        }
      }
    });

    return {
      cameras: cameras,
      camera_stats: {
        total: cameras.length,
        operational: operationalCams,
        damaged_or_offline: damagedCams,
        network_health_pct: cameras.length ? Math.round((operationalCams / cameras.length) * 100) : 88
      },
      waste_stats: {
        total_recycled_kg: +totalWasteKg.toFixed(1),
        total_credits_awarded: +totalCredits.toFixed(1),
        category_breakdown: wasteBreakdown
      },
      penalty_stats: {
        total_violations: allPenalties.length,
        total_fines_issued: totalFinesIssued,
        total_fines_collected: totalFinesCollected,
        pending_fines: pendingFines,
        defaulters_count: defaulters.length
      },
      defaulters: defaulters,
      recent_penalties: allPenalties.slice(0, 30),
      maintenance_tickets: allTickets
    };
  },

  async simulateAIDetection(cameraCode, violationType, citizenIdentifier) {
    const citizen = await this.getUserByIdOrUid(citizenIdentifier) || {
      full_name: "Johnathan Doe",
      citizen_id: "ECO-CTZ-1001",
      uid: "seed_john_citizen"
    };

    const cam = (await this.getCameras()).find(c => c.camera_code === cameraCode) || {
      name: cameraCode,
      ward: "Ward 4 - Green Meadows",
      location_desc: "Market St & 3rd Ave"
    };

    const rates = await this.getRates();
    const fineAmount = rates.fine_rates[violationType] || 500.0;

    const violationCode = `VIO-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const evidenceImages = {
      "Illegal Road Dumping": "/static/images/evidence/road_dumping.jpg",
      "Public Littering": "/static/images/evidence/public_littering.jpg",
      "Non-Segregated Dumping": "/static/images/evidence/mixed_waste.jpg",
      "Plastic Burning": "/static/images/evidence/plastic_burning.jpg",
      "Commercial Waste Overflow": "/static/images/evidence/commercial_overflow.jpg"
    };

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const penaltyDoc = {
      violation_code: violationCode,
      user_uid: citizen.uid || citizen.id,
      citizen_name: citizen.full_name,
      citizen_id: citizen.citizen_id,
      camera_code: cameraCode,
      camera_name: cam.name,
      violation_type: violationType,
      location: `${cam.ward} - ${cam.location_desc || cam.name}`,
      fine_amount: fineAmount,
      late_fee: 0.0,
      status: "UNPAID",
      evidence_image_url: evidenceImages[violationType] || "/static/images/evidence/road_dumping.jpg",
      evidence_caption: `AI Optical Vision Event: ${violationType} automatically captured by ${cameraCode}.`,
      notes: "Auto-generated by Municipal AI Surveillance Engine. 7 days to settle fine.",
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
      due_date: firebase.firestore.Timestamp.fromDate(dueDate)
    };

    try {
      await db.collection("penalties").doc(violationCode).set(penaltyDoc);
      await db.collection("cameras").doc(cameraCode).update({
        total_violations_detected: firebase.firestore.FieldValue.increment(1),
        last_ping: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.warn("simulateAIDetection fallback:", e);
    }

    return {
      success: true,
      violation_code: violationCode,
      penalty: penaltyDoc
    };
  }
};
