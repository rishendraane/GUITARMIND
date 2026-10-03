import { renderNav, setupNavEvents } from '../components/nav';
import { GamificationService } from '../services/gamification';
import { icons } from '../components/icons';

interface EarTrainingExercise {
  id: string;
  name: string;
  notes: number[]; // MIDI note offsets (arpeggio playing)
  chordNotes?: number[][]; // MIDI chords arpeggiated
  options: string[];
  correctAnswer: string;
  explanation: string;
}

const CHORD_TRAINING: EarTrainingExercise[] = [
  {
    id: 'chord_1',
    name: 'Chord Quality 1',
    notes: [48, 52, 55], // C4, E4, G4 (C Major arpeggio)
    options: ['Major Triad', 'Minor Triad', 'Dominant 7th'],
    correctAnswer: 'Major Triad',
    explanation: 'The arpeggio played is C - E - G. It has a major 3rd interval (C to E) and perfect 5th (C to G), forming a Major Triad.'
  },
  {
    id: 'chord_2',
    name: 'Chord Quality 2',
    notes: [48, 51, 55], // C4, Eb4, G4 (C Minor arpeggio)
    options: ['Major Triad', 'Minor Triad', 'Dominant 7th'],
    correctAnswer: 'Minor Triad',
    explanation: 'The arpeggio played is C - Eb - G. The minor 3rd interval (C to Eb) forms a Minor Triad.'
  },
  {
    id: 'chord_3',
    name: 'Chord Quality 3',
    notes: [48, 52, 55, 58], // C4, E4, G4, Bb4 (C7 arpeggio)
    options: ['Major Triad', 'Minor Triad', 'Dominant 7th'],
    correctAnswer: 'Dominant 7th',
    explanation: 'The arpeggio played is C - E - G - Bb. The major triad with an added minor 7th (Bb) forms a Dominant 7th.'
  }
];

const INTERVAL_TRAINING: EarTrainingExercise[] = [
  {
    id: 'int_1',
    name: 'Interval 1',
    notes: [48, 55], // C4 to G4 (Perfect 5th)
    options: ['Major 3rd', 'Perfect 5th', 'Octave', 'Perfect 4th'],
    correctAnswer: 'Perfect 5th',
    explanation: 'The interval played is C to G, which is exactly 7 semitones, constituting a Perfect 5th.'
  },
  {
    id: 'int_2',
    name: 'Interval 2',
    notes: [48, 52], // C4 to E4 (Major 3rd)
    options: ['Major 3rd', 'Perfect 5th', 'Octave', 'Perfect 4th'],
    correctAnswer: 'Major 3rd',
    explanation: 'The interval played is C to E, which is exactly 4 semitones, constituting a Major 3rd.'
  },
  {
    id: 'int_3',
    name: 'Interval 3',
    notes: [48, 60], // C4 to C5 (Octave)
    options: ['Major 3rd', 'Perfect 5th', 'Octave', 'Perfect 4th'],
    correctAnswer: 'Octave',
    explanation: 'The interval played is C4 to C5, which is exactly 12 semitones, constituting a full Octave.'
  }
];

export const earTrainingRoute = {
  path: '#eartraining',
  render: async () => {
    return `
      <div class="practice-page-container animate-fade-in mb-16">
        <main class="practice-main">
          
          <!-- Header -->
          <header class="flex justify-between items-center mb-6">
            <div>
              <h4 class="text-xs text-muted-color m-0 uppercase font-semibold">Hearing Gym</h4>
              <h2 class="m-0">AI Ear Training</h2>
            </div>
          </header>

          <div class="grid-layout-columns">
            <!-- Left Side: Ear trainer card -->
            <div class="glass-card flex flex-col gap-4">
              <div class="flex justify-between items-center">
                <div class="tab-bar">
                  <button id="tab-chord-gym" class="tab-item tab-item-active">Chords</button>
                  <button id="tab-interval-gym" class="tab-item">Intervals</button>
                </div>
              </div>

              <!-- Gym Player -->
              <div class="p-6 bg-card-elevated border-glass rounded-lg flex flex-col items-center gap-4 text-center">
                <button id="btn-play-ear-notes" class="btn btn-primary flex flex-col items-center justify-center p-6 gap-2" style="border-radius: var(--radius-xl); min-width: 140px;">
                  <span class="w-10 h-10 flex items-center justify-center text-black fill-current mb-1">${icons.volume2('w-8 h-8')}</span>
                  <span class="block text-sm font-semibold">Play Notes</span>
                </button>
                <p class="text-xs text-muted-color">Listen to the arpeggio sound and select the correct option below.</p>
              </div>

              <!-- Options -->
              <div class="flex flex-col gap-2" id="ear-options-container">
                <!-- Buttons -->
              </div>

              <!-- Feedback -->
              <div id="ear-feedback-box" class="hidden p-3 rounded-lg text-xs leading-relaxed">
                <strong id="ear-feedback-status">Correct!</strong>
                <p id="ear-feedback-expl" class="m-0 mt-1 text-muted-color">Explanation...</p>
              </div>

              <button id="btn-next-ear-question" class="btn btn-secondary btn-sm hidden w-full">Next Exercise</button>

            </div>

            <!-- Right Side: Tips and details -->
            <div class="glass-card flex flex-col gap-3">
              <h3>Hearing Tips</h3>
              <div class="flex items-start gap-3 bg-card-elevated border-glass p-3 rounded-lg">
                <span class="text-primary-color w-6 h-6 flex items-center justify-center">${icons.music('w-5 h-5')}</span>
                <div>
                  <h5 class="m-0 text-sm font-semibold">Triad Qualities</h5>
                  <p class="text-xs text-muted-color mt-1">Major chords sound happy and full, while Minor chords carry a sad, melancholic tone.</p>
                </div>
              </div>
              <div class="flex items-start gap-3 bg-card-elevated border-glass p-3 rounded-lg">
                <span class="text-accent-color w-6 h-6 flex items-center justify-center">${icons.sparkles('w-5 h-5')}</span>
                <div>
                  <h5 class="m-0 text-sm font-semibold">Interval Recognition</h5>
                  <p class="text-xs text-muted-color mt-1">Connect intervals to song melodies. E.g., a Perfect 5th sounds like the opening notes of Star Wars!</p>
                </div>
              </div>
            </div>
          </div>

        </main>
        
        <!-- Render Bottom Nav -->
        ${renderNav()}
      </div>
    `;
  },
  onMount: () => {
    setupNavEvents();
    setupEarGymLogic();
  },
  onUnmount: () => {
    cleanupEarAudio();
  }
};

let earAudioCtx: AudioContext | null = null;
let earActiveSynthNodes: OscillatorNode[] = [];

let activeGymTab = 'chords';
let chordGymIndex = 0;
let intervalGymIndex = 0;

function setupEarGymLogic(): void {
  const tabChord = document.getElementById('tab-chord-gym');
  const tabInt = document.getElementById('tab-interval-gym');

  if (tabChord && tabInt) {
    tabChord.addEventListener('click', () => {
      tabChord.classList.add('tab-item-active');
      tabInt.classList.remove('tab-item-active');
      activeGymTab = 'chords';
      resetEarGym();
    });

    tabInt.addEventListener('click', () => {
      tabInt.classList.add('tab-item-active');
      tabChord.classList.remove('tab-item-active');
      activeGymTab = 'intervals';
      resetEarGym();
    });
  }

  const btnPlay = document.getElementById('btn-play-ear-notes');
  if (btnPlay) {
    btnPlay.addEventListener('click', () => {
      playEarGymActiveNotes();
    });
  }

  const btnNext = document.getElementById('btn-next-ear-question');
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (activeGymTab === 'chords') chordGymIndex++;
      else intervalGymIndex++;
      loadActiveEarGymExercise();
    });
  }

  loadActiveEarGymExercise();
}

function resetEarGym(): void {
  chordGymIndex = 0;
  intervalGymIndex = 0;
  loadActiveEarGymExercise();
}

function loadActiveEarGymExercise(): void {
  const exercises = activeGymTab === 'chords' ? CHORD_TRAINING : INTERVAL_TRAINING;
  const index = activeGymTab === 'chords' ? chordGymIndex : intervalGymIndex;

  const optCont = document.getElementById('ear-options-container');
  const feedback = document.getElementById('ear-feedback-box');
  const btnNext = document.getElementById('btn-next-ear-question');
  const btnPlay = document.getElementById('btn-play-ear-notes');

  if (feedback) feedback.classList.add('hidden');
  if (btnNext) btnNext.classList.add('hidden');

  if (index >= exercises.length) {
    if (btnPlay) btnPlay.style.display = 'none';
    if (optCont) optCont.innerHTML = `<p class="text-xs text-success text-center font-semibold">Fantastic work! You have finished all Ear Training exercises in this section. +100 XP</p>`;
    GamificationService.awardXP(100);
    return;
  }

  if (btnPlay) btnPlay.style.display = 'inline-flex';

  const ex = exercises[index]!;
  
  if (optCont) {
    optCont.innerHTML = ex.options
      .map(
        (opt) => `
      <button class="btn btn-secondary py-2 text-left justify-start text-xs ear-option-btn w-full" data-val="${opt}">
        ${opt}
      </button>
    `
      )
      .join('');

    // Bind click
    const optButtons = document.querySelectorAll('.ear-option-btn');
    optButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.getAttribute('data-val')!;
        evaluateEarAnswer(value, ex.correctAnswer, ex.explanation);
      });
    });
  }

  // Auto play notes
  playEarGymActiveNotes();
}

function playEarGymActiveNotes(): void {
  ensureEarAudioCtx();
  if (!earAudioCtx) return;

  const exercises = activeGymTab === 'chords' ? CHORD_TRAINING : INTERVAL_TRAINING;
  const index = activeGymTab === 'chords' ? chordGymIndex : intervalGymIndex;
  
  if (index >= exercises.length) return;
  const ex = exercises[index]!;

  // Stop active synths
  earActiveSynthNodes.forEach(n => {
    try { n.stop(); } catch(e){}
  });
  earActiveSynthNodes = [];

  const now = earAudioCtx.currentTime;

  // Play arpeggio (notes offset by 250ms)
  ex.notes.forEach((midi, idx) => {
    if (!earAudioCtx) return;
    const osc = earAudioCtx.createOscillator();
    const gain = earAudioCtx.createGain();

    osc.connect(gain);
    gain.connect(earAudioCtx.destination);

    osc.type = 'triangle';
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    osc.frequency.setValueAtTime(freq, now + idx * 0.25);

    gain.gain.setValueAtTime(0, now + idx * 0.25);
    gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.25 + 0.05);
    gain.gain.setValueAtTime(0.2, now + idx * 0.25 + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.25 + 0.5);

    osc.start(now + idx * 0.25);
    osc.stop(now + idx * 0.25 + 0.55);
    earActiveSynthNodes.push(osc);
  });
}

function evaluateEarAnswer(selected: string, correct: string, explanation: string): void {
  const feedback = document.getElementById('ear-feedback-box');
  const status = document.getElementById('ear-feedback-status');
  const expl = document.getElementById('ear-feedback-expl');
  const btnNext = document.getElementById('btn-next-ear-question');

  if (!feedback || !status || !expl || !btnNext) return;

  feedback.classList.remove('hidden');
  btnNext.classList.remove('hidden');

  const optButtons = document.querySelectorAll('.ear-option-btn');
  optButtons.forEach((btn: any) => {
    btn.disabled = true;
    const val = btn.getAttribute('data-val')!;
    if (val === correct) {
      btn.style.borderColor = 'var(--color-success)';
      btn.style.background = 'var(--color-success-glow)';
    } else if (val === selected) {
      btn.style.borderColor = 'var(--color-error)';
      btn.style.background = 'var(--color-error-glow)';
    }
  });

  if (selected === correct) {
    status.textContent = 'Correct! +35 XP';
    status.style.color = '#10b981';
    feedback.className = 'p-3 rounded-lg text-xs leading-relaxed bg-success-glow border-glass';
    GamificationService.awardXP(35);
  } else {
    status.textContent = 'Incorrect';
    status.style.color = '#ef4444';
    feedback.className = 'p-3 rounded-lg text-xs leading-relaxed bg-error-glow border-glass';
  }

  expl.textContent = explanation;
}

function ensureEarAudioCtx(): void {
  if (!earAudioCtx) {
    earAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (earAudioCtx.state === 'suspended') {
    earAudioCtx.resume();
  }
}

function cleanupEarAudio(): void {
  earActiveSynthNodes.forEach(n => {
    try { n.stop(); } catch(e){}
  });
  earActiveSynthNodes = [];
  
  if (earAudioCtx) {
    earAudioCtx.close();
    earAudioCtx = null;
  }
}
