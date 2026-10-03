import { renderNav, setupNavEvents } from '../components/nav';
import { GamificationService } from '../services/gamification';

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const THEORY_QUIZZES: Record<string, QuizQuestion[]> = {
  notes_fretboard: [
    {
      question: "What is the note name of String 6 (thickest string) pressed at Fret 3?",
      options: ["A Note", "C Note", "G Note", "F Note"],
      correct: 2,
      explanation: "String 6 is tuned to low E in standard tuning. Fret 1 is F, Fret 2 is F#, and Fret 3 is G."
    },
    {
      question: "Which of the following note pairs are separated by a half-step only (1 fret apart)?",
      options: ["G and A", "B and C", "C and D", "A and B"],
      correct: 1,
      explanation: "In Western music theory, there are no sharp/flat notes between B-C and E-F. They are separated by a half-step (1 fret)."
    }
  ],
  chord_harmony: [
    {
      question: "What notes constitute the C Major triad chord?",
      options: ["C, E, G", "C, Eb, G", "C, E, G#", "C, D, G"],
      correct: 0,
      explanation: "A Major triad consists of the Root (1st), Major 3rd (3rd), and Perfect 5th (5th) scale degrees. For C Major, that is C, E, and G."
    }
  ]
};

export const theoryRoute = {
  path: '#theory',
  render: async () => {
    return `
      <div class="practice-page-container animate-fade-in mb-16">
        <main class="practice-main">
          
          <!-- Header -->
          <header class="flex justify-between items-center mb-6">
            <div>
              <h4 class="text-xs text-muted-color m-0 uppercase font-semibold">Fretboard Harmony</h4>
              <h2 class="m-0">Interactive Music Theory</h2>
            </div>
          </header>

          <div class="grid-layout-columns" style="grid-template-columns: 1fr;">
            
            <!-- Interactive Fretboard Map -->
            <section class="glass-card mb-6">
              <h3>Fretboard Note explorer</h3>
              <p class="text-xs text-muted-color mb-6">Click on any fret/string node to listen to its pitch note. Master string intervals and fret numbers.</p>
              
              <div class="fretboard-container-scroll overflow-x-auto pb-4">
                <!-- Visual Fretboard Grid -->
                <div class="fretboard-studio-grid relative" style="min-width: 800px; height: 180px; display: flex; flex-direction: column; justify-content: space-between;">
                  <div class="fret-markers flex justify-between absolute w-full pointer-events-none" style="top: -24px; padding-left: 50px;">
                    <span>Open</span>
                    <span>Fret 1</span>
                    <span>Fret 2</span>
                    <span class="text-accent-color font-bold">Fret 3 •</span>
                    <span>Fret 4</span>
                    <span class="text-accent-color font-bold">Fret 5 •</span>
                    <span>Fret 6</span>
                    <span class="text-accent-color font-bold">Fret 7 •</span>
                    <span>Fret 8</span>
                    <span class="text-accent-color font-bold">Fret 9 •</span>
                    <span>Fret 10</span>
                    <span>Fret 11</span>
                    <span class="text-accent-color font-bold">Fret 12 ••</span>
                  </div>
                  <!-- We draw 6 rows representing guitar strings: reverse order E4 down to E2 -->
                  <!-- Will be rendered dynamically in onMount to prevent messy string templates -->
                  <div id="fretboard-strings-rows" class="flex flex-col gap-2 w-full mt-2"></div>
                </div>
              </div>
            </section>

            <div class="grid-layout-columns">
              <!-- Left Side: Interactive quiz -->
              <div class="glass-card flex flex-col gap-4">
                <div class="flex justify-between items-center">
                  <h3>Theory Quiz Gym</h3>
                  <select id="quiz-category-select" class="select select-sm w-auto">
                    <option value="notes_fretboard">Fretboard Notes</option>
                    <option value="chord_harmony">Chord Harmony</option>
                  </select>
                </div>

                <!-- Quiz Card -->
                <div id="quiz-card-content" class="p-4 bg-card-elevated border-glass rounded-lg flex flex-col gap-3">
                  <h4 id="quiz-question-text" class="m-0 text-sm">Question placeholder?</h4>
                  <div class="flex flex-col gap-2" id="quiz-options-container">
                    <!-- Option buttons -->
                  </div>
                  
                  <div id="quiz-feedback-box" class="hidden p-3 rounded-lg text-xs leading-relaxed">
                    <strong id="quiz-feedback-status">Correct!</strong>
                    <p id="quiz-feedback-expl" class="m-0 mt-1 text-muted-color">Explanation...</p>
                  </div>

                  <button id="btn-next-question" class="btn btn-secondary btn-sm hidden">Next Question</button>
                </div>
              </div>

              <!-- Right Side: Guitar Scale reference charts -->
              <div class="glass-card flex flex-col gap-3">
                <h3>Scale Reference Shapes</h3>
                <div class="p-3 bg-card-elevated border-glass rounded-lg">
                  <h5 class="m-0 text-sm font-semibold">Minor Pentatonic Pattern 1</h5>
                  <p class="text-xs text-muted-color mt-1">The fundamental scale shape for blues solos. Formula: Root, Minor 3rd, Perfect 4th, Perfect 5th, Minor 7th.</p>
                </div>
                <div class="p-3 bg-card-elevated border-glass rounded-lg">
                  <h5 class="m-0 text-sm font-semibold">Major Triad Harmonization</h5>
                  <p class="text-xs text-muted-color mt-1">Building major, minor, and diminished chords using degree intervals: I - ii - iii - IV - V - vi - vii°.</p>
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
    renderInteractiveFretboard();
    setupTheoryQuiz();
  },
  onUnmount: () => {
    cleanupTheoryAudio();
  }
};

let theoryAudioCtx: AudioContext | null = null;
let theoryOscNode: OscillatorNode | null = null;

function renderInteractiveFretboard(): void {
  const container = document.getElementById('fretboard-strings-rows');
  if (!container) return;

  // 6 strings standard layout (index 6 down to 1)
  const strings = [
    { label: 'E4', baseMidi: 64, name: 'String 1' },
    { label: 'B3', baseMidi: 59, name: 'String 2' },
    { label: 'G3', baseMidi: 55, name: 'String 3' },
    { label: 'D3', baseMidi: 50, name: 'String 4' },
    { label: 'A2', baseMidi: 45, name: 'String 5' },
    { label: 'E2', baseMidi: 40, name: 'String 6' }
  ];

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  container.innerHTML = strings
    .map(
      str => `
    <div class="flex items-center gap-2 w-full fretboard-string-row">
      <span class="font-bold text-xs uppercase font-mono text-muted-color" style="min-width: 30px;">${str.label}</span>
      <div class="flex flex-grow justify-between border-t border-glass relative" style="height: 24px; padding-top: 4px;">
        ${Array.from({ length: 13 })
          .map((_, fIdx) => {
            const currentMidi = str.baseMidi + fIdx;
            const noteName = noteNames[currentMidi % 12] || '';
            const frequency = 440 * Math.pow(2, (currentMidi - 69) / 12);
            return `
            <button class="fret-node" data-freq="${frequency}" data-note="${noteName}" title="${noteName} (Fret ${fIdx})">
              <span class="fret-node-dot"></span>
            </button>
          `;
          })
          .join('')}
      </div>
    </div>
  `
    )
    .join('');

  // Bind note clicks to synth plays
  const fretBtns = document.querySelectorAll('.fret-node');
  fretBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      fretBtns.forEach(b => b.classList.remove('fret-node-active'));
      btn.classList.add('fret-node-active');
      const freq = parseFloat(btn.getAttribute('data-freq')!);
      playTheoryNotePitches(freq);
    });
  });
}

function playTheoryNotePitches(freq: number): void {
  ensureTheoryAudioCtx();
  if (!theoryAudioCtx) return;

  // Stop active oscillator
  if (theoryOscNode) {
    try { theoryOscNode.stop(); } catch(e){}
    theoryOscNode = null;
  }

  const osc = theoryAudioCtx.createOscillator();
  const gain = theoryAudioCtx.createGain();

  osc.connect(gain);
  gain.connect(theoryAudioCtx.destination);

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, theoryAudioCtx.currentTime);

  gain.gain.setValueAtTime(0.2, theoryAudioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, theoryAudioCtx.currentTime + 0.6); // decaying note

  osc.start(theoryAudioCtx.currentTime);
  osc.stop(theoryAudioCtx.currentTime + 0.65);
  theoryOscNode = osc;
}

// Quiz layout logic
let activeQuizCategory = 'notes_fretboard';
let currentQuestionIndex = 0;

function setupTheoryQuiz(): void {
  const selectCat = document.getElementById('quiz-category-select') as HTMLSelectElement;
  if (selectCat) {
    selectCat.addEventListener('change', () => {
      activeQuizCategory = selectCat.value;
      currentQuestionIndex = 0;
      loadActiveQuizQuestion();
    });
  }

  const btnNext = document.getElementById('btn-next-question');
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      currentQuestionIndex++;
      loadActiveQuizQuestion();
    });
  }

  loadActiveQuizQuestion();
}

function loadActiveQuizQuestion(): void {
  const categoryQuestions = THEORY_QUIZZES[activeQuizCategory] || THEORY_QUIZZES.notes_fretboard!;
  
  const textQuestion = document.getElementById('quiz-question-text');
  const optCont = document.getElementById('quiz-options-container');
  const feedback = document.getElementById('quiz-feedback-box');
  const btnNext = document.getElementById('btn-next-question');

  if (feedback) feedback.classList.add('hidden');
  if (btnNext) btnNext.classList.add('hidden');

  // Wrap check index
  if (currentQuestionIndex >= categoryQuestions.length) {
    if (textQuestion) textQuestion.textContent = 'Category Completed! Perfect!';
    if (optCont) optCont.innerHTML = `<p class="text-xs text-success font-semibold">You have mastered all questions in this category. Select another topic to test your skills!</p>`;
    // Award achievement XP
    GamificationService.awardXP(100);
    return;
  }

  const q = categoryQuestions[currentQuestionIndex]!;
  if (textQuestion) textQuestion.textContent = q.question;
  
  if (optCont) {
    optCont.innerHTML = q.options
      .map(
        (opt, idx) => `
      <button class="btn btn-secondary py-2 text-left justify-start text-xs quiz-option-btn w-full" data-idx="${idx}">
        ${opt}
      </button>
    `
      )
      .join('');

    // Bind option click
    const optButtons = document.querySelectorAll('.quiz-option-btn');
    optButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = parseInt(btn.getAttribute('data-idx')!, 10);
        evaluateQuizAnswer(selected, q.correct, q.explanation);
      });
    });
  }
}

function evaluateQuizAnswer(selected: number, correct: number, explanation: string): void {
  const feedback = document.getElementById('quiz-feedback-box');
  const status = document.getElementById('quiz-feedback-status');
  const expl = document.getElementById('quiz-feedback-expl');
  const btnNext = document.getElementById('btn-next-question');

  if (!feedback || !status || !expl || !btnNext) return;

  feedback.classList.remove('hidden');
  btnNext.classList.remove('hidden');

  // Disable option buttons
  const optButtons = document.querySelectorAll('.quiz-option-btn');
  optButtons.forEach((btn: any) => {
    btn.disabled = true;
    const idx = parseInt(btn.getAttribute('data-idx')!, 10);
    if (idx === correct) {
      btn.style.borderColor = 'var(--color-success)';
      btn.style.background = 'var(--color-success-glow)';
    } else if (idx === selected) {
      btn.style.borderColor = 'var(--color-error)';
      btn.style.background = 'var(--color-error-glow)';
    }
  });

  if (selected === correct) {
    status.textContent = 'Correct Answer! +25 XP';
    status.style.color = '#10b981';
    feedback.className = 'p-3 rounded-lg text-xs leading-relaxed bg-success-glow border-glass';
    // Award XP
    GamificationService.awardXP(25);
  } else {
    status.textContent = 'Incorrect Answer';
    status.style.color = '#ef4444';
    feedback.className = 'p-3 rounded-lg text-xs leading-relaxed bg-error-glow border-glass';
  }

  expl.textContent = explanation;
}

function ensureTheoryAudioCtx(): void {
  if (!theoryAudioCtx) {
    theoryAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (theoryAudioCtx.state === 'suspended') {
    theoryAudioCtx.resume();
  }
}

function cleanupTheoryAudio(): void {
  if (theoryOscNode) {
    try { theoryOscNode.stop(); } catch(e){}
    theoryOscNode = null;
  }
  if (theoryAudioCtx) {
    theoryAudioCtx.close();
    theoryAudioCtx = null;
  }
}
