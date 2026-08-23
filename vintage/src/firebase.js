// Firebase Configuration & Auth Module
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";

// Firebase configuration for pen-fight-35857
const firebaseConfig = {
  apiKey: "AIzaSyDzFzkCIm_n8PPOltPDApb_x3MkXWTw8Fw",
  authDomain: "pen-fight-35857.firebaseapp.com",
  projectId: "pen-fight-35857",
  storageBucket: "pen-fight-35857.firebasestorage.app",
  messagingSenderId: "959866306910",
  appId: "1:959866306910:web:95a1ff4ef0aab6090c4fcf",
  measurementId: "G-1F9KZ5LMQ3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// --- Auth State Management ---
let currentUser = null;

/** Sign in with Google popup */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    currentUser = user;
    console.log("✅ Signed in as:", user.displayName);
    return user;
  } catch (error) {
    console.error("❌ Google Sign-In error code:", error.code);
    console.error("❌ Google Sign-In error message:", error.message);
    console.error("❌ Full error:", error);
    
    // Show user-friendly error messages
    if (error.code === 'auth/unauthorized-domain') {
      alert(`Sign-in failed: This domain is not authorized.\n\nGo to Firebase Console → Authentication → Settings → Authorized Domains and add "localhost".`);
    } else if (error.code === 'auth/popup-closed-by-user') {
      console.log("ℹ️ User closed the sign-in popup");
    } else if (error.code === 'auth/popup-blocked') {
      alert('Pop-up was blocked by your browser. Please allow pop-ups for this site.');
    } else {
      alert(`Sign-in error: ${error.code}\n${error.message}`);
    }
    throw error;
  }
}

/** Sign out */
export async function logOut() {
  try {
    await signOut(auth);
    currentUser = null;
    console.log("✅ Signed out");
  } catch (error) {
    console.error("❌ Sign-out error:", error);
    throw error;
  }
}

/** Get current user */
export function getCurrentUser() {
  return currentUser;
}

/** Listen to auth state changes */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    currentUser = user;
    callback(user);
  });
}

export { auth, app };
