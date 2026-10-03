import { appStore } from '../store';
import { renderNav, setupNavEvents } from '../components/nav';
import { router } from '../router';
import { COACH_PERSONALITIES } from '@guitarmind/core';
import { supabase } from '../lib/supabase';
import { UsersRepo } from '../repositories/users.repo';
import type { User } from '@guitarmind/core';
import { AIService } from '../services/ai';
import { icons } from '../components/icons';


export const settingsRoute = {
  path: '#settings',
  render: async () => {
    const user = appStore.getState().currentUser;
    const name = user ? user.displayName : 'Guitarist';
    const email = user ? user.email : 'rishe@guitarmind.ai';
    const coachId = user ? user.coachPersonality : 'maya';
    const theme = appStore.getState().theme;

    const coach = COACH_PERSONALITIES[coachId] || COACH_PERSONALITIES.maya;

    return `
      <div class="settings-page-container animate-fade-in mb-16">
        <main class="settings-main">
          
          <!-- Header -->
          <header class="mb-6">
            <h4 class="text-xs text-muted-color m-0 uppercase font-semibold">User Controls</h4>
            <h2 class="m-0">Settings</h2>
          </header>

          <!-- User Card -->
          <section class="glass-card flex items-center gap-4 mb-6">
            <div class="avatar avatar-lg flex justify-center items-center bg-glass border-glass text-primary-color">
              ${icons.user('w-10 h-10')}
            </div>
            <div class="flex-grow">
              <h3 class="m-0">${name}</h3>
              <p class="text-xs text-muted-color m-0">${email}</p>
              <span class="badge badge-success mt-2">Level 2 Shredder</span>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('edit-display-name')?.focus()">Edit Name</button>
          </section>

          <!-- Edit Profile Section -->
          <section class="glass-card mb-6">
            <h3 class="section-title mb-4">Edit Profile</h3>
            <form id="edit-profile-form" class="flex flex-col gap-3">
              <div class="input-group">
                <label class="input-label" for="edit-display-name">Display Name</label>
                <input type="text" id="edit-display-name" class="input" value="${name}" required />
              </div>
              <div class="input-group">
                <label class="input-label" for="edit-guitar-type">Guitar Model/Type</label>
                <select id="edit-guitar-type" class="select">
                  <option value="acoustic" ${(user?.musicalBackground?.guitarTypes?.[0] === 'acoustic' || !user?.musicalBackground?.guitarTypes?.[0]) ? 'selected' : ''}>Acoustic Guitar</option>
                  <option value="electric" ${user?.musicalBackground?.guitarTypes?.[0] === 'electric' ? 'selected' : ''}>Electric Guitar</option>
                  <option value="classical" ${user?.musicalBackground?.guitarTypes?.[0] === 'classical' ? 'selected' : ''}>Classical Guitar</option>
                  <option value="bass" ${user?.musicalBackground?.guitarTypes?.[0] === 'bass' ? 'selected' : ''}>Bass Guitar</option>
                </select>
              </div>
              <div class="input-group">
                <label class="input-label" for="edit-coach">Preferred Coach</label>
                <select id="edit-coach" class="select">
                  <option value="maya" ${coachId === 'maya' ? 'selected' : ''}>Maya (Encouraging & Creative)</option>
                  <option value="axel" ${coachId === 'axel' ? 'selected' : ''}>Axel (Intense Rock Specialist)</option>
                  <option value="professor_chen" ${coachId === 'professor_chen' ? 'selected' : ''}>Professor Chen (Analytical & Theoretical)</option>
                  <option value="maestro_antonio" ${coachId === 'maestro_antonio' ? 'selected' : ''}>Maestro Antonio (Classical & Expressive)</option>
                  <option value="general" ${coachId === 'general' ? 'selected' : ''}>General AI Assistant</option>
                </select>
              </div>
              <button type="submit" class="btn btn-primary w-full mt-2">
                <span>Save Profile</span>
              </button>
            </form>
          </section>

          <!-- Settings Sections -->
          <div class="settings-sections-wrapper flex flex-col gap-6">

            <!-- Appearance -->
            <section class="glass-card">
              <h3 class="section-title mb-4">Appearance</h3>
              <div class="setting-item flex justify-between items-center py-2">
                <div>
                  <h4 class="m-0">Color Theme</h4>
                  <p class="text-xs text-muted-color m-0">Toggle between light and dark modes.</p>
                </div>
                <select id="theme-select" class="select select-sm w-auto">
                  <option value="dark" ${theme === 'dark' ? 'selected' : ''}>Dark Mode</option>
                  <option value="light" ${theme === 'light' ? 'selected' : ''}>Light Mode</option>
                  <option value="system" ${theme === 'system' ? 'selected' : ''}>System Default</option>
                </select>
              </div>
            </section>

            <!-- AI Integration -->
            <section class="glass-card">
              <h3 class="section-title mb-4">AI Coach Engine</h3>
              
              <div class="setting-item flex justify-between items-center py-3 border-bottom mb-4">
                <div>
                  <h4 class="m-0">Active Coach</h4>
                  <p class="text-xs text-muted-color m-0">Your current teacher is **${coach.name}**.</p>
                </div>
                <button class="btn btn-secondary" onclick="window.location.hash='#coach'">Switch Coach</button>
              </div>

              <form id="edit-ai-form" class="flex flex-col gap-3">
                <div class="input-group">
                  <label class="input-label" for="settings-ai-provider">AI Provider</label>
                  <select id="settings-ai-provider" class="select">
                    <option value="groq" ${user?.aiConfig?.provider === 'groq' ? 'selected' : ''}>Groq (Default)</option>
                    <option value="openrouter" ${user?.aiConfig?.provider === 'openrouter' ? 'selected' : ''}>OpenRouter</option>
                    <option value="gemini" ${user?.aiConfig?.provider === 'gemini' ? 'selected' : ''}>Google Gemini</option>
                    <option value="openai" ${user?.aiConfig?.provider === 'openai' ? 'selected' : ''}>OpenAI</option>
                    <option value="claude" ${user?.aiConfig?.provider === 'claude' ? 'selected' : ''}>Claude</option>
                  </select>
                </div>

                <div class="input-group">
                  <label class="input-label" for="settings-ai-key">API Key</label>
                  <div class="flex gap-2">
                    <input type="password" id="settings-ai-key" class="input flex-grow text-sm" placeholder="No key connected. Enter API key..." style="font-family: monospace;" />
                    <button type="button" id="btn-settings-validate-key" class="btn btn-secondary btn-sm">Validate</button>
                  </div>
                  <div id="settings-validation-status" class="text-xs mt-1 font-semibold text-muted-color"></div>
                </div>

                <div class="flex gap-2 mt-2">
                  <button type="submit" class="btn btn-primary flex-grow">
                    <span>Save AI Config</span>
                  </button>
                  <button type="button" id="btn-settings-clear-key" class="btn btn-danger btn-sm">
                    <span>Delete Key</span>
                  </button>
                </div>
              </form>
            </section>

            <!-- Notifications -->
            <section class="glass-card">
              <h3 class="section-title mb-4">Notifications</h3>
              <div class="setting-item flex justify-between items-center py-2 border-bottom">
                <div>
                  <h4 class="m-0">Practice Reminders</h4>
                  <p class="text-xs text-muted-color m-0">Receive a ping when it\\'s time to practice.</p>
                </div>
                <button class="toggle-btn toggle-on" id="toggle-reminders"></button>
              </div>
              <div class="setting-item flex justify-between items-center py-2">
                <div>
                  <h4 class="m-0">Weekly Reports</h4>
                  <p class="text-xs text-muted-color m-0">Get email analytics about your fretboard progress.</p>
                </div>
                <button class="toggle-btn" id="toggle-reports"></button>
              </div>
            </section>

            <!-- Integrations -->
            <section class="glass-card">
              <h3 class="section-title mb-4">Integrations</h3>
              <div class="setting-item flex justify-between items-center py-2 border-bottom">
                <div>
                  <h4 class="m-0">Calendar Sync</h4>
                  <p class="text-xs text-muted-color m-0">Automatically push scheduled practice events to your calendar.</p>
                </div>
                <button class="btn btn-secondary" onclick="alert('Google Calendar OAuth workflow started!')">Connect Calendar</button>
              </div>
            </section>

            <!-- Privacy -->
            <section class="glass-card">
              <h3 class="section-title mb-4">Hardware Permissions</h3>
              <div class="setting-item flex justify-between items-center py-2 border-bottom">
                <div>
                  <h4 class="m-0">Microphone</h4>
                  <p class="text-xs text-muted-color m-0">Needed for the real-time pitch recognition tuner.</p>
                </div>
                <button class="toggle-btn toggle-on" id="toggle-mic"></button>
              </div>
              <div class="setting-item flex justify-between items-center py-2">
                <div>
                  <h4 class="m-0">Camera</h4>
                  <p class="text-xs text-muted-color m-0">Needed for MediaPipe hand/fret placement tracking.</p>
                </div>
                <button class="toggle-btn" id="toggle-camera"></button>
              </div>
            </section>

            <!-- System Info -->
            <section class="glass-card text-center py-4 bg-glass border-none">
              <p class="text-xs text-muted-color m-0">GuitarMind AI v1.0.0 (Production-Ready)</p>
              <p class="text-xs text-disabled mt-1">Built with dedication by DeepMind Advanced Agentic Coding</p>
            </section>

            <!-- Sign Out Button -->
            <button id="btn-sign-out" class="btn btn-danger w-full py-3 mb-6">
              <span>Sign Out</span>
            </button>

          </div>

        </main>
        
        <!-- Render Bottom Nav -->
        ${renderNav()}
      </div>
    `;
  },
  onMount: () => {
    setupNavEvents();
    setupSettingsEvents();
  },
  onUnmount: () => {
    console.log('Unmounting Settings Route');
  }
};

function setupSettingsEvents(): void {
  const btnSignOut = document.getElementById('btn-sign-out') as HTMLButtonElement;
  const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;

  // Toggle buttons
  const toggleReminders = document.getElementById('toggle-reminders') as HTMLButtonElement;
  const toggleReports = document.getElementById('toggle-reports') as HTMLButtonElement;
  const toggleMic = document.getElementById('toggle-mic') as HTMLButtonElement;
  const toggleCamera = document.getElementById('toggle-camera') as HTMLButtonElement;

  const makeToggleable = (btn: HTMLButtonElement) => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('toggle-on');
    });
  };

  if (toggleReminders) makeToggleable(toggleReminders);
  if (toggleReports) makeToggleable(toggleReports);
  if (toggleMic) makeToggleable(toggleMic);
  if (toggleCamera) makeToggleable(toggleCamera);

  // Edit profile form
  const profileForm = document.getElementById('edit-profile-form') as HTMLFormElement;
  if (profileForm) {
    profileForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const user = appStore.getState().currentUser;
      if (!user) return;

      const nameInput = document.getElementById('edit-display-name') as HTMLInputElement;
      const guitarSelect = document.getElementById('edit-guitar-type') as HTMLSelectElement;
      const coachSelect = document.getElementById('edit-coach') as HTMLSelectElement;

      const displayName = nameInput.value.trim();
      const guitarType = guitarSelect.value as any;
      const coachPersonality = coachSelect.value as any;

      const updatedUser: User = {
        ...user,
        displayName,
        coachPersonality,
        musicalBackground: {
          ...user.musicalBackground,
          guitarTypes: [guitarType]
        }
      };

      const success = await UsersRepo.upsertUser(updatedUser);
      if (success) {
        appStore.setState({ currentUser: updatedUser });
        alert('Profile updated successfully!');
        router.navigate('#settings'); // Rerender
      } else {
        alert('Failed to update profile. Please try again.');
      }
    });
  }

  // AI Config Form
  const aiForm = document.getElementById('edit-ai-form') as HTMLFormElement;
  const btnValidateKey = document.getElementById('btn-settings-validate-key') as HTMLButtonElement;
  const btnClearKey = document.getElementById('btn-settings-clear-key') as HTMLButtonElement;
  const keyInput = document.getElementById('settings-ai-key') as HTMLInputElement;
  const providerSelect = document.getElementById('settings-ai-provider') as HTMLSelectElement;
  const validationStatus = document.getElementById('settings-validation-status') as HTMLDivElement;

  if (keyInput && providerSelect) {
    const userObj = appStore.getState().currentUser;
    const activeProvider = userObj?.aiConfig?.provider || 'groq';

    let keysObj: Record<string, string> = {};
    try {
      keysObj = JSON.parse(userObj?.aiConfig?.apiKeyEncrypted || '{}');
    } catch {
      if (userObj?.aiConfig?.apiKeyEncrypted) {
        keysObj[activeProvider] = userObj.aiConfig.apiKeyEncrypted;
      }
    }

    const loadMaskedKey = (prov: string) => {
      const currentKey = keysObj[prov] || '';
      if (currentKey) {
        const prefix = currentKey.substring(0, Math.min(5, currentKey.length));
        keyInput.value = `${prefix}_xxxxxxxxxxxxxxxx`;
      } else {
        keyInput.value = '';
      }
    };

    loadMaskedKey(providerSelect.value);

    providerSelect.addEventListener('change', () => {
      loadMaskedKey(providerSelect.value);
      validationStatus.textContent = '';
      validationStatus.className = 'text-xs mt-1 font-semibold text-muted-color';
    });

    if (btnValidateKey) {
      btnValidateKey.addEventListener('click', async () => {
        let apiKey = keyInput.value.trim();
        const provider = providerSelect.value as any;

        const originalKey = keysObj[provider] || '';
        const maskedCompare = originalKey ? `${originalKey.substring(0, Math.min(5, originalKey.length))}_xxxxxxxxxxxxxxxx` : '';

        if (apiKey === maskedCompare) {
          apiKey = originalKey;
        }

        if (!apiKey) {
          alert('Please enter an API key to validate.');
          return;
        }

        btnValidateKey.disabled = true;
        const originalText = btnValidateKey.innerHTML;
        btnValidateKey.innerHTML = `<span>Validating...</span>`;
        validationStatus.className = 'text-xs mt-1 font-semibold text-muted-color';
        validationStatus.textContent = 'Validating key...';

        const isValid = await AIService.validateApiKey(provider, apiKey);

        btnValidateKey.disabled = false;
        btnValidateKey.innerHTML = originalText;

        if (isValid) {
          validationStatus.className = 'text-xs mt-1 font-semibold text-success';
          validationStatus.textContent = 'Key Validated Successfully!';
        } else {
          validationStatus.className = 'text-xs mt-1 font-semibold text-danger';
          validationStatus.textContent = 'Invalid API Key. Please check and try again.';
        }
      });
    }

    if (btnClearKey) {
      btnClearKey.addEventListener('click', async () => {
        const provider = providerSelect.value;
        if (confirm(`Are you sure you want to delete the API key for ${provider}?`)) {
          const userObj2 = appStore.getState().currentUser;
          if (!userObj2) return;

          let tempKeys: Record<string, string> = {};
          try {
            tempKeys = JSON.parse(userObj2.aiConfig?.apiKeyEncrypted || '{}');
          } catch {
            if (userObj2.aiConfig?.apiKeyEncrypted) {
              tempKeys[userObj2.aiConfig.provider] = userObj2.aiConfig.apiKeyEncrypted;
            }
          }

          delete tempKeys[provider];

          const updatedUser: User = {
            ...userObj2,
            aiConfig: {
              ...userObj2.aiConfig,
              apiKeyEncrypted: JSON.stringify(tempKeys),
              validated: false
            }
          };

          const success = await UsersRepo.upsertUser(updatedUser);
          if (success) {
            appStore.setState({ currentUser: updatedUser });
            alert(`API key for ${provider} deleted successfully.`);
            router.navigate('#settings'); // Rerender
          } else {
            alert('Failed to delete key.');
          }
        }
      });
    }

    if (aiForm) {
      aiForm.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const userObj3 = appStore.getState().currentUser;
        if (!userObj3) return;

        const provider = providerSelect.value as any;
        let newKey = keyInput.value.trim();

        let tempKeys: Record<string, string> = {};
        try {
          tempKeys = JSON.parse(userObj3.aiConfig?.apiKeyEncrypted || '{}');
        } catch {
          if (userObj3.aiConfig?.apiKeyEncrypted) {
            tempKeys[userObj3.aiConfig.provider] = userObj3.aiConfig.apiKeyEncrypted;
          }
        }

        const originalKey = tempKeys[provider] || '';
        const maskedCompare = originalKey ? `${originalKey.substring(0, Math.min(5, originalKey.length))}_xxxxxxxxxxxxxxxx` : '';

        if (newKey === maskedCompare) {
          newKey = originalKey; // Unchanged
        }

        if (newKey === '') {
          delete tempKeys[provider];
        } else {
          tempKeys[provider] = newKey;
        }

        const isCurrentlyValidated = validationStatus.textContent?.includes('Successfully') || false;

        const updatedUser: User = {
          ...userObj3,
          aiConfig: {
            ...userObj3.aiConfig,
            provider,
            model: provider === 'groq' ? 'llama-3.3-70b-versatile' : provider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o',
            apiKeyEncrypted: JSON.stringify(tempKeys),
            validated: isCurrentlyValidated
          }
        };

        const success = await UsersRepo.upsertUser(updatedUser);
        if (success) {
          appStore.setState({ currentUser: updatedUser });
          alert('AI Configuration saved successfully!');
          router.navigate('#settings'); // Rerender
        } else {
          alert('Failed to save AI configuration. Please try again.');
        }
      });
    }
  }

  if (btnSignOut) {
    btnSignOut.addEventListener('click', async () => {
      if (confirm('Are you sure you want to sign out?')) {
        // Sign out from Supabase
        await supabase.auth.signOut().catch(() => {});

        // Clear active session
        localStorage.removeItem('guitarmind_active_uid');
        localStorage.removeItem('guitarmind_offline_session');
        
        // Reset app state
        appStore.setState({
          currentUser: null,
          isAuthenticated: false,
          currentPage: '#auth'
        });
        
        // Redirect
        router.navigate('#auth');
      }
    });
  }

  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      const selected = themeSelect.value as any;
      appStore.setState({ theme: selected });

      const html = document.documentElement;
      if (selected === 'dark') {
        html.setAttribute('data-theme', 'dark');
      } else if (selected === 'light') {
        html.setAttribute('data-theme', 'light');
      } else {
        // System
        const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        html.setAttribute('data-theme', sysDark ? 'dark' : 'light');
      }
    });
  }
}
