import './styles/index.css';
import { router } from './router';
import { authRoute } from './pages/auth';
import { onboardingRoute } from './pages/onboarding';
import { dashboardRoute } from './pages/dashboard';
import { tunerRoute } from './pages/tuner';
import { coachRoute } from './pages/coach';
import { settingsRoute } from './pages/settings';
import { practiceRoute } from './pages/practice';
import { songsRoute } from './pages/songs';
import { jamRoute } from './pages/jam';
import { youtubeRoute } from './pages/youtube';
import { theoryRoute } from './pages/theory-module';
import { earTrainingRoute } from './pages/ear-training';
import { calendarRoute } from './pages/calendar';
import { visionRoute } from './pages/vision';
import { adminRoute } from './pages/admin';
import { appStore } from './store';
import { icons } from './components/icons';

// Register all routes in the hash router
router.register(authRoute);
router.register(onboardingRoute);
router.register(dashboardRoute);
router.register(tunerRoute);
router.register(coachRoute);
router.register(settingsRoute);
router.register(practiceRoute);
router.register(songsRoute);
router.register(jamRoute);
router.register(youtubeRoute);
router.register(theoryRoute);
router.register(earTrainingRoute);
router.register(calendarRoute);
router.register(visionRoute);
router.register(adminRoute);

// Theme loader utility
function loadTheme(): void {
  const { theme } = appStore.getState();
  const html = document.documentElement;
  if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
  } else {
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.setAttribute('data-theme', sysDark ? 'dark' : 'light');
  }
}

// Start up the application
const bootstrap = async () => {
  // Check if we have an offline session saved
  const offlineUserStr = localStorage.getItem('guitarmind_offline_session');
  if (offlineUserStr) {
    try {
      const user = JSON.parse(offlineUserStr);
      appStore.setState({
        currentUser: user,
        isAuthenticated: true,
        isLoading: false
      });
      loadTheme();
      setTimeout(() => {
        router.start();
      }, 1000);
      return;
    } catch (e) {
      console.error('Failed to parse offline session', e);
    }
  }

  // Initialize loading state
  appStore.setState({ isLoading: true });

  // PocketBase does not use real-time auth listeners.
  // Authentication is handled via the Developer Bypass button (offline mode).
  // The offline session is already restored above from localStorage.

  // If no session was found above, mark as unauthenticated
  if (!appStore.getState().isAuthenticated) {
    appStore.setState({ isLoading: false });
    if (!window.location.hash || window.location.hash === '#auth') {
      window.location.hash = '#auth';
    }
  }

  // Load user settings theme
  loadTheme();

  // Show a premium loading animation while bootstrapping the app modules
  const appContainer = document.getElementById('app');
  if (appContainer) {
    appContainer.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background-color: #0a0a0f;
        color: #ffffff;
        font-family: 'Outfit', sans-serif;
      ">
        <div class="animate-pulse-slow flex justify-center text-primary-color" style="filter: drop-shadow(0 0 15px rgba(124,58,237,0.5));">
          ${icons.music('w-16 h-16')}
        </div>
        <h2 style="margin-top: 1rem; letter-spacing: -0.01em;">GuitarMind AI</h2>
        <p style="font-size: 0.8rem; color: #9898a6; margin-top: 0.25rem;">Tuning the engines...</p>
      </div>
    `;
  }

  // Register Service Worker for offline capability
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      console.log('ServiceWorker registration successful with scope: ', reg.scope);
    }).catch((err) => {
      console.error('ServiceWorker registration failed: ', err);
    });
  }

  // Brief delay to let animations/dom stabilize
  setTimeout(() => {
    router.start();
  }, 1000);
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
