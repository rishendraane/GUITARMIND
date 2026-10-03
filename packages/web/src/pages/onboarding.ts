import { router } from '../router';
import { appStore, onboardingStore, dashboardStore } from '../store';
import type { User, CoachPersonalityId } from '@guitarmind/core';
import { UsersRepo } from '../repositories/users.repo';
import { icons } from '../components/icons';

export const onboardingRoute = {
  path: '#onboarding',
  render: async () => {
    const state = onboardingStore.getState();
    const stepsCount = 11;
    const progressPercent = Math.round(((state.currentStep + 1) / stepsCount) * 100);

    return `
      <div class="onboarding-container animate-fade-in">
        <!-- Progress Header -->
        <div class="onboarding-header">
          <div class="progress-bar-wrapper">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
          </div>
          <div class="step-indicator">
            <span>Step ${state.currentStep + 1} of ${stepsCount}</span>
            <div class="step-dots">
              ${Array.from({ length: stepsCount })
                .map(
                  (_, i) =>
                    `<span class="step-dot ${
                      i === state.currentStep ? 'step-dot-active' : i < state.currentStep ? 'step-dot-completed' : ''
                    }"></span>`
                )
                .join('')}
            </div>
          </div>
        </div>

        <!-- Onboarding Card Form -->
        <div class="onboarding-content-card glass-card">
          <div id="step-content">
            ${renderStep(state.currentStep, state)}
          </div>

          <!-- Bottom Actions -->
          <div class="onboarding-actions mt-8 flex justify-between items-center">
            <button id="btn-back" class="btn btn-secondary ${state.currentStep === 0 ? 'hidden' : ''}">
              <span>Back</span>
            </button>
            <div class="flex-grow"></div>
            <button id="btn-next" class="btn btn-primary">
              <span>${state.currentStep === stepsCount - 1 ? 'Finish' : 'Next'}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },
  onMount: () => {
    setupOnboardingEvents();
  },
  onUnmount: () => {
    console.log('Unmounting Onboarding Route');
  }
};

function renderStep(step: number, state: ReturnType<typeof onboardingStore.getState>): string {
  switch (step) {
    case 0:
      return `
        <div class="step-fade-in">
          <h2 class="mb-2">Welcome to GuitarMind AI!</h2>
          <p class="text-muted-color mb-6">Let's get to know you first. Tell us a bit about yourself.</p>
          <div class="flex flex-col gap-4">
            <div class="input-group">
              <label class="input-label" for="profile-name">What should we call you?</label>
              <input type="text" id="profile-name" class="input" placeholder="Your Name" value="${state.profile.name}" required />
            </div>
            <div class="input-group">
              <label class="input-label" for="profile-age">How old are you?</label>
              <input type="number" id="profile-age" class="input" value="${state.profile.age}" min="5" max="120" required />
            </div>
            <div class="input-group">
              <label class="input-label" for="profile-country">Country</label>
              <input type="text" id="profile-country" class="input" placeholder="e.g. United States" value="${state.profile.country}" required />
            </div>
          </div>
        </div>
      `;
    case 1:
      return `
        <div class="step-fade-in">
          <h2 class="mb-2">What is your current skill level?</h2>
          <p class="text-muted-color mb-6">Be honest! We adapt your lessons and roadmap to where you are.</p>
          <div class="grid grid-cols-3 gap-4">
            <div class="level-card glass-card-hover ${state.skillLevel === 'beginner' ? 'card-selected' : ''}" data-level="beginner">
              <div class="card-icon w-8 h-8 flex items-center justify-center text-primary-color mx-auto mb-2">${icons.bookOpen('w-6 h-6')}</div>
              <h3>Beginner</h3>
              <p class="text-xs text-muted-color mt-2">Never touched a guitar, or just know 1-2 open chords.</p>
            </div>
            <div class="level-card glass-card-hover ${state.skillLevel === 'intermediate' ? 'card-selected' : ''}" data-level="intermediate">
              <div class="card-icon w-8 h-8 flex items-center justify-center text-primary-color mx-auto mb-2">${icons.music('w-6 h-6')}</div>
              <h3>Intermediate</h3>
              <p class="text-xs text-muted-color mt-2">Can play simple chords and strum patterns, learning bar chords.</p>
            </div>
            <div class="level-card glass-card-hover ${state.skillLevel === 'advanced' ? 'card-selected' : ''}" data-level="advanced">
              <div class="card-icon w-8 h-8 flex items-center justify-center text-primary-color mx-auto mb-2">${icons.sparkles('w-6 h-6')}</div>
              <h3>Advanced</h3>
              <p class="text-xs text-muted-color mt-2">Play clean bar chords, understand scales, starting to solo/improvise.</p>
            </div>
          </div>
        </div>
      `;
    case 2:
      const bg = state.musicalBackground;
      return `
        <div class="step-fade-in">
          <h2 class="mb-2">Your Musical Background</h2>
          <p class="text-muted-color mb-6">Help us understand what skills you already have.</p>
          <div class="flex flex-col             <div class="bg-toggle-row justify-between items-center flex p-3 glass-card" data-key="hasPlayedBefore">
              <div class="flex items-center gap-3">
                <span class="bg-icon text-primary-color w-6 h-6 flex items-center justify-center">${icons.disc('w-5 h-5')}</span>
                <div>
                  <h4 class="m-0">Played Guitar Before</h4>
                  <p class="text-xs text-muted-color m-0">You have some basic practice experience.</p>
                </div>
              </div>
              <button class="toggle-btn ${bg.hasPlayedBefore ? 'toggle-on' : ''}"></button>
            </div>
            <div class="bg-toggle-row justify-between items-center flex p-3 glass-card" data-key="canReadTabs">
              <div class="flex items-center gap-3">
                <span class="bg-icon text-primary-color w-6 h-6 flex items-center justify-center">${icons.bookOpen('w-5 h-5')}</span>
                <div>
                  <h4 class="m-0">Can Read Guitar Tabs</h4>
                  <p class="text-xs text-muted-color m-0">You understand string/fret tablature notation.</p>
                </div>
              </div>
              <button class="toggle-btn ${bg.canReadTabs ? 'toggle-on' : ''}"></button>
            </div>
            <div class="bg-toggle-row justify-between items-center flex p-3 glass-card" data-key="canReadSheetMusic">
              <div class="flex items-center gap-3">
                <span class="bg-icon text-primary-color w-6 h-6 flex items-center justify-center">${icons.music('w-5 h-5')}</span>
                <div>
                  <h4 class="m-0">Can Read Sheet Music</h4>
                  <p class="text-xs text-muted-color m-0">You read standard five-line musical staff notation.</p>
                </div>
              </div>
              <button class="toggle-btn ${bg.canReadSheetMusic ? 'toggle-on' : ''}"></button>
            </div>
            <div class="bg-toggle-row justify-between items-center flex p-3 glass-card" data-key="knowsBasicChords">
              <div class="flex items-center gap-3">
                <span class="bg-icon text-primary-color w-6 h-6 flex items-center justify-center">${icons.music('w-5 h-5')}</span>
                <div>
                  <h4 class="m-0">Know Basic Chords</h4>
                  <p class="text-xs text-muted-color m-0">You can play basic open chords (C, A, G, E, D, etc.).</p>
                </div>
              </div>
              <button class="toggle-btn ${bg.knowsBasicChords ? 'toggle-on' : ''}"></button>
            </div>n>
            </div>
          </div>
        </div>
      `;
    case 3:
      const goalsList = [
        { id: 'learn_songs', label: 'Learn Specific Songs' },
        { id: 'fingerstyle', label: 'Fingerpicking/Fingerstyle' },
        { id: 'lead_guitar', label: 'Lead Guitar & Soloing' },
        { id: 'theory', label: 'Understand Music Theory' },
        { id: 'ear_training', label: 'Ear Training / Play by Ear' },
        { id: 'rhythm', label: 'Solid Rhythm & Strumming' },
        { id: 'improvisation', label: 'Improvising Jamming' }
      ];
      return `
        <div class="step-fade-in">
          <h2 class="mb-2">What are your learning goals?</h2>
          <p class="text-muted-color mb-6">Select all that apply. We'll adjust your roadmap targets.</p>
          <div class="flex flex-wrap gap-3">
            ${goalsList
              .map(
                (g) =>
                  `<button class="chip ${state.goals.includes(g.id) ? 'chip-selected' : ''}" data-goal="${g.id}">
                    ${g.label}
                  </button>`
              )
              .join('')}
          </div>
        </div>
      `;
    case 4:
      const genresList = [
        { id: 'rock', label: 'Rock' },
        { id: 'blues', label: 'Blues' },
        { id: 'jazz', label: 'Jazz' },
        { id: 'classical', label: 'Classical' },
        { id: 'pop', label: 'Pop' },
        { id: 'metal', label: 'Metal' },
        { id: 'acoustic', label: 'Acoustic / Folk' },
        { id: 'worship', label: 'Worship' },
        { id: 'flamenco', label: 'Flamenco' }
      ];
      return `
        <div class="step-fade-in">
          <h2 class="mb-2">What genres do you like?</h2>
          <p class="text-muted-color mb-6">We use this to suggest songs and backing tracks you'll actually enjoy.</p>
          <div class="flex flex-wrap gap-3">
            ${genresList
              .map(
                (g) =>
                  `<button class="chip ${state.genres.includes(g.id) ? 'chip-selected' : ''}" data-genre="${g.id}">
                    ${g.label}
                  </button>`
              )
              .join('')}
          </div>
        </div>
      `;
    case 5:
      return `
        <div class="step-fade-in">
          <h2 class="mb-2">Daily Practice Commitment</h2>
          <p class="text-muted-color mb-6">How many minutes per day are you willing to dedicate to practice?</p>
          <div class="grid grid-cols-2 gap-4">
            <div class="time-card glass-card-hover ${state.practiceMinutesPerDay === 15 ? 'card-selected' : ''}" data-time="15">
              <div class="time-val">15</div>
              <div class="time-unit">Min / Day</div>
              <p class="text-xs text-muted-color mt-2">Casual, daily habit builder.</p>
            </div>
            <div class="time-card glass-card-hover ${state.practiceMinutesPerDay === 30 ? 'card-selected' : ''}" data-time="30">
              <div class="time-val">30</div>
              <div class="time-unit">Min / Day</div>
              <p class="text-xs text-muted-color mt-2">Standard. Steady, fast improvement.</p>
            </div>
            <div class="time-card glass-card-hover ${state.practiceMinutesPerDay === 60 ? 'card-selected' : ''}" data-time="60">
              <div class="time-val">60</div>
              <div class="time-unit">Min / Day</div>
              <p class="text-xs text-muted-color mt-2">Immersive. For highly dedicated players.</p>
            </div>
            <div class="time-card glass-card-hover ${![15, 30, 60].includes(state.practiceMinutesPerDay) ? 'card-selected' : ''}" data-time="custom">
              <div class="time-val">${![15, 30, 60].includes(state.practiceMinutesPerDay) ? state.practiceMinutesPerDay : 'Custom'}</div>
              <div class="time-unit">Min / Day</div>
              <input type="number" id="custom-time-input" class="input mt-2 ${![15, 30, 60].includes(state.practiceMinutesPerDay) ? '' : 'hidden'}" placeholder="Minutes" value="${state.practiceMinutesPerDay}" min="5" max="180" />
            </div>
          </div>
        </div>
      `;
    case 6:
      const learningGoals = [
        { id: 'play_first_song', title: 'Play My First Song', desc: 'Get to playing a complete basic song with chords and simple strumming.' },
        { id: 'play_live', title: 'Perform Live on Stage', desc: 'Gain the skills and confidence to perform in front of friends or live venues.' },
        { id: 'join_band', title: 'Join a Band / Jam Sessions', desc: 'Learn how to play with other musicians, improvise, and lock in with a rhythm.' },
        { id: 'write_music', title: 'Write My Own Music', desc: 'Understand chord progressions, song structure, melody writing and harmony.' }
      ];
      return `
        <div class="step-fade-in">
          <h2 class="mb-2">What is your ultimate objective?</h2>
          <p class="text-muted-color mb-6">Choose one main milestone that defines success for you.</p>
          <div class="flex flex-col gap-3">
            ${learningGoals
              .map(
                (lg) =>
                  `<div class="goal-selection-card glass-card-hover flex items-center p-4 gap-4 cursor-pointer ${
                    state.learningGoal === lg.id ? 'card-selected' : ''
                  }" data-lgoal="${lg.id}">
                    <div class="flex-grow">
                      <h4 class="m-0">${lg.title}</h4>
                      <p class="text-xs text-muted-color m-0 mt-1">${lg.desc}</p>
                    </div>
                  </div>`
              )
              .join('')}
          </div>
        </div>
      `;
    case 7:
      return `
        <div class="step-fade-in text-center py-8">
          <div class="generating-logo-animation text-primary-color mb-4 flex justify-center items-center h-16 w-16 mx-auto">${icons.sparkles('w-12 h-12')}</div>
          <h2 class="mb-2">Secure AI Integration</h2>
          <p class="text-muted-color mb-6 max-w-sm mx-auto">
            Your personalized AI Coach is fully configured using our system's secure, built-in API credentials. No manual keys are required.
          </p>
          <div class="p-3 bg-glass border-glass rounded-lg text-xs text-success font-semibold flex items-center justify-center gap-2 max-w-xs mx-auto mb-6">
            ${icons.check('w-4 h-4')} Default AI Coach Key Active (Secured)
          </div>

          <!-- Hidden inputs and button to satisfy existing JS event listeners -->
          <div style="display: none;">
            <select id="ai-provider" class="select">
              <option value="gemini" selected>Google Gemini</option>
            </select>
            <input type="password" id="ai-key" value="" />
            <button type="button" id="btn-validate-key"></button>
            <div id="validation-status">Key Validated Successfully!</div>
          </div>
        </div>
      `;
    case 8:
      return `
        <div class="step-fade-in">
          <h2 class="mb-2">Do you currently own a guitar?</h2>
          <p class="text-muted-color mb-6">Knowing your gear helps us design custom tuner profiles and fretboard exercises.</p>
          <div class="flex flex-col gap-4">
            <div class="guitar-option-row flex gap-4">
              <button class="level-card flex-grow glass-card-hover flex flex-col items-center justify-center p-4 gap-2 ${state.guitar.ownsGuitar ? 'card-selected' : ''}" id="owns-guitar-yes">
                <span class="w-8 h-8 flex items-center justify-center text-primary-color mb-1">${icons.disc('w-6 h-6')}</span>
                <h3>Yes, I do</h3>
              </button>
              <button class="level-card flex-grow glass-card-hover flex flex-col items-center justify-center p-4 gap-2 ${!state.guitar.ownsGuitar ? 'card-selected' : ''}" id="owns-guitar-no">
                <span class="w-8 h-8 flex items-center justify-center text-primary-color mb-1">${icons.search('w-6 h-6')}</span>
                <h3>No, not yet</h3>
              </button>
            </div>
            
            <div id="guitar-details" class="${state.guitar.ownsGuitar ? '' : 'hidden'} mt-4">
              <div class="input-group">
                <label class="input-label" for="guitar-type">Guitar Type</label>
                <select id="guitar-type" class="select">
                  <option value="acoustic" ${state.guitar.type === 'acoustic' ? 'selected' : ''}>Acoustic (Steel Strings)</option>
                  <option value="electric" ${state.guitar.type === 'electric' ? 'selected' : ''}>Electric</option>
                  <option value="classical" ${state.guitar.type === 'classical' ? 'selected' : ''}>Classical (Nylon Strings)</option>
                  <option value="bass" ${state.guitar.type === 'bass' ? 'selected' : ''}>Bass Guitar</option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-3 mt-3">
                <div class="input-group">
                  <label class="input-label" for="guitar-brand">Brand</label>
                  <input type="text" id="guitar-brand" class="input" placeholder="e.g. Fender" value="${state.guitar.brand || ''}" />
                </div>
                <div class="input-group">
                  <label class="input-label" for="guitar-model">Model</label>
                  <input type="text" id="guitar-model" class="input" placeholder="e.g. Stratocaster" value="${state.guitar.model || ''}" />
                </div>
              </div>
            </div>

            <div id="guitar-recommendations" class="${!state.guitar.ownsGuitar ? '' : 'hidden'} mt-4 p-4 glass-card">
              <h4 class="mb-2">No Guitar? No Problem!</h4>
              <p class="text-xs text-muted-color">We recommend starting with an **acoustic steel-string** or a **classical nylon-string** guitar for learning. Our AI coach can recommend specific models in your budget during chat sessions.</p>
            </div>
          </div>
        </div>
      `;
    case 9:
      return `
        <div class="step-fade-in">
          <h2 class="mb-2">Choose your AI Practice Coach</h2>
          <p class="text-muted-color mb-6">Each coach has their own tone, system instructions, and teaching philosophy.</p>
          <div class="flex flex-col gap-3">
            <div class="coach-card glass-card-hover flex items-center p-3 gap-4 cursor-pointer ${state.coach === 'maya' ? 'card-selected' : ''}" data-coach="maya">
              <div class="coach-avatar-wrapper flex items-center justify-center font-bold text-xs bg-primary-container text-primary-color" style="width: 32px; height: 32px; border-radius: 50%;">M</div>
              <div class="flex-grow">
                <div class="flex items-center gap-2">
                  <h4 class="m-0">Maya</h4>
                  <span class="badge badge-success">Encouraging</span>
                </div>
                <p class="text-xs text-muted-color m-0 mt-1">"Hey there! Don't worry about mistakes — that's just part of the music." Great for beginners.</p>
              </div>
            </div>
            <div class="coach-card glass-card-hover flex items-center p-3 gap-4 cursor-pointer ${state.coach === 'axel' ? 'card-selected' : ''}" data-coach="axel">
              <div class="coach-avatar-wrapper flex items-center justify-center font-bold text-xs bg-primary-container text-primary-color" style="width: 32px; height: 32px; border-radius: 50%;">A</div>
              <div class="flex-grow">
                <div class="flex items-center gap-2">
                  <h4 class="m-0">Axel</h4>
                  <span class="badge badge-warning">High Energy</span>
                </div>
                <p class="text-xs text-muted-color m-0 mt-1">"What's up, rocker! Ready to make some noise? Let's shred!" Great for riffs and rock jam.</p>
              </div>
            </div>
            <div class="coach-card glass-card-hover flex items-center p-3 gap-4 cursor-pointer ${state.coach === 'professor_chen' ? 'card-selected' : ''}" data-coach="professor_chen">
              <div class="coach-avatar-wrapper flex items-center justify-center font-bold text-xs bg-primary-container text-primary-color" style="width: 32px; height: 32px; border-radius: 50%;">P</div>
              <div class="flex-grow">
                <div class="flex items-center gap-2">
                  <h4 class="m-0">Prof. Chen</h4>
                  <span class="badge badge-success">Structured</span>
                </div>
                <p class="text-xs text-muted-color m-0 mt-1">"Greetings. Today, we will analyze the scale construction." Focussed on theory and method.</p>
              </div>
            </div>
            <div class="coach-card glass-card-hover flex items-center p-3 gap-4 cursor-pointer ${state.coach === 'maestro_antonio' ? 'card-selected' : ''}" data-coach="maestro_antonio">
              <div class="coach-avatar-wrapper flex items-center justify-center font-bold text-xs bg-primary-container text-primary-color" style="width: 32px; height: 32px; border-radius: 50%;">M</div>
              <div class="flex-grow">
                <div class="flex items-center gap-2">
                  <h4 class="m-0">Maestro Antonio</h4>
                  <span class="badge badge-danger">Precision</span>
                </div>
                <p class="text-xs text-muted-color m-0 mt-1">"Flawless hand position is the root of speed." Focussed on classical guitar and fine mechanics.</p>
              </div>
            </div>
            <div class="coach-card glass-card-hover flex items-center p-3 gap-4 cursor-pointer ${state.coach === 'general' ? 'card-selected' : ''}" data-coach="general">
              <div class="coach-avatar-wrapper flex items-center justify-center font-bold text-xs bg-primary-container text-primary-color" style="width: 32px; height: 32px; border-radius: 50%;">G</div>
              <div class="flex-grow">
                <div class="flex items-center gap-2">
                  <h4 class="m-0">General Assistant</h4>
                  <span class="badge badge-info">General Chat</span>
                </div>
                <p class="text-xs text-muted-color m-0 mt-1">"Hello! Ask me any guitar-related questions." Stark, informative, neutral guitar expert.</p>
              </div>
            </div>
          </div>
        </div>
      `;
    case 10:
      return `
        <div class="step-fade-in text-center p-6 flex flex-col items-center justify-center">
          <div class="generating-logo-animation text-primary-color mb-4 flex justify-center items-center h-16 w-16 mx-auto">${icons.sparkles('w-12 h-12')}</div>
          <h2 class="mt-4 mb-2">Crafting Your Learning Journey...</h2>
          <p class="text-muted-color mb-6 max-w-sm">Our AI is generating a personalized practice roadmap, custom scales list, and lesson sets based on your goals.</p>
          <div class="progress-ring-wrapper">
            <svg class="progress-ring" width="80" height="80">
              <circle class="progress-ring-circle-bg" stroke="rgba(255, 255, 255, 0.05)" stroke-width="6" fill="transparent" r="30" cx="40" cy="40"/>
              <circle class="progress-ring-circle" stroke="#7c3aed" stroke-width="6" fill="transparent" r="30" cx="40" cy="40" stroke-dasharray="188.4" stroke-dashoffset="30"/>
            </svg>
          </div>
          <p class="text-xs text-primary-color mt-4 font-semibold animate-pulse-slow">Analyzing fretboard goals...</p>
        </div>
      `;
    default:
      return '';
  }
}

function setupOnboardingEvents(): void {
  const btnBack = document.getElementById('btn-back') as HTMLButtonElement;
  const btnNext = document.getElementById('btn-next') as HTMLButtonElement;
  const stepContent = document.getElementById('step-content') as HTMLDivElement;

  const stepsCount = 11;

  const refreshStep = () => {
    const state = onboardingStore.getState();
    const progressPercent = Math.round(((state.currentStep + 1) / stepsCount) * 100);

    // Update progress bar & dots
    const progressFill = document.querySelector('.progress-fill') as HTMLDivElement;
    if (progressFill) progressFill.style.width = `${progressPercent}%`;

    const stepIndicator = document.querySelector('.step-indicator > span') as HTMLSpanElement;
    if (stepIndicator) stepIndicator.textContent = `Step ${state.currentStep + 1} of ${stepsCount}`;

    const stepDots = document.querySelector('.step-dots') as HTMLDivElement;
    if (stepDots) {
      stepDots.innerHTML = Array.from({ length: stepsCount })
        .map(
          (_, i) =>
            `<span class="step-dot ${
              i === state.currentStep ? 'step-dot-active' : i < state.currentStep ? 'step-dot-completed' : ''
            }"></span>`
        )
        .join('');
    }

    // Toggle Back button visibility
    if (state.currentStep === 0) {
      btnBack.classList.add('hidden');
    } else {
      btnBack.classList.remove('hidden');
    }

    // Next/Finish button label
    const btnNextText = document.querySelector('#btn-next span') as HTMLSpanElement;
    if (btnNextText) {
      btnNextText.textContent = state.currentStep === stepsCount - 1 ? 'Finish' : 'Next';
    }

    // Render inner content
    stepContent.innerHTML = renderStep(state.currentStep, state);
    bindStepSpecificEvents(state.currentStep);
  };

  btnBack.addEventListener('click', () => {
    const { currentStep } = onboardingStore.getState();
    if (currentStep > 0) {
      onboardingStore.setState({ currentStep: currentStep - 1 });
      refreshStep();
    }
  });

  btnNext.addEventListener('click', () => {
    const { currentStep } = onboardingStore.getState();
    
    // Save current step data before moving
    saveCurrentStepData(currentStep);

    if (currentStep < stepsCount - 1) {
      // For Generating loading screen step (step 10 is generating, step 9 is choosing coach)
      if (currentStep === 9) {
        onboardingStore.setState({ currentStep: 10 });
        refreshStep();
        
        // Simulate AI generating profile for 3 seconds
        setTimeout(() => {
          completeOnboarding();
        }, 3000);
      } else {
        onboardingStore.setState({ currentStep: currentStep + 1 });
        refreshStep();
      }
    }
  });

  // Bind initial view
  bindStepSpecificEvents(onboardingStore.getState().currentStep);
}

function saveCurrentStepData(step: number): void {
  const state = onboardingStore.getState();
  
  if (step === 0) {
    const name = (document.getElementById('profile-name') as HTMLInputElement).value;
    const age = parseInt((document.getElementById('profile-age') as HTMLInputElement).value, 10) || 25;
    const country = (document.getElementById('profile-country') as HTMLInputElement).value;
    onboardingStore.setState({
      profile: { name, age, country }
    });
  } else if (step === 7) {
    const provider = (document.getElementById('ai-provider') as HTMLSelectElement).value as any;
    const apiKey = (document.getElementById('ai-key') as HTMLInputElement).value;
    onboardingStore.setState({
      aiConfig: { ...state.aiConfig, provider, apiKey, validated: true }
    });
  } else if (step === 8) {
    const type = (document.getElementById('guitar-type') as HTMLSelectElement)?.value as any;
    const brand = (document.getElementById('guitar-brand') as HTMLInputElement)?.value;
    const model = (document.getElementById('guitar-model') as HTMLInputElement)?.value;
    onboardingStore.setState({
      guitar: {
        ...state.guitar,
        type,
        brand,
        model
      }
    });
  }
}

function bindStepSpecificEvents(step: number): void {
  const state = onboardingStore.getState();

  if (step === 1) {
    // Skill Level Selection Cards
    const levelCards = document.querySelectorAll('.level-card');
    levelCards.forEach((card) => {
      card.addEventListener('click', () => {
        levelCards.forEach((c) => c.classList.remove('card-selected'));
        card.classList.add('card-selected');
        const skillLevel = card.getAttribute('data-level') as any;
        onboardingStore.setState({ skillLevel });
      });
    });
  } else if (step === 2) {
    // Background Toggles
    const toggleRows = document.querySelectorAll('.bg-toggle-row');
    toggleRows.forEach((row) => {
      row.addEventListener('click', () => {
        const key = row.getAttribute('data-key') as keyof typeof state.musicalBackground;
        const currentVal = state.musicalBackground[key];
        
        onboardingStore.setState({
          musicalBackground: {
            ...state.musicalBackground,
            [key]: !currentVal
          }
        });
        
        const btn = row.querySelector('.toggle-btn') as HTMLButtonElement;
        if (btn) {
          if (!currentVal) {
            btn.classList.add('toggle-on');
          } else {
            btn.classList.remove('toggle-on');
          }
        }
      });
    });
  } else if (step === 3) {
    // Goals Multi-Select Chips
    const chips = document.querySelectorAll('.chip[data-goal]');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const goalId = chip.getAttribute('data-goal')!;
        const currentGoals = [...onboardingStore.getState().goals];
        const idx = currentGoals.indexOf(goalId);
        
        if (idx > -1) {
          currentGoals.splice(idx, 1);
          chip.classList.remove('chip-selected');
        } else {
          currentGoals.push(goalId);
          chip.classList.add('chip-selected');
        }
        
        onboardingStore.setState({ goals: currentGoals });
      });
    });
  } else if (step === 4) {
    // Genres Multi-Select Chips
    const chips = document.querySelectorAll('.chip[data-genre]');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const genreId = chip.getAttribute('data-genre')!;
        const currentGenres = [...onboardingStore.getState().genres];
        const idx = currentGenres.indexOf(genreId);
        
        if (idx > -1) {
          currentGenres.splice(idx, 1);
          chip.classList.remove('chip-selected');
        } else {
          currentGenres.push(genreId);
          chip.classList.add('chip-selected');
        }
        
        onboardingStore.setState({ genres: currentGenres });
      });
    });
  } else if (step === 5) {
    // Practice time selector
    const cards = document.querySelectorAll('.time-card');
    const customTimeInput = document.getElementById('custom-time-input') as HTMLInputElement;

    cards.forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target === customTimeInput) return; // ignore click inside input
        
        cards.forEach((c) => c.classList.remove('card-selected'));
        card.classList.add('card-selected');

        const val = card.getAttribute('data-time')!;
        if (val === 'custom') {
          customTimeInput.classList.remove('hidden');
          customTimeInput.focus();
        } else {
          customTimeInput.classList.add('hidden');
          onboardingStore.setState({ practiceMinutesPerDay: parseInt(val, 10) });
        }
      });
    });

    customTimeInput.addEventListener('input', () => {
      const minutes = parseInt(customTimeInput.value, 10) || 5;
      onboardingStore.setState({ practiceMinutesPerDay: minutes });
      
      const customCardVal = document.querySelector('.time-card[data-time="custom"] .time-val') as HTMLDivElement;
      if (customCardVal) customCardVal.textContent = minutes.toString();
    });
  } else if (step === 6) {
    // Learning Objective Single Selection
    const cards = document.querySelectorAll('.goal-selection-card');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        cards.forEach((c) => c.classList.remove('card-selected'));
        card.classList.add('card-selected');
        const lgoal = card.getAttribute('data-lgoal')!;
        onboardingStore.setState({ learningGoal: lgoal });
      });
    });
  } else if (step === 7) {
    // Validate API Key button action
    const btnValidate = document.getElementById('btn-validate-key') as HTMLButtonElement;
    const keyInput = document.getElementById('ai-key') as HTMLInputElement;
    const statusText = document.getElementById('validation-status') as HTMLDivElement;

    btnValidate.addEventListener('click', () => {
      const apiKey = keyInput.value.trim();
      if (!apiKey) {
        alert('Please enter an API key');
        return;
      }
      
      btnValidate.disabled = true;
      const originalText = btnValidate.innerHTML;
      btnValidate.innerHTML = `<span>Validating...</span>`;

      setTimeout(() => {
        btnValidate.disabled = false;
        btnValidate.innerHTML = originalText;
        
        // Simulate validation success
        statusText.classList.remove('text-muted-color');
        statusText.classList.add('text-success');
        statusText.textContent = 'Key Validated Successfully!';
        
        onboardingStore.setState({
          aiConfig: {
            ...onboardingStore.getState().aiConfig,
            apiKey,
            validated: true
          }
        });
      }, 1500);
    });
  } else if (step === 8) {
    // Guitar Selection
    const btnYes = document.getElementById('owns-guitar-yes') as HTMLButtonElement;
    const btnNo = document.getElementById('owns-guitar-no') as HTMLButtonElement;
    const details = document.getElementById('guitar-details') as HTMLDivElement;
    const recommendations = document.getElementById('guitar-recommendations') as HTMLDivElement;

    btnYes.addEventListener('click', () => {
      btnYes.classList.add('card-selected');
      btnNo.classList.remove('card-selected');
      details.classList.remove('hidden');
      recommendations.classList.add('hidden');
      onboardingStore.setState({ guitar: { ownsGuitar: true, type: 'acoustic' } });
    });

    btnNo.addEventListener('click', () => {
      btnNo.classList.add('card-selected');
      btnYes.classList.remove('card-selected');
      details.classList.add('hidden');
      recommendations.classList.remove('hidden');
      onboardingStore.setState({ guitar: { ownsGuitar: false } });
    });
  } else if (step === 9) {
    // Coach selection cards
    const coachCards = document.querySelectorAll('.coach-card');
    coachCards.forEach((card) => {
      card.addEventListener('click', () => {
        coachCards.forEach((c) => c.classList.remove('card-selected'));
        card.classList.add('card-selected');
        const coach = card.getAttribute('data-coach') as CoachPersonalityId;
        onboardingStore.setState({ coach });
      });
    });
  }
}

async function completeOnboarding(): Promise<void> {
  const oState = onboardingStore.getState();
  const aState = appStore.getState();

  if (!aState.currentUser) return;

  // Build the complete User object
  const updatedUser: User = {
    ...aState.currentUser,
    onboardingComplete: true,
    displayName: oState.profile.name || aState.currentUser.displayName,
    profile: {
      age: oState.profile.age,
      country: oState.profile.country,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
    musicalBackground: {
      skillLevel: oState.skillLevel,
      yearsPlaying: 0,
      favoriteGenres: oState.genres as any,
      guitarTypes: oState.guitar.ownsGuitar && oState.guitar.type ? [oState.guitar.type] : [],
      favoriteArtists: [],
      targetSongs: [],
      otherInstruments: [],
      canReadSheetMusic: oState.musicalBackground.canReadSheetMusic,
      knowsMusicTheory: oState.musicalBackground.knowsBasicChords,
      canReadTabs: oState.musicalBackground.canReadTabs,
      knowsBasicChords: oState.musicalBackground.knowsBasicChords,
      hasPlayedBefore: oState.musicalBackground.hasPlayedBefore,
    } as any,
    goals: {
      primaryGoal: oState.learningGoal,
      dailyPracticeMinutes: oState.practiceMinutesPerDay,
      practiceDays: [1, 2, 3, 4, 5],
      shortTermGoals: oState.goals,
      longTermGoals: [],
    },
    aiConfig: {
      provider: oState.aiConfig.provider as any,
      model: oState.aiConfig.provider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o',
      temperature: 0.7,
      maxTokens: 1000,
      streaming: true,
      apiKeyEncrypted: oState.aiConfig.apiKey,
      validated: oState.aiConfig.validated,
    },
    coachPersonality: oState.coach,
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    unlockedAchievements: [],
    isPremium: false,
  };

  (updatedUser as any).guitarBrand = oState.guitar.brand || '';
  (updatedUser as any).guitarModel = oState.guitar.model || '';

  onboardingStore.setState({ isSubmitting: true });

  // Save to Supabase DB via UsersRepo
  const success = await UsersRepo.upsertUser(updatedUser);
  onboardingStore.setState({ isSubmitting: false });

  if (!success) {
    alert('Failed to save your profile to Supabase database. Please try again.');
    return;
  }

  // Save to App State
  appStore.setState({
    currentUser: updatedUser,
  });

  // Hydrate dashboard
  dashboardStore.setState({
    streak: 0,
    xp: 0,
    level: 1,
    chordsCount: 0,
    songsCount: 0,
  });

  // Navigate to main dashboard
  router.navigate('#home');
}
