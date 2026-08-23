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

  // Default center coordinates (Ward 4 & Ward 7 zone)
  const defaultLat = 37.7760;
  const defaultLng = -122.4160;

  cctvMap = L.map('cctvMapContainer', {
    zoomControl: true,
    attributionControl: false
  }).setView([defaultLat, defaultLng], 14);

  // Dark modern map tiles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
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
    let statusBadge = '<span class="px-2 py-0.5 text-xs rounded bg-emerald-900 text-emerald-300 font-semibold">OPERATIONAL</span>';
    
    if (cam.status === 'damaged') {
      color = '#ef4444'; // Red
      statusBadge = '<span class="px-2 py-0.5 text-xs rounded bg-red-900 text-red-300 font-semibold animate-pulse">DAMAGED</span>';
    } else if (cam.status === 'offline') {
      color = '#f59e0b'; // Amber
      statusBadge = '<span class="px-2 py-0.5 text-xs rounded bg-amber-900 text-amber-300 font-semibold">OFFLINE</span>';
    }

    // Custom SVG Camera Marker
    const customIcon = L.divIcon({
      className: 'custom-cctv-marker',
      html: `
        <div style="background-color: ${color}; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px ${color}; border: 2px solid white;">
          <svg style="width: 18px; height: 18px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -18]
    });

    const marker = L.marker([cam.latitude, cam.longitude], { icon: customIcon }).addTo(cctvMap);

    const popupContent = `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 220px; color: #0f172a; padding: 4px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <strong style="font-size: 14px;">${cam.camera_code}</strong>
          ${statusBadge}
        </div>
        <div style="font-size: 12px; color: #475569; margin-bottom: 4px;"><strong>Location:</strong> ${cam.location_name}</div>
        <div style="font-size: 12px; color: #475569; margin-bottom: 4px;"><strong>Ward:</strong> ${cam.ward}</div>
        <div style="font-size: 12px; color: #475569; margin-bottom: 8px;"><strong>Feed:</strong> ${cam.resolution}</div>
        ${cam.fault_description ? `<div style="font-size: 11px; background: #fee2e2; color: #991b1b; padding: 4px 6px; border-radius: 4px; margin-bottom: 8px;"><strong>Issue:</strong> ${cam.fault_description}</div>` : ''}
        <div style="display: flex; gap: 6px;">
          <button onclick="window.openCameraDetails(${cam.id})" style="flex: 1; padding: 4px 8px; font-size: 11px; background: #059669; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Inspect Feed</button>
          ${cam.status === 'operational' ? `<button onclick="window.triggerSimulateForCamera(${cam.id})" style="flex: 1; padding: 4px 8px; font-size: 11px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Simulate AI</button>` : ''}
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);
    cameraMarkers.push(marker);
    bounds.push([cam.latitude, cam.longitude]);
  });

  if (bounds.length > 0) {
    cctvMap.fitBounds(bounds, { padding: [40, 40] });
  }
}
