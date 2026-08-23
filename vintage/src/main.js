import { GameManager } from './gameplay/GameManager.js';
import { sound } from './audio/SoundEngine.js';
import { signInWithGoogle, logOut, onAuthChange, getCurrentUser } from './firebase.js';

// --- Auth UI Helpers ---
function showLoginScreen() {
  const login = document.getElementById('login-screen');
  const menu = document.getElementById('main-menu');
  if (login) login.classList.remove('hidden');
  if (menu) menu.classList.add('hidden');
}

function hideLoginScreen() {
  const login = document.getElementById('login-screen');
  if (login) login.classList.add('hidden');
}

function updateUserBadge(user) {
  const badge = document.getElementById('user-profile-badge');
  const avatar = document.getElementById('user-avatar');
  const displayName = document.getElementById('user-display-name');

  if (user && badge) {
    avatar.src = user.photoURL || '';
    avatar.style.display = user.photoURL ? 'block' : 'none';
    displayName.textContent = user.displayName || user.email || 'Player';
    badge.classList.remove('hidden');
  } else if (badge) {
    badge.classList.add('hidden');
  }
}

function showMainMenu() {
  hideLoginScreen();
  const menu = document.getElementById('main-menu');
  if (menu) menu.classList.remove('hidden');
}

// Initialize Game on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  const game = new GameManager();
  window.game = game;

  // Initialize Web Audio context on first user gesture
  const initAudio = () => {
    sound.init();
    window.removeEventListener('click', initAudio);
    window.removeEventListener('touchstart', initAudio);
    window.removeEventListener('keydown', initAudio);
  };

  window.addEventListener('click', initAudio);
  window.addEventListener('touchstart', initAudio);
  window.addEventListener('keydown', initAudio);

  // --- Firebase Auth Integration ---

  // Google Sign-In Button
  const googleBtn = document.getElementById('btn-google-signin');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      googleBtn.classList.add('loading');
      try {
        await signInWithGoogle();
        // Auth state listener will handle the rest
      } catch (err) {
        console.error('Sign-in failed:', err);
        googleBtn.classList.remove('loading');
        // Show error feedback
        const prompt = document.querySelector('.login-prompt');
        if (prompt) {
          prompt.textContent = '❌ Sign-in failed. Please try again.';
          prompt.style.color = '#ff6b6b';
          setTimeout(() => {
            prompt.textContent = 'Sign in to save your progress, unlock pens, and compete on leaderboards!';
            prompt.style.color = '#9ab3a5';
          }, 3000);
        }
      }
    });
  }

  // Guest Play Button
  const guestBtn = document.getElementById('btn-play-guest');
  if (guestBtn) {
    guestBtn.addEventListener('click', () => {
      sound.playClick();
      showMainMenu();
      updateUserBadge(null);
    });
  }

  // Sign Out Button
  const signoutBtn = document.getElementById('btn-signout');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', async () => {
      sound.playClick();
      await logOut();
      updateUserBadge(null);
      showLoginScreen();
    });
  }

  // Listen for auth state changes
  onAuthChange((user) => {
    if (user) {
      console.log(`🎮 Welcome, ${user.displayName || user.email}!`);
      hideLoginScreen();
      updateUserBadge(user);

      // Pre-fill player name with Google display name
      const p1NameInput = document.getElementById('mp-name-p1');
      if (p1NameInput && user.displayName) {
        p1NameInput.value = user.displayName.split(' ')[0]; // First name
      }

      // Show main menu
      showMainMenu();

      // Remove loading state from button
      if (googleBtn) googleBtn.classList.remove('loading');
    } else {
      // Not signed in — show login screen, hide main menu
      showLoginScreen();
      updateUserBadge(null);
    }
  });

  console.log("🏫 Vintage School Pen Fight 3D - Full View Gameplay loaded successfully!");
});
