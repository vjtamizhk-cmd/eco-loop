// ============================================================
// Eco Loop Main Application Logic (Firebase & Firestore Edition)
// ============================================================

let appState = {
  currentUser: null,
  allUsers: [],
  currentRole: 'citizen',
  cameras: [],
  penalties: [],
  rewards: [],
  selectedCitizenForCollection: null,
  wasteChart: null,
  activeCitizenPickupUnsubscribe: null,
  activeCollectorQueueUnsubscribe: null
};

const DEFAULT_DEMO_USERS = [
  {
    uid: "demo_alex_collector",
    id: "demo_alex_collector",
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
    id: "demo_sarah_admin",
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
    id: "demo_director_kumar",
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

const GUEST_PREVIEW_USER = {
  uid: "guest_demo_citizen",
  id: "guest_demo_citizen",
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
};

// ============================================================
// 1. App Lifecycle & Authentication Bootstrap
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 1. Check and seed initial Firestore dataset if empty
    try {
      await checkAndSeedFirestore();
    } catch (e) {
      console.warn("Firestore seed check warning:", e);
    }

    // 2. Load all available registered users from Firestore for directory lookups
    try {
      await refreshAllUsers();
    } catch (e) {
      console.warn("User refresh warning:", e);
    }

    // 3. Check if user is signed in via Firebase Auth
    if (currentProfile) {
      appState.currentUser = currentProfile;
    } else {
      appState.currentUser = GUEST_PREVIEW_USER;
    }

    // 4. Update Header & Switch to active role
    updateUserHeaderUI();
    renderUserSwitcherDropdown();

    if (appState.currentUser) {
      await switchRole(appState.currentUser.role || 'citizen');
    }
  } catch (err) {
    console.error("Initialization error:", err);
    appState.currentUser = GUEST_PREVIEW_USER;
    updateUserHeaderUI();
    renderUserSwitcherDropdown();
    switchRole('citizen');
  } finally {
    setupEventListeners();
    lucide.createIcons();
  }
});

// Callback when Firebase Auth sign-in detects a user
window.onUserProfileLoaded = async (profile) => {
  appState.currentUser = profile;
  await refreshAllUsers();
  updateUserHeaderUI();
  renderUserSwitcherDropdown();
  await switchRole(profile.role || 'citizen');
  updateAuthButtonState(true);
};

// Callback when Firebase Auth signs out
window.onUserSignedOut = async () => {
  updateAuthButtonState(false);
  await refreshAllUsers();
  // Fall back to preview persona
  appState.currentUser = GUEST_PREVIEW_USER;
  updateUserHeaderUI();
  renderUserSwitcherDropdown();
  if (appState.currentUser) {
    await switchRole(appState.currentUser.role || 'citizen');
  }
};

function updateAuthButtonState(isSignedIn) {
  const btn = document.getElementById("btnUnifiedAuth");
  const text = document.getElementById("btnAuthText");
  if (!btn || !text) return;

  if (isSignedIn) {
    text.innerText = "Account Settings";
    btn.className = "flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition";
  } else {
    text.innerText = "Sign In / Sign Up";
    btn.className = "flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-700/30 transition";
  }
}

async function refreshAllUsers() {
  try {
    appState.allUsers = await FirestoreService.getAllUsers();
  } catch (err) {
    console.error("Failed to load users from Firestore:", err);
  }
}

function renderUserSwitcherDropdown() {
  const container = document.getElementById("userSwitcherOptions");
  if (!container) return;

  const currentAuth = currentProfile;
  const isAuthActive = !!currentAuth;

  let html = '';

  // 1. Primary Account (User's Private Isolated Account)
  if (isAuthActive) {
    const isPrimarySelected = appState.currentUser && (appState.currentUser.id === currentAuth.id || appState.currentUser.uid === currentAuth.uid);
    const roleBadgeClass = currentAuth.role === 'collector' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                           currentAuth.role === 'admin' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                           'bg-emerald-950 text-emerald-300 border-emerald-800';

    html += `
      <div class="pt-1 pb-1 px-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
        <span class="flex items-center gap-1.5"><i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-400"></i> My Private Account</span>
        <span class="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono border border-emerald-800">Active</span>
      </div>
      <div onclick="selectPersona('${currentAuth.id || currentAuth.uid}')" class="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/60 cursor-pointer transition ${isPrimarySelected ? 'bg-slate-700/80 border border-emerald-500/50 shadow-inner' : 'border border-slate-700/40'}">
        <div class="flex items-center gap-2.5 min-w-0">
          <img src="${currentAuth.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}" class="w-7 h-7 rounded-full border border-emerald-500/60 object-cover flex-shrink-0" />
          <div class="truncate">
            <div class="text-xs font-bold text-slate-100 truncate">${currentAuth.full_name}</div>
            <div class="text-[10px] text-emerald-300/90 font-mono truncate">${currentAuth.citizen_id || currentAuth.email}</div>
          </div>
        </div>
        <span class="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold border ${roleBadgeClass}">${currentAuth.role || 'citizen'}</span>
      </div>
    `;
  } else {
    const isGuestSelected = !appState.currentUser || appState.currentUser.uid === GUEST_PREVIEW_USER.uid;
    html += `
      <div class="pt-1 pb-1 px-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
        <span class="flex items-center gap-1.5"><i data-lucide="user" class="w-3.5 h-3.5 text-slate-400"></i> Guest Preview Mode</span>
        <span class="text-[9px] text-emerald-400 font-semibold cursor-pointer underline" onclick="openUnifiedAuthModal()">Sign In / Sign Up</span>
      </div>
      <div onclick="selectPersona('${GUEST_PREVIEW_USER.uid}')" class="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/60 cursor-pointer transition ${isGuestSelected ? 'bg-slate-700/80 border border-emerald-500/50' : 'border border-slate-700/40'}">
        <div class="flex items-center gap-2.5 min-w-0">
          <img src="${GUEST_PREVIEW_USER.avatar_url}" class="w-7 h-7 rounded-full border border-slate-600 object-cover flex-shrink-0" />
          <div class="truncate">
            <div class="text-xs font-bold text-slate-200 truncate">${GUEST_PREVIEW_USER.full_name}</div>
            <div class="text-[10px] text-slate-400 font-mono">${GUEST_PREVIEW_USER.citizen_id}</div>
          </div>
        </div>
        <span class="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">CITIZEN</span>
      </div>
    `;
  }

  // 2. Default Simulated Demo Personas (1 Collector, 2 Admins)
  const collectors = DEFAULT_DEMO_USERS.filter(u => u.role === 'collector');
  const admins = DEFAULT_DEMO_USERS.filter(u => u.role === 'admin');

  const renderGroup = (title, icon, users, badgeColor) => `
    <div class="pt-2.5 pb-1 px-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
      ${icon} ${title}
    </div>
    ${users.map(user => {
      const isSelected = appState.currentUser && (appState.currentUser.id === user.id || appState.currentUser.uid === user.uid);
      return `
        <div onclick="selectPersona('${user.id || user.uid}')" class="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/60 cursor-pointer transition ${isSelected ? 'bg-slate-700/80 border border-amber-500/50' : 'border border-slate-700/30'}">
          <div class="flex items-center gap-2.5 min-w-0">
            <img src="${user.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}" class="w-7 h-7 rounded-full border border-slate-600 object-cover flex-shrink-0" />
            <div class="truncate">
              <div class="text-xs font-semibold text-slate-200 truncate">${user.full_name}</div>
              <div class="text-[10px] text-slate-400 font-mono">${user.citizen_id} (Demo)</div>
            </div>
          </div>
          <span class="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold border ${badgeColor}">${user.role}</span>
        </div>
      `;
    }).join("")}
  `;

  html += renderGroup('Default Demo Collector', '<i data-lucide="truck" class="w-3 h-3 text-amber-400"></i>', collectors, 'bg-amber-950 text-amber-300 border-amber-800');
  html += renderGroup('Default Demo Admins', '<i data-lucide="shield" class="w-3 h-3 text-purple-400"></i>', admins, 'bg-purple-950 text-purple-300 border-purple-800');

  container.innerHTML = html;
  lucide.createIcons();
}

async function selectPersona(userDocId) {
  let targetUser = null;

  if (currentProfile && (currentProfile.id === userDocId || currentProfile.uid === userDocId)) {
    targetUser = currentProfile;
  } else if (userDocId === GUEST_PREVIEW_USER.uid || userDocId === GUEST_PREVIEW_USER.id) {
    targetUser = GUEST_PREVIEW_USER;
  } else {
    targetUser = DEFAULT_DEMO_USERS.find(u => u.id === userDocId || u.uid === userDocId);
  }

  if (!targetUser) {
    targetUser = appState.allUsers.find(u => u.id === userDocId || u.uid === userDocId);
  }

  if (!targetUser) return;

  appState.currentUser = targetUser;
  updateUserHeaderUI();
  renderUserSwitcherDropdown();
  toggleUserDropdown(false);
  await switchRole(targetUser.role || 'citizen');

  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: `Active View: ${targetUser.full_name} (${(targetUser.role || 'citizen').toUpperCase()})`,
    showConfirmButton: false,
    timer: 2000,
    background: '#1e293b',
    color: '#f8fafc'
  });
}

function updateUserHeaderUI() {
  const user = appState.currentUser;
  if (!user) return;

  const avatar = document.getElementById("headerUserAvatar");
  const name = document.getElementById("headerUserName");
  const email = document.getElementById("headerUserEmail");
  const roleBadge = document.getElementById("headerUserRoleBadge");

  if (avatar) avatar.src = user.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=user";
  if (name) name.innerText = user.full_name || "Citizen";
  if (email) {
    if (user.is_demo) {
      email.innerText = `${user.citizen_id} (Demo)`;
    } else {
      email.innerText = user.citizen_id || user.email || "";
    }
  }

  if (roleBadge) {
    roleBadge.innerText = (user.role || "citizen").toUpperCase();
    roleBadge.className = `text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${
      user.role === 'citizen' ? 'bg-emerald-900 text-emerald-300 border border-emerald-700' :
      user.role === 'collector' ? 'bg-amber-900 text-amber-300 border border-amber-700' :
      'bg-purple-900 text-purple-300 border border-purple-700'
    }`;
  }
}

function toggleUserDropdown(forceState = null) {
  const dropdown = document.getElementById("userDropdownMenu");
  if (!dropdown) return;
  if (forceState !== null) {
    dropdown.classList.toggle("hidden", !forceState);
  } else {
    dropdown.classList.toggle("hidden");
  }
}

function showMobileSection(section) {
  const activeView = ['citizenView', 'collectorView', 'adminView']
    .map(id => document.getElementById(id))
    .find(view => view && !view.classList.contains('hidden'));
  if (!activeView) return;

  activeView.querySelectorAll('.mobile-section-block').forEach(block => {
    block.classList.toggle('is-mobile-active', block.dataset.mobileSection === section);
  });

  document.querySelectorAll('.mobile-section-tab').forEach(tab => {
    const isActive = tab.dataset.mobileSection === section;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

async function handleSignOut() {
  toggleUserDropdown(false);
  await signOutUser();
  Swal.fire({
    icon: 'info',
    title: 'Signed Out',
    text: 'You have been signed out from Firebase Auth.',
    timer: 1500,
    showConfirmButton: false,
    background: '#1e293b',
    color: '#f8fafc'
  });
}

// ============================================================
// 2. Strict Role-Based View Switching
// ============================================================
async function switchRole(role) {
  appState.currentRole = role;

  // Update Header Mode Badge
  const headerIcon = document.getElementById("roleHeaderIcon");
  const headerText = document.getElementById("roleHeaderText");

  if (headerIcon && headerText) {
    if (role === 'citizen') {
      headerIcon.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse";
      headerText.innerText = "👤 Citizen Account Portal";
      headerText.className = "text-xs font-bold text-emerald-300 uppercase tracking-wider";
    } else if (role === 'collector') {
      headerIcon.className = "w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse";
      headerText.innerText = "🚛 Collector Field Hub";
      headerText.className = "text-xs font-bold text-amber-300 uppercase tracking-wider";
    } else {
      headerIcon.className = "w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse";
      headerText.innerText = "🛡️ Administrator Command Center";
      headerText.className = "text-xs font-bold text-purple-300 uppercase tracking-wider";
    }
  }

  // Strictly enforce view visibility
  const citizenView = document.getElementById("citizenView");
  const collectorView = document.getElementById("collectorView");
  const adminView = document.getElementById("adminView");

  if (citizenView) citizenView.classList.toggle("hidden", role !== 'citizen');
  if (collectorView) collectorView.classList.toggle("hidden", role !== 'collector');
  if (adminView) adminView.classList.toggle("hidden", role !== 'admin' && role !== 'superadmin');

  // Load section-specific data
  if (role === 'citizen') {
    await loadCitizenDashboard();
  } else if (role === 'collector') {
    await loadCollectorDashboard();
  } else if (role === 'admin' || role === 'superadmin') {
    await loadAdminDashboard();
  }

  renderUserSwitcherDropdown();
  lucide.createIcons();
  showMobileSection('overview');
}

async function loadDashboardForCurrentRole() {
  await switchRole(appState.currentRole || 'citizen');
}

// ============================================================
// 3. Citizen Portal Functions
// ============================================================
// ============================================================
// 3. Citizen Portal Functions
// ============================================================
let activeCitizenUserUid = null;
let lastKnownCollectionsCount = -1;

async function loadCitizenDashboard() {
  const user = appState.currentUser;
  if (!user) return;

  try {
    const data = await FirestoreService.getCitizenDashboard(user);

    // Render Metrics
    document.getElementById("citizenCreditsBalance").innerText = (data.user.eco_credits || 0).toFixed(1);
    updateCreditCalculators();
    document.getElementById("citizenTotalWasteKg").innerText = `${data.metrics.total_waste_recycled_kg} kg`;
    document.getElementById("citizenCo2Offset").innerText = `${data.metrics.co2_offset_kg} kg CO₂`;
    document.getElementById("citizenUnpaidFines").innerText = `₹${data.metrics.total_fines_due}`;
    document.getElementById("citizenUnpaidCount").innerText = `${data.metrics.unpaid_penalties_count} active`;

    // Render Dynamic QR Card
    document.getElementById("passCitizenName").innerText = data.user.full_name || "Citizen";
    document.getElementById("passCitizenId").innerText = data.user.citizen_id || "ECO-CTZ-1001";
    document.getElementById("passCitizenWard").innerText = data.user.ward || "Ward 4";
    document.getElementById("passCitizenEmail").innerText = data.user.email || data.user.phone || "";
    document.getElementById("passQrImage").src = data.qr_image;

    // Render Penalties
    renderCitizenPenalties(data.penalties);

    // Render Recent Collections History (Doorstep Handover Ledger)
    renderCitizenCollections(data.recent_collections);

    // Render Rewards Catalog
    await loadRewardsCatalog();

    // Render Redemptions History
    renderCitizenRedemptions(data.redemptions);

    // Setup Real-Time Synchronized Listeners (User Balance, Ledger, Pickups)
    setupCitizenRealtimeListeners(user.uid || user.id);

  } catch (err) {
    console.error("Error loading citizen dashboard:", err);
  }
}

function setupCitizenRealtimeListeners(userUid) {
  if (appState.activeCitizenPickupUnsubscribe) {
    appState.activeCitizenPickupUnsubscribe();
  }
  if (appState.activeCitizenUserDocUnsubscribe) {
    appState.activeCitizenUserDocUnsubscribe();
  }
  if (appState.activeCitizenCollectionsUnsubscribe) {
    appState.activeCitizenCollectionsUnsubscribe();
  }

  activeCitizenUserUid = userUid;
  lastKnownCollectionsCount = -1;

  // 1. Live User Doc Listener for instant credit balance updates.
  appState.activeCitizenUserDocUnsubscribe = FirestoreService.subscribeToUserDoc(userUid, (freshUser) => {
    if (!freshUser) return;
    const oldBal = appState.currentUser?.eco_credits || 0;
    const newBal = freshUser.eco_credits || 0;

    appState.currentUser.eco_credits = newBal;
    const balElem = document.getElementById("citizenCreditsBalance");
    if (balElem) {
      balElem.innerText = newBal.toFixed(1);
      if (newBal > oldBal && oldBal > 0) {
        balElem.classList.add("text-emerald-300", "scale-110", "transition-transform");
        setTimeout(() => balElem.classList.remove("scale-110"), 1000);
      }
    }

    loadRewardsCatalog();
  });

  // 2. Live Collections Listener (Doorstep Handover Ledger & Spontaneous Handover Alert)
  appState.activeCitizenCollectionsUnsubscribe = FirestoreService.subscribeToCitizenCollections(userUid, (collections) => {
    renderCitizenCollections(collections);

    let totalWasteKg = 0;
    collections.forEach(c => { totalWasteKg += (c.weight_kg || 0); });
    const kgElem = document.getElementById("citizenTotalWasteKg");
    if (kgElem) kgElem.innerText = `${totalWasteKg.toFixed(1)} kg`;
    const co2Elem = document.getElementById("citizenCo2Offset");
    if (co2Elem) co2Elem.innerText = `${(totalWasteKg * 1.85).toFixed(1)} kg CO₂`;

    // Alert on spontaneous direct street handover when collector credits resident
    if (lastKnownCollectionsCount >= 0 && collections.length > lastKnownCollectionsCount) {
      const latest = collections[0];
      Swal.fire({
        icon: 'success',
        title: `🎉 +${latest.credits_awarded} EcoCredits Awarded!`,
        html: `
          <div class="text-xs text-left space-y-1.5 mt-2">
            <p><strong>Handover Ref:</strong> <span class="font-mono text-emerald-400 font-bold">${latest.collection_code}</span></p>
            <p><strong>Collector:</strong> ${latest.collector_name || 'Alex Turner'} (${latest.ward || 'Ward 4'})</p>
            <p><strong>Waste Measured:</strong> ${latest.weight_kg} kg ${latest.waste_type}</p>
            <p class="text-emerald-300 font-bold mt-2">✓ Handover recorded! +${latest.credits_awarded} EcoCredits added instantly to your wallet.</p>
          </div>
        `,
        timer: 6000,
        background: '#064e3b',
        color: '#ecfdf5',
        confirmButtonColor: '#059669'
      });
    }
    lastKnownCollectionsCount = collections.length;
  });

  // 3. Live Pickup Requests Listener
  setupCitizenPickupListener(userUid);
}

function setupCitizenPickupListener(userUid) {
  if (appState.activeCitizenPickupUnsubscribe) {
    appState.activeCitizenPickupUnsubscribe();
  }

  appState.activeCitizenPickupUnsubscribe = FirestoreService.subscribeToCitizenPickups(userUid, (requests) => {
    const tracker = document.getElementById("citizenActivePickupTracker");
    if (!tracker) return;

    const activeReq = requests.find(r => ["DISPATCHED", "ACCEPTED", "ARRIVED"].includes(r.status));
    const recentCompleted = requests.find(r => r.status === "COMPLETED" && (!r.dismissed));

    if (activeReq) {
      tracker.classList.remove("hidden");
      let statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-900 text-amber-200 border border-amber-700 animate-pulse">DISPATCHED 🟡</span>`;
      let statusDesc = `Searching for nearby squad in ${activeReq.ward}...`;

      if (activeReq.status === "ACCEPTED") {
        statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-900 text-blue-200 border border-blue-700 animate-pulse">EN ROUTE 🚛</span>`;
        statusDesc = `Collector <strong>${activeReq.collector_name}</strong> is driving to your address.`;
      } else if (activeReq.status === "ARRIVED") {
        statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900 text-emerald-200 border border-emerald-700 animate-bounce">AT DOORSTEP 📍</span>`;
        statusDesc = `Collector has arrived! Show your QR code for waste scale weighing.`;
      }

      tracker.innerHTML = `
        <div class="p-3 bg-slate-900/90 rounded-xl border border-emerald-500/40 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-mono text-emerald-400 font-bold">${activeReq.request_code}</span>
            ${statusBadge}
          </div>
          <div class="text-xs text-slate-200 font-semibold flex items-center justify-between">
            <span>${activeReq.waste_category} (~${activeReq.estimated_weight_kg} kg)</span>
            <span class="text-[11px] text-slate-400 font-normal">${activeReq.urgency}</span>
          </div>
          <p class="text-[11px] text-slate-300">${statusDesc}</p>
          <div class="text-[11px] text-slate-300 flex items-center justify-between pt-1 border-t border-slate-800">
            <span><strong>Collector:</strong> ${activeReq.collector_name || 'Ward 4 Team'}</span>
            <button onclick="cancelPickupRequest('${activeReq.id}')" class="text-red-400 hover:text-red-300 font-bold text-[10px] underline">Cancel Call</button>
          </div>
        </div>
      `;
    } else if (recentCompleted) {
      tracker.classList.remove("hidden");
      tracker.innerHTML = `
        <div class="p-3 bg-emerald-950/60 rounded-xl border border-emerald-500 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-mono text-emerald-400 font-bold">${recentCompleted.request_code}</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900 text-emerald-200 border border-emerald-700">COMPLETED ✅</span>
          </div>
          <div class="text-xs font-bold text-slate-100">
            🎉 Collected ${recentCompleted.actual_weight_kg || recentCompleted.estimated_weight_kg} kg ${recentCompleted.waste_category}!
          </div>
          <div class="text-xs text-emerald-300 font-bold">
            +${recentCompleted.credits_awarded || 0} EcoCredits added to your wallet.
          </div>
          <button onclick="document.getElementById('citizenActivePickupTracker').classList.add('hidden')" class="w-full py-1 bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 rounded-lg text-[11px] font-bold transition">
            Dismiss
          </button>
        </div>
      `;
    } else {
      tracker.classList.add("hidden");
    }
  });
}

function openCallCollectorModal() {
  const user = appState.currentUser;
  if (!user) return;

  Swal.fire({
    title: `<span class="text-base font-bold text-slate-100 flex items-center gap-2 justify-center"><i data-lucide="truck" class="w-5 h-5 text-emerald-400"></i> Call Waste Collector to Doorstep</span>`,
    html: `
      <div class="text-left text-xs space-y-3 mt-2">
        <p class="text-slate-300">A municipal collector assigned to <strong>${user.ward || 'Ward 4 - Green Meadows'}</strong> will receive your call and navigate to your address.</p>

        <div>
          <label class="block text-slate-300 font-semibold mb-1">Waste Category</label>
          <select id="swalPickupCategory" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200">
            <option value="Recyclable Plastic">Recyclable Plastic (Bottles / Packaging)</option>
            <option value="Organic / Wet Waste">Organic / Wet Kitchen Waste</option>
            <option value="Paper & Cardboard">Paper & Cardboard Boxes</option>
            <option value="E-Waste">E-Waste & Electronics</option>
            <option value="Metal & Aluminum">Metal & Aluminum Cans</option>
            <option value="Glass & Bottles">Glass & Beverage Bottles</option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Estimated Weight (kg)</label>
            <input type="number" id="swalPickupWeight" value="5.0" step="0.5" min="0.5" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-200" />
          </div>
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Urgency</label>
            <select id="swalPickupUrgency" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200">
              <option value="Immediate (Within 30 mins)">Immediate (Within 30 mins)</option>
              <option value="Today Afternoon">Today Afternoon</option>
              <option value="Scheduled Tomorrow Morning">Scheduled Tomorrow Morning</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-slate-300 font-semibold mb-1">Pickup Address</label>
          <input type="text" id="swalPickupAddress" value="${user.address || '124 Green Valley Road, Apt 4B'}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200" />
        </div>

        <div>
          <label class="block text-slate-300 font-semibold mb-1">Contact Phone</label>
          <input type="text" id="swalPickupPhone" value="${user.phone || '+1 (555) 234-5678'}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-200" />
        </div>

        <div>
          <label class="block text-slate-300 font-semibold mb-1">Doorstep Instructions (Optional)</label>
          <input type="text" id="swalPickupNotes" placeholder="e.g. 2 bags kept beside front porch" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200" />
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '🚀 Confirm & Dispatch Collector',
    confirmButtonColor: '#059669',
    cancelButtonColor: '#334155',
    background: '#1e293b',
    color: '#f8fafc',
    preConfirm: async () => {
      const cat = document.getElementById("swalPickupCategory").value;
      const weight = parseFloat(document.getElementById("swalPickupWeight").value);
      const urgency = document.getElementById("swalPickupUrgency").value;
      const address = document.getElementById("swalPickupAddress").value;
      const phone = document.getElementById("swalPickupPhone").value;
      const notes = document.getElementById("swalPickupNotes").value;

      try {
        const result = await FirestoreService.createPickupRequest(user, {
          waste_category: cat,
          estimated_weight_kg: weight,
          urgency: urgency,
          address: address,
          phone: phone,
          notes: notes
        });
        return result;
      } catch (err) {
        Swal.showValidationMessage(`Failed: ${err.message}`);
      }
    }
  }).then(async (result) => {
    if (result.isConfirmed && result.value) {
      Swal.fire({
        icon: 'success',
        title: 'Waste Collector Alerted! 🚛',
        html: `
          <div class="text-xs text-left space-y-1.5 mt-2">
            <p><strong>Tracking Code:</strong> <span class="font-mono text-emerald-400">${result.value.request_code}</span></p>
            <p><strong>Assigned Zone:</strong> ${result.value.ward}</p>
            <p><strong>Status:</strong> <span class="text-emerald-300 font-bold">DISPATCHED TO FIELD UNIT</span></p>
            <p class="text-slate-400">Keep your Eco-Pass QR and segregated waste ready for doorstep weighing.</p>
          </div>
        `,
        background: '#1e293b',
        color: '#f8fafc',
        confirmButtonColor: '#059669'
      });
    }
  });
}

async function cancelPickupRequest(requestId) {
  Swal.fire({
    title: 'Cancel Pickup Call?',
    text: 'Are you sure you want to cancel this doorstep collection request?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, Cancel Call',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#334155',
    background: '#1e293b',
    color: '#f8fafc'
  }).then(async (res) => {
    if (res.isConfirmed) {
      try {
        await FirestoreService.cancelPickupRequest(requestId);
        Swal.fire({ icon: 'success', title: 'Cancelled', text: 'Pickup request has been cancelled.', background: '#1e293b', color: '#f8fafc' });
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: '#1e293b', color: '#f8fafc' });
      }
    }
  });
}

function renderCitizenPenalties(penalties) {
  const container = document.getElementById("citizenPenaltiesList");
  if (!container) return;

  if (penalties.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-8 text-center bg-slate-800/40 rounded-xl border border-dashed border-slate-700">
        <i data-lucide="shield-check" class="w-12 h-12 text-emerald-400 mx-auto mb-3"></i>
        <h4 class="text-base font-semibold text-slate-200">No Violations Found!</h4>
        <p class="text-xs text-slate-400 mt-1">You have a clean record. Thank you for keeping our city clean and green!</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = penalties.map(p => {
    let statusClass = "bg-amber-900/60 text-amber-300 border-amber-700/60";
    if (p.status === "PAID") statusClass = "bg-emerald-900/60 text-emerald-300 border-emerald-700/60";
    if (p.status === "DELAYED") statusClass = "bg-red-900/60 text-red-300 border-red-700/60 animate-pulse";
    if (p.status === "DISPUTED") statusClass = "bg-purple-900/60 text-purple-300 border-purple-700/60";

    const totalAmount = (p.fine_amount || 0) + (p.late_fee || 0);

    return `
      <div class="glass-card rounded-2xl p-4 border border-slate-800 space-y-3 relative overflow-hidden">
        <!-- Top row: Violation Code & Status -->
        <div class="flex items-center justify-between">
          <span class="font-mono text-xs font-bold text-amber-400">${p.violation_code}</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusClass}">
            ${p.status} ${p.late_fee > 0 ? '(+Late Fee)' : ''}
          </span>
        </div>

        <!-- Evidence Image & Violation Details -->
        <div class="flex gap-3">
          <div class="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 flex-shrink-0 cursor-pointer" onclick="viewEvidenceImage('${p.evidence_image_url || '/static/images/evidence/road_dumping.jpg'}', '${p.evidence_caption || ''}')">
            <img src="${p.evidence_image_url || '/static/images/evidence/road_dumping.jpg'}" class="w-full h-full object-cover hover:scale-105 transition" />
            <div class="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-center py-0.5 text-slate-200">🔍 Evidence</div>
          </div>
          <div class="flex-1 space-y-1">
            <div class="text-sm font-bold text-slate-100">${p.violation_type}</div>
            <div class="text-[11px] text-slate-400 flex items-center gap-1">
              <i data-lucide="map-pin" class="w-3 h-3 text-slate-500"></i> ${p.location}
            </div>
            <div class="text-[11px] text-slate-400 flex items-center gap-1">
              <i data-lucide="camera" class="w-3 h-3 text-slate-500"></i> ${p.camera_code} (${p.camera_name || ''})
            </div>
            <div class="text-xs font-bold text-emerald-400 pt-1">Fine: ₹${totalAmount}</div>
          </div>
        </div>

        <!-- Action Row -->
        <div class="flex gap-2 pt-2 border-t border-slate-800/80">
          ${p.status !== 'PAID' ? `
            <button onclick="openPayPenaltyModal('${p.id}', '${p.violation_code}', ${totalAmount})" class="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5">
              <i data-lucide="credit-card" class="w-3.5 h-3.5"></i> Pay Online
            </button>
            <button onclick="openDisputeModal('${p.id}', '${p.violation_code}')" class="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition">
              Dispute
            </button>
          ` : `
            <div class="w-full py-1.5 px-3 bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5">
              <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Settled (Ref: ${p.payment_ref || 'PAID'})
            </div>
          `}
        </div>
      </div>
    `;
  }).join("");

  lucide.createIcons();
}

function viewEvidenceImage(imageUrl, caption) {
  Swal.fire({
    title: 'CCTV Optical Evidence Snapshot',
    imageUrl: imageUrl,
    imageAlt: 'CCTV Evidence',
    text: caption || 'Captured by Municipal AI Surveillance Network Camera.',
    background: '#1e293b',
    color: '#f8fafc',
    confirmButtonColor: '#059669',
    confirmButtonText: 'Close Evidence'
  });
}

function openPayPenaltyModal(penaltyId, violationCode, totalAmount) {
  Swal.fire({
    title: `Pay Fine: ${violationCode}`,
    html: `
      <div class="text-left text-xs space-y-3">
        <p class="text-slate-300">Total Statutory Dues to Municipal Clean City Board: <strong class="text-emerald-400 text-base">₹${totalAmount}</strong></p>
        <div>
          <label class="block text-slate-300 font-semibold mb-1">Select Payment Gateway</label>
          <select id="swalPaymentMethod" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200">
            <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
            <option value="CARD">Debit / Credit Card</option>
            <option value="NETBANKING">Net Banking</option>
            <option value="ECO_CREDITS">Offset using EcoCredits Balance</option>
          </select>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: `Pay ₹${totalAmount} Now`,
    confirmButtonColor: '#059669',
    background: '#1e293b',
    color: '#f8fafc',
    preConfirm: async () => {
      const method = document.getElementById("swalPaymentMethod").value;
      try {
        const result = await FirestoreService.payPenalty(penaltyId, method);
        return result;
      } catch (err) {
        Swal.showValidationMessage(`Payment failed: ${err.message}`);
      }
    }
  }).then(async (result) => {
    if (result.isConfirmed && result.value) {
      Swal.fire({
        icon: 'success',
        title: 'Payment Successful!',
        text: `Penalty ${violationCode} has been cleared. Clean municipal record maintained!`,
        background: '#1e293b',
        color: '#f8fafc'
      });
      await loadCitizenDashboard();
    }
  });
}

function openDisputeModal(penaltyId, violationCode) {
  Swal.fire({
    title: `Dispute Violation ${violationCode}`,
    html: `
      <div class="text-left text-xs space-y-2">
        <p class="text-slate-300">Submit an official review appeal to the Municipal Sanitation Board.</p>
        <label class="block text-slate-300 font-semibold mb-1">Reason for Appeal / Dispute</label>
        <textarea id="swalDisputeReason" rows="3" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200" placeholder="e.g. The footage shows municipal windblown debris, not my trash..."></textarea>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Submit Appeal',
    confirmButtonColor: '#9333ea',
    background: '#1e293b',
    color: '#f8fafc',
    preConfirm: async () => {
      const reason = document.getElementById("swalDisputeReason").value;
      if (!reason.trim()) {
        Swal.showValidationMessage("Please provide a valid dispute explanation.");
        return;
      }
      try {
        await FirestoreService.disputePenalty(penaltyId, reason);
        return true;
      } catch (err) {
        Swal.showValidationMessage(`Dispute failed: ${err.message}`);
      }
    }
  }).then((res) => {
    if (res.isConfirmed) {
      Swal.fire({ icon: 'success', title: 'Appeal Submitted', text: 'Municipal officer review in progress (24-48 hrs).', background: '#1e293b', color: '#f8fafc' });
      loadCitizenDashboard();
    }
  });
}

function renderCitizenCollections(collections) {
  const tbody = document.getElementById("citizenCollectionsTableBody");
  const container = document.getElementById("citizenCollectionsList");

  if (tbody) {
    if (!collections || collections.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-400 text-xs">No doorstep collections recorded yet. Call a collector or hand over waste to earn EcoCredits!</td></tr>`;
    } else {
      tbody.innerHTML = collections.map(c => {
        const cDate = c.collected_at?.toDate ? c.collected_at.toDate() : new Date(c.collected_at || Date.now());
        return `
          <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition text-xs">
            <td class="py-3 px-3 font-mono font-bold text-emerald-400">${c.collection_code}</td>
            <td class="py-3 px-3">
              <span class="font-bold text-slate-200">${c.waste_type}</span>
              <div class="text-[10px] text-slate-400">Collector: ${c.collector_name || 'Alex Turner'} (${c.ward || 'Ward 4'})</div>
            </td>
            <td class="py-3 px-3 font-mono font-bold text-slate-200">${c.weight_kg} kg</td>
            <td class="py-3 px-3 text-slate-400 text-[11px]">${cDate.toLocaleDateString()} ${cDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
            <td class="py-3 px-3 text-right font-mono font-extrabold text-emerald-400 text-sm">+${(c.credits_awarded || 0).toFixed(1)} Cr</td>
          </tr>
        `;
      }).join("");
    }
  }

  if (container) {
    if (!collections || collections.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400 col-span-full">No doorstep collections recorded yet.</p>`;
    } else {
      container.innerHTML = collections.map(c => {
        const cDate = c.collected_at?.toDate ? c.collected_at.toDate() : new Date(c.collected_at || Date.now());
        return `
          <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400 font-bold text-xs">
                ♻️
              </div>
              <div>
                <div class="text-xs font-bold text-slate-200">${c.waste_type} (${c.weight_kg} kg)</div>
                <div class="text-[10px] text-slate-400 font-mono">${c.collection_code} ● Collector: ${c.collector_name || 'Alex Turner'}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs font-extrabold text-emerald-400 font-mono">+${(c.credits_awarded || 0).toFixed(1)} Cr</div>
              <div class="text-[10px] text-slate-400">${cDate.toLocaleDateString()}</div>
            </div>
          </div>
        `;
      }).join("");
    }
  }
}

async function loadRewardsCatalog() {
  const container = document.getElementById("rewardsCatalogGrid") || document.getElementById("rewardsGrid");
  if (!container) return;

  try {
    const rewards = await FirestoreService.getRewardsCatalog();
    const userCredits = appState.currentUser?.eco_credits || 0;

    container.innerHTML = rewards.map(r => {
      r.description = r.description.replace(/30 consecutive days/gi, '7 consecutive days');
      r.value_label = r.value_label.replace(/30-Day/gi, '7-Day');
      const canAfford = userCredits >= r.credit_cost;
      return `
        <div class="glass-card rounded-2xl p-4 border border-slate-800 flex flex-col justify-between space-y-3 bg-gradient-to-br from-slate-900 to-slate-900/80 hover:border-emerald-500/40 transition">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold uppercase border border-emerald-800">${r.category}</span>
              <span class="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">${r.credit_cost} Credits</span>
            </div>
            <h4 class="text-sm font-bold text-slate-100">${r.title}</h4>
            <p class="text-xs text-slate-400 mt-1">${r.description}</p>
          </div>

          <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span class="text-[11px] text-emerald-300 font-semibold">${r.value_label}</span>
            <button onclick="redeemRewardVoucher('${r.id || r.reward_code}')" class="py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              canAfford
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-700/20 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
            }" ${!canAfford ? 'disabled' : ''}>
              ${canAfford ? '🎁 Redeem Voucher' : 'Need more credits'}
            </button>
          </div>
        </div>
      `;
    }).join("");

    lucide.createIcons();
  } catch (err) {
    console.error("Error loading rewards:", err);
  }
}

async function redeemRewardVoucher(rewardId) {
  const user = appState.currentUser;
  if (!user) return;

  Swal.fire({
    title: 'Confirm Voucher Redemption',
    text: 'Do you want to spend your EcoCredits to redeem this municipal benefit voucher?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Confirm & Generate Code',
    confirmButtonColor: '#059669',
    background: '#1e293b',
    color: '#f8fafc'
  }).then(async (res) => {
    if (res.isConfirmed) {
      try {
        const result = await FirestoreService.redeemReward(user, rewardId);
        Swal.fire({
          icon: 'success',
          title: 'Voucher Code Generated! 🎉',
          html: `
            <div class="text-xs text-left space-y-2 mt-2">
              <p>Your unique digital voucher code:</p>
              <div class="p-3 bg-slate-900 border border-emerald-500 rounded-lg text-center font-mono font-bold text-lg text-emerald-400">
                ${result.voucher_code}
              </div>
              <p class="text-slate-400 text-[11px]">Show this code at city municipal offices, transport counters, or partner stores.</p>
            </div>
          `,
          background: '#1e293b',
          color: '#f8fafc'
        });
        user.eco_credits = result.new_balance;
        await loadCitizenDashboard();
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Redemption Failed', text: err.message, background: '#1e293b', color: '#f8fafc' });
      }
    }
  });
}

function renderCitizenRedemptions(redemptions) {
  const container = document.getElementById("citizenRedemptionsList");
  if (!container) return;

  if (redemptions.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 col-span-full">No reward vouchers redeemed yet.</p>`;
    return;
  }

  container.innerHTML = redemptions.map(r => {
    const rDate = r.redeemed_at?.toDate ? r.redeemed_at.toDate() : new Date(r.redeemed_at);
    return `
      <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700 flex items-center justify-between">
        <div>
          <div class="text-xs font-bold text-slate-200">${r.reward_title}</div>
          <div class="text-[11px] font-mono text-emerald-400 tracking-wider font-semibold mt-0.5">Code: ${r.voucher_code}</div>
        </div>
        <div class="text-right">
          <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">${r.status}</span>
          <div class="text-[10px] text-slate-400 mt-1">${rDate.toLocaleDateString()}</div>
        </div>
      </div>
    `;
  }).join("");
}

// ============================================================
// 4. Collector Portal Functions
// ============================================================
async function loadCollectorDashboard() {
  const collector = appState.currentUser;
  if (!collector) return;

  try {
    const data = await FirestoreService.getCollectorDashboard(collector);

    document.getElementById("collectorTodayKg").innerText = `${data.stats.today_total_kg} kg`;
    document.getElementById("collectorTodayCredits").innerText = `${data.stats.today_credits_distributed}`;
    document.getElementById("collectorTodayCount").innerText = `${data.stats.today_collections_count}`;
    document.getElementById("collectorAllTimeKg").innerText = `${data.stats.all_time_kg} kg`;
    updateCreditCalculators();

    // Render Quick Citizens Select for Easy Testing
    renderCollectorCitizenSelector();

    // Setup Real-Time Listener for Collector's Queue
    setupCollectorQueueListener();

    // Render Collector Logs Table
    renderCollectorLogs(data.recent_logs);

    // Populate Waste Categories Dropdown
    await loadWasteCategories();

  } catch (err) {
    console.error("Error loading collector dashboard:", err);
  }
}

function setupCollectorQueueListener() {
  if (appState.activeCollectorQueueUnsubscribe) {
    appState.activeCollectorQueueUnsubscribe();
  }

  appState.activeCollectorQueueUnsubscribe = FirestoreService.subscribeToCollectorQueue((pickups) => {
    const container = document.getElementById("collectorPickupRequestsBody");
    if (!container) return;

    if (pickups.length === 0) {
      container.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400 text-xs">No active doorstep pickup requests in your ward right now.</td></tr>`;
      return;
    }

    container.innerHTML = pickups.map(p => {
      let statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">DISPATCHED</span>`;
      if (p.status === 'ACCEPTED') statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800 animate-pulse">EN ROUTE</span>`;
      if (p.status === 'ARRIVED') statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 animate-bounce">AT DOORSTEP</span>`;

      return `
        <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition text-xs">
          <td class="py-3 px-3 font-mono text-amber-400 font-semibold">${p.request_code}</td>
          <td class="py-3 px-3">
            <div class="font-bold text-slate-200">${p.citizen_name}</div>
            <div class="text-[11px] text-slate-300">${p.address}</div>
            <div class="text-[10px] text-slate-400 font-mono">📞 ${p.phone}</div>
          </td>
          <td class="py-3 px-3">
            <span class="font-semibold text-slate-200">${p.waste_category}</span>
            ${p.notes ? `<div class="text-[10px] text-slate-400 italic mt-0.5">"${p.notes}"</div>` : ''}
          </td>
          <td class="py-3 px-3 font-mono text-slate-200">~${p.estimated_weight_kg} kg</td>
          <td class="py-3 px-3 text-slate-300 text-[11px]">${p.urgency}</td>
          <td class="py-3 px-3">${statusBadge}</td>
          <td class="py-3 px-3 text-right">
            <div class="flex items-center justify-end gap-1.5">
              ${p.status === 'DISPATCHED' ? `
                <button onclick="acceptPickupCall('${p.id}')" class="py-1 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition">
                  Accept
                </button>
              ` : p.status === 'ACCEPTED' ? `
                <button onclick="markCollectorArrivedAtDoorstep('${p.id}')" class="py-1 px-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold transition">
                  Arrived
                </button>
              ` : ''}
              <button onclick="acceptAndWeighPickup('${p.citizen_id}', '${p.citizen_name}', '${p.ward}', '${p.waste_category}', ${p.estimated_weight_kg}, '${p.id}')" class="py-1.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-[11px] font-bold shadow-md transition flex items-center gap-1">
                <i data-lucide="scale" class="w-3.5 h-3.5"></i> Weigh Waste
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    lucide.createIcons();
  });
}

async function acceptPickupCall(requestId) {
  try {
    await FirestoreService.acceptPickupRequest(requestId, appState.currentUser);
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Pickup call accepted. Status set to EN ROUTE.', timer: 2000, background: '#1e293b', color: '#fff' });
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Error', text: e.message, background: '#1e293b', color: '#fff' });
  }
}

async function markCollectorArrivedAtDoorstep(requestId) {
  try {
    await FirestoreService.markCollectorArrived(requestId);
    Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Arrival marked. Resident notified to bring out waste.', timer: 2000, background: '#1e293b', color: '#fff' });
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Error', text: e.message, background: '#1e293b', color: '#fff' });
  }
}

async function acceptAndWeighPickup(citizenId, citizenName, ward, category, weight, requestId) {
  // Mark request as accepted if not already
  try {
    await FirestoreService.acceptPickupRequest(requestId, appState.currentUser);
  } catch (e) { }

  // Auto-fill weighing form
  selectCitizenForCollection(citizenId, citizenName, ward, 0);

  const wasteSelect = document.getElementById("collectorWasteTypeSelect");
  if (wasteSelect) {
    for (let i = 0; i < wasteSelect.options.length; i++) {
      if (wasteSelect.options[i].value === category || wasteSelect.options[i].text.includes(category)) {
        wasteSelect.selectedIndex = i;
        break;
      }
    }
  }

  const weightInput = document.getElementById("collectorWeightInput");
  if (weightInput) {
    weightInput.value = weight;
  }

  updateCollectionCreditPreview();

  // Scroll smoothly to weighing card
  document.getElementById("collectorWeightInput").scrollIntoView({ behavior: "smooth" });
  document.getElementById("collectorWeightInput").focus();

  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'info',
    title: `Pickup Loaded for ${citizenName} (~${weight}kg ${category})`,
    showConfirmButton: false,
    timer: 3000,
    background: '#1e293b',
    color: '#f8fafc'
  });
}

async function identifyCitizen(inputIdentifier) {
  if (!inputIdentifier) {
    Swal.fire({
      icon: 'warning',
      title: 'Citizen ID / QR Required',
      text: 'Please enter a citizen ID (e.g. ECO-CTZ-1001) or scan an Eco-Pass QR code.',
      background: '#1e293b',
      color: '#f8fafc'
    });
    return null;
  }

  Swal.fire({
    title: 'Looking Up Resident...',
    text: `Verifying "${inputIdentifier}" against municipal records...`,
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); },
    background: '#1e293b',
    color: '#f8fafc'
  });

  try {
    const citizen = await FirestoreService.getUserByIdOrUid(inputIdentifier);
    Swal.close();

    if (!citizen) {
      Swal.fire({
        icon: 'error',
        title: 'Resident Not Found',
        html: `No registered resident matches code <strong class="font-mono text-amber-400">"${inputIdentifier}"</strong>.<br><br>Please check the Citizen ID or select a citizen from the list below.`,
        background: '#1e293b',
        color: '#f8fafc'
      });
      return null;
    }

    selectCitizenForCollection(citizen.citizen_id, citizen.full_name, citizen.ward, citizen.eco_credits);

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Resident Verified: ${citizen.full_name} (${citizen.citizen_id})`,
      showConfirmButton: false,
      timer: 2500,
      background: '#1e293b',
      color: '#f8fafc'
    });

    return citizen;
  } catch (err) {
    Swal.close();
    Swal.fire({
      icon: 'error',
      title: 'Lookup Error',
      text: err.message,
      background: '#1e293b',
      color: '#f8fafc'
    });
    return null;
  }
}

window.handleCitizenQRScanned = async (decodedText) => {
  console.log("Collector QR Scanned:", decodedText);
  document.getElementById("collectorCitizenInput").value = decodedText;
  await identifyCitizen(decodedText);
};

window.handleIdentifyCitizenClick = async () => {
  const val = document.getElementById("collectorCitizenInput").value.trim();
  await identifyCitizen(val);
};

function renderCollectorCitizenSelector() {
  const container = document.getElementById("quickCitizenSelector");
  if (!container) return;

  let citizens = appState.allUsers.filter(u => u.role === 'citizen');
  if (citizens.length === 0) {
    citizens = [GUEST_PREVIEW_USER];
  }

  container.innerHTML = citizens.map(c => `
    <button onclick="selectCitizenForCollection('${c.citizen_id}', '${c.full_name}', '${c.ward}', ${c.eco_credits || 0})" class="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left transition flex items-center justify-between">
      <div class="flex items-center gap-2 min-w-0">
        <img src="${c.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}" class="w-7 h-7 rounded-full object-cover flex-shrink-0" />
        <div class="truncate">
          <div class="text-xs font-bold text-slate-200 truncate">${c.full_name}</div>
          <div class="text-[10px] font-mono text-emerald-400 font-bold">${c.citizen_id} <span class="text-slate-400 font-normal">● Active</span></div>
        </div>
      </div>
      <div class="text-right flex-shrink-0">
        <span class="text-xs font-bold text-emerald-400 font-mono">${(c.eco_credits || 0).toFixed(1)} cr</span>
        <div class="text-[9px] text-slate-400 font-medium">🔒 Protected</div>
      </div>
    </button>
  `).join("");
}

function selectCitizenForCollection(citizenId, name, ward, credits) {
  document.getElementById("collectorCitizenInput").value = citizenId;
  const card = document.getElementById("scannedCitizenCard");
  if (card) {
    card.classList.remove("hidden");
    document.getElementById("scannedCitizenName").innerText = name || "Citizen";
    document.getElementById("scannedCitizenId").innerText = `${citizenId} • 🔒 Credentials Protected`;
    document.getElementById("scannedCitizenWard").innerText = ward || "Ward 4";
    document.getElementById("scannedCitizenBalance").innerText = `${(credits || 0).toFixed(1)} EcoCredits`;
  }
}

async function loadWasteCategories() {
  const select = document.getElementById("collectorWasteTypeSelect");
  if (!select) return;

  const rates = await FirestoreService.getRates();
  select.innerHTML = Object.entries(rates.waste_rates).map(([type, rate]) => `
    <option value="${type}" data-rate="${rate}">${type} — ₹${rate} / kg (or Credits)</option>
  `).join("");

  updateCollectionCreditPreview();
}

function updateCollectionCreditPreview() {
  const select = document.getElementById("collectorWasteTypeSelect");
  const weightInput = document.getElementById("collectorWeightInput");
  const preview = document.getElementById("collectorCreditsPreview");

  if (!select || !weightInput || !preview) return;

  const selectedOption = select.options[select.selectedIndex];
  const rate = selectedOption ? parseFloat(selectedOption.dataset.rate || 10.0) : 10.0;
  const weight = parseFloat(weightInput.value || 0);

  const credits = (weight * rate).toFixed(1);
  preview.innerText = `${credits} Credits`;
}

async function submitWasteCollection() {
  const collector = appState.currentUser;
  const citizenCode = document.getElementById("collectorCitizenInput").value.trim();
  const select = document.getElementById("collectorWasteTypeSelect");
  const wasteType = select.value;
  const weight = parseFloat(document.getElementById("collectorWeightInput").value);
  const notes = document.getElementById("collectorNotesInput").value;

  if (!citizenCode) {
    Swal.fire({ icon: 'warning', title: 'Citizen Required', text: 'Please scan citizen QR code or select a resident profile.', background: '#1e293b', color: '#f8fafc' });
    return;
  }

  if (!weight || weight <= 0) {
    Swal.fire({ icon: 'warning', title: 'Measured Weight Required', text: 'Please input scale weight in kilograms.', background: '#1e293b', color: '#f8fafc' });
    return;
  }

  try {
    const result = await FirestoreService.recordWasteCollection(collector, citizenCode, wasteType, weight, notes);

    Swal.fire({
      icon: 'success',
      title: 'Waste Handover Recorded! 🎉',
      html: `
        <div class="text-xs text-left space-y-1.5 mt-2">
          <p><strong>Handover Ref:</strong> <span class="font-mono text-emerald-400">${result.collection.collection_code}</span></p>
          <p><strong>Citizen:</strong> ${result.collection.citizen_name} (${result.collection.citizen_id})</p>
          <p><strong>Measured Weight:</strong> ${weight} kg (${wasteType})</p>
          <p><strong>EcoCredits Awarded:</strong> <span class="text-emerald-400 font-extrabold text-sm">+${result.collection.credits_awarded} Credits</span></p>
          <p class="text-emerald-300 font-semibold mt-2">✓ Handover completed. Credits credited instantly to resident wallet.</p>
        </div>
      `,
      background: '#1e293b',
      color: '#f8fafc'
    });

    // Reset Form
    document.getElementById("collectorWeightInput").value = "";
    document.getElementById("collectorNotesInput").value = "";
    updateCollectionCreditPreview();

    // Refresh Dashboard
    await loadCollectorDashboard();

  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Collection Failed', text: err.message, background: '#1e293b', color: '#f8fafc' });
  }
}

function renderCollectorLogs(logs) {
  const container = document.getElementById("collectorRecentLogsBody");
  if (!container) return;

  if (logs.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-400 text-xs">No collections recorded yet today.</td></tr>`;
    return;
  }

  container.innerHTML = logs.map(l => `
    <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition text-xs">
      <td class="py-2.5 px-3 font-mono text-emerald-400">${l.collection_code}</td>
      <td class="py-2.5 px-3">
        <div class="font-bold text-slate-200">${l.citizen_name}</div>
        <div class="text-[10px] text-slate-400 font-mono">${l.citizen_id}</div>
      </td>
      <td class="py-2.5 px-3 text-slate-300">${l.waste_type}</td>
      <td class="py-2.5 px-3 font-mono font-bold text-slate-200">${l.weight_kg} kg</td>
      <td class="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-400">+${l.credits_awarded} Cr</td>
    </tr>
  `).join("");
}

// ============================================================
// 5. Administrator Command Center
// ============================================================
async function loadAdminDashboard() {
  try {
    const data = await FirestoreService.getAdminDashboard();
    updateCreditCalculators();
    appState.cameras = data.cameras;

    // Camera Stats
    document.getElementById("adminCamHealthPct").innerText = `${data.camera_stats.network_health_pct}%`;
    document.getElementById("adminDamagedCams").innerText = `${data.camera_stats.damaged_or_offline} damaged or offline`;

    // Penalty Stats
    document.getElementById("adminRecoveryRate").innerText = `${data.penalty_stats.total_fines_issued ? Math.round((data.penalty_stats.total_fines_collected / data.penalty_stats.total_fines_issued) * 100) : 0}%`;
    document.getElementById("adminTotalDefaultFines").innerText = `Outstanding: ₹${data.penalty_stats.pending_fines}`;

    // Waste Stats
    document.getElementById("adminTotalWasteTons").innerText = `${(data.waste_stats.total_recycled_kg / 1000).toFixed(3)} Tons`;
    document.getElementById("adminTotalViolations").innerText = data.penalty_stats.total_violations;
    document.getElementById("adminOverdueDefaulters").innerText = `${data.penalty_stats.defaulters_count} overdue defaulters`;

    // Initialize/Update Leaflet CCTV Map
    if (window.initCCTVMap) {
      window.initCCTVMap(data.cameras);
    }

    // Populate Camera selector for AI Simulator
    const simSelect = document.getElementById("simCameraSelect");
    if (simSelect) {
      simSelect.innerHTML = data.cameras.map(c => `
        <option value="${c.camera_code}">${c.camera_code} — ${c.name} (${c.status.toUpperCase()})</option>
      `).join("");
    }

    // Populate Citizen selector for AI Simulator
    const simUserSelect = document.getElementById("simUserSelect");
    if (simUserSelect) {
      const citizens = appState.allUsers.filter(u => u.role === 'citizen');
      simUserSelect.innerHTML = citizens.map(c => `
        <option value="${c.citizen_id}">${c.full_name} (${c.citizen_id})</option>
      `).join("");
    }

    // Render Defaulters List
    renderAdminDefaulters(data.defaulters);

    // Render Maintenance Tickets
    renderAdminTickets(data.maintenance_tickets);

    // Render All Violations Ledger
    renderAdminAllPenalties(data.recent_penalties);

    // Render Waste Chart
    renderAdminWasteChart(data.waste_stats.category_breakdown);

  } catch (err) {
    console.error("Error loading admin dashboard:", err);
  }
}

async function updateCreditCalculators() {
  const value = await FirestoreService.getCurrentCreditValue();
  document.querySelectorAll("[data-credit-calculator]").forEach(calculator => {
    const input = calculator.querySelector("[data-credit-input]");
    const output = calculator.querySelector("[data-credit-output]");
    const rate = calculator.querySelector("[data-credit-rate]");
    if (!input || !output) return;
    const credits = Math.max(0, Number(input.value) || 0);
    output.innerText = `₹${(credits * value).toFixed(2)}`;
    if (rate) rate.innerText = `1 credit = ₹${value.toFixed(2)}`;
  });
}

function renderAdminDefaulters(defaulters) {
  const container = document.getElementById("adminDefaultersTableBody");
  if (!container) return;

  if (defaulters.length === 0) {
    container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">No overdue defaulters found. Outstanding collections are on schedule.</div>`;
    return;
  }

  container.innerHTML = defaulters.map(d => {
    const totalDue = (d.fine_amount || 0) + (d.late_fee || 0);
    return `
      <div class="p-3 rounded-xl bg-red-950/30 border border-red-800/60 flex items-center justify-between">
        <div>
          <div class="text-xs font-bold text-slate-200">${d.citizen_name} <span class="text-red-400 font-mono">(${d.citizen_id})</span></div>
          <div class="text-[11px] text-slate-400">${d.violation_type} ● ${d.camera_code}</div>
          <div class="text-[10px] text-red-300 font-mono font-bold mt-0.5">Delinquent: ₹${totalDue} (incl. ₹${d.late_fee || 0} late fee)</div>
        </div>
        <button onclick="dispatchWarningNoticeModal('${d.id}')" class="py-1.5 px-3 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5">
          <i data-lucide="mail-warning" class="w-3.5 h-3.5"></i> Dispatch Notice
        </button>
      </div>
    `;
  }).join("");

  lucide.createIcons();
}

function renderAdminTickets(tickets) {
  const container = document.getElementById("adminTicketsTableBody");
  if (!container) return;

  if (tickets.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400 text-xs">No maintenance tickets in queue. All cameras operational.</td></tr>`;
    return;
  }

  container.innerHTML = tickets.map(t => {
    let statusClass = "bg-amber-900/60 text-amber-300 border-amber-700";
    if (t.status === "RESOLVED") statusClass = "bg-emerald-900/60 text-emerald-300 border-emerald-700";

    return `
      <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition text-xs">
        <td class="py-2.5 px-3 font-mono text-amber-400 font-bold">${t.ticket_code}</td>
        <td class="py-2.5 px-3 font-semibold text-slate-200">${t.camera_code}</td>
        <td class="py-2.5 px-3 text-slate-300">${t.issue_category}</td>
        <td class="py-2.5 px-3 text-slate-400 text-[11px] max-w-xs truncate">${t.description}</td>
        <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold border ${statusClass}">${t.status}</span></td>
        <td class="py-2.5 px-3 text-right">
          ${t.status !== 'RESOLVED' ? `
            <button onclick="openResolveTicketModal('${t.id}', '${t.ticket_code}', '${t.camera_code}')" class="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold transition">
              Resolve Ticket
            </button>
          ` : `
            <span class="text-emerald-400 text-xs font-semibold">✓ Repaired</span>
          `}
        </td>
      </tr>
    `;
  }).join("");
}

function renderAdminAllPenalties(penalties) {
  const container = document.getElementById("adminAllPenaltiesBody");
  if (!container) return;

  if (penalties.length === 0) {
    container.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400 text-xs">No violations recorded in municipal ledger.</td></tr>`;
    return;
  }

  container.innerHTML = penalties.map(p => {
    let statusClass = "bg-amber-900/60 text-amber-300 border-amber-700";
    if (p.status === "PAID") statusClass = "bg-emerald-900/60 text-emerald-300 border-emerald-700";
    if (p.status === "DELAYED") statusClass = "bg-red-900/60 text-red-300 border-red-700";

    const total = (p.fine_amount || 0) + (p.late_fee || 0);

    return `
      <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition text-xs">
        <td class="py-2.5 px-3 font-mono text-amber-400 font-bold">${p.violation_code}</td>
        <td class="py-2.5 px-3">
          <div class="font-bold text-slate-200">${p.citizen_name}</div>
          <div class="text-[10px] text-slate-400 font-mono">${p.citizen_id}</div>
        </td>
        <td class="py-2.5 px-3 text-slate-300 font-semibold">${p.violation_type}</td>
        <td class="py-2.5 px-3 text-slate-400 text-[11px]">${p.location}</td>
        <td class="py-2.5 px-3 font-mono font-bold text-emerald-400">₹${total}</td>
        <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold border ${statusClass}">${p.status}</span></td>
        <td class="py-2.5 px-3 text-right">
          <button onclick="viewEvidenceImage('${p.evidence_image_url || '/static/images/evidence/road_dumping.jpg'}', '${p.evidence_caption || ''}')" class="text-emerald-400 hover:text-emerald-300 underline text-xs font-semibold">
            View Frame
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function renderAdminWasteChart(breakdown) {
  const canvas = document.getElementById("wasteAnalyticsChart");
  if (!canvas) return;

  const labels = Object.keys(breakdown).length ? Object.keys(breakdown) : ["No submissions yet"];
  const data = Object.keys(breakdown).length ? Object.values(breakdown) : [1];

  if (appState.wasteChart) {
    appState.wasteChart.destroy();
  }

  appState.wasteChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#94a3b8', font: { size: 11 } }
        }
      }
    }
  });
}

// AI Surveillance Simulation Trigger
async function runAIDetectionSimulation() {
  const camCode = document.getElementById("simCameraSelect").value;
  const violationType = document.getElementById("simViolationSelect").value;
  const citizenIdentifier = document.getElementById("simUserSelect").value;

  try {
    const result = await FirestoreService.simulateAIDetection(camCode, violationType, citizenIdentifier);

    Swal.fire({
      icon: 'success',
      title: 'AI Violation Captured! 📸',
      html: `
        <div class="text-xs text-left space-y-2 mt-2">
          <p><strong>Violation Code:</strong> <span class="font-mono text-amber-400">${result.violation_code}</span></p>
          <p><strong>Camera Unit:</strong> ${result.penalty.camera_code} (${result.penalty.camera_name})</p>
          <p><strong>Offense:</strong> <span class="text-red-400 font-bold">${result.penalty.violation_type}</span></p>
          <p><strong>Statutory Fine Allotted:</strong> <span class="text-emerald-400 font-bold">₹${result.penalty.fine_amount}</span></p>
          <p class="text-slate-300">Evidence frame recorded and SMS penalty summons dispatched to resident.</p>
        </div>
      `,
      background: '#1e293b',
      color: '#f8fafc'
    });

    await loadAdminDashboard();

  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Simulation Error', text: err.message, background: '#1e293b', color: '#f8fafc' });
  }
}

function triggerSimulateForCamera(camCode) {
  const simSelect = document.getElementById("simCameraSelect");
  if (simSelect) {
    simSelect.value = camCode;
    document.getElementById("simCameraSelect").scrollIntoView({ behavior: "smooth" });
  }
}

function openReportCameraModal(cameraId, camCode, camName) {
  Swal.fire({
    title: `Report Camera Fault: ${camCode}`,
    html: `
      <div class="text-left text-xs space-y-3">
        <p class="text-slate-300">Report hardware damage or optical obstruction for <strong>${camName}</strong>.</p>
        <div>
          <label class="block text-slate-300 font-semibold mb-1">Issue Category</label>
          <select id="swalTicketCategory" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200">
            <option value="Lens Damaged / Glitch">Lens Damaged / Physical Crack</option>
            <option value="Camera Lens Obstructed">Camera Lens Obstructed (Tree / Signboard)</option>
            <option value="Power Failure / Offline">Power Failure / Solar Inverter Offline</option>
            <option value="IR Night Vision Sensor Fault">IR Night Vision Sensor Fault</option>
            <option value="Other CCTV Operating Issue">Other CCTV Operating Issue</option>
          </select>
        </div>
        <div>
          <label class="block text-slate-300 font-semibold mb-1">Detailed Description</label>
          <textarea id="swalTicketDesc" rows="2" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200" placeholder="e.g. Optical sensor glitch after heavy storm..."></textarea>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Create Technician Ticket',
    confirmButtonColor: '#dc2626',
    background: '#1e293b',
    color: '#f8fafc',
    preConfirm: async () => {
      const cat = document.getElementById("swalTicketCategory").value;
      const desc = document.getElementById("swalTicketDesc").value || "Hardware inspection requested.";
      try {
        await FirestoreService.reportCameraIssue(camCode, camName, "Ward 4", cat, desc, "HIGH");
        return true;
      } catch (err) {
        Swal.showValidationMessage(`Failed: ${err.message}`);
      }
    }
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({ icon: 'success', title: 'Ticket Created', text: 'Camera marked as Damaged and queued for technician repair.', background: '#1e293b', color: '#f8fafc' });
      loadAdminDashboard();
    }
  });
}

function openResolveTicketModal(ticketId, ticketCode, camCode) {
  Swal.fire({
    title: `Resolve Ticket ${ticketCode}`,
    html: `
      <div class="text-left text-xs space-y-2">
        <p class="text-slate-300">Resolving this ticket will restore camera <strong>${camCode}</strong> to <strong>OPERATIONAL (Green)</strong> status.</p>
        <label class="block text-slate-300 font-semibold mb-1">Technician Repair Notes</label>
        <textarea id="swalTechNotes" rows="2" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200" placeholder="e.g. Replaced optical lens and re-calibrated AI object model..."></textarea>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Confirm Repair & Restore',
    confirmButtonColor: '#059669',
    background: '#1e293b',
    color: '#f8fafc',
    preConfirm: async () => {
      const notes = document.getElementById("swalTechNotes").value || "Repaired and restored to operational service.";
      try {
        await FirestoreService.resolveTicket(ticketId, camCode, notes);
        return true;
      } catch (err) {
        Swal.showValidationMessage(`Failed: ${err.message}`);
      }
    }
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({ icon: 'success', title: 'Camera Restored!', text: 'Camera is now fully operational.', background: '#1e293b', color: '#f8fafc' });
      loadAdminDashboard();
    }
  });
}

function dispatchWarningNoticeModal(penaltyId) {
  const penalty = appState.allUsers ? null : null;
  Swal.fire({
    title: `<span class="text-sm font-mono text-red-400">OFFICIAL STATUTORY NOTICE ● DISPATCHED</span>`,
    html: `
      <div class="text-left text-xs space-y-2 p-3 bg-slate-900 rounded-lg border border-red-800">
        <p class="text-slate-200"><strong>Statutory Notice:</strong> FORM-LIT-2026</p>
        <p class="text-slate-300"><strong>Subject:</strong> Immediate Demand for Settlement of Unpaid Municipal Littering Penalty</p>
        <div class="p-2.5 bg-red-950/60 rounded border border-red-800/80 text-red-200 mt-2 font-mono text-[11px]">
          NOTICE: Continued non-payment within 7 calendar days will result in suspension of municipal doorstep waste collection services and formal referral to Municipal Court.
        </div>
        <p class="text-emerald-400 font-semibold text-[11px] mt-2">✓ Simulated SMS & Email statutory notice dispatched to citizen.</p>
      </div>
    `,
    width: 580,
    background: '#1e293b',
    color: '#f8fafc',
    confirmButtonColor: '#059669',
    confirmButtonText: 'Done'
  });
}

// ============================================================
// 6. Unified Authentication Modal (Google / Email / Phone)
// ============================================================
function openUnifiedAuthModal() {
  Swal.fire({
    title: '<span class="text-lg font-bold text-slate-100 flex items-center justify-center gap-2">🔐 Firebase Authentication</span>',
    html: `
      <div class="text-left text-xs mt-2 space-y-4">
        <!-- Auth Provider Tabs -->
        <div class="flex border-b border-slate-700">
          <button type="button" id="tabBtnGoogle" onclick="switchAuthTab('google')" class="flex-1 py-2 font-bold text-emerald-400 border-b-2 border-emerald-500 transition text-center">
            Google
          </button>
          <button type="button" id="tabBtnEmail" onclick="switchAuthTab('email')" class="flex-1 py-2 font-semibold text-slate-400 hover:text-slate-200 transition text-center">
            Email & Password
          </button>
          <button type="button" id="tabBtnPhone" onclick="switchAuthTab('phone')" class="flex-1 py-2 font-semibold text-slate-400 hover:text-slate-200 transition text-center">
            Phone (SMS OTP)
          </button>
        </div>

        <!-- 1. GOOGLE SIGN-IN TAB -->
        <div id="authTabGoogle" class="space-y-3">
          <p class="text-slate-300">Sign in instantly with your verified Google account to generate your dynamic Eco-Pass QR code.</p>
          <button type="button" onclick="handleGoogleSignIn()" class="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold transition flex items-center justify-center gap-3 shadow-lg">
            <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
            Continue with Google
          </button>
        </div>

        <!-- 2. EMAIL / PASSWORD TAB -->
        <div id="authTabEmail" class="hidden space-y-3">
          <div class="flex items-center justify-between pb-1">
            <span id="emailAuthModeLabel" class="text-slate-300 font-bold">Sign In</span>
            <button type="button" onclick="toggleEmailAuthMode()" id="emailAuthToggleBtn" class="text-emerald-400 hover:text-emerald-300 text-[11px] underline">Need an account? Sign Up</button>
          </div>

          <div id="emailNameGroup" class="hidden">
            <label class="block text-slate-300 font-semibold mb-1">Full Name</label>
            <input type="text" id="authEmailName" placeholder="e.g. Maya Lin" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200" />
          </div>

          <div>
            <label class="block text-slate-300 font-semibold mb-1">Email Address</label>
            <input type="email" id="authEmailInput" placeholder="name@domain.com" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-200" />
          </div>

          <div>
            <label class="block text-slate-300 font-semibold mb-1">Password</label>
            <input type="password" id="authEmailPassword" placeholder="••••••••" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200" />
          </div>

          <button type="button" onclick="handleEmailAuthSubmit()" id="btnEmailSubmit" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition">
            Sign In with Email
          </button>
        </div>

        <!-- 3. PHONE SMS OTP TAB -->
        <div id="authTabPhone" class="hidden space-y-3">
          <p class="text-slate-300">Enter your mobile phone number with country code (e.g. +1 or +91).</p>

          <div id="phoneStep1" class="space-y-3">
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Mobile Phone Number</label>
              <input type="tel" id="authPhoneNumber" placeholder="+1 555 234 5678" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-200" />
            </div>

            <button type="button" onclick="handleSendPhoneOTP()" id="btnSendOTP" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition">
              📲 Send Verification SMS Code
            </button>
          </div>

          <div id="phoneStep2" class="hidden space-y-3">
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Enter 6-Digit SMS Verification Code</label>
              <input type="text" id="authOTPCode" placeholder="123456" maxlength="6" class="w-full bg-slate-900 border border-emerald-500 rounded-lg p-2.5 font-mono text-center text-lg tracking-widest text-emerald-400 font-bold" />
            </div>

            <button type="button" onclick="handleVerifyPhoneOTP()" class="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-bold transition">
              Verify & Complete Sign In
            </button>
          </div>
        </div>
      </div>
    `,
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonText: 'Close',
    cancelButtonColor: '#334155',
    background: '#1e293b',
    color: '#f8fafc'
  });
}

let isEmailSignUpMode = false;

window.switchAuthTab = (tab) => {
  document.getElementById("authTabGoogle").classList.toggle("hidden", tab !== 'google');
  document.getElementById("authTabEmail").classList.toggle("hidden", tab !== 'email');
  document.getElementById("authTabPhone").classList.toggle("hidden", tab !== 'phone');

  const btnG = document.getElementById("tabBtnGoogle");
  const btnE = document.getElementById("tabBtnEmail");
  const btnP = document.getElementById("tabBtnPhone");

  btnG.className = tab === 'google' ? "flex-1 py-2 font-bold text-emerald-400 border-b-2 border-emerald-500 transition text-center" : "flex-1 py-2 font-semibold text-slate-400 hover:text-slate-200 transition text-center";
  btnE.className = tab === 'email' ? "flex-1 py-2 font-bold text-emerald-400 border-b-2 border-emerald-500 transition text-center" : "flex-1 py-2 font-semibold text-slate-400 hover:text-slate-200 transition text-center";
  btnP.className = tab === 'phone' ? "flex-1 py-2 font-bold text-emerald-400 border-b-2 border-emerald-500 transition text-center" : "flex-1 py-2 font-semibold text-slate-400 hover:text-slate-200 transition text-center";
};

window.toggleEmailAuthMode = () => {
  isEmailSignUpMode = !isEmailSignUpMode;
  document.getElementById("emailNameGroup").classList.toggle("hidden", !isEmailSignUpMode);
  document.getElementById("emailAuthModeLabel").innerText = isEmailSignUpMode ? "Create New Account" : "Sign In";
  document.getElementById("btnEmailSubmit").innerText = isEmailSignUpMode ? "Sign Up with Email" : "Sign In with Email";
  document.getElementById("emailAuthToggleBtn").innerText = isEmailSignUpMode ? "Already have an account? Sign In" : "Need an account? Sign Up";
};

window.handleGoogleSignIn = async () => {
  try {
    const user = await signInWithGoogle();
    Swal.close();
    Swal.fire({
      icon: 'success',
      title: 'Signed In with Google!',
      text: `Welcome ${user.displayName || user.email}. Your Eco-Pass has been synchronized.`,
      timer: 2000,
      showConfirmButton: false,
      background: '#1e293b',
      color: '#f8fafc'
    });
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Google Sign-In Failed', text: err.message, background: '#1e293b', color: '#f8fafc' });
  }
};

window.handleEmailAuthSubmit = async () => {
  const email = document.getElementById("authEmailInput").value.trim();
  const password = document.getElementById("authEmailPassword").value;
  const name = document.getElementById("authEmailName")?.value.trim() || "";

  if (!email || !password) {
    Swal.showValidationMessage("Please enter both email and password.");
    return;
  }

  try {
    let user;
    if (isEmailSignUpMode) {
      user = await signUpWithEmail(email, password, name);
    } else {
      user = await signInWithEmail(email, password);
    }
    Swal.close();
    Swal.fire({
      icon: 'success',
      title: isEmailSignUpMode ? 'Account Created!' : 'Signed In!',
      text: `Welcome ${user.displayName || user.email}.`,
      timer: 2000,
      showConfirmButton: false,
      background: '#1e293b',
      color: '#f8fafc'
    });
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Authentication Failed', text: err.message, background: '#1e293b', color: '#f8fafc' });
  }
};

window.handleSendPhoneOTP = async () => {
  const phone = document.getElementById("authPhoneNumber").value.trim();
  if (!phone) {
    Swal.showValidationMessage("Please enter a phone number with country code.");
    return;
  }

  const btn = document.getElementById("btnSendOTP");
  btn.disabled = true;
  btn.innerText = "Sending SMS Code...";

  try {
    await sendPhoneOTP(phone);
    document.getElementById("phoneStep1").classList.add("hidden");
    document.getElementById("phoneStep2").classList.remove("hidden");
  } catch (err) {
    btn.disabled = false;
    btn.innerText = "📲 Send Verification SMS Code";
    Swal.fire({ icon: 'error', title: 'SMS Dispatch Failed', text: err.message, background: '#1e293b', color: '#f8fafc' });
  }
};

window.handleVerifyPhoneOTP = async () => {
  const code = document.getElementById("authOTPCode").value.trim();
  if (!code || code.length < 6) {
    Swal.showValidationMessage("Please enter the 6-digit SMS code.");
    return;
  }

  try {
    const user = await verifyPhoneOTP(code);
    Swal.close();
    Swal.fire({
      icon: 'success',
      title: 'Phone Verified!',
      text: `Welcome ${user.phoneNumber}. Your Eco-Pass is active.`,
      timer: 2000,
      showConfirmButton: false,
      background: '#1e293b',
      color: '#f8fafc'
    });
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Verification Failed', text: err.message, background: '#1e293b', color: '#f8fafc' });
  }
};

// Print & Download QR
function printEcoPass() {
  window.print();
}

function downloadEcoPassImage() {
  const qrImg = document.getElementById("passQrImage");
  if (!qrImg || !qrImg.src) return;

  const a = document.createElement("a");
  a.href = qrImg.src;
  a.download = `${appState.currentUser.citizen_id || 'EcoPass'}-QR.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Community Civic & CCTV Problem Reporting Tool
function openCommunityReportModal() {
  const user = appState.currentUser || {};
  const cameras = appState.cameras || [];

  Swal.fire({
    title: '<span class="text-base font-bold text-slate-100 flex items-center gap-2 justify-center"><i data-lucide="alert-triangle" class="w-5 h-5 text-amber-400"></i> Report Civic Problem or CCTV Fault</span>',
    html: `
      <div class="text-left text-xs space-y-3 mt-2">
        <p class="text-slate-300">File an official citizen maintenance ticket directly with the Municipal Surveillance & Sanitation Engineering Desk.</p>

        <div>
          <label class="block text-slate-300 font-semibold mb-1">Select Major Problem Category</label>
          <select id="swalCommCategory" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 text-xs font-semibold focus:border-purple-500 focus:outline-none">
            <option value="Lens Damaged / Physical Glass Crack">📷 Camera Lens Damaged / Physical Glass Crack</option>
            <option value="Camera Lens Obstructed by Trees / Signboards">🌳 Camera Lens Obstructed by Trees / Signboard</option>
            <option value="Illegal Garbage Pileup Hotspot">🚯 Chronic Garbage Littering Hotspot Under Camera</option>
            <option value="Camera Offline / Solar Power Fault">⚡ Camera Offline / Solar Battery Depleted</option>
            <option value="IR Night Vision Sensor Fault">🌙 IR Night Vision Sensor Optical Failure</option>
            <option value="Camera Vandalism / Misaligned Angle">🛠️ Camera Vandalism / Misaligned Angle</option>
            <option value="Open Drain / Hazardous Waste Spill">🚰 Open Drain Overflow / Chemical Waste Spill</option>
            <option value="Damaged Municipal Community Dustbin">🗑️ Broken / Missing Municipal Community Dustbin</option>
            <option value="Other Civic Issue">📌 Other Civic Issue</option>
          </select>
        </div>

        <div>
          <label class="block text-slate-300 font-semibold mb-1">Nearest CCTV Camera Unit (Optional)</label>
          <select id="swalCommCamera" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:border-purple-500 focus:outline-none">
            <option value="CAM-GENERAL">General Street Location (No specific camera)</option>
            ${cameras.map(c => `<option value="${c.camera_code}">${c.camera_code} — ${c.name} (${c.ward})</option>`).join("")}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Municipal Ward</label>
            <input type="text" id="swalCommWard" value="${user.ward || 'Ward 4 - Green Meadows'}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs" />
          </div>
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Urgency Priority</label>
            <select id="swalCommPriority" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs">
              <option value="MEDIUM">Medium (Standard Inspection)</option>
              <option value="HIGH">High (Active Littering / Damage)</option>
              <option value="URGENT">Urgent (Safety / Critical Obstruction)</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-slate-300 font-semibold mb-1">Street Address / Landmark Location</label>
          <input type="text" id="swalCommLandmark" placeholder="e.g. Beside 3rd Ave bus stop, opposite Sunrise Bakery" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs" />
        </div>

        <div>
          <label class="block text-slate-300 font-semibold mb-1">Detailed Problem Description</label>
          <textarea id="swalCommDesc" rows="3" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:border-purple-500 focus:outline-none" placeholder="Describe what you noticed in detail (e.g. Optical lens cracked after heavy storm winds, garbage piling up rapidly under the surveillance pole)..."></textarea>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '🚀 Submit Municipal Ticket',
    confirmButtonColor: '#9333ea',
    cancelButtonColor: '#334155',
    background: '#1e293b',
    color: '#f8fafc',
    preConfirm: async () => {
      const category = document.getElementById("swalCommCategory").value;
      const camCode = document.getElementById("swalCommCamera").value;
      const ward = document.getElementById("swalCommWard").value;
      const priority = document.getElementById("swalCommPriority").value;
      const landmark = document.getElementById("swalCommLandmark").value || ward;
      const desc = document.getElementById("swalCommDesc").value.trim();

      if (!desc) {
        Swal.showValidationMessage("Please write a detailed description of the problem.");
        return;
      }

      try {
        const result = await FirestoreService.reportCommunityIssue(user, {
          issue_category: category,
          camera_code: camCode,
          camera_name: camCode !== "CAM-GENERAL" ? (cameras.find(c => c.camera_code === camCode)?.name || camCode) : "Street Location",
          ward: ward,
          priority: priority,
          location_landmark: landmark,
          description: desc
        });
        return result;
      } catch (err) {
        Swal.showValidationMessage(`Failed: ${err.message}`);
      }
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      const ticket = result.value.ticket;
      Swal.fire({
        icon: 'success',
        title: 'Municipal Ticket Registered! 📋',
        html: `
          <div class="text-xs text-left space-y-1.5 mt-2">
            <p><strong>Statutory Ticket ID:</strong> <span class="font-mono text-purple-400 font-bold">${ticket.ticket_code}</span></p>
            <p><strong>Issue Category:</strong> ${ticket.issue_category}</p>
            <p><strong>Location:</strong> ${ticket.location_landmark} (${ticket.ward})</p>
            <p><strong>Priority:</strong> <span class="text-amber-400 font-bold">${ticket.priority}</span></p>
            <p><strong>Status:</strong> <span class="text-emerald-400 font-bold">QUEUED FOR TECHNICIAN DISPATCH</span></p>
            <p class="text-slate-300 mt-2">Thank you for reporting. Municipal crews will inspect and update the ticket.</p>
          </div>
        `,
        background: '#1e293b',
        color: '#f8fafc',
        confirmButtonColor: '#9333ea'
      });
    }
  });
}

// Event Listeners Helper
function setupEventListeners() {
  // Global helper for opening camera details from map
  window.openCameraDetails = (camCode) => {
    const cam = appState.cameras.find(c => c.camera_code === camCode);
    if (!cam) return;
    openReportCameraModal(cam.camera_code, cam.camera_code, cam.name);
  };

  window.triggerSimulateForCamera = triggerSimulateForCamera;
  window.openCommunityReportModal = openCommunityReportModal;
}
