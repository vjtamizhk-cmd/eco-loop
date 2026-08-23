// Eco Loop Main Application Logic
let appState = {
  currentUser: null,
  allUsers: [],
  currentRole: 'citizen',
  cameras: [],
  penalties: [],
  rewards: [],
  selectedCitizenForCollection: null,
  wasteChart: null
};

const originalFetch = window.fetch.bind(window);
window.fetch = async (...args) => {
  const response = await originalFetch(...args);

  const safeJson = async () => {
    const rawText = await response.text();
    if (!rawText) return null;

    const trimmedText = rawText.trim();
    if (!trimmedText) return null;

    try {
      return JSON.parse(trimmedText);
    } catch (error) {
      const fallbackMessage = trimmedText || "Request failed";
      return {
        detail: fallbackMessage,
        message: fallbackMessage,
        raw: fallbackMessage
      };
    }
  };

  Object.defineProperty(response, "json", {
    value: safeJson,
    configurable: true
  });

  return response;
};

// Initialize App on DOM Load
document.addEventListener("DOMContentLoaded", async () => {
  await loadUsers();
  setupEventListeners();
  lucide.createIcons();
});

// 1. User and Authentication Management
async function loadUsers() {
  try {
    const res = await fetch("/api/auth/users");
    appState.allUsers = await res.json();
    
    // Default to first citizen if not set
    if (!appState.currentUser) {
      appState.currentUser = appState.allUsers.find(u => u.role === 'citizen') || appState.allUsers[0];
    }
    
    renderUserSwitcherDropdown();
    updateUserHeaderUI();
    await switchRole(appState.currentUser.role);
  } catch (err) {
    console.error("Failed to load users:", err);
  }
}

function renderUserSwitcherDropdown() {
  const container = document.getElementById("userSwitcherOptions");
  if (!container) return;

  const citizens = appState.allUsers.filter(u => u.role === 'citizen');
  const collectors = appState.allUsers.filter(u => u.role === 'collector');
  const admins = appState.allUsers.filter(u => u.role === 'admin' || u.role === 'superadmin');

  const renderGroup = (title, icon, users, badgeColor) => `
    <div class="pt-2 pb-1 px-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
      ${icon} ${title}
    </div>
    ${users.map(user => {
      const isSelected = appState.currentUser && appState.currentUser.id === user.id;
      return `
        <div onclick="selectUser(${user.id})" class="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/60 cursor-pointer transition ${isSelected ? 'bg-slate-700/80 border border-emerald-500/40' : ''}">
          <div class="flex items-center gap-2.5">
            <img src="${user.avatar_url}" class="w-7 h-7 rounded-full border border-slate-600 object-cover" />
            <div>
              <div class="text-xs font-semibold text-slate-200">${user.full_name}</div>
              <div class="text-[10px] text-slate-400 font-mono">${user.email}</div>
            </div>
          </div>
          <span class="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${badgeColor}">${user.role}</span>
        </div>
      `;
    }).join("")}
  `;

  container.innerHTML = `
    ${renderGroup('Citizen Personas', '<i data-lucide="user" class="w-3 h-3 text-emerald-400"></i>', citizens, 'bg-emerald-950 text-emerald-300 border border-emerald-800')}
    ${renderGroup('Waste Collectors', '<i data-lucide="truck" class="w-3 h-3 text-amber-400"></i>', collectors, 'bg-amber-950 text-amber-300 border border-amber-800')}
    ${renderGroup('Municipal Admins', '<i data-lucide="shield" class="w-3 h-3 text-purple-400"></i>', admins, 'bg-purple-950 text-purple-300 border border-purple-800')}
  `;
  lucide.createIcons();
}

async function selectUser(userId) {
  const user = appState.allUsers.find(u => u.id === userId);
  if (!user) return;
  
  appState.currentUser = user;
  updateUserHeaderUI();
  toggleUserDropdown(false);
  await switchRole(user.role);

  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: `Authenticated as ${user.full_name} (${user.role.toUpperCase()})`,
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

  if (avatar) avatar.src = user.avatar_url;
  if (name) name.innerText = user.full_name;
  if (email) email.innerText = user.email;
  
  if (roleBadge) {
    roleBadge.innerText = user.role.toUpperCase();
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

// 2. Strict Role-Based View Switching
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

  // Strictly enforce role visibility:
  // Citizens ONLY see citizenView; Collectors ONLY see collectorView; Admins ONLY see adminView.
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
}

// 3. Citizen Portal Functions
async function loadCitizenDashboard() {
  const user = appState.currentUser;
  if (!user) return;

  try {
    const res = await fetch(`/api/citizen/${user.id}/dashboard`);
    const data = await res.json();

    // Render Metrics
    document.getElementById("citizenCreditsBalance").innerText = data.user.eco_credits.toFixed(1);
    document.getElementById("citizenEcoTier").innerText = data.user.tier;
    document.getElementById("citizenTotalWasteKg").innerText = `${data.metrics.total_waste_recycled_kg} kg`;
    document.getElementById("citizenCo2Offset").innerText = `${data.metrics.co2_offset_kg} kg CO₂`;
    document.getElementById("citizenUnpaidFines").innerText = `₹${data.metrics.total_fines_due}`;
    document.getElementById("citizenUnpaidCount").innerText = `${data.metrics.unpaid_penalties_count} active`;

    // Render Dynamic QR Card
    document.getElementById("passCitizenName").innerText = data.user.full_name;
    document.getElementById("passCitizenId").innerText = data.user.citizen_id;
    document.getElementById("passCitizenWard").innerText = data.user.ward;
    document.getElementById("passCitizenEmail").innerText = data.user.email;
    document.getElementById("passQrImage").src = data.qr_image;

    // Render Penalties
    renderCitizenPenalties(data.penalties);

    // Render Recent Collections History
    renderCitizenCollections(data.recent_collections);

    // Render Rewards Catalog
    await loadRewardsCatalog();

    // Render Redemptions History
    renderCitizenRedemptions(data.redemptions);

    // Render Active Doorstep Waste Pickup Requests
    await loadCitizenPickupRequests();

  } catch (err) {
    console.error("Error loading citizen dashboard:", err);
  }
}

async function loadCitizenPickupRequests() {
  const user = appState.currentUser;
  if (!user) return;

  try {
    const res = await fetch(`/api/citizen/${user.id}/pickup-requests`);
    const requests = await res.json();

    const tracker = document.getElementById("citizenActivePickupTracker");
    if (!tracker) return;

    const activeReq = requests.find(r => r.status === "DISPATCHED" || r.status === "ACCEPTED");

    if (activeReq) {
      tracker.classList.remove("hidden");
      const isAccepted = activeReq.status === "ACCEPTED";
      const statusBadge = isAccepted 
        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900 text-emerald-200 border border-emerald-700 animate-pulse">COLLECTOR EN ROUTE 🚛</span>`
        : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-900 text-amber-200 border border-amber-700">DISPATCHED 🟡</span>`;

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
          <div class="text-[11px] text-slate-300 flex items-center justify-between pt-1 border-t border-slate-800">
            <span><strong>Collector:</strong> ${activeReq.collector_name}</span>
            <button onclick="cancelPickupRequest(${activeReq.id})" class="text-red-400 hover:text-red-300 font-bold text-[10px] underline">Cancel Call</button>
          </div>
        </div>
      `;
    } else {
      tracker.classList.add("hidden");
    }
  } catch (err) {
    console.error("Error loading citizen pickup tracker:", err);
  }
}

function openCallCollectorModal() {
  const user = appState.currentUser;
  if (!user) return;

  Swal.fire({
    title: `<span class="text-base font-bold text-slate-100 flex items-center gap-2 justify-center"><i data-lucide="truck" class="w-5 h-5 text-emerald-400"></i> Call Waste Collector to Doorstep</span>`,
    html: `
      <div class="text-left text-xs space-y-3 mt-2">
        <p class="text-slate-300">A municipal collector assigned to <strong>${user.ward}</strong> will receive your call and navigate to your address.</p>

        <div>
          <label class="block text-slate-300 font-semibold mb-1">Waste Category</label>
          <select id="swalPickupCategory" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200">
            <option value="Recyclable Plastic">Recyclable Plastic (Bottles / Containers)</option>
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
          <input type="text" id="swalPickupAddress" value="${user.address}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200" />
        </div>

        <div>
          <label class="block text-slate-300 font-semibold mb-1">Contact Phone</label>
          <input type="text" id="swalPickupPhone" value="${user.phone || '+1 (555) 234-5678'}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-200" />
        </div>

        <div>
          <label class="block text-slate-300 font-semibold mb-1">Doorstep Instructions (Optional)</label>
          <input type="text" id="swalPickupNotes" placeholder="e.g. 2 bags kept beside front door" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200" />
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
        const res = await fetch("/api/citizen/pickup-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            waste_category: cat,
            estimated_weight_kg: weight,
            urgency: urgency,
            address: address,
            phone: phone,
            notes: notes
          })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Dispatch failed");
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
            <p><strong>Tracking Code:</strong> <span class="font-mono text-emerald-400">${result.value.pickup_request.request_code}</span></p>
            <p><strong>Assigned Zone:</strong> ${result.value.pickup_request.ward}</p>
            <p><strong>Status:</strong> <span class="text-emerald-300 font-bold">DISPATCHED TO FIELD UNIT</span></p>
            ${result.value.pickup_request.collector ? `
              <p><strong>Collector:</strong> ${result.value.pickup_request.collector.full_name} (${result.value.pickup_request.collector.is_active ? 'Online' : 'Offline'})</p>
              <p class="text-[11px]">📞 ${result.value.pickup_request.collector.phone || 'Not available'}</p>
            ` : ''}
            <p class="text-slate-400">Keep your Eco-Pass QR and segregated waste ready for doorstep weighing.</p>
          </div>
        `,
        background: '#1e293b',
        color: '#f8fafc',
        confirmButtonColor: '#059669'
      });
      await loadCitizenDashboard();
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
        const response = await fetch(`/api/citizen/pickup-request/${requestId}/cancel`, { method: "POST" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || "Cancel failed");
        Swal.fire({ icon: 'success', title: 'Cancelled', text: 'Pickup request has been cancelled.', background: '#1e293b', color: '#f8fafc' });
        await loadCitizenDashboard();
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
    let statusText = p.status;
    let lateBadge = "";

    if (p.status === "DELAYED") {
      statusClass = "bg-red-900/70 text-red-300 border-red-700 animate-pulse";
      statusText = `OVERDUE (${p.days_overdue}d)`;
      lateBadge = `<div class="text-[11px] text-red-400 font-semibold mt-1">⚠️ +₹${p.late_fee} Late Surcharge added</div>`;
    } else if (p.status === "PAID") {
      statusClass = "bg-emerald-900/60 text-emerald-300 border-emerald-700/60";
      statusText = "CLEARED / PAID";
    } else if (p.status === "DISPUTED") {
      statusClass = "bg-blue-900/60 text-blue-300 border-blue-700/60";
      statusText = "UNDER DISPUTE REVIEW";
    }

    return `
      <div class="glass-card glass-card-hover rounded-xl p-5 border border-slate-700/60 relative overflow-hidden flex flex-col justify-between">
        <div>
          <div class="flex items-start justify-between gap-2 mb-3">
            <div>
              <span class="text-[10px] font-mono uppercase tracking-wider text-slate-400">${p.violation_code}</span>
              <h4 class="text-sm font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
                <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-400"></i>
                ${p.violation_type}
              </h4>
            </div>
            <span class="text-[10px] px-2.5 py-1 rounded-full font-bold border ${statusClass}">
              ${statusText}
            </span>
          </div>

          <!-- CCTV Thumbnail & Details -->
          <div class="relative rounded-lg overflow-hidden border border-slate-700/80 mb-3 bg-slate-900 group cursor-pointer" onclick="openEvidenceModal('${p.evidence_image_url}', '${p.violation_code}', '${p.violation_type}', '${p.evidence_caption}', '${p.camera_name}', '${p.location}')">
            <img src="${p.evidence_image_url}" class="w-full h-32 object-cover transition duration-300 group-hover:scale-105 opacity-90 group-hover:opacity-100" />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent flex items-end p-2">
              <span class="text-[11px] text-slate-300 flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur">
                <i data-lucide="eye" class="w-3 h-3 text-emerald-400"></i> Click to Inspect CCTV Evidence
              </span>
            </div>
          </div>

          <div class="space-y-1.5 text-xs text-slate-300 mb-3">
            <div class="flex justify-between"><span class="text-slate-400">Location:</span> <span class="font-medium text-slate-200 text-right truncate max-w-[180px]">${p.location}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Surveillance Cam:</span> <span class="font-mono text-slate-200">${p.camera_name || 'CAM-AI-01'}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Date Logged:</span> <span>${new Date(p.created_at).toLocaleDateString()}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Payment Due:</span> <span class="${p.status === 'DELAYED' ? 'text-red-400 font-bold' : 'text-amber-300'}">${new Date(p.due_date).toLocaleDateString()}</span></div>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-700/60">
          <div class="flex items-center justify-between mb-3">
            <div>
              <div class="text-[11px] text-slate-400">Total Fine Amount</div>
              <div class="text-lg font-extrabold text-slate-100">₹${p.total_payable}</div>
            </div>
            ${lateBadge}
          </div>

          ${p.status === "UNPAID" || p.status === "DELAYED" ? `
            <div class="flex gap-2">
              <button onclick="openPayPenaltyModal(${p.id}, '${p.violation_code}', ${p.total_payable}, '${p.violation_type}')" class="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5">
                <i data-lucide="credit-card" class="w-3.5 h-3.5"></i> Pay Penalty Online
              </button>
              <button onclick="openDisputeModal(${p.id}, '${p.violation_code}')" class="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 transition" title="Dispute this violation">
                <i data-lucide="help-circle" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          ` : p.status === "PAID" ? `
            <div class="p-2 bg-emerald-950/60 border border-emerald-800/60 rounded-lg flex items-center justify-between text-xs text-emerald-300">
              <span class="flex items-center gap-1.5 font-semibold"><i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400"></i> Penalty Settled</span>
              <span class="font-mono text-[10px] text-slate-400">${p.payment_ref || 'TXN-PAID'}</span>
            </div>
          ` : `
            <div class="p-2 bg-blue-950/60 border border-blue-800/60 rounded-lg text-center text-xs text-blue-300">
              Dispute appeal submitted to municipal magistrate.
            </div>
          `}
        </div>
      </div>
    `;
  }).join("");

  lucide.createIcons();
}

function renderCitizenCollections(collections) {
  const container = document.getElementById("citizenCollectionsTableBody");
  if (!container) return;

  if (collections.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-400 text-xs">No waste handovers recorded yet. Hand over segregated waste to our collectors to earn EcoCredits!</td></tr>`;
    return;
  }

  container.innerHTML = collections.map(c => `
    <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition">
      <td class="py-3 px-3 font-mono text-xs text-slate-400">${c.collection_code}</td>
      <td class="py-3 px-3">
        <span class="font-semibold text-slate-200 text-xs">${c.waste_type}</span>
      </td>
      <td class="py-3 px-3 text-xs text-slate-300 font-mono">${c.weight_kg} kg</td>
      <td class="py-3 px-3 text-xs text-slate-400">${new Date(c.collected_at).toLocaleDateString()}</td>
      <td class="py-3 px-3 text-right">
        <span class="inline-flex items-center gap-1 font-bold text-emerald-400 text-xs bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
          +${c.credits_awarded} <i data-lucide="coins" class="w-3 h-3"></i>
        </span>
      </td>
    </tr>
  `).join("");

  lucide.createIcons();
}

async function loadRewardsCatalog() {
  try {
    const res = await fetch("/api/citizen/rewards");
    appState.rewards = await res.json();
    
    const container = document.getElementById("rewardsGrid");
    if (!container) return;

    container.innerHTML = appState.rewards.map(r => {
      const canAfford = appState.currentUser.eco_credits >= r.credit_cost;

      return `
        <div class="glass-card glass-card-hover rounded-xl p-4 border border-slate-700/60 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
                ${r.category}
              </span>
              <span class="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <i data-lucide="coins" class="w-3.5 h-3.5"></i> ${r.credit_cost} Credits
              </span>
            </div>
            <h4 class="text-sm font-bold text-slate-100 mb-1">${r.title}</h4>
            <p class="text-xs text-slate-400 mb-3">${r.description}</p>
          </div>

          <div class="pt-3 border-t border-slate-700/60 flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-300">${r.value_label}</span>
            <button onclick="redeemRewardItem(${r.id}, '${r.title}', ${r.credit_cost})" class="py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              canAfford 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }" ${!canAfford ? 'disabled' : ''}>
              ${canAfford ? 'Redeem Voucher' : 'Need more credits'}
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

function renderCitizenRedemptions(redemptions) {
  const container = document.getElementById("citizenRedemptionsList");
  if (!container) return;

  if (redemptions.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 col-span-full">No reward vouchers redeemed yet.</p>`;
    return;
  }

  container.innerHTML = redemptions.map(r => `
    <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700 flex items-center justify-between">
      <div>
        <div class="text-xs font-bold text-slate-200">${r.reward_title}</div>
        <div class="text-[11px] font-mono text-emerald-400 tracking-wider font-semibold mt-0.5">Code: ${r.voucher_code}</div>
      </div>
      <div class="text-right">
        <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">${r.status}</span>
        <div class="text-[10px] text-slate-400 mt-1">${new Date(r.redeemed_at).toLocaleDateString()}</div>
      </div>
    </div>
  `).join("");
}

// 4. Collector Portal Functions
async function loadCollectorDashboard() {
  const collector = appState.currentUser;
  if (!collector) return;

  try {
    const res = await fetch(`/api/collector/${collector.id}/logs`);
    const data = await res.json();

    document.getElementById("collectorTodayKg").innerText = `${data.stats.today_total_kg} kg`;
    document.getElementById("collectorTodayCredits").innerText = `${data.stats.today_credits_distributed}`;
    document.getElementById("collectorTodayCount").innerText = `${data.stats.today_collections_count}`;
    document.getElementById("collectorAllTimeKg").innerText = `${data.stats.all_time_kg} kg`;

    // Render Quick Citizens Select for Easy Testing
    renderCollectorCitizenSelector();

    // Render Incoming Citizen On-Demand Pickup Requests
    await loadCollectorPickupRequests();

    // Render Collector Logs Table
    renderCollectorLogs(data.recent_logs);

    // Populate Waste Categories Dropdown
    await loadWasteCategories();

  } catch (err) {
    console.error("Error loading collector dashboard:", err);
  }
}

async function loadCollectorPickupRequests() {
  const collector = appState.currentUser;
  if (!collector) return;

  try {
    const res = await fetch(`/api/collector/${collector.id}/pickup-requests`);
    const pickups = await res.json();

    const container = document.getElementById("collectorPickupRequestsBody");
    if (!container) return;

    if (pickups.length === 0) {
      container.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400 text-xs">No active doorstep pickup requests in your ward right now.</td></tr>`;
      return;
    }

    container.innerHTML = pickups.map(p => {
      let statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">DISPATCHED</span>`;
      if (p.status === 'ACCEPTED') statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 animate-pulse">EN ROUTE</span>`;

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
            <button onclick="acceptAndWeighPickup('${p.citizen_id}', '${p.citizen_name}', '${p.ward}', '${p.waste_category}', ${p.estimated_weight_kg}, ${p.id})" class="py-1.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-[11px] font-bold shadow-md transition flex items-center gap-1.5 ml-auto">
              <i data-lucide="scale" class="w-3.5 h-3.5"></i> Accept & Weigh
            </button>
          </td>
        </tr>
      `;
    }).join("");

    lucide.createIcons();
  } catch (err) {
    console.error("Error loading collector pickup requests:", err);
  }
}

async function acceptAndWeighPickup(citizenId, citizenName, ward, category, weight, requestId) {
  // Mark request as accepted in backend
  try {
    await fetch(`/api/collector/pickup-request/${requestId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collector_id: appState.currentUser.id })
    });
  } catch (e) {
    console.log(e);
  }

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

function renderCollectorCitizenSelector() {
  const container = document.getElementById("quickCitizenSelector");
  if (!container) return;

  const citizens = appState.allUsers.filter(u => u.role === 'citizen');
  container.innerHTML = citizens.map(c => `
    <button onclick="selectCitizenForCollection('${c.citizen_id}', '${c.full_name}', '${c.ward}', ${c.eco_credits})" class="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left transition flex items-center justify-between">
      <div class="flex items-center gap-2">
        <img src="${c.avatar_url}" class="w-7 h-7 rounded-full object-cover" />
        <div>
          <div class="text-xs font-bold text-slate-200">${c.full_name}</div>
          <div class="text-[10px] font-mono text-slate-400">${c.citizen_id} (${c.ward.split(' - ')[0]})</div>
        </div>
      </div>
      <span class="text-xs font-bold text-emerald-400 font-mono">${c.eco_credits} cr</span>
    </button>
  `).join("");
}

function selectCitizenForCollection(citizenId, name, ward, credits) {
  document.getElementById("collectorCitizenInput").value = citizenId;
  document.getElementById("scannedCitizenCard").classList.remove("hidden");
  document.getElementById("scannedCitizenName").innerText = name;
  document.getElementById("scannedCitizenId").innerText = citizenId;
  document.getElementById("scannedCitizenWard").innerText = ward;
  document.getElementById("scannedCitizenBalance").innerText = `${credits} EcoCredits`;
  updateCollectionCreditPreview();
}

async function loadWasteCategories() {
  try {
    const res = await fetch("/api/collector/rates");
    const rates = await res.json();
    const select = document.getElementById("collectorWasteTypeSelect");
    if (!select) return;

    select.innerHTML = rates.map(r => `
      <option value="${r.waste_type}" data-rate="${r.credits_per_kg}">
        ${r.waste_type} (+${r.credits_per_kg} cr/kg)
      </option>
    `).join("");

    updateCollectionCreditPreview();
  } catch (err) {
    console.error("Error loading waste rates:", err);
  }
}

function updateCollectionCreditPreview() {
  const select = document.getElementById("collectorWasteTypeSelect");
  const weightInput = document.getElementById("collectorWeightInput");
  const preview = document.getElementById("collectorCreditsPreview");

  if (!select || !weightInput || !preview) return;

  const selectedOption = select.options[select.selectedIndex];
  const rate = selectedOption ? parseFloat(selectedOption.dataset.rate || 10) : 10;
  const weight = parseFloat(weightInput.value || 0);

  const totalCredits = (weight * rate).toFixed(1);
  preview.innerText = `${totalCredits} Credits`;
}

async function submitWasteCollection() {
  const citizenId = document.getElementById("collectorCitizenInput").value.trim();
  const wasteType = document.getElementById("collectorWasteTypeSelect").value;
  const weight = parseFloat(document.getElementById("collectorWeightInput").value);
  const notes = document.getElementById("collectorNotesInput").value;

  if (!citizenId) {
    Swal.fire({ icon: 'warning', title: 'Missing Citizen', text: 'Please scan a citizen QR code or select a citizen first.', background: '#1e293b', color: '#f8fafc' });
    return;
  }

  if (!weight || weight <= 0) {
    Swal.fire({ icon: 'warning', title: 'Invalid Weight', text: 'Please enter a valid weight in kilograms (> 0 kg).', background: '#1e293b', color: '#f8fafc' });
    return;
  }

  try {
    const res = await fetch("/api/collector/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        citizen_qr_or_id: citizenId,
        collector_id: appState.currentUser.id,
        waste_type: wasteType,
        weight_kg: weight,
        notes: notes
      })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || "Failed to log collection");

    Swal.fire({
      icon: 'success',
      title: 'Waste Handover Logged!',
      html: `
        <div class="text-left text-xs space-y-2 mt-2">
          <p><strong>Citizen:</strong> ${result.collection.citizen_name}</p>
          <p><strong>Category:</strong> ${result.collection.waste_type}</p>
          <p><strong>Weight:</strong> ${result.collection.weight_kg} kg</p>
          <p class="text-emerald-400 text-sm font-bold"><strong>Credits Awarded:</strong> +${result.collection.credits_awarded} EcoCredits</p>
          <p><strong>Citizen New Balance:</strong> ${result.collection.citizen_new_balance} cr</p>
        </div>
      `,
      background: '#1e293b',
      color: '#f8fafc',
      confirmButtonColor: '#059669'
    });

    // Reset Form
    document.getElementById("collectorWeightInput").value = "";
    document.getElementById("collectorNotesInput").value = "";
    await loadCollectorDashboard();
    await loadUsers(); // Refresh balance

  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Collection Failed', text: err.message, background: '#1e293b', color: '#f8fafc' });
  }
}

function renderCollectorLogs(logs) {
  const container = document.getElementById("collectorRecentLogsBody");
  if (!container) return;

  if (logs.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-400 text-xs">No collections logged today yet.</td></tr>`;
    return;
  }

  container.innerHTML = logs.map(l => `
    <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition">
      <td class="py-3 px-3 font-mono text-xs text-slate-400">${l.collection_code}</td>
      <td class="py-3 px-3">
        <div class="text-xs font-bold text-slate-200">${l.citizen_name}</div>
        <div class="text-[10px] text-slate-400 font-mono">${l.citizen_id}</div>
      </td>
      <td class="py-3 px-3 text-xs text-slate-300">${l.waste_type}</td>
      <td class="py-3 px-3 text-xs text-slate-200 font-mono">${l.weight_kg} kg</td>
      <td class="py-3 px-3 text-right font-bold text-emerald-400 text-xs font-mono">+${l.credits_awarded}</td>
    </tr>
  `).join("");
}

// 5. Administrator Command Center Functions
async function loadAdminDashboard() {
  try {
    const res = await fetch("/api/admin/overview");
    const data = await res.json();

    // Render Overview KPIs
    document.getElementById("adminTotalCams").innerText = data.cctv_metrics.total_cameras;
    document.getElementById("adminDamagedCams").innerText = `${data.cctv_metrics.damaged} Damaged / ${data.cctv_metrics.offline} Offline`;
    document.getElementById("adminCamHealthPct").innerText = `${data.cctv_metrics.health_percentage}%`;
    document.getElementById("adminTotalWasteTons").innerText = `${data.waste_metrics.total_recycled_tons} Tons`;
    document.getElementById("adminTotalViolations").innerText = data.penalty_metrics.total_violations;
    document.getElementById("adminOverdueDefaulters").innerText = `${data.penalty_metrics.delayed_count} Overdue`;
    document.getElementById("adminRecoveryRate").innerText = `${data.penalty_metrics.recovery_rate_pct}%`;
    document.getElementById("adminTotalDefaultFines").innerText = `₹${data.penalty_metrics.total_default_amount}`;

    // Load CCTV Cameras & Map
    await loadAdminCameras();

    // Load Maintenance Tickets
    await loadAdminTickets();

    // Load Defaulters Watchlist
    await loadAdminDefaulters();

    // Load Citywide Penalties
    await loadAdminPenalties();

    // Load Waste Analytics Chart
    await loadAdminWasteChart();

    // Load AI Simulator Options
    populateSimulatorDropdowns();

  } catch (err) {
    console.error("Error loading admin dashboard:", err);
  }
}

async function loadAdminCameras() {
  try {
    const res = await fetch("/api/admin/cameras");
    appState.cameras = await res.json();

    // Initialize/update Leaflet map
    initCCTVMap(appState.cameras);

    // Render Camera Grid
    const container = document.getElementById("adminCamerasGrid");
    if (!container) return;

    container.innerHTML = appState.cameras.map(c => {
      let statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">OPERATIONAL</span>`;
      let cardBorder = "border-slate-700/60";

      if (c.status === 'damaged') {
        statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-800 animate-pulse">DAMAGED</span>`;
        cardBorder = "border-red-900/60 bg-red-950/20";
      } else if (c.status === 'offline') {
        statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">OFFLINE</span>`;
        cardBorder = "border-amber-900/60 bg-amber-950/20";
      }

      return `
        <div class="glass-card rounded-xl p-4 border ${cardBorder} flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-2 mb-2">
              <div>
                <span class="text-[10px] font-mono text-slate-400">${c.camera_code}</span>
                <h4 class="text-xs font-bold text-slate-200 mt-0.5">${c.name}</h4>
              </div>
              ${statusBadge}
            </div>
            <div class="text-xs text-slate-400 space-y-1 mb-3">
              <div><strong>Ward:</strong> ${c.ward}</div>
              <div><strong>Location:</strong> ${c.location_name}</div>
              <div><strong>Feed:</strong> ${c.resolution}</div>
              ${c.fault_description ? `<div class="text-red-400 bg-red-950/40 p-2 rounded text-[11px] mt-2 border border-red-900/40"><strong>Issue:</strong> ${c.fault_description}</div>` : ''}
            </div>
          </div>

          <div class="pt-3 border-t border-slate-700/60 flex gap-2">
            ${c.status === 'operational' ? `
              <button onclick="triggerSimulateForCamera(${c.id})" class="flex-1 py-1.5 px-2.5 bg-red-900/80 hover:bg-red-800 text-red-200 rounded text-xs font-semibold transition flex items-center justify-center gap-1">
                <i data-lucide="video" class="w-3.5 h-3.5"></i> Test AI Detection
              </button>
              <button onclick="openReportCameraModal(${c.id}, '${c.camera_code}', '${c.name}')" class="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs border border-slate-700 transition" title="Report Fault">
                <i data-lucide="wrench" class="w-3.5 h-3.5"></i>
              </button>
            ` : `
              <button onclick="openResolveTicketModalForCamera(${c.id}, '${c.camera_code}')" class="flex-1 py-1.5 px-2.5 bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 rounded text-xs font-semibold transition flex items-center justify-center gap-1">
                <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Mark Repaired / Restore
              </button>
            `}
          </div>
        </div>
      `;
    }).join("");

    lucide.createIcons();
  } catch (err) {
    console.error("Error loading cameras:", err);
  }
}

async function loadAdminTickets() {
  try {
    const res = await fetch("/api/admin/tickets");
    const tickets = await res.json();

    const container = document.getElementById("adminTicketsTableBody");
    if (!container) return;

    if (tickets.length === 0) {
      container.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400 text-xs">All surveillance cameras are operational. No open tickets!</td></tr>`;
      return;
    }

    container.innerHTML = tickets.map(t => {
      let statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">OPEN</span>`;
      if (t.status === 'IN_PROGRESS') statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">IN PROGRESS</span>`;
      if (t.status === 'RESOLVED') statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">RESOLVED</span>`;

      return `
        <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition text-xs">
          <td class="py-3 px-3 font-mono text-slate-400">${t.ticket_code}</td>
          <td class="py-3 px-3">
            <div class="font-bold text-slate-200">${t.camera_code}</div>
            <div class="text-[10px] text-slate-400">${t.camera_name}</div>
          </td>
          <td class="py-3 px-3 text-slate-300 font-semibold">${t.issue_category}</td>
          <td class="py-3 px-3 text-slate-400 truncate max-w-xs">${t.description}</td>
          <td class="py-3 px-3">${statusBadge}</td>
          <td class="py-3 px-3 text-right">
            ${t.status !== 'RESOLVED' ? `
              <button onclick="openResolveTicketModal(${t.id}, '${t.ticket_code}', '${t.camera_code}')" class="py-1 px-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold transition">
                Resolve Ticket
              </button>
            ` : `<span class="text-slate-500 font-mono text-[10px]">Closed</span>`}
          </td>
        </tr>
      `;
    }).join("");

    lucide.createIcons();
  } catch (err) {
    console.error("Error loading tickets:", err);
  }
}

async function loadAdminDefaulters() {
  try {
    const res = await fetch("/api/admin/defaulters");
    const defaulters = await res.json();

    const container = document.getElementById("adminDefaultersTableBody");
    if (!container) return;

    if (defaulters.length === 0) {
      container.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400 text-xs">Great news! No overdue penalty defaulters found in your area.</td></tr>`;
      return;
    }

    container.innerHTML = defaulters.map(d => `
      <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition text-xs">
        <td class="py-3 px-3 font-mono text-slate-400">${d.violation_code}</td>
        <td class="py-3 px-3">
          <div class="font-bold text-slate-200">${d.user_name}</div>
          <div class="text-[10px] text-slate-400 font-mono">${d.user_email}</div>
        </td>
        <td class="py-3 px-3 text-slate-300">${d.violation_type}</td>
        <td class="py-3 px-3">
          <span class="px-2 py-0.5 rounded font-mono font-bold bg-red-950 text-red-300 border border-red-800 text-[10px]">
            ${d.days_overdue} Days Late
          </span>
        </td>
        <td class="py-3 px-3 font-extrabold text-slate-100 font-mono">
          ₹${d.total_payable}
          <div class="text-[10px] text-red-400 font-normal">+₹${d.late_fee} late fee</div>
        </td>
        <td class="py-3 px-3 text-right">
          <button onclick="dispatchWarningNoticeModal(${d.id})" class="py-1.5 px-3 bg-red-900/90 hover:bg-red-800 text-red-100 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 ml-auto border border-red-700">
            <i data-lucide="send" class="w-3 h-3"></i> Dispatch Notice
          </button>
        </td>
      </tr>
    `).join("");

    lucide.createIcons();
  } catch (err) {
    console.error("Error loading defaulters:", err);
  }
}

async function loadAdminPenalties() {
  try {
    const res = await fetch("/api/admin/penalties");
    appState.penalties = await res.json();

    const container = document.getElementById("adminAllPenaltiesBody");
    if (!container) return;

    container.innerHTML = appState.penalties.map(p => {
      let statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">${p.status}</span>`;
      if (p.status === 'DELAYED') statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-800 animate-pulse">OVERDUE</span>`;
      if (p.status === 'PAID') statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">PAID</span>`;

      return `
        <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition text-xs">
          <td class="py-3 px-3 font-mono text-slate-400">${p.violation_code}</td>
          <td class="py-3 px-3 font-semibold text-slate-200">${p.user_name}</td>
          <td class="py-3 px-3 text-slate-300">${p.violation_type}</td>
          <td class="py-3 px-3 text-slate-400">${p.location}</td>
          <td class="py-3 px-3 font-mono font-bold text-slate-200">₹${p.total_payable}</td>
          <td class="py-3 px-3">${statusBadge}</td>
          <td class="py-3 px-3 text-right">
            <button onclick="openEvidenceModal('${p.evidence_image_url}', '${p.violation_code}', '${p.violation_type}', '${p.evidence_caption}', '${p.camera_name}', '${p.location}')" class="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition" title="View CCTV Frame">
              <i data-lucide="eye" class="w-3.5 h-3.5"></i>
            </button>
          </td>
        </tr>
      `;
    }).join("");

    lucide.createIcons();
  } catch (err) {
    console.error("Error loading all penalties:", err);
  }
}

async function loadAdminWasteChart() {
  try {
    const res = await fetch("/api/admin/analytics/waste-chart");
    const chartData = await res.json();

    const canvas = document.getElementById("wasteAnalyticsChart");
    if (!canvas) return;

    if (appState.wasteChart) {
      appState.wasteChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    appState.wasteChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: chartData.labels,
        datasets: [{
          data: chartData.data,
          backgroundColor: [
            '#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6'
          ],
          borderWidth: 2,
          borderColor: '#0f172a'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
          }
        }
      }
    });
  } catch (err) {
    console.error("Error loading waste chart:", err);
  }
}

function populateSimulatorDropdowns() {
  const camSelect = document.getElementById("simCameraSelect");
  const userSelect = document.getElementById("simUserSelect");

  if (camSelect && appState.cameras.length > 0) {
    camSelect.innerHTML = appState.cameras
      .filter(c => c.status === 'operational')
      .map(c => `<option value="${c.id}">${c.camera_code} - ${c.name} (${c.ward.split(' - ')[0]})</option>`)
      .join("");
  }

  if (userSelect && appState.allUsers.length > 0) {
    const citizens = appState.allUsers.filter(u => u.role === 'citizen');
    userSelect.innerHTML = citizens
      .map(u => `<option value="${u.id}">${u.full_name} (${u.citizen_id}) - ${u.email}</option>`)
      .join("");
  }
}

function triggerSimulateForCamera(cameraId) {
  const camSelect = document.getElementById("simCameraSelect");
  if (camSelect) camSelect.value = cameraId;
  
  // Scroll to simulator section
  document.getElementById("aiSimulatorCard").scrollIntoView({ behavior: 'smooth' });
}

async function runAIDetectionSimulation() {
  const cameraId = parseInt(document.getElementById("simCameraSelect").value);
  const userId = parseInt(document.getElementById("simUserSelect").value);
  const violationType = document.getElementById("simViolationSelect").value;
  const customNotes = document.getElementById("simNotesInput").value;

  if (!cameraId || !userId) {
    Swal.fire({ icon: 'warning', title: 'Incomplete Parameters', text: 'Please select both an operational CCTV Camera and a Citizen.', background: '#1e293b', color: '#f8fafc' });
    return;
  }

  try {
    const res = await fetch("/api/detection/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        camera_id: cameraId,
        user_id: userId,
        violation_type: violationType,
        custom_notes: customNotes
      })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || "Simulation failed");

    Swal.fire({
      icon: 'success',
      title: '🚨 CCTV AI Optical Detection Triggered!',
      html: `
        <div class="text-left text-xs space-y-2 mt-2">
          <p><strong>Violation Code:</strong> <span class="font-mono text-amber-400">${result.penalty.violation_code}</span></p>
          <p><strong>Offense:</strong> ${result.penalty.violation_type}</p>
          <p><strong>Citizen Allotted:</strong> ${result.penalty.user_name}</p>
          <p><strong>Location:</strong> ${result.penalty.location}</p>
          <p class="text-red-400 font-bold text-sm"><strong>Statutory Fine:</strong> ₹${result.penalty.total_payable}</p>
          <p class="text-slate-400 text-[11px]">AI Optical evidence snapshot captured and penalty record dispatched.</p>
        </div>
      `,
      background: '#1e293b',
      color: '#f8fafc',
      confirmButtonColor: '#dc2626'
    });

    await loadAdminDashboard();
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Simulation Error', text: err.message, background: '#1e293b', color: '#f8fafc' });
  }
}

// 6. Modals & Actions
function openEvidenceModal(imageUrl, code, type, caption, camName, location) {
  Swal.fire({
    title: `<span class="text-sm font-mono text-red-400">CCTV EVIDENCE ● ${code}</span>`,
    html: `
      <div class="text-left">
        <div class="rounded-lg overflow-hidden border border-slate-700 mb-3 bg-slate-950">
          <img src="${imageUrl}" class="w-full h-64 object-cover" />
        </div>
        <div class="space-y-1 text-xs text-slate-300">
          <p><strong>Offense:</strong> <span class="text-slate-100 font-bold">${type}</span></p>
          <p><strong>Optical Tag:</strong> ${caption}</p>
          <p><strong>Camera:</strong> <span class="font-mono">${camName}</span></p>
          <p><strong>Location:</strong> ${location}</p>
        </div>
      </div>
    `,
    width: 600,
    background: '#1e293b',
    color: '#f8fafc',
    confirmButtonColor: '#059669',
    confirmButtonText: 'Close Frame'
  });
}

function openPayPenaltyModal(penaltyId, violationCode, amount, violationType) {
  Swal.fire({
    title: `<span class="text-base font-bold text-slate-100">Pay Penalty Online</span>`,
    html: `
      <div class="text-left text-xs space-y-3">
        <div class="p-3 bg-slate-800 rounded-lg border border-slate-700">
          <div class="flex justify-between text-slate-400"><span>Violation Code:</span> <span class="font-mono text-slate-200">${violationCode}</span></div>
          <div class="flex justify-between text-slate-400"><span>Violation Type:</span> <span class="text-slate-200">${violationType}</span></div>
          <div class="flex justify-between text-slate-200 font-bold text-sm mt-1 pt-1 border-t border-slate-700"><span>Payable Amount:</span> <span class="text-emerald-400">₹${amount}</span></div>
        </div>

        <div>
          <label class="block text-slate-300 font-semibold mb-1">Select Payment Method</label>
          <select id="swalPaymentMethod" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200">
            <option value="CARD">Credit / Debit Card (Instant Clearance)</option>
            <option value="UPI">UPI / Google Pay / PhonePe</option>
            <option value="NETBANKING">Municipal NetBanking Portal</option>
          </select>
        </div>

        <div>
          <label class="block text-slate-300 font-semibold mb-1">Card / UPI ID (Simulated)</label>
          <input type="text" id="swalPayRef" value="4532 •••• •••• 8812" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-200" />
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: `Authorize ₹${amount}`,
    confirmButtonColor: '#059669',
    cancelButtonColor: '#334155',
    background: '#1e293b',
    color: '#f8fafc',
    preConfirm: async () => {
      const method = document.getElementById("swalPaymentMethod").value;
      const ref = document.getElementById("swalPayRef").value;
      
      try {
        const res = await fetch(`/api/citizen/penalties/${penaltyId}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payment_method: method })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Payment failed");
        return result;
      } catch (err) {
        Swal.showValidationMessage(`Payment failed: ${err.message}`);
      }
    }
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({
        icon: 'success',
        title: 'Payment Successful! 🎉',
        html: `
          <div class="text-xs text-left space-y-1.5 mt-2">
            <p><strong>Receipt Reference:</strong> <span class="font-mono text-emerald-400">${result.value.penalty.payment_ref}</span></p>
            <p><strong>Status:</strong> <span class="text-emerald-300 font-bold">CLEARED / PAID</span></p>
            <p class="text-slate-400">Your penalty is cleared and your citizen record is updated.</p>
          </div>
        `,
        background: '#1e293b',
        color: '#f8fafc',
        confirmButtonColor: '#059669'
      });
      loadCitizenDashboard();
    }
  });
}

function openDisputeModal(penaltyId, violationCode) {
  Swal.fire({
    title: 'Dispute Penalty Violation',
    html: `
      <div class="text-left text-xs space-y-2">
        <p class="text-slate-300">Submit an appeal for violation <strong>${violationCode}</strong> if you believe this was an erroneous camera detection or unauthorized vehicle use.</p>
        <textarea id="swalDisputeReason" rows="3" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200" placeholder="Explain the reason for dispute..."></textarea>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Submit Dispute',
    confirmButtonColor: '#2563eb',
    background: '#1e293b',
    color: '#f8fafc',
    preConfirm: async () => {
      const reason = document.getElementById("swalDisputeReason").value;
      if (!reason) {
        Swal.showValidationMessage("Please provide a reason for the dispute.");
        return;
      }
      try {
        const res = await fetch(`/api/citizen/penalties/${penaltyId}/dispute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dispute_reason: reason })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Dispute failed");
        return result;
      } catch (err) {
        Swal.showValidationMessage(`Dispute failed: ${err.message}`);
      }
    }
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({
        icon: 'success',
        title: 'Dispute Submitted',
        text: 'Your appeal has been queued for municipal officer review.',
        background: '#1e293b',
        color: '#f8fafc'
      });
      loadCitizenDashboard();
    }
  });
}

async function redeemRewardItem(rewardId, title, cost) {
  Swal.fire({
    title: 'Redeem EcoReward',
    text: `Are you sure you want to spend ${cost} EcoCredits for '${title}'?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Confirm & Redeem',
    confirmButtonColor: '#059669',
    background: '#1e293b',
    color: '#f8fafc'
  }).then(async (res) => {
    if (res.isConfirmed) {
      try {
        const response = await fetch(`/api/citizen/rewards/redeem?user_id=${appState.currentUser.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reward_id: rewardId })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || "Redemption failed");

        Swal.fire({
          icon: 'success',
          title: 'Reward Voucher Issued! 🎁',
          html: `
            <div class="text-left text-xs space-y-2 mt-2">
              <p><strong>Voucher Code:</strong> <span class="font-mono text-emerald-400 font-bold text-sm">${result.voucher_code}</span></p>
              <p><strong>Item:</strong> ${result.reward_title}</p>
              <p><strong>Credits Spent:</strong> ${result.credits_spent} cr</p>
              <p class="text-slate-400">Present this voucher code at partner utility/retail outlets to claim your rebate.</p>
            </div>
          `,
          background: '#1e293b',
          color: '#f8fafc',
          confirmButtonColor: '#059669'
        });

        await loadCitizenDashboard();
        await loadUsers();
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Redemption Failed', text: err.message, background: '#1e293b', color: '#f8fafc' });
      }
    }
  });
}

function openReportCameraModal(cameraId, code, name) {
  Swal.fire({
    title: `Report CCTV Fault: ${code}`,
    html: `
      <div class="text-left text-xs space-y-3">
        <div>
          <label class="block text-slate-300 font-semibold mb-1">Issue Category</label>
          <select id="swalIssueCategory" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200">
            <option value="Physical Damage / Broken Lens">Physical Damage / Shattered Optical Lens</option>
            <option value="Connection / Network Offline">Connection / RTSP Stream Lost</option>
            <option value="Camera Lens Obstructed">Lens Obstructed / Vegetation / Paint</option>
            <option value="AI Tracking Calibration Glitch">AI Detection Glitch</option>
          </select>
        </div>
        <div>
          <label class="block text-slate-300 font-semibold mb-1">Detailed Description</label>
          <textarea id="swalIssueDesc" rows="3" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200" placeholder="Describe camera issue..."></textarea>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Submit Maintenance Ticket',
    confirmButtonColor: '#dc2626',
    background: '#1e293b',
    color: '#f8fafc',
    preConfirm: async () => {
      const cat = document.getElementById("swalIssueCategory").value;
      const desc = document.getElementById("swalIssueDesc").value;
      if (!desc) {
        Swal.showValidationMessage("Please provide a description of the issue.");
        return;
      }
      try {
        const res = await fetch(`/api/admin/cameras/${cameraId}/report-issue`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            camera_id: cameraId,
            issue_category: cat,
            description: desc,
            priority: "HIGH"
          })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Report failed");
        return result;
      } catch (err) {
        Swal.showValidationMessage(`Failed: ${err.message}`);
      }
    }
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({
        icon: 'success',
        title: 'Maintenance Ticket Created',
        text: `Camera marked as DAMAGED/OFFLINE and technician ticket generated.`,
        background: '#1e293b',
        color: '#f8fafc'
      });
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
        <textarea id="swalTechNotes" rows="2" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200" placeholder="e.g. Replaced cracked optical lens and re-calibrated AI object model..."></textarea>
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
        const res = await fetch(`/api/admin/tickets/${ticketId}/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ technician_notes: notes })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Resolve failed");
        return result;
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

function openResolveTicketModalForCamera(cameraId, camCode) {
  // Find open ticket for camera
  Swal.fire({
    title: `Restore Camera ${camCode}`,
    text: `Mark this CCTV as fully repaired and restore live AI tracking?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Restore Operational Status',
    confirmButtonColor: '#059669',
    background: '#1e293b',
    color: '#f8fafc'
  }).then(async (res) => {
    if (res.isConfirmed) {
      await fetch(`/api/admin/cameras/${cameraId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "operational", fault_description: "" })
      });
      Swal.fire({ icon: 'success', title: 'Restored', text: `Camera ${camCode} is operational.`, background: '#1e293b', color: '#f8fafc' });
      loadAdminDashboard();
    }
  });
}

function dispatchWarningNoticeModal(penaltyId) {
  fetch(`/api/admin/defaulters/${penaltyId}/send-notice`, { method: "POST" })
    .then(r => r.json())
    .then(data => {
      const n = data.notice;
      Swal.fire({
        title: `<span class="text-sm font-mono text-red-400">OFFICIAL STATUTORY NOTICE ● ${n.notice_number}</span>`,
        html: `
          <div class="text-left text-xs space-y-2 p-3 bg-slate-900 rounded-lg border border-red-800">
            <p><strong>Issued To:</strong> ${n.citizen_name} (${n.email})</p>
            <p><strong>Citizen ID:</strong> ${n.citizen_id}</p>
            <p><strong>Offense:</strong> ${n.violation_type} (Cam: ${n.camera_code})</p>
            <p><strong>Days Delinquent:</strong> <span class="text-red-400 font-bold">${n.days_overdue} days</span></p>
            <p><strong>Total Statutory Dues:</strong> <span class="text-red-400 font-extrabold text-sm">₹${n.total_amount_due}</span></p>
            <div class="p-2.5 bg-red-950/60 rounded border border-red-800/80 text-red-200 mt-2 font-mono text-[11px]">
              ${n.warning_text}
            </div>
            <p class="text-emerald-400 font-semibold text-[11px] mt-2">✓ Simulated SMS & Email notice dispatched to citizen.</p>
          </div>
        `,
        width: 580,
        background: '#1e293b',
        color: '#f8fafc',
        confirmButtonColor: '#059669',
        confirmButtonText: 'Done'
      });
    });
}

async function handleGoogleCredentialResponse(response) {
  if (!response || !response.credential) {
    Swal.fire({ icon: 'error', title: 'Google Sign-In Failed', text: 'No credential was returned by Google.', background: '#1e293b', color: '#f8fafc' });
    return;
  }

  try {
    const res = await fetch("/api/auth/google-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential })
    });
    const user = await res.json();
    if (!res.ok) throw new Error(user.detail || "Google login failed");

    Swal.close();
    await loadUsers();
    await selectUser(user.id);
    Swal.fire({
      icon: 'success',
      title: 'Google Account Connected!',
      text: `Welcome ${user.full_name}. Your Eco-Pass has been generated using your real Google account.`,
      background: '#1e293b',
      color: '#f8fafc'
    });
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Google Sign-In Failed', text: err.message, background: '#1e293b', color: '#f8fafc' });
  }
}

function renderGoogleLoginButton(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return false;

  if (!window.ECO_LOOP_GOOGLE_CLIENT_ID || !window.google?.accounts?.id) {
    container.innerHTML = '<div class="text-[11px] text-slate-400">Real Google sign-in is not configured for this environment.</div>';
    return false;
  }

  container.innerHTML = '';
  window.google.accounts.id.initialize({
    client_id: window.ECO_LOOP_GOOGLE_CLIENT_ID,
    callback: handleGoogleCredentialResponse
  });
  window.google.accounts.id.renderButton(container, {
    theme: 'filled_black',
    size: 'large',
    type: 'standard',
    text: 'continue_with',
    shape: 'pill',
    logo_alignment: 'left',
    width: '100%'
  });
  return true;
}

function openGoogleSignInModal() {
  const hasRealGoogle = !!window.ECO_LOOP_GOOGLE_CLIENT_ID && !!window.google?.accounts?.id;

  Swal.fire({
    title: 'Connect Google Account',
    html: `
      <div class="text-left text-xs space-y-3">
        <div class="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
          <svg class="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
          <div>
            <div class="font-bold text-slate-200">Google Identity Services</div>
            <div class="text-slate-400 text-[11px]">Use your real Google account or the demo profile for testing.</div>
          </div>
        </div>

        ${hasRealGoogle ? `
          <div class="space-y-2">
            <div class="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Real Google sign-in</div>
            <div id="googleSignInButtonWrapper" class="w-full"></div>
          </div>
        ` : `
          <div class="rounded-lg border border-slate-700 bg-slate-900/60 p-2 text-[11px] text-slate-400">
            Real Google sign-in is disabled until a Google OAuth client ID is configured.
          </div>
        `}

        <div class="border-t border-slate-800 pt-3 space-y-3">
          <div class="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Demo mode (simulation)</div>
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Full Name</label>
            <input type="text" id="swalGoogleName" value="Kavita Krishnan" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200" />
          </div>

          <div>
            <label class="block text-slate-300 font-semibold mb-1">Gmail Address</label>
            <input type="email" id="swalGoogleEmail" value="kavita.krishnan@gmail.com" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-200" />
          </div>

          <button type="button" id="demoGoogleLoginBtn" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2.5 font-semibold transition">
            Use Demo Google Profile
          </button>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Sign in with Google',
    confirmButtonColor: '#059669',
    background: '#1e293b',
    color: '#f8fafc',
    didOpen: () => {
      if (hasRealGoogle) {
        renderGoogleLoginButton("googleSignInButtonWrapper");
      }

      const demoButton = document.getElementById("demoGoogleLoginBtn");
      if (demoButton) {
        demoButton.addEventListener("click", async () => {
          const name = document.getElementById("swalGoogleName").value.trim();
          const email = document.getElementById("swalGoogleEmail").value.trim();

          if (!name || !email) {
            Swal.showValidationMessage("Please provide both a name and Gmail address.");
            return;
          }

          try {
            const res = await fetch("/api/auth/google-login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name,
                email,
                avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`
              })
            });
            const user = await res.json();
            if (!res.ok) throw new Error(user.detail || "Google demo login failed" );
            Swal.close();
            await loadUsers();
            await selectUser(user.id);
            Swal.fire({
              icon: 'success',
              title: 'Demo Google Account Connected!',
              text: `Welcome ${user.full_name}. Your simulated Google profile is active.`,
              background: '#1e293b',
              color: '#f8fafc'
            });
          } catch (err) {
            Swal.fire({ icon: 'error', title: 'Demo Google Login Failed', text: err.message, background: '#1e293b', color: '#f8fafc' });
          }
        });
      }
    }
  });
}

function printEcoPass() {
  window.print();
}

function downloadEcoPassImage() {
  const qrImg = document.getElementById("passQrImage");
  if (!qrImg || !qrImg.src) return;

  const a = document.createElement("a");
  a.href = qrImg.src;
  a.download = `${appState.currentUser.citizen_id}-EcoPass-QR.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Event Listeners Helper
function setupEventListeners() {
  // Navigation Role Tabs
  document.querySelectorAll(".nav-role-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const role = tab.dataset.role;
      switchRole(role);
    });
  });

  // Global helper for opening camera details from map
  window.openCameraDetails = (camId) => {
    const cam = appState.cameras.find(c => c.id === camId);
    if (!cam) return;
    openReportCameraModal(cam.id, cam.camera_code, cam.name);
  };

  window.triggerSimulateForCamera = triggerSimulateForCamera;
}
