import { router } from '../router';
import { appStore } from '../store';
import { supabase } from '../lib/supabase';
import { UsersRepo } from '../repositories/users.repo';

export const authRoute = {
  path: '#auth',
  render: async () => {
    return `
      <div class="auth-container animate-fade-in">
        <div class="floating-notes-container">
          <div class="note note-1">♫</div>
          <div class="note note-2">♩</div>
          <div class="note note-3">♬</div>
          <div class="note note-4">♪</div>
          <div class="note note-5">♫</div>
        </div>

        <div class="auth-card-wrapper">
          <div class="auth-logo-section">
            <div class="guitar-icon-animation">
              <svg viewBox="0 0 100 100" class="guitar-svg">
                <!-- Body -->
                <path d="M 40,70 C 25,60 25,45 35,35 C 45,25 55,25 65,35 C 75,45 75,60 60,70 C 50,75 50,75 40,70 Z" fill="url(#guitarBodyGrad)" />
                <!-- Hole -->
                <circle cx="50" cy="50" r="10" fill="#0a0a0f" stroke="#fbbf24" stroke-width="2" />
                <!-- Neck -->
                <rect x="47" y="5" width="6" height="30" fill="#8b5cf6" />
                <!-- Frets -->
                <line x1="47" y1="12" x2="53" y2="12" stroke="#ffffff" stroke-width="1.5" />
                <line x1="47" y1="20" x2="53" y2="20" stroke="#ffffff" stroke-width="1.5" />
                <line x1="47" y1="28" x2="53" y2="28" stroke="#ffffff" stroke-width="1.5" />
                <!-- Head -->
                <polygon points="45,-2 55,-2 57,6 43,6" fill="#7c3aed" />
                <!-- Strings -->
                <line x1="48" y1="2" x2="48" y2="60" stroke="rgba(255,255,255,0.7)" stroke-width="0.8" />
                <line x1="49" y1="2" x2="49" y2="60" stroke="rgba(255,255,255,0.7)" stroke-width="0.8" />
                <line x1="50" y1="2" x2="50" y2="60" stroke="rgba(255,255,255,0.7)" stroke-width="0.8" />
                <line x1="51" y1="2" x2="51" y2="60" stroke="rgba(255,255,255,0.7)" stroke-width="0.8" />
                <line x1="52" y1="2" x2="52" y2="60" stroke="rgba(255,255,255,0.7)" stroke-width="0.8" />
                
                <defs>
                  <linearGradient id="guitarBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#7c3aed" />
                    <stop offset="50%" stop-color="#db2777" />
                    <stop offset="100%" stop-color="#f59e0b" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 class="app-title">GuitarMind AI</h1>
            <p class="app-subtitle">Your AI Guitar Teacher, Available 24/7</p>
          </div>

          <div class="glass-card auth-card">
            <!-- Tab selector -->
            <div class="tab-bar mb-6">
              <button id="tab-login" class="tab-item tab-item-active">Sign In</button>
              <button id="tab-signup" class="tab-item">Sign Up</button>
            </div>

            <!-- Login Form -->
            <form id="auth-form" class="flex flex-col gap-4">
              <div class="input-group">
                <label class="input-label" for="auth-email">Email Address</label>
                <input type="email" id="auth-email" class="input" placeholder="rocker@guitarmind.ai" required />
              </div>
              <div class="input-group">
                <label class="input-label" for="auth-password">Password</label>
                <input type="password" id="auth-password" class="input" placeholder="••••••••" required />
              </div>
              
              <button type="submit" id="btn-submit" class="btn btn-primary w-full mt-2">
                <span>Let's Jam</span>
              </button>
            </form>

            <div class="divider mt-6 mb-6">
              <span class="divider-line"></span>
              <span class="divider-text">OR</span>
              <span class="divider-line"></span>
            </div>

            <!-- Google Authentication Button -->
            <button id="btn-google" class="btn btn-secondary w-full">
              <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <button id="btn-bypass-auth" class="btn btn-primary w-full mt-3" style="background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); border: none;">
              <span>Developer / Demo Bypass</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },
  onMount: () => {
    const tabLogin = document.getElementById('tab-login') as HTMLButtonElement;
    const tabSignup = document.getElementById('tab-signup') as HTMLButtonElement;
    const btnSubmit = document.getElementById('btn-submit') as HTMLButtonElement;
    const btnSubmitText = document.querySelector('#btn-submit span') as HTMLSpanElement;
    const authForm = document.getElementById('auth-form') as HTMLFormElement;
    const btnGoogle = document.getElementById('btn-google') as HTMLButtonElement;
    
    let isSignUpMode = false;

    const setMode = (signup: boolean) => {
      isSignUpMode = signup;
      if (isSignUpMode) {
        tabSignup.classList.add('tab-item-active');
        tabLogin.classList.remove('tab-item-active');
        btnSubmitText.textContent = 'Create Account';
      } else {
        tabLogin.classList.add('tab-item-active');
        tabSignup.classList.remove('tab-item-active');
        btnSubmitText.textContent = "Let's Jam";
      }
    };

    tabLogin.addEventListener('click', () => setMode(false));
    tabSignup.addEventListener('click', () => setMode(true));

    // Helper to transition state on successful authentication
    const loginSuccess = async (uid: string, email: string, name: string) => {
      appStore.setState({ isLoading: true });
      try {
        // Try fetching user profile from Supabase
        let user = await UsersRepo.getUser(uid);
        
        if (!user) {
          // Initialize first-time user details (onboarding incomplete)
          user = {
            uid,
            displayName: name || email.split('@')[0] || 'Rocker',
            email,
            onboardingComplete: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            isPremium: false,
            unlockedAchievements: [],
            coachPersonality: 'maya',
            profile: { age: 25, country: 'US', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' },
            musicalBackground: {
              skillLevel: 'beginner',
              yearsPlaying: 0,
              favoriteGenres: [],
              guitarTypes: ['acoustic'],
              favoriteArtists: [],
              targetSongs: [],
              otherInstruments: [],
              canReadSheetMusic: false,
              knowsMusicTheory: false,
            },
            goals: {
              primaryGoal: '',
              dailyPracticeMinutes: 15,
              practiceDays: [1, 2, 3, 4, 5],
              shortTermGoals: [],
              longTermGoals: [],
            },
            aiConfig: {
              provider: 'gemini',
              model: 'gemini-2.0-flash',
              temperature: 0.7,
              maxTokens: 1000,
              streaming: true,
              apiKeyEncrypted: '',
            },
            stats: {
              totalSessions: 0,
              totalPracticeMinutes: 0,
              currentStreak: 0,
              longestStreak: 0,
              chordsMastered: 0,
              songsLearned: 0,
              scalesMastered: 0,
              totalXP: 0,
              currentLevel: 1,
              averageSessionScore: 0,
              lastPracticeDate: '',
              achievementsUnlocked: 0,
              lessonsCompleted: 0,
              theoryModulesCompleted: 0,
            },
            calendarIntegrations: [],
            settings: {
              theme: 'dark',
              language: 'en',
              pushNotifications: true,
              emailNotifications: false,
              soundEffects: true,
              hapticFeedback: true,
              defaultBPM: 80,
              preferredTuning: 'standard',
              notationPreference: 'tab',
              autoRecordSessions: false,
              countdownDuration: 3,
              learningStyle: 'visual',
            },
          };
          // Insert initial placeholder user/profile rows into database
          await UsersRepo.upsertUser(user);
        }

        localStorage.setItem('guitarmind_offline_session', JSON.stringify(user));
        localStorage.setItem('guitarmind_active_uid', user.uid);

        appStore.setState({
          currentUser: user,
          isAuthenticated: true,
          isLoading: false
        });

        // Redirect based on onboarding completeness
        if (user.onboardingComplete) {
          router.navigate('#home');
        } else {
          router.navigate('#onboarding');
        }
      } catch (err) {
        console.error('Error handling login success:', err);
        appStore.setState({ isLoading: false });
        alert('Authentication failed to initialize user profile.');
      }
    };

    // Handle authentication form submission
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = (document.getElementById('auth-email') as HTMLInputElement).value;
      const password = (document.getElementById('auth-password') as HTMLInputElement).value;

      btnSubmit.disabled = true;
      const originalText = btnSubmitText.textContent;
      btnSubmitText.textContent = isSignUpMode ? 'Creating...' : 'Signing In...';

      try {
        if (isSignUpMode) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });
          if (error) throw error;
          if (data.user) {
            alert('Signup successful! Check your email for validation or continue.');
            await loginSuccess(data.user.id, data.user.email || email, email.split('@')[0]);
          } else {
            throw new Error('No user data returned from signup.');
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          if (data.user) {
            await loginSuccess(data.user.id, data.user.email || email, email.split('@')[0]);
          } else {
            throw new Error('No user data returned from signin.');
          }
        }
      } catch (err: any) {
        console.error('Auth error:', err);
        alert(err.message || 'Authentication failed. Please try again.');
        btnSubmit.disabled = false;
        btnSubmitText.textContent = originalText;
      }
    });

    btnGoogle.addEventListener('click', async () => {
      btnGoogle.disabled = true;
      const originalContent = btnGoogle.innerHTML;
      btnGoogle.innerHTML = '<span>Connecting to Google...</span>';
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + '/'
          }
        });
        if (error) throw error;
      } catch (err: any) {
        console.error('Google Auth error:', err);
        alert(err.message || 'Google authentication failed.');
        btnGoogle.disabled = false;
        btnGoogle.innerHTML = originalContent;
      }
    });

    const btnBypassAuth = document.getElementById('btn-bypass-auth') as HTMLButtonElement;
    if (btnBypassAuth) {
      btnBypassAuth.addEventListener('click', async () => {
        btnBypassAuth.disabled = true;
        btnBypassAuth.textContent = 'Bypassing...';
        await loginSuccess('offline_user_id', 'rocker@local.guitarmind', 'Offline Rocker');
      });
    }
  },
  onUnmount: () => {
    console.log('Unmounting Auth Route');
  }
};

