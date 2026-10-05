// CCTV Interactive Leaflet Map Manager
let cctvMap = null;
let cameraMarkers = [];

function initCCTVMap(cameras = []) {
  const mapContainer = document.getElementById("cctvMapContainer");
  if (!mapContainer) return;

  if (cctvMap) {
    cctvMap.remove();
    cctvMap = null;
  }

  // Keep the municipal view centered on Chennai, Tamil Nadu.
  const defaultLat = 13.0827;
  const defaultLng = 80.2707;

  cctvMap = L.map('cctvMapContainer', {
    zoomControl: true,
    attributionControl: false
  }).setView([defaultLat, defaultLng], 13);

  // Tactical dark ops map tiles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(cctvMap);

  renderCameraMarkers(cameras);
}

function renderCameraMarkers(cameras) {
  if (!cctvMap) return;

  // Clear existing markers
  cameraMarkers.forEach(m => cctvMap.removeLayer(m));
  cameraMarkers = [];

  const bounds = [];

  cameras.forEach(cam => {
    let color = '#10b981'; // Green (operational)
    let statusBadge = '<span class="px-2 py-0.5 text-xs rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold font-mono">OPERATIONAL</span>';
    
    if (cam.status === 'damaged') {
      color = '#ef4444'; // Red
      statusBadge = '<span class="px-2 py-0.5 text-xs rounded bg-red-950 text-red-300 border border-red-800 font-semibold font-mono">DAMAGED</span>';
    } else if (cam.status === 'obstructed' || cam.status === 'offline') {
      color = '#f59e0b'; // Amber
      statusBadge = '<span class="px-2 py-0.5 text-xs rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold font-mono">OBSTRUCTED</span>';
    }

    // Custom SVG Camera Marker with glowing ring
    const customIcon = L.divIcon({
      className: 'custom-cctv-marker',
      html: `
        <div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px ${color}88; border: 2px solid #ffffff;">
          <svg style="width: 15px; height: 15px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
    });

    const marker = L.marker([cam.latitude, cam.longitude], { icon: customIcon }).addTo(cctvMap);

    const popupContent = `
      <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; min-width: 220px; color: #f8fafc; padding: 4px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <strong style="font-size: 13px; font-family: 'JetBrains Mono', monospace; color: #34d399;">${cam.camera_code}</strong>
          ${statusBadge}
        </div>
        <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 4px;"><strong>Name:</strong> ${cam.name}</div>
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;"><strong>Ward:</strong> ${cam.ward}</div>
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;"><strong>Location:</strong> ${cam.location_desc || ''}</div>
        ${cam.fault_description ? `<div style="font-size: 11px; background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4); padding: 5px 8px; border-radius: 6px; margin-bottom: 8px;"><strong>Issue:</strong> ${cam.fault_description}</div>` : ''}
        <div style="display: flex; gap: 6px; margin-top: 8px;">
          <button onclick="window.openCameraDetails('${cam.camera_code}')" style="flex: 1; padding: 6px 10px; font-size: 11px; background: #059669; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700;">Report Issue</button>
          ${cam.status === 'operational' ? `<button onclick="window.triggerSimulateForCamera('${cam.camera_code}')" style="flex: 1; padding: 6px 10px; font-size: 11px; background: #b91c1c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700;">Simulate AI</button>` : ''}
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);
    cameraMarkers.push(marker);
    bounds.push([cam.latitude, cam.longitude]);
  });

  if (bounds.length > 0) {
    cctvMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
  } else {
    cctvMap.setView([defaultLat, defaultLng], 11);
  }
}
