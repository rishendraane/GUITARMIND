import { renderNav, setupNavEvents } from '../components/nav';
import { PitchDetector } from 'pitchy';
import { icons } from '../components/icons';

interface JamChordLoop {
  name: string;
  chords: string[];
  bpm: number;
}

const JAM_LOOPS: JamChordLoop[] = [
  { name: 'Blues Shuffle', chords: ['Am', 'Dm', 'Am', 'E7'], bpm: 80 },
  { name: 'Pop Progression', chords: ['G', 'D', 'Em', 'C'], bpm: 95 },
  { name: 'Rock Anthem', chords: ['Em', 'C', 'G', 'D'], bpm: 120 }
];

export const jamRoute = {
  path: '#jam',
  render: async () => {
    const loopOptions = JAM_LOOPS
      .map((l, idx) => `<option value="${idx}">${l.name} (${l.chords.join(' - ')})</option>`)
      .join('');

    return `
      <div class="practice-page-container animate-fade-in mb-16">
        <main class="practice-main flex flex-col items-center">
          
          <!-- Header -->
          <header class="w-full flex justify-between items-center mb-6">
            <div>
              <h4 class="text-xs text-muted-color m-0 uppercase font-semibold">Guitar Sandbox</h4>
              <h2 class="m-0">AI Jam Session</h2>
            </div>
            
            <div class="input-group w-auto m-0">
              <select id="jam-loop-select" class="select select-sm">
                ${loopOptions}
              </select>
            </div>
          </header>

          <!-- Main Jam Board -->
          <div class="glass-card w-full mb-6 p-6 flex flex-col items-center relative overflow-hidden">
            <div class="lesson-glow-bg" style="background: radial-gradient(circle at center, rgba(16,185,129,0.12) 0%, transparent 70%);"></div>
            
            <div id="jam-mic-view" class="text-center py-6">
              <div class="w-16 h-16 text-primary-color animate-pulse mx-auto flex items-center justify-center mb-4">
                ${icons.mic('w-12 h-12')}
              </div>
              <h3 class="mb-2">Connect Mic for Jam Chord Detection</h3>
              <p class="text-xs text-muted-color max-w-sm mb-6">Play along with the synthesised drums and let the app score your chord alignment in real-time!</p>
              <button id="btn-enable-jam-mic" class="btn btn-primary">
                <span>Start Jam Studio</span>
              </button>
            </div>

            <div id="jam-active-view" class="hidden w-full flex flex-col items-center gap-6 relative z-10">
              
              <!-- Progression bar -->
              <div class="w-full flex gap-3 justify-center" id="jam-chords-row">
                <!-- Chords populated dynamically -->
              </div>

              <!-- Metronome / Jam Grid -->
              <div class="flex justify-between items-center w-full max-w-sm border-glass bg-glass p-4 rounded-lg my-2 text-center">
                <div>
                  <span class="text-xs text-muted-color block">Tempo</span>
                  <span id="jam-bpm-text" class="text-xl font-bold font-mono text-primary-color">95 BPM</span>
                </div>
                <div class="border-r border-glass h-8"></div>
                <div>
                  <span class="text-xs text-muted-color block">Detected Chord</span>
                  <span id="jam-detected-chord" class="text-xl font-bold text-accent-color">--</span>
                </div>
                <div class="border-r border-glass h-8"></div>
                <div>
                  <span class="text-xs text-muted-color block">Jam Points</span>
                  <span id="jam-score" class="text-xl font-bold text-success font-mono">0 pts</span>
                </div>
              </div>

              <!-- Controls -->
              <div class="flex justify-center items-center gap-4">
                <button id="btn-toggle-drums" class="btn btn-secondary px-6">
                  <span id="drums-play-icon">▶</span> <span id="drums-play-text">Start Drum Loop</span>
                </button>
                <div class="w-8 h-8 rounded-full bg-glass transition-all duration-75" id="jam-beat-flash"></div>
              </div>

              <!-- Spectrogram Centroid visualizer -->
              <canvas id="jam-visualizer-canvas" class="w-full h-16 bg-black-glow rounded-lg border-glass mt-2"></canvas>

            </div>
          </div>

          <!-- Chord Reference guides -->
          <div class="glass-card w-full">
            <h3 class="mb-4">Chord Progression Reference</h3>
            <div id="jam-chord-diagrams" class="grid grid-cols-4 gap-3">
              <!-- Diagrams -->
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
    setupJamLogic();
  },
  onUnmount: () => {
    cleanupJamAudio();
  }
};

let jamAudioCtx: AudioContext | null = null;
let jamAnalyser: AnalyserNode | null = null;
let jamStream: MediaStream | null = null;
let jamMicSource: MediaStreamAudioSourceNode | null = null;
let jamDrawId: number | null = null;

let isDrumsPlaying = false;
let drumLoopInterval: number | null = null;
let activeLoopIndex = 0;
let jamBpm = 95;
let jamPoints = 0;

function setupJamLogic(): void {
  const btnEnableMic = document.getElementById('btn-enable-jam-mic');
  const selectLoop = document.getElementById('jam-loop-select') as HTMLSelectElement;
  const micView = document.getElementById('jam-mic-view');
  const activeView = document.getElementById('jam-active-view');

  if (btnEnableMic) {
    btnEnableMic.addEventListener('click', async () => {
      try {
        await startJamAudioPipeline();
        if (micView) micView.classList.add('hidden');
        if (activeView) activeView.classList.remove('hidden');
        loadActiveLoop();
      } catch (err) {
        console.error(err);
        alert('Could not start microphone. Jamming in offline chord mode.');
        // Bypass to active view
        if (micView) micView.classList.add('hidden');
        if (activeView) activeView.classList.remove('hidden');
        loadActiveLoop();
      }
    });
  }

  if (selectLoop) {
    selectLoop.addEventListener('change', () => {
      activeLoopIndex = parseInt(selectLoop.value, 10);
      loadActiveLoop();
    });
  }

  const btnDrums = document.getElementById('btn-toggle-drums');
  if (btnDrums) {
    btnDrums.addEventListener('click', () => {
      if (isDrumsPlaying) {
        stopDrums();
      } else {
        startDrums();
      }
    });
  }
}

function loadActiveLoop(): void {
  stopDrums();
  const loop = JAM_LOOPS[activeLoopIndex] || JAM_LOOPS[0]!;
  jamBpm = loop.bpm;

  const bpmText = document.getElementById('jam-bpm-text');
  if (bpmText) bpmText.textContent = `${jamBpm} BPM`;

  // Draw progress cards
  const chordsCont = document.getElementById('jam-chords-row');
  if (chordsCont) {
    chordsCont.innerHTML = loop.chords
      .map(
        (c, idx) => `
      <div class="glass-card px-6 py-4 flex-1 text-center font-bold text-lg font-mono border-glass jam-loop-chord-card" data-idx="${idx}">
        ${c}
      </div>
    `
      )
      .join('');
  }

  // Draw chord diagrams
  renderJamChordDiagrams(loop.chords);
}

function renderJamChordDiagrams(chords: string[]): void {
  const container = document.getElementById('jam-chord-diagrams');
  if (!container) return;

  const diagrams: Record<string, string> = {
    Am: `<div class="fretboard-widget"><span class="chord-title">Am</span><pre class="fretboard-text">E|-o-|
B|-1-|
G|-2-|
D|-2-|
A|-o-|
E|-x-|</pre></div>`,
    Dm: `<div class="fretboard-widget"><span class="chord-title">Dm</span><pre class="fretboard-text">E|-1-|
B|-3-|
G|-2-|
D|-o-|
A|-o-|
E|-x-|</pre></div>`,
    E7: `<div class="fretboard-widget"><span class="chord-title">E7</span><pre class="fretboard-text">E|-o-|
B|-3-|
G|-1-|
D|-o-|
A|-2-|
E|-o-|</pre></div>`,
    G: `<div class="fretboard-widget"><span class="chord-title">G</span><pre class="fretboard-text">E|-3-|
B|-o-|
G|-o-|
D|-o-|
A|-2-|
E|-3-|</pre></div>`,
    C: `<div class="fretboard-widget"><span class="chord-title">C</span><pre class="fretboard-text">E|-o-|
B|-1-|
G|-o-|
D|-2-|
A|-3-|
E|-x-|</pre></div>`,
    D: `<div class="fretboard-widget"><span class="chord-title">D</span><pre class="fretboard-text">E|-2-|
B|-3-|
G|-2-|
D|-o-|
A|-x-|
E|-x-|</pre></div>`,
    Em: `<div class="fretboard-widget"><span class="chord-title">Em</span><pre class="fretboard-text">E|-o-|
B|-o-|
G|-o-|
D|-2-|
A|-2-|
E|-o-|</pre></div>`
  };

  container.innerHTML = chords
    .map(c => diagrams[c] || `<div class="fretboard-widget"><span class="chord-title">${c}</span><pre class="fretboard-text">--</pre></div>`)
    .join('');
}

// ----------------------------------------------------
// Web Audio API drum beat loops
// ----------------------------------------------------
function startDrums(): void {
  if (isDrumsPlaying) return;
  ensureJamAudioContext();

  const loop = JAM_LOOPS[activeLoopIndex] || JAM_LOOPS[0]!;
  const beatDuration = 60 / jamBpm;
  const chords = loop.chords;
  let beatCount = 0;
  let chordIndex = 0;

  const playBeat = () => {
    if (!jamAudioCtx || !isDrumsPlaying) return;

    // Flash metronome indicator
    const flash = document.getElementById('jam-beat-flash');
    if (flash) {
      flash.style.transform = 'scale(1.25)';
      flash.style.backgroundColor = beatCount === 0 ? 'var(--color-success)' : 'var(--color-primary-light)';
      setTimeout(() => {
        flash.style.transform = 'scale(1.0)';
        flash.style.backgroundColor = 'var(--bg-glass)';
      }, 90);
    }

    // Progression index logic: chord shifts every 4 beats
    if (beatCount === 0) {
      const cards = document.querySelectorAll('.jam-loop-chord-card');
      cards.forEach((card, idx) => {
        if (idx === chordIndex) {
          card.classList.add('fretboard-widget-active');
        } else {
          card.classList.remove('fretboard-widget-active');
        }
      });

      // Simple score evaluation: If user played correct chord in time, add points
      const detected = document.getElementById('jam-detected-chord')?.textContent;
      const target = chords[chordIndex];
      if (detected && detected === target) {
        jamPoints += 50;
        const scoreText = document.getElementById('jam-score');
        if (scoreText) scoreText.textContent = `${jamPoints} pts`;
        
        // Visual indicator of correct playing
        const currentCard = document.querySelector(`.jam-loop-chord-card[data-idx="${chordIndex}"]`);
        if (currentCard) {
          currentCard.classList.add('string-btn-active');
          setTimeout(() => currentCard.classList.remove('string-btn-active'), 400);
        }
      }

      chordIndex = (chordIndex + 1) % chords.length;
    }

    // 1. Synthesize Bass Kick Drum on Beats 0 and 2
    if (beatCount === 0 || beatCount === 2) {
      const kickOsc = jamAudioCtx.createOscillator();
      const kickGain = jamAudioCtx.createGain();
      kickOsc.connect(kickGain);
      kickGain.connect(jamAudioCtx.destination);
      
      kickOsc.frequency.setValueAtTime(150, jamAudioCtx.currentTime);
      kickOsc.frequency.exponentialRampToValueAtTime(0.01, jamAudioCtx.currentTime + 0.15); // descending pitch drop
      
      kickGain.gain.setValueAtTime(0.6, jamAudioCtx.currentTime);
      kickGain.gain.exponentialRampToValueAtTime(0.001, jamAudioCtx.currentTime + 0.16);
      
      kickOsc.start(jamAudioCtx.currentTime);
      kickOsc.stop(jamAudioCtx.currentTime + 0.18);
    }

    // 2. Synthesize Hi-Hat Snare on beats 1 and 3 (using white noise sound buffer)
    if (beatCount === 1 || beatCount === 3) {
      const noiseBuffer = createNoiseBuffer();
      if (noiseBuffer) {
        const noiseNode = jamAudioCtx.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        
        const noiseFilter = jamAudioCtx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1200; // band filter hi-hat frequency

        const noiseGain = jamAudioCtx.createGain();
        
        noiseNode.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(jamAudioCtx.destination);
        
        noiseGain.gain.setValueAtTime(0.06, jamAudioCtx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, jamAudioCtx.currentTime + 0.09);
        
        noiseNode.start(jamAudioCtx.currentTime);
        noiseNode.stop(jamAudioCtx.currentTime + 0.1);
      }
    }

    beatCount = (beatCount + 1) % 4;
  };

  playBeat();
  drumLoopInterval = window.setInterval(playBeat, beatDuration * 1000);
  isDrumsPlaying = true;

  const btnPlay = document.getElementById('btn-toggle-drums');
  const playIcon = document.getElementById('drums-play-icon');
  const playText = document.getElementById('drums-play-text');

  if (btnPlay) btnPlay.classList.add('btn-primary');
  if (playIcon) playIcon.textContent = '⏸';
  if (playText) playText.textContent = 'Stop Beat';
}

function stopDrums(): void {
  if (!isDrumsPlaying) return;

  if (drumLoopInterval) {
    clearInterval(drumLoopInterval);
    drumLoopInterval = null;
  }
  isDrumsPlaying = false;

  const cards = document.querySelectorAll('.jam-loop-chord-card');
  cards.forEach(c => c.classList.remove('fretboard-widget-active'));

  const btnPlay = document.getElementById('btn-toggle-drums');
  const playIcon = document.getElementById('drums-play-icon');
  const playText = document.getElementById('drums-play-text');

  if (btnPlay) btnPlay.classList.remove('btn-primary');
  if (playIcon) playIcon.textContent = '▶';
  if (playText) playText.textContent = 'Start Drum Loop';
}

// Generate simple white noise buffer for snare hi-hat synthesis
function createNoiseBuffer(): AudioBuffer | null {
  if (!jamAudioCtx) return null;
  const bufferSize = jamAudioCtx.sampleRate * 0.1; // 100ms
  const buffer = jamAudioCtx.createBuffer(1, bufferSize, jamAudioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// ----------------------------------------------------
// Acoustic Microphone Audio Capture & Chord Recognition
// ----------------------------------------------------
async function startJamAudioPipeline(): Promise<void> {
  ensureJamAudioContext();

  jamStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  
  if (jamAudioCtx) {
    jamMicSource = jamAudioCtx.createMediaStreamSource(jamStream);
    jamAnalyser = jamAudioCtx.createAnalyser();
    jamAnalyser.fftSize = 1024;
    jamMicSource.connect(jamAnalyser);
  }

  startJamSpectrogramLoop();
}

function startJamSpectrogramLoop(): void {
  const canvas = document.getElementById('jam-visualizer-canvas') as HTMLCanvasElement;
  if (!canvas || !jamAnalyser || !jamAudioCtx) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const bufferLength = jamAnalyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  const pitchBuffer = new Float32Array(jamAnalyser.fftSize);
  const detector = PitchDetector.forFloat32Array(jamAnalyser.fftSize);

  let jamFrameCount = 0;
  const draw = () => {
    if (!jamAnalyser || !jamAudioCtx) return;

    jamDrawId = requestAnimationFrame(draw);

    jamFrameCount++;
    if (jamFrameCount % 2 !== 0) return;

    jamAnalyser.getByteFrequencyData(dataArray);
    jamAnalyser.getFloatTimeDomainData(pitchBuffer);

    // Draw audio visual spectrogram blocks
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = 'rgba(10, 10, 15, 0.4)';
    ctx.fillRect(0, 0, width, height);

    const barWidth = (width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const val = dataArray[i]! / 255;
      ctx.fillStyle = `rgba(16, 185, 129, ${val})`; // green glow peaks
      ctx.fillRect(x, height - val * height, barWidth - 1, val * height);
      x += barWidth;
    }

    // Try pitch analysis & chord recognition matching
    const [pitch, clarity] = detector.findPitch(pitchBuffer, jamAudioCtx.sampleRate);
    if (pitch > 60 && pitch < 1000 && clarity > 0.84) {
      evaluatePitchToChordName(pitch);
    }
  };

  draw();
}

// Quick spectrum matching heuristics for standard practice chords
function evaluatePitchToChordName(pitch: number): void {
  const textChord = document.getElementById('jam-detected-chord');
  if (!textChord) return;

  // Standard string pitch notes (E2: 82.4, A2: 110, D3: 146.8, G3: 196, B3: 246.9, E4: 329.6)
  // Let's check dominant pitch ranges to map chord names
  let chord = '--';
  
  if (pitch >= 190 && pitch <= 205) {
    chord = 'G';
  } else if (pitch >= 215 && pitch <= 228) {
    chord = 'Am';
  } else if (pitch >= 255 && pitch <= 270) {
    chord = 'C';
  } else if (pitch >= 285 && pitch <= 305) {
    chord = 'D';
  } else if (pitch >= 140 && pitch <= 152) {
    chord = 'Dm';
  } else if (pitch >= 160 && pitch <= 172) {
    chord = 'Em';
  } else if (pitch >= 320 && pitch <= 340) {
    chord = 'E7';
  }

  if (chord !== '--') {
    textChord.textContent = chord;
  }
}

function ensureJamAudioContext(): void {
  if (!jamAudioCtx) {
    jamAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (jamAudioCtx.state === 'suspended') {
    jamAudioCtx.resume();
  }
}

function cleanupJamAudio(): void {
  stopDrums();
  
  if (jamDrawId) {
    cancelAnimationFrame(jamDrawId);
    jamDrawId = null;
  }

  if (jamMicSource) {
    jamMicSource.disconnect();
    jamMicSource = null;
  }

  if (jamAnalyser) {
    jamAnalyser = null;
  }

  if (jamStream) {
    jamStream.getTracks().forEach(t => t.stop());
    jamStream = null;
  }

  if (jamAudioCtx) {
    jamAudioCtx.close();
    jamAudioCtx = null;
  }
}
