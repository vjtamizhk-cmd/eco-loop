// ============================================================
// Firebase Configuration & Authentication Service
// Eco Loop - Smart Waste Management Platform
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCYfb9QucotkjoHSkn6nlo_cfXGJMWEGIs",
  authDomain: "eco-loops.firebaseapp.com",
  projectId: "eco-loops",
  storageBucket: "eco-loops.firebasestorage.app",
  messagingSenderId: "529117528133",
  appId: "1:529117528133:web:e8b9bb2d41d0ba11a4a32c",
  measurementId: "G-SFEE7XLKNE"
};

// Initialize Firebase App
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Global Firebase service references
const auth = firebase.auth();
const db = firebase.firestore();

// Global Auth State
let currentAuthUser = null;
let currentProfile = null;

// Global Promise for initial auth ready
let _authReadyResolve;
const authReadyPromise = new Promise(resolve => { _authReadyResolve = resolve; });

// Auth State Observer
auth.onAuthStateChanged(async (user) => {
  currentAuthUser = user;
  if (user) {
    console.log("🔐 Firebase Auth: Signed in as", user.email || user.phoneNumber || user.uid);
    try {
      currentProfile = await ensureUserProfile(user);
      if (window.onUserProfileLoaded) {
        await window.onUserProfileLoaded(currentProfile);
      }
    } catch (e) {
      console.error("Error loading user profile:", e);
    }
  } else {
    console.log("🔓 Firebase Auth: User is signed out");
    currentProfile = null;
    if (window.onUserSignedOut) {
      window.onUserSignedOut();
    }
  }
  if (_authReadyResolve) {
    _authReadyResolve(user);
    _authReadyResolve = null;
  }
});

// ============================================================
// User Profile Management (Firestore)
// ============================================================
async function ensureUserProfile(firebaseUser) {
  const userRef = db.collection("users").doc(firebaseUser.uid);
  const snap = await userRef.get();

  const userEmail = (firebaseUser.email || "").toLowerCase();
  let assignedRole = "citizen";
  if (userEmail.includes("collector")) {
    assignedRole = "collector";
  } else if (userEmail.includes("admin") || userEmail.includes("director") || userEmail.endsWith("@ecoloop.gov")) {
    assignedRole = "admin";
  }

  if (!snap.exists) {
    // Generate unique Citizen ID derived deterministically from UID (range 2000 - 9999)
    const uidStr = firebaseUser.uid || "";
    let hash = 0;
    for (let i = 0; i < uidStr.length; i++) {
      hash = ((hash << 5) - hash) + uidStr.charCodeAt(i);
      hash |= 0;
    }
    const uniqueNum = Math.abs(hash) % 8000 + 2000;
    const citizenPrefix = assignedRole === "collector" ? "ECO-COL" : assignedRole === "admin" ? "ECO-ADM" : "ECO-CTZ";
    const citizenId = `${citizenPrefix}-${uniqueNum}`;
    const qrToken = citizenId;

    const profile = {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      citizen_id: citizenId,
      email: firebaseUser.email || "",
      full_name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split("@")[0] : (assignedRole === "collector" ? "Eco Collector" : assignedRole === "admin" ? "Municipal Admin" : "Eco Citizen")),
      avatar_url: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`,
      phone: firebaseUser.phoneNumber || "+1 (555) 234-5678",
      address: "124 Green Valley Road, Apt 4B",
      ward: assignedRole === "admin" ? "Citywide Operations" : "Ward 4 - Green Meadows",
      role: assignedRole,
      qr_token: qrToken,
      eco_credits: 50.0,
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
      is_active: true
    };

    await userRef.set(profile);
    console.log(`✅ Created unique ${assignedRole} profile:`, citizenId);
    return profile;
  } else {
    const existing = snap.data();
    existing.id = snap.id;

    const updates = {};

    // Ensure role is preserved or recognized
    if (!existing.role) {
      existing.role = assignedRole;
      updates.role = assignedRole;
    }

    // Sync display name or avatar if updated from provider
    if (firebaseUser.displayName && firebaseUser.displayName !== existing.full_name) {
      updates.full_name = firebaseUser.displayName;
      existing.full_name = firebaseUser.displayName;
    }
    if (firebaseUser.photoURL && firebaseUser.photoURL !== existing.avatar_url) {
      updates.avatar_url = firebaseUser.photoURL;
      existing.avatar_url = firebaseUser.photoURL;
    }
    if (Object.keys(updates).length > 0) {
      await userRef.update(updates);
    }
    return existing;
  }
}

// ============================================================
// Authentication Methods
// ============================================================

// 1. Google Sign-In (Popup)
async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await auth.signInWithPopup(provider);
    return result.user;
  } catch (error) {
    console.error("Google Sign-In failed:", error);
    throw error;
  }
}

// 2. Email / Password Sign Up
async function signUpWithEmail(email, password, displayName) {
  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    if (displayName) {
      await result.user.updateProfile({ displayName });
    }
    return result.user;
  } catch (error) {
    console.error("Email Sign-Up failed:", error);
    throw error;
  }
}

// 3. Email / Password Sign In
async function signInWithEmail(email, password) {
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    return result.user;
  } catch (error) {
    console.error("Email Sign-In failed:", error);
    throw error;
  }
}

// 4. Phone SMS OTP Setup & Verification
let recaptchaVerifierInstance = null;

function getRecaptchaVerifier(containerId = "recaptcha-container") {
  if (!recaptchaVerifierInstance) {
    recaptchaVerifierInstance = new firebase.auth.RecaptchaVerifier(containerId, {
      size: "invisible",
      callback: () => {
        console.log("reCAPTCHA solved");
      }
    });
  }
  return recaptchaVerifierInstance;
}

async function sendPhoneOTP(phoneNumber) {
  try {
    const verifier = getRecaptchaVerifier();
    const confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, verifier);
    window.phoneConfirmationResult = confirmationResult;
    return confirmationResult;
  } catch (error) {
    console.error("Phone OTP send failed:", error);
    if (recaptchaVerifierInstance) {
      recaptchaVerifierInstance.clear();
      recaptchaVerifierInstance = null;
    }
    throw error;
  }
}

async function verifyPhoneOTP(verificationCode) {
  if (!window.phoneConfirmationResult) {
    throw new Error("No active phone verification in progress. Please request OTP first.");
  }
  try {
    const result = await window.phoneConfirmationResult.confirm(verificationCode);
    return result.user;
  } catch (error) {
    console.error("OTP verification failed:", error);
    throw error;
  }
}

// 5. Sign Out
async function signOutUser() {
  try {
    await auth.signOut();
  } catch (error) {
    console.error("Sign-out failed:", error);
    throw error;
  }
}
