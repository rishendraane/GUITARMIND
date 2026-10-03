import { PitchDetector } from 'pitchy';
import { TUNING_PRESETS } from '@guitarmind/core';
import { renderNav, setupNavEvents } from '../components/nav';
import { appStore } from '../store';
import { icons } from '../components/icons';

export const tunerRoute = {
  path: '#tuner',
  render: async () => {
    const user = appStore.getState().currentUser;
    const ownsGuitar = !!(user?.musicalBackground?.guitarTypes && user.musicalBackground.guitarTypes.length > 0);

    if (!ownsGuitar) {
      return `
        <div class="tuner-page-container animate-fade-in mb-16">
          <main class="tuner-main flex flex-col items-center">
            
            <!-- Header -->
            <header class="w-full flex justify-between items-center mb-6">
              <div>
                <h4 class="text-xs text-muted-color m-0 uppercase font-semibold">Guitar Guide</h4>
                <h2 class="m-0">Choosing Your Instrument</h2>
              </div>
            </header>

            <!-- Guide Card -->
            <div class="glass-card w-full p-8 flex flex-col gap-6 text-left" style="max-width: 600px;">
              <h3 class="m-0 text-xl font-bold">No Guitar? No Problem.</h3>
              <p class="text-xs text-muted-color leading-relaxed m-0">You don't need a guitar to start! GuitarMind AI teaches you music theory, ear training, and coordinates your practice logs. Here are the 3 main options to find your first instrument:</p>
              
              <div class="flex flex-col gap-4">
                <div class="p-4 bg-card-elevated border-glass rounded-lg">
                  <h4 class="m-0 text-sm font-semibold text-accent-color">1. Classical Guitar (Nylon Strings)</h4>
                  <p class="text-xs text-muted-color mt-1 m-0">Nylon strings are soft and easy on beginner fingers. It has a wider neck which helps you separate chords cleanly. Recommended for classical, fingerstyle, or flamenco.</p>
                </div>
                <div class="p-4 bg-card-elevated border-glass rounded-lg">
                  <h4 class="m-0 text-sm font-semibold text-primary-color-dark">2. Acoustic Guitar (Steel Strings)</h4>
                  <p class="text-xs text-muted-color mt-1 m-0">Steel strings have a bright, powerful ringing sound. Excellent for singer-songwriter strumming, blues, and country. Requires finger calluses but feels rewarding!</p>
                </div>
                <div class="p-4 bg-card-elevated border-glass rounded-lg">
                  <h4 class="m-0 text-sm font-semibold text-success">3. Electric Guitar</h4>
                  <p class="text-xs text-muted-color mt-1 m-0">The thin neck makes electric guitars very easy to hold. You can practice quietly using headphones, but you will eventually need a small practice amplifier. Great for rock, metal, pop, and jazz.</p>
                </div>
              </div>

              <div class="border-top pt-4 mt-2 flex flex-col gap-3">
                <h4 class="m-0 text-sm font-semibold">Ask Your AI Coach for Budget Picks</h4>
                <p class="text-xs text-muted-color m-0">Your coach can suggest specific brand models (e.g. Yamaha FG800, Squier Stratocaster) based on your budget ($100-$300) and favorite genres.</p>
                <button class="btn btn-primary w-full mt-2" onclick="window.location.hash='#coach'">
                  <span>Consult Coach</span>
                </button>
              </div>
            </div>
            
          </main>
          ${renderNav()}
        </div>
      `;
    }

    // Generate options list for tunings
    const selectOptions = Object.values(TUNING_PRESETS)
      .map((t) => `<option value="${t.id}">${t.name}</option>`)
      .join('');

    return `
      <div class="tuner-page-container animate-fade-in mb-16">
        <main class="tuner-main flex flex-col items-center">
          
          <!-- Header -->
          <header class="w-full flex justify-between items-center mb-6">
            <div>
              <h4 class="text-xs text-muted-color m-0 uppercase font-semibold">Guitar Tools</h4>
              <h2 class="m-0">Guitar Tuner</h2>
            </div>
            
            <div class="input-group w-auto m-0">
              <select id="tuning-select" class="select select-sm">
                ${selectOptions}
              </select>
            </div>
          </header>

          <!-- Mic request view / Tuner View -->
          <div id="tuner-status-card" class="glass-card w-full text-center flex flex-col items-center justify-center p-8 mb-6">
            <div id="mic-request-view">
              <span class="w-16 h-16 flex items-center justify-center text-primary-color mb-4 animate-float mx-auto">${icons.mic('w-12 h-12')}</span>
              <h3 class="mb-2">Microphone Permission Required</h3>
              <p class="text-sm text-muted-color mb-6 max-w-sm">To tune your guitar in real-time, we need access to your microphone to analyze pitch frequencies.</p>
              <button id="btn-enable-mic" class="btn btn-primary">
                <span>Enable Microphone</span>
              </button>
            </div>

            <div id="tuner-active-view" class="hidden w-full flex flex-col items-center">
              
              <!-- String indicators -->
              <div class="string-indicators-row flex gap-3 mb-8 w-full justify-between max-w-md">
                <!-- Will be dynamically populated based on active tuning strings -->
              </div>

              <!-- Speedometer Meter -->
              <div class="pitch-meter-wrapper mb-6 relative flex justify-center items-center">
                <svg width="220" height="220" class="speedometer-svg">
                  <!-- Dial Background Track -->
                  <path d="M 30,170 A 90,90 0 1,1 190,170" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="12" stroke-linecap="round" />
                  <!-- Range Colors (Red Left, Yellow Middle, Green Center, Yellow/Red Right) -->
                  <!-- We can color outline zones dynamically or with static glows -->
                  <!-- Center target -->
                  <circle cx="110" cy="110" r="8" fill="#10b981" />
                  <!-- Needle pointer -->
                  <line id="tuner-needle" x1="110" y1="110" x2="110" y2="40" stroke="#7c3aed" stroke-width="4" stroke-linecap="round" style="transform-origin: 110px 110px; transform: rotate(0deg); transition: transform 0.15s ease-out;" />
                </svg>
                <div class="pitch-needle-center flex flex-col items-center">
                  <span id="detected-note-text" class="detected-note">--</span>
                  <span id="cents-deviation-text" class="cents-val">--</span>
                </div>
              </div>

              <!-- Frequency & Status Feedback -->
              <div class="tuner-feedback-panel text-center">
                <div id="freq-display" class="text-xs text-muted-color font-semibold">0.00 Hz</div>
                <div id="tune-instruction" class="text-md font-bold mt-1 text-primary-color">Pluck a string...</div>
              </div>

            </div>
          </div>

          <!-- Celebration message element -->
          <div id="tune-success-card" class="glass-card w-full text-center hidden animate-scale-in p-6 bg-success-glow border-glass flex flex-col items-center justify-center">
            <span class="w-8 h-8 flex items-center justify-center text-success mb-1">${icons.checkCircle('w-7 h-7')}</span>
            <h4 class="mt-2 text-success">String is In Tune!</h4>
          </div>

        </main>
        
        <!-- Render Bottom Nav -->
        ${renderNav()}
      </div>
    `;
  },
  onMount: () => {
    setupNavEvents();
    setupTunerLogic();
  },
  onUnmount: () => {
    // Stop audio context
    stopAudioPipeline();
  }
};

let audioCtx: AudioContext | null = null;
let stream: MediaStream | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;
let analyserNode: AnalyserNode | null = null;
let animationId: number | null = null;
let isAudioRunning = false;
let currentTuningId = 'standard';
let tunedStreakCount = 0;

function setupTunerLogic(): void {
  const btnEnableMic = document.getElementById('btn-enable-mic') as HTMLButtonElement;
  const selectTuning = document.getElementById('tuning-select') as HTMLSelectElement;
  const micView = document.getElementById('mic-request-view') as HTMLDivElement;
  const activeView = document.getElementById('tuner-active-view') as HTMLDivElement;

  if (btnEnableMic) {
    btnEnableMic.addEventListener('click', async () => {
      try {
        await startAudioPipeline();
        if (micView) micView.classList.add('hidden');
        if (activeView) activeView.classList.remove('hidden');
        renderStringsRow();
      } catch (err) {
        console.error('Mic access error:', err);
        alert('Could not access microphone. Please check permissions in your browser settings.');
      }
    });
  }

  if (selectTuning) {
    selectTuning.addEventListener('change', () => {
      currentTuningId = selectTuning.value;
      renderStringsRow();
    });
  }
}

async function startAudioPipeline(): Promise<void> {
  if (isAudioRunning) return;

  stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  
  // Create audio context
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  analyserNode = audioCtx.createAnalyser();
  analyserNode.fftSize = 2048;

  sourceNode = audioCtx.createMediaStreamSource(stream);
  sourceNode.connect(analyserNode);

  isAudioRunning = true;
  startPitchDetection();
}

function stopAudioPipeline(): void {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  if (sourceNode) {
    sourceNode.disconnect();
    sourceNode = null;
  }

  if (analyserNode) {
    analyserNode = null;
  }

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }

  isAudioRunning = false;
}

function renderStringsRow(): void {
  const row = document.querySelector('.string-indicators-row') as HTMLDivElement;
  if (!row) return;

  const tuning = TUNING_PRESETS[currentTuningId] || TUNING_PRESETS.standard;
  
  // 6 strings, reversed to match guitar view (string 1 is thin/highest E, on right; string 6 is thick/lowest E, on left)
  const strings = [...tuning.strings].reverse();

  row.innerHTML = strings
    .map(
      (s) => `
    <button class="tuner-string-btn" data-index="${s.index}" data-freq="${s.targetFrequency}">
      <span class="string-label">${s.noteName}</span>
      <span class="string-num">${s.index}</span>
    </button>
  `
    )
    .join('');

  // Add click listener to select a string manually to focus tuning
  const buttons = document.querySelectorAll('.tuner-string-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('string-btn-focused'));
      btn.classList.add('string-btn-focused');
    });
  });
}

function startPitchDetection(): void {
  if (!analyserNode || !audioCtx) return;

  const detector = PitchDetector.forFloat32Array(analyserNode.fftSize);
  const inputBuffer = new Float32Array(analyserNode.fftSize);
  
  const sampleRate = audioCtx.sampleRate;
  
  const needle = document.getElementById('tuner-needle') as any;
  const noteText = document.getElementById('detected-note-text') as HTMLSpanElement;
  const centsText = document.getElementById('cents-deviation-text') as HTMLSpanElement;
  const freqDisplay = document.getElementById('freq-display') as HTMLDivElement;
  const tuneInstruction = document.getElementById('tune-instruction') as HTMLDivElement;
  const successCard = document.getElementById('tune-success-card') as HTMLDivElement;

  let tunerFrameCount = 0;
  const update = () => {
    if (!analyserNode) return;
    
    tunerFrameCount++;
    if (tunerFrameCount % 2 !== 0) {
      animationId = requestAnimationFrame(update);
      return;
    }
    
    analyserNode.getFloatTimeDomainData(inputBuffer);
    
    // Pitchy detection logic
    const [pitch, clarity] = detector.findPitch(inputBuffer, sampleRate);
    
    if (pitch > 50 && pitch < 1000 && clarity > 0.85) {
      freqDisplay.textContent = `${pitch.toFixed(2)} Hz`;

      // Find closest string in current active tuning
      const tuning = TUNING_PRESETS[currentTuningId] || TUNING_PRESETS.standard;
      
      // Determine manual focused string
      const focusedBtn = document.querySelector('.string-btn-focused') as HTMLButtonElement;
      let targetString = tuning.strings[0]!;

      if (focusedBtn) {
        const index = parseInt(focusedBtn.getAttribute('data-index')!, 10);
        targetString = tuning.strings.find((s) => s.index === index) || targetString;
      } else {
        // Find closest string mathematically by target frequency
        let minDiff = Infinity;
        tuning.strings.forEach((s) => {
          const diff = Math.abs(pitch - s.targetFrequency);
          if (diff < minDiff) {
            minDiff = diff;
            targetString = s;
          }
        });
      }

      // Highlight closest string on UI
      const stringBtns = document.querySelectorAll('.tuner-string-btn');
      stringBtns.forEach((btn) => {
        const idx = parseInt(btn.getAttribute('data-index')!, 10);
        if (idx === targetString.index) {
          btn.classList.add('string-btn-active');
        } else {
          btn.classList.remove('string-btn-active');
        }
      });

      // Calculate cents deviation
      // formula: cents = 1200 * log2(f1 / f2)
      const cents = 1200 * Math.log2(pitch / targetString.targetFrequency);
      
      // needle rotation (scale cents -50 to +50 -> -90deg to +90deg)
      const clampedCents = Math.max(-50, Math.min(50, cents));
      const rotation = (clampedCents / 50) * 90;
      
      if (needle) needle.style.transform = `rotate(${rotation}deg)`;
      
      noteText.textContent = targetString.noteName;
      
      const absCents = Math.abs(cents);
      
      if (absCents <= 3.5) {
        // In tune
        centsText.textContent = 'In Tune!';
        centsText.style.color = '#10b981';
        tuneInstruction.textContent = 'Perfect!';
        tuneInstruction.style.color = '#10b981';
        
        tunedStreakCount++;
        if (tunedStreakCount > 15) {
          // Celebratory status
          if (successCard) {
            successCard.classList.remove('hidden');
            successCard.innerHTML = `<div class="mb-2 flex justify-center">${icons.checkCircle('w-8 h-8 text-success')}</div><h4 class="mt-2 text-success">${targetString.noteName} String is In Tune!</h4>`;
            
            // Auto hide after 2 seconds
            setTimeout(() => {
              successCard.classList.add('hidden');
            }, 2000);
          }
          tunedStreakCount = 0;
        }
      } else if (cents < 0) {
        // Flat
        centsText.textContent = `-${Math.round(absCents)}¢`;
        centsText.style.color = '#f97316';
        tuneInstruction.textContent = 'Tune UP ↑';
        tuneInstruction.style.color = '#f97316';
        tunedStreakCount = 0;
      } else {
        // Sharp
        centsText.textContent = `+${Math.round(absCents)}¢`;
        centsText.style.color = '#ef4444';
        tuneInstruction.textContent = 'Tune DOWN ↓';
        tuneInstruction.style.color = '#ef4444';
        tunedStreakCount = 0;
      }
    } else {
      // Idle
      if (needle) needle.style.transform = 'rotate(0deg)';
      centsText.textContent = '--';
      centsText.style.color = 'var(--text-muted)';
      tuneInstruction.textContent = 'Pluck a string...';
      tuneInstruction.style.color = 'var(--color-primary-light)';
    }

    animationId = requestAnimationFrame(update);
  };

  update();
}
