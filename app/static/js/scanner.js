// QR Code Scanner Manager for Collectors
let html5QrCodeScanner = null;
let isScannerActive = false;

async function startQRScanner(onSuccessCallback) {
  const qrReaderDiv = document.getElementById("qrReaderContainer");
  if (!qrReaderDiv) return;

  if (isScannerActive) {
    stopQRScanner();
    return;
  }

  try {
    qrReaderDiv.classList.remove("hidden");
    html5QrCodeScanner = new Html5Qrcode("qrReader");

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    await html5QrCodeScanner.start(
      { facingMode: "environment" },
      config,
      (decodedText, decodedResult) => {
        // Success
        console.log("QR Scanned successfully:", decodedText);
        stopQRScanner();
        if (onSuccessCallback) onSuccessCallback(decodedText);
      },
      (errorMessage) => {
        // Ignore frame read errors
      }
    );

    isScannerActive = true;
    document.getElementById("btnToggleScanner").innerText = "🛑 Stop Camera Scanner";
  } catch (err) {
    console.warn("Camera scanner could not be started (permission or hardware issue):", err);
    Swal.fire({
      icon: "info",
      title: "Camera Access Notice",
      text: "Camera could not be accessed directly (permissions or HTTP). You can use the instant 'Quick Select Citizen' buttons or manual Citizen ID input below!",
      background: "#1e293b",
      color: "#f8fafc",
      confirmButtonColor: "#059669"
    });
    stopQRScanner();
  }
}

async function stopQRScanner() {
  if (html5QrCodeScanner && isScannerActive) {
    try {
      await html5QrCodeScanner.stop();
      html5QrCodeScanner.clear();
    } catch (e) {
      console.log(e);
    }
  }
  isScannerActive = false;
  const qrReaderDiv = document.getElementById("qrReaderContainer");
  if (qrReaderDiv) qrReaderDiv.classList.add("hidden");
  
  const toggleBtn = document.getElementById("btnToggleScanner");
  if (toggleBtn) toggleBtn.innerText = "📷 Start Camera QR Scanner";
}
