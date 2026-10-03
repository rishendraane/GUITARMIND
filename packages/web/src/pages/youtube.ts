import { appStore, dashboardStore } from '../store';
import { renderNav, setupNavEvents } from '../components/nav';
import { RoadmapService } from '../services/roadmap';
import type { RoadmapTask, SongTranscriptionResult, TranscribedNote } from '@guitarmind/core';
import { SongsRepo } from '../repositories/songs.repo';
import { icons } from '../components/icons';
import {
  TranscriptionService,
  type AudioAnalysisSummary,
  type ArrangementConfig,
  type StringConstraintMode,
  type SingleStringTarget,
  type TwoStringsTarget
} from '../services/transcription';

let baseTranscription: SongTranscriptionResult | null = null;
let activeTranscription: SongTranscriptionResult | null = null;
let currentAllowedStrings: number[] = [1, 2, 3, 4, 5, 6];
let currentArrangementConfig: ArrangementConfig = {
  stringCount: '6',
  singleStringTarget: 'auto',
  twoStringsTarget: 'auto',
  includeChords: true
};

let currentSourceMode: 'link' | 'upload' = 'upload';
let uploadedAudioFile: File | null = null;
let uploadedAudioUrl: string | null = null;
let uploadedAudioAnalysis: AudioAnalysisSummary | null = null;
let playbackSpeed: number = 1.0;
let isAudioSynthesizing: boolean = false;
let currentTrackASource: 'upload' | 'youtube' | 'stream' = 'upload';
let currentYouTubeVideoId: string | null = null;
let isYouTubePlaying: boolean = false;

function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();
  const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (match && match[1]) return match[1];
  if (/^[\w-]{11}$/.test(clean)) return clean;
  return null;
}

function setupTrackAForYouTube(videoId: string, title: string): void {
  currentTrackASource = 'youtube';
  currentYouTubeVideoId = videoId;
  isYouTubePlaying = false;

  const audioCont = document.getElementById('container-track-a-audio');
  const ytCont = document.getElementById('container-track-a-youtube');
  const iframe = document.getElementById('youtube-embed-iframe') as HTMLIFrameElement;
  const label = document.getElementById('original-audio-track-label');
  const badge = document.getElementById('track-a-source-badge');
  const originalAudioPlayer = document.getElementById('original-audio-player') as HTMLAudioElement;
  const btnSoloA = document.getElementById('btn-solo-a');

  if (originalAudioPlayer && !originalAudioPlayer.paused) {
    originalAudioPlayer.pause();
  }

  if (audioCont) audioCont.classList.add('hidden');
  if (ytCont) ytCont.classList.remove('hidden');
  if (iframe) {
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1`;
  }
  if (label) label.textContent = `YouTube: ${title}`;
  if (badge) {
    badge.textContent = 'YouTube Audio';
    badge.style.background = 'rgba(239, 68, 68, 0.15)';
    badge.style.color = '#f87171';
    badge.style.border = '1px solid rgba(239, 68, 68, 0.3)';
  }
  if (btnSoloA) {
    btnSoloA.innerHTML = `${icons.play('w-3 h-3')} <span>Play YouTube Audio</span>`;
  }
}

function setupTrackAForUploadedFile(file: File): void {
  currentTrackASource = 'upload';
  currentYouTubeVideoId = null;
  isYouTubePlaying = false;

  const audioCont = document.getElementById('container-track-a-audio');
  const ytCont = document.getElementById('container-track-a-youtube');
  const iframe = document.getElementById('youtube-embed-iframe') as HTMLIFrameElement;
  const label = document.getElementById('original-audio-track-label');
  const badge = document.getElementById('track-a-source-badge');
  const btnSoloA = document.getElementById('btn-solo-a');

  if (iframe) iframe.src = 'about:blank';
  if (ytCont) ytCont.classList.add('hidden');
  if (audioCont) audioCont.classList.remove('hidden');
  if (label) label.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
  if (badge) {
    badge.textContent = 'Track A';
    badge.style.background = 'rgba(59, 130, 246, 0.15)';
    badge.style.color = '#60a5fa';
    badge.style.border = '1px solid rgba(59, 130, 246, 0.3)';
  }
  if (btnSoloA) {
    btnSoloA.innerHTML = `${icons.play('w-3 h-3')} <span>Play Original</span>`;
  }
}

function setupTrackAForAudioStream(streamUrl: string, title: string): void {
  currentTrackASource = 'stream';
  currentYouTubeVideoId = null;
  isYouTubePlaying = false;

  const audioCont = document.getElementById('container-track-a-audio');
  const ytCont = document.getElementById('container-track-a-youtube');
  const iframe = document.getElementById('youtube-embed-iframe') as HTMLIFrameElement;
  const label = document.getElementById('original-audio-track-label');
  const badge = document.getElementById('track-a-source-badge');
  const originalAudioPlayer = document.getElementById('original-audio-player') as HTMLAudioElement;
  const btnSoloA = document.getElementById('btn-solo-a');

  if (iframe) iframe.src = 'about:blank';
  if (ytCont) ytCont.classList.add('hidden');
  if (audioCont) audioCont.classList.remove('hidden');
  if (originalAudioPlayer) {
    originalAudioPlayer.src = streamUrl;
  }
  if (label) label.textContent = title;
  if (badge) {
    badge.textContent = 'Web Stream';
    badge.style.background = 'rgba(59, 130, 246, 0.15)';
    badge.style.color = '#60a5fa';
    badge.style.border = '1px solid rgba(59, 130, 246, 0.3)';
  }
  if (btnSoloA) {
    btnSoloA.innerHTML = `${icons.play('w-3 h-3')} <span>Play Original</span>`;
  }
}

function playTrackA(): void {
  if (isAudioSynthesizing) stopPlayback();

  const btnSoloA = document.getElementById('btn-solo-a');
  if (currentTrackASource === 'youtube' && currentYouTubeVideoId) {
    const iframe = document.getElementById('youtube-embed-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
      isYouTubePlaying = true;
      if (btnSoloA) btnSoloA.innerHTML = `${icons.pause('w-3 h-3')} <span>Pause YouTube</span>`;
    }
  } else {
    const originalAudioPlayer = document.getElementById('original-audio-player') as HTMLAudioElement;
    if (originalAudioPlayer) {
      originalAudioPlayer.play().catch(e => console.warn('Could not play track A:', e));
      if (btnSoloA) btnSoloA.innerHTML = `${icons.pause('w-3 h-3')} <span>Pause Track A</span>`;
    }
  }
}

function pauseTrackA(): void {
  const btnSoloA = document.getElementById('btn-solo-a');
  if (currentTrackASource === 'youtube') {
    const iframe = document.getElementById('youtube-embed-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*');
      isYouTubePlaying = false;
      if (btnSoloA) btnSoloA.innerHTML = `${icons.play('w-3 h-3')} <span>Play YouTube Audio</span>`;
    }
  } else {
    const originalAudioPlayer = document.getElementById('original-audio-player') as HTMLAudioElement;
    if (originalAudioPlayer) {
      originalAudioPlayer.pause();
      if (btnSoloA) btnSoloA.innerHTML = `${icons.play('w-3 h-3')} <span>Play Original</span>`;
    }
  }
}

export const youtubeRoute = {
  path: '#youtube',
  render: async () => {
    const user = appStore.getState().currentUser;
    const userId = user ? user.uid : 'anonymous';
    const recentImports = userId !== 'anonymous' ? await SongsRepo.getYouTubeImports(userId) : [];

    const importsHtml = recentImports.length > 0
      ? recentImports.map(imp => {
          const dateStr = imp.createdAt ? new Date(imp.createdAt).toLocaleDateString() : 'recently';
          return `
            <div class="p-3 bg-card-elevated border-glass rounded-lg cursor-pointer hover:border-white-glow btn-recent-import" data-title="${encodeURIComponent(imp.title)}" data-artist="${encodeURIComponent(imp.artist || '')}" data-url="${encodeURIComponent(imp.youtubeUrl || '')}">
              <div class="flex items-center justify-between">
                <h5 class="m-0 text-sm font-semibold">${imp.title}</h5>
                <span class="badge badge-success text-xxs capitalize" style="background-color: rgba(52, 211, 153, 0.2); color: rgb(52, 211, 153); border: 1px solid rgba(52, 211, 153, 0.3);">${imp.status || 'saved'}</span>
              </div>
              <p class="text-xs text-muted-color mt-1 m-0">${imp.artist || 'Unknown'} • Transcribed ${dateStr}</p>
            </div>
          `;
        }).join('')
      : `
        <p class="text-xs text-muted-color m-0">No recent transcriptions found. Enter a song link or upload an audio file to extract exact notes!</p>
      `;

    return `
      <div class="w-full min-h-screen flex flex-col items-center animate-fade-in pb-28 overflow-x-hidden" style="background: radial-gradient(circle at 10% 10%, rgba(245, 158, 11, 0.04) 0%, transparent 45%), radial-gradient(circle at 90% 10%, rgba(124, 58, 237, 0.06) 0%, transparent 45%), var(--bg-main);">
        <main class="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 min-w-0">
          
          <!-- Header -->
          <header class="flex justify-between items-center mb-2">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="badge badge-primary text-xxs uppercase tracking-wider font-semibold">AI Musical Perception v2</span>
                <span class="badge text-xxs font-mono" style="background: rgba(52, 211, 153, 0.15); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3);">YIN Spectral Engine Active</span>
              </div>
              <h2 class="m-0 text-2xl font-bold">AI Song & Tab Transcriber</h2>
              <p class="text-xs text-muted-color m-0 mt-1">Upload song audio or paste a link. Customize single-string solos, 2-string riffs, or full 6-string arrangements with or without chords.</p>
            </div>
          </header>

          <!-- Top Input & Recents Row (2 columns: 65% / 35%) -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
            
            <!-- Left 2 Columns: Source Input Selector -->
            <div class="lg:col-span-2 flex flex-col gap-4 w-full min-w-0">
              <div class="glass-card w-full min-w-0">
                <!-- Mode Switcher Tabs -->
                <div class="flex gap-2 p-1 bg-card-elevated border-glass rounded-lg mb-4 w-fit">
                  <button type="button" id="tab-mode-upload" class="btn btn-sm ${currentSourceMode === 'upload' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-1.5 text-xs">
                    ${icons.upload('w-3.5 h-3.5')}
                    <span>Upload Audio File</span>
                  </button>
                  <button type="button" id="tab-mode-link" class="btn btn-sm ${currentSourceMode === 'link' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-1.5 text-xs">
                    ${icons.video('w-3.5 h-3.5')}
                    <span>Song Link / YouTube</span>
                  </button>
                </div>

                <!-- Upload Mode Container -->
                <div id="container-upload-mode" class="${currentSourceMode === 'upload' ? '' : 'hidden'}">
                  <p class="text-xs text-muted-color mb-3">Upload any MP3, WAV, M4A, or OGG recording. High-precision YIN pitch tracker isolates fundamental guitar notes, tempo, and chords.</p>
                  <div id="audio-drop-zone" class="border-2 border-dashed border-glass rounded-xl p-6 text-center cursor-pointer hover:border-primary-color transition-all flex flex-col items-center justify-center gap-2" style="background: rgba(255,255,255,0.015);">
                    <div class="w-12 h-12 rounded-full bg-glass border-glass flex items-center justify-center text-primary-color mb-1">
                      ${icons.upload('w-6 h-6')}
                    </div>
                    <h5 class="m-0 text-sm font-semibold">Drop audio file here or click to browse</h5>
                    <p class="text-xxs text-muted-color m-0">Supports MP3, WAV, M4A, OGG up to 50MB</p>
                    <input type="file" id="audio-file-input" accept="audio/*" class="hidden" />
                  </div>
                  
                  <div class="flex items-center justify-between mt-3 px-1">
                    <span class="text-xxs text-muted-color">Want to test with the uploaded groove?</span>
                    <button type="button" id="btn-load-sample-riff" class="btn btn-secondary btn-sm text-xxs flex items-center gap-1.5 py-1 px-3">
                      ${icons.music('w-3.5 h-3.5 text-primary-color')}
                      <span>Load Sample Track (28s D-Minor Riff)</span>
                    </button>
                  </div>
                  
                  <div id="audio-file-preview" class="hidden mt-4 p-3 bg-card-elevated border-glass rounded-xl flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-lg bg-primary-color/20 text-primary-color flex items-center justify-center">
                        ${icons.music('w-5 h-5')}
                      </div>
                      <div>
                        <div id="audio-file-name" class="text-xs font-semibold text-white">song.mp3</div>
                        <div id="audio-file-meta" class="text-xxs text-muted-color">Ready for frequency scanning</div>
                      </div>
                    </div>
                    <button id="btn-analyze-upload" class="btn btn-primary btn-sm flex items-center gap-1.5 px-4">
                      ${icons.sparkles('w-3.5 h-3.5')}
                      <span>Transcribe Audio</span>
                    </button>
                  </div>
                </div>

                <!-- Link Mode Container -->
                <div id="container-link-mode" class="${currentSourceMode === 'link' ? '' : 'hidden'}">
                  <p class="text-xs text-muted-color mb-3">Paste any YouTube song or acoustic guitar video link below to transcribe the exact notes.</p>
                  <div class="flex gap-2">
                    <input type="text" id="youtube-url-input" placeholder="https://www.youtube.com/watch?v=..." class="input" style="flex-grow: 1;" />
                    <button id="btn-analyze-song" class="btn btn-primary flex items-center gap-1.5">
                      ${icons.sparkles('w-4 h-4')}
                      <span>Transcribe Notes</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            <!-- Right 1 Column: Recent Transcriptions -->
            <div class="lg:col-span-1 glass-card flex flex-col gap-3 w-full min-w-0">
              <div class="flex items-center justify-between">
                <h4 class="m-0 text-sm font-bold">Recent Library</h4>
                <span class="badge badge-info text-xxs font-mono">${recentImports.length} Saved</span>
              </div>
              <p class="text-xs text-muted-color m-0">Previously extracted songs and lessons saved to your profile.</p>
              <div class="flex flex-col gap-2 mt-1 overflow-y-auto" style="max-height: 220px;" id="recent-imports-list">
                ${importsHtml}
              </div>
            </div>

          </div>

          <!-- FULL-WIDTH OUTPUT NOTE & TAB STUDIO DECK (Initially hidden, revealed on transcription) -->
          <div id="youtube-output-card" class="glass-card hidden flex flex-col gap-6 animate-scale-in w-full min-w-0 max-w-full overflow-hidden mb-8">
            
            <!-- Transcription Header & Quick Actions -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-glass pb-4">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="badge badge-warning text-xxs flex items-center gap-1">
                    ${icons.sparkles('w-3 h-3')} AI Exact Note Transcription
                  </span>
                  <span id="yt-status-badge" class="badge badge-success text-xxs">100% Signal Match</span>
                </div>
                <h2 id="yt-lesson-title" class="m-0 text-xl font-bold text-white">Transcribed Track</h2>
                <p id="yt-artist-subtitle" class="text-xs text-muted-color m-0 mt-0.5">Original Audio • Standard Tuning</p>
              </div>
              <div class="flex items-center gap-2">
                <button id="btn-save-to-songs" class="btn btn-secondary btn-sm flex items-center gap-1.5">
                  ${icons.save('w-3.5 h-3.5')}
                  <span>Save to Songs</span>
                </button>
                <button id="btn-sync-to-roadmap" class="btn btn-primary btn-sm flex items-center gap-1.5">
                  ${icons.plus('w-3.5 h-3.5')}
                  <span>Add to Roadmap</span>
                </button>
              </div>
            </div>

            <!-- Song Musical Metadata Badges -->
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="badge badge-info text-xxs py-1 px-3">Key: <b id="yt-meta-key" class="text-white ml-1 font-mono">D Minor</b></span>
              <span class="badge badge-secondary text-xxs py-1 px-3">Tempo: <b id="yt-meta-bpm" class="text-white ml-1 font-mono">133 BPM</b></span>
              <span class="badge badge-secondary text-xxs py-1 px-3">Time: <b id="yt-meta-time" class="text-white ml-1 font-mono">4/4</b></span>
              <span class="badge badge-secondary text-xxs py-1 px-3">Capo: <b id="yt-meta-capo" class="text-white ml-1 font-mono">None</b></span>
              <span class="badge badge-secondary text-xxs py-1 px-3">Tuning: <b id="yt-meta-tuning" class="text-white ml-1 font-mono">E A D G B E</b></span>
              <span class="badge badge-secondary text-xxs py-1 px-3">Duration: <b id="yt-meta-duration" class="text-white ml-1 font-mono">28.0s</b></span>
            </div>

            <!-- DYNAMIC ARRANGEMENT & STRING CONTROLLER -->
            <div class="p-4 bg-card-elevated border-glass rounded-xl flex flex-col gap-3.5" style="background: rgba(15, 23, 42, 0.55); border: 1px solid rgba(255, 255, 255, 0.09);">
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      ${icons.settings('w-3.5 h-3.5 text-primary-color')} String Count & Chord Arrangement
                    </span>
                    <span id="active-arrangement-badge" class="badge badge-primary text-xxs font-mono">All 6 Strings • With Chords</span>
                  </div>
                  <p class="text-xxs text-muted-color m-0 mt-0.5">Switch instantly between single-string slide solo, 2-string riff, and full 6-string tab with or without chords.</p>
                </div>

                <!-- Quick Chord Accompaniment Toggle Buttons -->
                <div class="flex items-center gap-1 bg-glass p-1 rounded-lg border-glass w-fit">
                  <button type="button" id="btn-toggle-chords-off" class="btn btn-sm text-xxs py-1 px-3 btn-secondary flex items-center gap-1" title="Play pure single-note melody without chord backing">
                    ${icons.music('w-3 h-3')}
                    <span>No Chords (Melody Solo)</span>
                  </button>
                  <button type="button" id="btn-toggle-chords-on" class="btn btn-sm text-xxs py-1 px-3 btn-primary flex items-center gap-1" title="Include chord progression and harmony accompaniment">
                    ${icons.sparkles('w-3 h-3')}
                    <span>With Chords</span>
                  </button>
                </div>
              </div>

              <!-- String Count Mode Buttons -->
              <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-glass">
                <span class="text-xxs uppercase tracking-wider font-semibold text-muted-color mr-1">Number of Strings:</span>
                
                <button type="button" class="btn-string-count btn btn-sm text-xxs py-1 px-3 btn-secondary" data-count="1">
                  <span>1 String (Single String Solo)</span>
                </button>
                
                <button type="button" class="btn-string-count btn btn-sm text-xxs py-1 px-3 btn-secondary" data-count="2">
                  <span>2 Strings (Dual String Riff)</span>
                </button>
                
                <button type="button" class="btn-string-count btn btn-sm text-xxs py-1 px-3 btn-secondary" data-count="3">
                  <span>3 Strings (Triad Box)</span>
                </button>
                
                <button type="button" class="btn-string-count btn btn-sm text-xxs py-1 px-3 btn-secondary" data-count="4">
                  <span>4 Strings</span>
                </button>
                
                <button type="button" class="btn-string-count btn btn-sm text-xxs py-1 px-3 btn-primary" data-count="6">
                  <span>All 6 Strings (Standard)</span>
                </button>
              </div>

              <!-- Sub-picker for Single String (Target: 1, 2, 3, 4, 5, 6, or auto) -->
              <div id="single-string-picker" class="hidden flex flex-wrap items-center gap-2 pt-2 border-t border-glass/60 animate-fade-in">
                <span class="text-xxs uppercase tracking-wider font-semibold text-accent-color mr-1">Select Single String:</span>
                <button type="button" class="btn-target-single btn btn-sm text-xxs py-0.5 px-2.5 btn-primary" data-string="auto">Auto (Best Fit)</button>
                <button type="button" class="btn-target-single btn btn-sm text-xxs py-0.5 px-2.5 btn-secondary" data-string="1">String 1 (High E)</button>
                <button type="button" class="btn-target-single btn btn-sm text-xxs py-0.5 px-2.5 btn-secondary" data-string="2">String 2 (B)</button>
                <button type="button" class="btn-target-single btn btn-sm text-xxs py-0.5 px-2.5 btn-secondary" data-string="3">String 3 (G)</button>
                <button type="button" class="btn-target-single btn btn-sm text-xxs py-0.5 px-2.5 btn-secondary" data-string="4">String 4 (D)</button>
                <button type="button" class="btn-target-single btn btn-sm text-xxs py-0.5 px-2.5 btn-secondary" data-string="5">String 5 (A)</button>
                <button type="button" class="btn-target-single btn btn-sm text-xxs py-0.5 px-2.5 btn-secondary" data-string="6">String 6 (Low E)</button>
              </div>

              <!-- Sub-picker for 2 Strings (Target: 5-6, 4-5, 3-4, 1-2, or auto) -->
              <div id="two-strings-picker" class="hidden flex flex-wrap items-center gap-2 pt-2 border-t border-glass/60 animate-fade-in">
                <span class="text-xxs uppercase tracking-wider font-semibold text-accent-color mr-1">Select 2-String Pair:</span>
                <button type="button" class="btn-target-pair btn btn-sm text-xxs py-0.5 px-2.5 btn-primary" data-pair="auto">Auto (Best Fit)</button>
                <button type="button" class="btn-target-pair btn btn-sm text-xxs py-0.5 px-2.5 btn-secondary" data-pair="5-6">Strings 5 & 6 (Power / Bass)</button>
                <button type="button" class="btn-target-pair btn btn-sm text-xxs py-0.5 px-2.5 btn-secondary" data-pair="4-5">Strings 4 & 5 (Rhythm Mid)</button>
                <button type="button" class="btn-target-pair btn btn-sm text-xxs py-0.5 px-2.5 btn-secondary" data-pair="3-4">Strings 3 & 4 (Central)</button>
                <button type="button" class="btn-target-pair btn btn-sm text-xxs py-0.5 px-2.5 btn-secondary" data-pair="1-2">Strings 1 & 2 (High Lead Solo)</button>
              </div>
            </div>

            <!-- Chords in Progression Section -->
            <div id="yt-chords-section">
              <span id="yt-chords-title" class="text-xxs font-bold uppercase tracking-wider text-muted-color block mb-2">Detected Chord Progression</span>
              <div id="yt-chords-container" class="flex flex-wrap gap-2">
                <!-- Populated dynamically -->
              </div>
            </div>

            <!-- SIDE-BY-SIDE AUDIO COMPARISON STUDIO -->
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider text-muted-color flex items-center gap-1.5">
                  ${icons.sparkles('w-3.5 h-3.5 text-primary-color')} Audio Accuracy Comparison Studio (A/B Verification)
                </span>
                <span class="text-xxs text-muted-color">Compare Original Recording with AI Guitar Synth</span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <!-- Track A: Original Song Audio Player -->
                <div class="p-4 rounded-xl border-glass flex flex-col justify-between gap-3" style="background: rgba(15, 23, 42, 0.45); border: 1px solid rgba(255, 255, 255, 0.08);">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
                        ${icons.music('w-4 h-4')}
                      </span>
                      <div>
                        <h5 class="m-0 text-xs font-bold text-white">Track A: Original Song Audio</h5>
                        <span id="original-audio-track-label" class="text-xxs text-muted-color">Uploaded Recording</span>
                      </div>
                    </div>
                    <span id="track-a-source-badge" class="badge text-xxs py-0.5 px-2 font-mono" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);">Track A</span>
                  </div>
                  
                  <!-- Container for HTML5 Audio Player (When audio file is uploaded or direct stream) -->
                  <div id="container-track-a-audio" class="my-1">
                    <audio id="original-audio-player" controls class="w-full" style="height: 38px; border-radius: 6px;"></audio>
                  </div>

                  <!-- Container for YouTube Embed Video/Audio (When YouTube link is entered) -->
                  <div id="container-track-a-youtube" class="hidden my-1 flex flex-col gap-1.5">
                    <div class="relative w-full rounded-lg overflow-hidden border border-glass shadow-lg" style="height: 140px; background: #000;">
                      <iframe id="youtube-embed-iframe" class="w-full h-full" src="" title="Original YouTube Song Audio" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
                    </div>
                    <span class="text-xxxs text-muted-color flex items-center gap-1">
                      ${icons.video('w-3 h-3 text-red-500')}
                      <span>Live YouTube Stream Sync Active • Direct from YouTube</span>
                    </span>
                  </div>

                  <div class="flex items-center justify-between text-xxs text-muted-color">
                    <span id="track-a-status-text">Authentic source audio performance</span>
                    <button type="button" id="btn-solo-a" class="btn btn-secondary btn-sm py-1 px-2.5 text-xxs flex items-center gap-1">
                      ${icons.play('w-3 h-3')}
                      <span>Play Original</span>
                    </button>
                  </div>
                </div>

                <!-- Track B: AI Guitar Tab Synthesizer -->
                <div class="p-4 rounded-xl border-glass flex flex-col justify-between gap-3" style="background: rgba(15, 23, 42, 0.45); border: 1px solid rgba(255, 255, 255, 0.08);">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">
                        ${icons.sparkles('w-4 h-4')}
                      </span>
                      <div>
                        <h5 class="m-0 text-xs font-bold text-white">Track B: AI Transcribed Guitar Synth</h5>
                        <span id="tab-playhead-status" class="badge badge-success text-xxs py-0 px-1.5 ml-1">Ready</span>
                      </div>
                    </div>
                    <span class="badge text-xxs py-0.5 px-2 font-mono" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3);">Track B</span>
                  </div>
                  
                  <div class="flex items-center justify-between gap-3 my-1">
                    <div class="flex items-center gap-2">
                      <button id="btn-tab-play" class="btn btn-primary btn-icon flex items-center justify-center shadow-lg" style="width: 38px; height: 38px; border-radius: 50%;">
                        ${icons.play('w-4 h-4')}
                      </button>
                      <button id="btn-tab-stop" class="btn btn-secondary btn-icon flex items-center justify-center" style="width: 34px; height: 34px; border-radius: 50%;" title="Stop Playback">
                        <span style="display: block; width: 10px; height: 10px; background: currentColor; border-radius: 2px;"></span>
                      </button>
                      <div id="tab-active-note-display" class="text-xs font-mono text-primary-color-light">Click Play to synthesize notes</div>
                    </div>

                    <!-- Speed Selector -->
                    <div class="flex items-center gap-1.5">
                      <span class="text-xxs text-muted-color uppercase font-semibold">Speed:</span>
                      <select id="tab-speed-select" class="select text-xs py-1 px-2 font-mono" style="background: #111116; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: #fff;">
                        <option value="0.5">0.5x</option>
                        <option value="0.75">0.75x</option>
                        <option value="1.0" selected>1.0x</option>
                        <option value="1.25">1.25x</option>
                      </select>
                    </div>
                  </div>

                  <div class="flex items-center justify-between text-xxs text-muted-color">
                    <span>Synthesizes exact plucked notes & frets</span>
                    <button type="button" id="btn-solo-b" class="btn btn-secondary btn-sm py-1 px-2.5 text-xxs flex items-center gap-1">
                      ${icons.play('w-3 h-3')}
                      <span>Play Synth Tab</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            <!-- INTERACTIVE REALISTIC GUITAR FRETBOARD -->
            <div class="flex flex-col gap-2 w-full min-w-0 overflow-hidden">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider text-muted-color flex items-center gap-1.5">
                  ${icons.music('w-3.5 h-3.5')} Interactive Rosewood Fretboard (Click any string or fret to pluck)
                </span>
                <span id="fretboard-string-status" class="text-xxs text-muted-color font-mono">Frets 0 - 15 • Strings 1 to 6 Active</span>
              </div>
              <div class="fretboard-visualizer-container w-full min-w-0 overflow-x-auto p-4 bg-card-elevated border-glass rounded-xl shadow-inner" style="background: #09090d; border: 1px solid rgba(255,255,255,0.08); scrollbar-width: thin;">
                <div id="fretboard-canvas-wrapper" class="relative w-full min-w-0" style="min-width: 780px;">
                  <!-- Dynamic SVG Fretboard drawn here -->
                </div>
              </div>
            </div>

            <!-- NOTE-BY-NOTE SEQUENCE CARDS -->
            <div class="flex flex-col gap-2 w-full min-w-0 overflow-hidden">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider text-muted-color">Exact Note Sequence (Click card to play note)</span>
                <span id="note-count-badge" class="badge badge-primary text-xxs font-mono">32 Notes</span>
              </div>
              <div class="w-full min-w-0 overflow-x-auto pb-3 pt-1 rounded-xl" style="scrollbar-width: thin; -webkit-overflow-scrolling: touch;">
                <div id="note-sequence-strip" class="flex gap-2.5 w-max">
                  <!-- Note chips rendered here -->
                </div>
              </div>
            </div>

            <!-- ASCII TABLATURE STAFF (PRE-FORMATTED, NON-WRAPPING) -->
            <div class="flex flex-col gap-2 w-full min-w-0 overflow-hidden">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider text-muted-color">Standard Tablature (ASCII Tab)</span>
                <div class="flex items-center gap-2">
                  <button id="btn-copy-tab" class="btn btn-secondary btn-sm flex items-center gap-1.5 py-1 px-3 text-xs">
                    ${icons.copy('w-3.5 h-3.5')}
                    <span id="copy-btn-text">Copy Tab</span>
                  </button>
                  <button id="btn-download-tab" class="btn btn-secondary btn-sm flex items-center gap-1.5 py-1 px-3 text-xs">
                    ${icons.download('w-3.5 h-3.5')}
                    <span>Download .txt</span>
                  </button>
                </div>
              </div>
              <div class="w-full min-w-0 overflow-x-auto rounded-xl border border-glass" style="background: #060609; border-color: rgba(52, 211, 153, 0.25); scrollbar-width: thin;">
                <div class="flex items-center justify-between px-4 py-2 border-b border-glass" style="background: rgba(255,255,255,0.02); min-width: 600px;">
                  <span class="text-xxs font-mono text-muted-color">GUITAR TABLATURE • ARRANGEMENT VIEW</span>
                  <span class="text-xxs font-mono text-success">ASCII FORMAT</span>
                </div>
                <pre id="ascii-tab-block" class="p-4 m-0 text-xs font-mono w-full text-success" style="white-space: pre !important; word-wrap: normal !important; line-height: 1.6; letter-spacing: 0.08em; font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;"></pre>
              </div>
            </div>

            <!-- Structured Practice Drills -->
            <div class="flex flex-col gap-3 mt-2">
              <h4 class="text-sm font-semibold m-0 text-white">Recommended Practice Routine</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3" id="yt-steps-container">
                <!-- Steps go here -->
              </div>
            </div>

          </div>

        </main>

        <!-- AI Processing Modal Overlay -->
        <div id="yt-loading-overlay" class="modal-overlay hidden">
          <div class="modal text-center max-w-sm flex flex-col items-center p-6 glass-card" style="border: 1px solid var(--border-glass);">
            <div class="w-16 h-16 text-primary-color animate-pulse flex items-center justify-center mb-4">
              ${icons.sparkles('w-12 h-12')}
            </div>
            <h3 class="mb-2 text-base font-semibold" id="transcribe-loading-title">AI Transcribing Audio Frequencies...</h3>
            <p class="text-xs text-muted-color leading-relaxed m-0" id="transcribe-loading-desc">Running YIN pitch detection, matching chromagram chords, and generating exact guitar tablature...</p>
            <div class="w-full bg-glass rounded-full h-1.5 mt-4 overflow-hidden">
              <div class="bg-primary-color h-full w-2/3 animate-pulse"></div>
            </div>
          </div>
        </div>

        <!-- Render Bottom Nav -->
        ${renderNav()}
      </div>
    `;
  },
  onMount: () => {
    setupNavEvents();
    setupTranscriberLogic();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autotranscribe') === '1') {
      setTimeout(() => {
        const btn = document.getElementById('btn-load-sample-riff');
        if (btn) btn.click();
        setTimeout(() => {
          const btnTranscribe = document.getElementById('btn-analyze-upload');
          if (btnTranscribe) btnTranscribe.click();
        }, 600);
      }, 500);
    }
  },
  onUnmount: () => {
    TranscriptionService.stopPlayback();
    isAudioSynthesizing = false;
    if (uploadedAudioUrl) {
      URL.revokeObjectURL(uploadedAudioUrl);
      uploadedAudioUrl = null;
    }
  }
};

function setupTranscriberLogic(): void {
  // Mode Switcher Tabs
  const tabModeLink = document.getElementById('tab-mode-link');
  const tabModeUpload = document.getElementById('tab-mode-upload');
  const containerLink = document.getElementById('container-link-mode');
  const containerUpload = document.getElementById('container-upload-mode');

  if (tabModeLink && tabModeUpload && containerLink && containerUpload) {
    tabModeLink.addEventListener('click', () => {
      currentSourceMode = 'link';
      tabModeLink.className = 'btn btn-sm btn-primary flex items-center gap-1.5 text-xs';
      tabModeUpload.className = 'btn btn-sm btn-secondary flex items-center gap-1.5 text-xs';
      containerLink.classList.remove('hidden');
      containerUpload.classList.add('hidden');
    });

    tabModeUpload.addEventListener('click', () => {
      currentSourceMode = 'upload';
      tabModeUpload.className = 'btn btn-sm btn-primary flex items-center gap-1.5 text-xs';
      tabModeLink.className = 'btn btn-sm btn-secondary flex items-center gap-1.5 text-xs';
      containerUpload.classList.remove('hidden');
      containerLink.classList.add('hidden');
    });
  }

  // Audio File Upload Handling
  const dropZone = document.getElementById('audio-drop-zone');
  const fileInput = document.getElementById('audio-file-input') as HTMLInputElement;
  const filePreview = document.getElementById('audio-file-preview');
  const fileNameDisplay = document.getElementById('audio-file-name');
  const fileMetaDisplay = document.getElementById('audio-file-meta');
  const btnAnalyzeUpload = document.getElementById('btn-analyze-upload');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--color-primary)';
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = '';
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '';
      if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
        handleSelectedAudioFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        handleSelectedAudioFile(fileInput.files[0]);
      }
    });
  }

  async function handleSelectedAudioFile(file: File) {
    uploadedAudioFile = file;
    if (uploadedAudioUrl) {
      URL.revokeObjectURL(uploadedAudioUrl);
    }
    uploadedAudioUrl = URL.createObjectURL(file);

    // Update player track A with object URL
    const originalAudioPlayer = document.getElementById('original-audio-player') as HTMLAudioElement;
    if (originalAudioPlayer) {
      originalAudioPlayer.src = uploadedAudioUrl;
    }
    setupTrackAForUploadedFile(file);

    if (fileNameDisplay) fileNameDisplay.textContent = file.name;
    if (fileMetaDisplay) fileMetaDisplay.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB • Decoding audio buffer...`;
    if (filePreview) filePreview.classList.remove('hidden');

    try {
      uploadedAudioAnalysis = await TranscriptionService.analyzeAudioFile(file);
      if (fileMetaDisplay && uploadedAudioAnalysis) {
        fileMetaDisplay.textContent = `${uploadedAudioAnalysis.durationSeconds}s duration • Detected Key: ${uploadedAudioAnalysis.detectedKey} • ${uploadedAudioAnalysis.estimatedBpm} BPM`;
      }
    } catch (err) {
      console.warn('Audio decoding warning, using file name:', err);
      if (fileMetaDisplay) fileMetaDisplay.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to transcribe`;
    }
  }

  const btnLoadSampleRiff = document.getElementById('btn-load-sample-riff');
  if (btnLoadSampleRiff) {
    btnLoadSampleRiff.addEventListener('click', async () => {
      try {
        btnLoadSampleRiff.setAttribute('disabled', 'true');
        btnLoadSampleRiff.innerHTML = `<span>Loading Sample Audio...</span>`;
        const resp = await fetch('/sample_audio.mp3');
        const blob = await resp.blob();
        const sampleFile = new File([blob], 'sample_audio.mp3', { type: 'audio/mpeg' });
        await handleSelectedAudioFile(sampleFile);
        btnLoadSampleRiff.removeAttribute('disabled');
        btnLoadSampleRiff.innerHTML = `${icons.music('w-3.5 h-3.5 text-primary-color')} <span>Loaded! Click Transcribe</span>`;
      } catch (err) {
        console.error('Failed to load sample riff:', err);
        btnLoadSampleRiff.removeAttribute('disabled');
        btnLoadSampleRiff.innerHTML = `${icons.music('w-3.5 h-3.5 text-primary-color')} <span>Load Sample Track</span>`;
      }
    });
  }

  if (btnAnalyzeUpload) {
    btnAnalyzeUpload.addEventListener('click', () => {
      if (!uploadedAudioFile) {
        alert('Please select an audio file first.');
        return;
      }
      runTranscription({
        sourceType: 'upload',
        file: uploadedAudioFile,
        fileName: uploadedAudioFile.name,
        audioAnalysis: uploadedAudioAnalysis || undefined
      });
    });
  }

  // Link Analysis Handling
  const btnAnalyzeLink = document.getElementById('btn-analyze-song');
  if (btnAnalyzeLink) {
    btnAnalyzeLink.addEventListener('click', async () => {
      const inputUrl = document.getElementById('youtube-url-input') as HTMLInputElement;
      const url = inputUrl?.value?.trim();
      if (!url) {
        alert('Please enter a YouTube or audio stream link.');
        return;
      }
      runTranscription({
        sourceType: 'link',
        sourceUrl: url
      });
    });
  }

  // Audio Comparison Controls (A/B Solo Buttons)
  const btnSoloA = document.getElementById('btn-solo-a');
  const btnSoloB = document.getElementById('btn-solo-b');
  const originalAudioPlayer = document.getElementById('original-audio-player') as HTMLAudioElement;

  if (btnSoloA) {
    btnSoloA.addEventListener('click', () => {
      if (currentTrackASource === 'youtube') {
        if (isYouTubePlaying) {
          pauseTrackA();
        } else {
          playTrackA();
        }
      } else if (originalAudioPlayer) {
        if (originalAudioPlayer.paused) {
          playTrackA();
        } else {
          pauseTrackA();
        }
      }
    });

    if (originalAudioPlayer) {
      originalAudioPlayer.addEventListener('pause', () => {
        if (currentTrackASource !== 'youtube' && btnSoloA) {
          btnSoloA.innerHTML = `${icons.play('w-3 h-3')} <span>Play Original</span>`;
        }
      });
      originalAudioPlayer.addEventListener('ended', () => {
        if (currentTrackASource !== 'youtube' && btnSoloA) {
          btnSoloA.innerHTML = `${icons.play('w-3 h-3')} <span>Play Original</span>`;
        }
      });
    }
  }

  if (btnSoloB) {
    btnSoloB.addEventListener('click', () => {
      pauseTrackA();
      if (isAudioSynthesizing) {
        pausePlayback();
      } else {
        startPlayback();
      }
    });
  }

  // Playback Synthesizer Controls
  const btnPlay = document.getElementById('btn-tab-play');
  const btnStop = document.getElementById('btn-tab-stop');
  const speedSelect = document.getElementById('tab-speed-select') as HTMLSelectElement;

  if (speedSelect) {
    speedSelect.addEventListener('change', () => {
      playbackSpeed = parseFloat(speedSelect.value) || 1.0;
      if (isAudioSynthesizing && activeTranscription) {
        startPlayback();
      }
    });
  }

  if (btnPlay) {
    btnPlay.addEventListener('click', () => {
      if (originalAudioPlayer && !originalAudioPlayer.paused) {
        originalAudioPlayer.pause();
      }
      if (isAudioSynthesizing) {
        pausePlayback();
      } else {
        startPlayback();
      }
    });
  }

  if (btnStop) {
    btnStop.addEventListener('click', () => {
      stopPlayback();
    });
  }

  // Copy Tab Button
  const btnCopyTab = document.getElementById('btn-copy-tab');
  if (btnCopyTab) {
    btnCopyTab.addEventListener('click', () => {
      if (!activeTranscription) return;
      navigator.clipboard.writeText(activeTranscription.tabStaff).then(() => {
        const copyText = document.getElementById('copy-btn-text');
        if (copyText) copyText.textContent = 'Copied!';
        setTimeout(() => {
          if (copyText) copyText.textContent = 'Copy Tab';
        }, 2000);
      });
    });
  }

  // Download Tab Button
  const btnDownloadTab = document.getElementById('btn-download-tab');
  if (btnDownloadTab) {
    btnDownloadTab.addEventListener('click', () => {
      if (!activeTranscription) return;
      const tabContent = `GuitarMind AI Tablature Transcription
Title: ${activeTranscription.title}
Artist: ${activeTranscription.artist}
Key: ${activeTranscription.key} | Tempo: ${activeTranscription.tempo} BPM | Tuning: ${activeTranscription.tuning}
Arrangement: ${currentArrangementConfig.stringCount}-String Mode | Chords: ${currentArrangementConfig.includeChords ? 'Yes' : 'No'}

${activeTranscription.tabStaff}

Generated by GuitarMind AI
`;
      const blob = new Blob([tabContent], { type: 'text/plain;charset=utf-8' });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `${activeTranscription.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_tab.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);
    });
  }

  // Save to Songs Button
  const btnSaveToSongs = document.getElementById('btn-save-to-songs');
  if (btnSaveToSongs) {
    btnSaveToSongs.addEventListener('click', async () => {
      if (!activeTranscription) return;
      const user = appStore.getState().currentUser;
      const uid = user ? user.uid : 'anonymous';

      await SongsRepo.saveSong({
        userId: uid,
        title: `${activeTranscription.title} (${currentArrangementConfig.stringCount}-String)`,
        artist: activeTranscription.artist,
        key: activeTranscription.key,
        tempo: activeTranscription.tempo,
        tuning: activeTranscription.tuning,
        timeSignature: activeTranscription.timeSignature,
        capo: activeTranscription.capo ?? undefined,
        chords: activeTranscription.chords,
        tabs: activeTranscription.tabStaff,
        status: 'learning',
        progressPercent: 10,
        youtubeUrl: activeTranscription.sourceUrl,
        createdAt: new Date().toISOString()
      });

      alert(`Saved "${activeTranscription.title}" to your Song Library!`);
      window.location.hash = '#songs';
    });
  }

  // Add to Roadmap Button
  const btnSyncToRoadmap = document.getElementById('btn-sync-to-roadmap');
  if (btnSyncToRoadmap) {
    btnSyncToRoadmap.addEventListener('click', async () => {
      await addTranscriptionToRoadmap();
    });
  }

  // Arrangement Controller Event Listeners
  setupArrangementControllerEvents();

  // Recent imports click delegation
  const recentCards = document.querySelectorAll('.btn-recent-import');
  recentCards.forEach(card => {
    card.addEventListener('click', () => {
      const title = decodeURIComponent(card.getAttribute('data-title') || '');
      const artist = decodeURIComponent(card.getAttribute('data-artist') || '');
      const url = decodeURIComponent(card.getAttribute('data-url') || '');

      runTranscription({
        sourceType: 'link',
        sourceUrl: url,
        titleOverride: title,
        artistOverride: artist
      });
    });
  });
}

function setupArrangementControllerEvents(): void {
  // 1. String count buttons: 1, 2, 3, 4, 6
  const countButtons = document.querySelectorAll('.btn-string-count');
  countButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const count = btn.getAttribute('data-count') as StringConstraintMode;
      if (count && count !== currentArrangementConfig.stringCount) {
        currentArrangementConfig.stringCount = count;
        applyCurrentArrangement();
      }
    });
  });

  // 2. Single string picker buttons
  const singleButtons = document.querySelectorAll('.btn-target-single');
  singleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const sVal = btn.getAttribute('data-string');
      currentArrangementConfig.singleStringTarget = sVal === 'auto' ? 'auto' : (parseInt(sVal || '1', 10) as SingleStringTarget);
      applyCurrentArrangement();
    });
  });

  // 3. Two string picker buttons
  const pairButtons = document.querySelectorAll('.btn-target-pair');
  pairButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const pVal = btn.getAttribute('data-pair') as TwoStringsTarget;
      currentArrangementConfig.twoStringsTarget = pVal || 'auto';
      applyCurrentArrangement();
    });
  });

  // 4. Chords toggle buttons
  const btnChordsOff = document.getElementById('btn-toggle-chords-off');
  const btnChordsOn = document.getElementById('btn-toggle-chords-on');

  if (btnChordsOff) {
    btnChordsOff.addEventListener('click', () => {
      if (currentArrangementConfig.includeChords) {
        currentArrangementConfig.includeChords = false;
        applyCurrentArrangement();
      }
    });
  }

  if (btnChordsOn) {
    btnChordsOn.addEventListener('click', () => {
      if (!currentArrangementConfig.includeChords) {
        currentArrangementConfig.includeChords = true;
        applyCurrentArrangement();
      }
    });
  }
}

function applyCurrentArrangement(): void {
  if (!baseTranscription) return;

  stopPlayback();

  const arranged = TranscriptionService.rearrangeTranscription(baseTranscription, currentArrangementConfig);
  activeTranscription = arranged;
  currentAllowedStrings = arranged.allowedStrings;

  renderTranscriptionOutput(arranged, arranged.allowedStrings);
  updateArrangementUiControls(arranged.allowedStrings);
}

function updateArrangementUiControls(allowedStrings: number[]): void {
  const stringNames = ['', 'High E', 'B', 'G', 'D', 'A', 'Low E'];

  // 1. Badge text
  const badge = document.getElementById('active-arrangement-badge');
  if (badge) {
    const stringText = currentArrangementConfig.stringCount === '1'
      ? `1 String (${stringNames[allowedStrings[0]] || 'S' + allowedStrings[0]})`
      : currentArrangementConfig.stringCount === '2'
      ? `2 Strings (${allowedStrings.map(s => stringNames[s] || 'S' + s).join(' & ')})`
      : currentArrangementConfig.stringCount === '6'
      ? 'All 6 Strings (Standard)'
      : `${currentArrangementConfig.stringCount} Strings`;

    const chordText = currentArrangementConfig.includeChords ? 'With Chords' : 'No Chords (Melody Solo)';
    badge.textContent = `${stringText} • ${chordText}`;
  }

  // 2. String count buttons styling
  const countButtons = document.querySelectorAll('.btn-string-count');
  countButtons.forEach(btn => {
    const count = btn.getAttribute('data-count');
    if (count === currentArrangementConfig.stringCount) {
      btn.className = 'btn-string-count btn btn-sm text-xxs py-1 px-3 btn-primary';
    } else {
      btn.className = 'btn-string-count btn btn-sm text-xxs py-1 px-3 btn-secondary';
    }
  });

  // 3. Single string picker visibility
  const singlePicker = document.getElementById('single-string-picker');
  if (singlePicker) {
    if (currentArrangementConfig.stringCount === '1') {
      singlePicker.classList.remove('hidden');
      const singleButtons = singlePicker.querySelectorAll('.btn-target-single');
      singleButtons.forEach(btn => {
        const val = btn.getAttribute('data-string');
        const currentTarget = String(currentArrangementConfig.singleStringTarget || 'auto');
        if (val === currentTarget) {
          btn.className = 'btn-target-single btn btn-sm text-xxs py-0.5 px-2.5 btn-primary';
        } else {
          btn.className = 'btn-target-single btn btn-sm text-xxs py-0.5 px-2.5 btn-secondary';
        }
      });
    } else {
      singlePicker.classList.add('hidden');
    }
  }

  // 4. Two strings picker visibility
  const twoPicker = document.getElementById('two-strings-picker');
  if (twoPicker) {
    if (currentArrangementConfig.stringCount === '2') {
      twoPicker.classList.remove('hidden');
      const pairButtons = twoPicker.querySelectorAll('.btn-target-pair');
      pairButtons.forEach(btn => {
        const val = btn.getAttribute('data-pair');
        const currentPair = currentArrangementConfig.twoStringsTarget || 'auto';
        if (val === currentPair) {
          btn.className = 'btn-target-pair btn btn-sm text-xxs py-0.5 px-2.5 btn-primary';
        } else {
          btn.className = 'btn-target-pair btn btn-sm text-xxs py-0.5 px-2.5 btn-secondary';
        }
      });
    } else {
      twoPicker.classList.add('hidden');
    }
  }

  // 5. Chords buttons styling
  const btnChordsOff = document.getElementById('btn-toggle-chords-off');
  const btnChordsOn = document.getElementById('btn-toggle-chords-on');
  if (btnChordsOff && btnChordsOn) {
    if (currentArrangementConfig.includeChords) {
      btnChordsOn.className = 'btn btn-sm text-xxs py-1 px-3 btn-primary flex items-center gap-1';
      btnChordsOff.className = 'btn btn-sm text-xxs py-1 px-3 btn-secondary flex items-center gap-1';
    } else {
      btnChordsOff.className = 'btn btn-sm text-xxs py-1 px-3 btn-primary flex items-center gap-1';
      btnChordsOn.className = 'btn btn-sm text-xxs py-1 px-3 btn-secondary flex items-center gap-1';
    }
  }
}

async function runTranscription(params: {
  sourceType: 'link' | 'upload';
  sourceUrl?: string;
  file?: File;
  fileName?: string;
  audioAnalysis?: AudioAnalysisSummary;
  titleOverride?: string;
  artistOverride?: string;
}): Promise<void> {
  const overlay = document.getElementById('yt-loading-overlay');
  const output = document.getElementById('youtube-output-card');
  const loadingTitle = document.getElementById('transcribe-loading-title');
  const loadingDesc = document.getElementById('transcribe-loading-desc');

  if (overlay) overlay.classList.remove('hidden');

  let detectedTitle = params.titleOverride;
  let detectedArtist = params.artistOverride;

  // Setup Track A player immediately for link / upload
  if (params.sourceType === 'link' && params.sourceUrl) {
    const vId = extractYouTubeVideoId(params.sourceUrl);
    if (vId) {
      setupTrackAForYouTube(vId, detectedTitle || 'YouTube Song');
    } else {
      setupTrackAForAudioStream(params.sourceUrl, detectedTitle || 'Audio Stream');
    }
  } else if (params.sourceType === 'upload' && params.file) {
    setupTrackAForUploadedFile(params.file);
  }

  // If link, fetch YouTube oEmbed
  if (params.sourceType === 'link' && params.sourceUrl && !detectedTitle) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(params.sourceUrl)}&format=json`;
      const res = await fetch(oembedUrl);
      if (res.ok) {
        const metadata = await res.json();
        detectedTitle = metadata.title;
        detectedArtist = metadata.author_name;
        const vId = extractYouTubeVideoId(params.sourceUrl);
        if (vId) {
          setupTrackAForYouTube(vId, detectedTitle || 'YouTube Track');
        }
      }
    } catch {
      // Continue with link string
    }
  }

  if (loadingTitle) loadingTitle.textContent = "AI Transcribing Exact Notes...";
  if (loadingDesc) loadingDesc.textContent = "Running YIN pitch detection, matching chromagram chords, and generating exact guitar tablature...";

  try {
    const result = await TranscriptionService.transcribeSong({
      ...params,
      titleOverride: detectedTitle,
      artistOverride: detectedArtist
    });

    baseTranscription = result;
    applyCurrentArrangement();

    // Also persist log into PocketBase
    const user = appStore.getState().currentUser;
    if (user) {
      SongsRepo.logYouTubeImport({
        userId: user.uid,
        youtubeUrl: result.sourceUrl || '',
        title: result.title,
        artist: result.artist,
        status: 'completed',
        tabs: result.tabStaff
      }).catch(err => console.warn('Could not log import to PB:', err));
    }
  } catch (err) {
    console.error('Transcription execution error:', err);
    alert('Transcription error. Please check your connection or model.');
  } finally {
    if (overlay) overlay.classList.add('hidden');
    if (output) output.classList.remove('hidden');
    // Scroll output card into view smoothly
    output?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderTranscriptionOutput(res: SongTranscriptionResult, allowedStrings?: number[]): void {
  // 1. Text metadata
  const title = document.getElementById('yt-lesson-title');
  const artist = document.getElementById('yt-artist-subtitle');
  const metaKey = document.getElementById('yt-meta-key');
  const metaBpm = document.getElementById('yt-meta-bpm');
  const metaTime = document.getElementById('yt-meta-time');
  const metaCapo = document.getElementById('yt-meta-capo');
  const metaTuning = document.getElementById('yt-meta-tuning');
  const metaDuration = document.getElementById('yt-meta-duration');
  const chordsCont = document.getElementById('yt-chords-container');
  const asciiTabBlock = document.getElementById('ascii-tab-block');
  const stepsCont = document.getElementById('yt-steps-container');
  const noteCountBadge = document.getElementById('note-count-badge');
  const fretboardStatus = document.getElementById('fretboard-string-status');

  if (title) title.textContent = res.title;
  if (artist) artist.textContent = `${res.artist} • ${res.tuning}`;
  if (metaKey) metaKey.textContent = res.key;
  if (metaBpm) metaBpm.textContent = `${res.tempo} BPM`;
  if (metaTime) metaTime.textContent = res.timeSignature;
  if (metaCapo) metaCapo.textContent = res.capo ? `Fret ${res.capo}` : 'None';
  if (metaTuning) metaTuning.textContent = res.tuning;
  if (metaDuration) metaDuration.textContent = `${res.audioDuration || 28.0}s`;
  if (asciiTabBlock) asciiTabBlock.textContent = res.tabStaff;
  if (noteCountBadge) noteCountBadge.textContent = `${res.notes.length} Exact Notes`;

  const stringNames = ['', 'High E', 'B', 'G', 'D', 'A', 'Low E'];
  if (fretboardStatus) {
    if (allowedStrings && allowedStrings.length === 1) {
      fretboardStatus.textContent = `Frets 0 - 15 • Exclusively String ${allowedStrings[0]} (${stringNames[allowedStrings[0]]}) Active`;
    } else if (allowedStrings && allowedStrings.length === 2) {
      fretboardStatus.textContent = `Frets 0 - 15 • Strings ${allowedStrings.map(s => `${s} [${stringNames[s]}]`).join(' & ')} Active`;
    } else {
      fretboardStatus.textContent = 'Frets 0 - 15 • All 6 Strings Active';
    }
  }

  // 2. Chords Pills (or Melody Solo Notice if chords disabled)
  if (chordsCont) {
    if (!currentArrangementConfig.includeChords) {
      chordsCont.innerHTML = `
        <div class="flex items-center gap-2 p-2 bg-card-elevated border-glass rounded-lg w-full">
          <span class="text-primary-color">${icons.music('w-4 h-4')}</span>
          <span class="text-xs font-semibold text-white">Melody Solo Mode Active</span>
          <span class="text-xxs text-muted-color">• Chord accompaniment disabled for pure single-note practice.</span>
        </div>
      `;
    } else if (res.chords.length > 0) {
      chordsCont.innerHTML = res.chords.map(c => `
        <span class="badge badge-success px-3 py-1 text-xs font-bold font-mono" style="background: rgba(52, 211, 153, 0.15); color: rgb(52, 211, 153); border: 1px solid rgba(52, 211, 153, 0.3);">
          ${c}
        </span>
      `).join('');
    } else {
      chordsCont.innerHTML = `<span class="text-xxs text-muted-color">No chord progression found.</span>`;
    }
  }

  // 3. Recommended Steps
  if (stepsCont && res.steps) {
    stepsCont.innerHTML = res.steps.map((s, idx) => `
      <div class="flex items-start gap-3 bg-card-elevated border-glass p-3.5 rounded-xl">
        <div class="w-6 h-6 rounded-full bg-primary-color/20 text-primary-color flex items-center justify-center font-bold text-xs flex-shrink-0">
          ${idx + 1}
        </div>
        <div>
          <h5 class="m-0 text-xs font-bold text-white">${s.name}</h5>
          <p class="text-xs text-muted-color mt-1 m-0">${s.desc}</p>
        </div>
      </div>
    `).join('');
  }

  // 4. Draw Initial Fretboard SVG with string dimming / highlighting
  renderInteractiveFretboard(null, allowedStrings);

  // 5. Render Note Strip Chips
  renderNoteSequenceStrip(res.notes);
}

function renderInteractiveFretboard(activeNote: TranscribedNote | null, allowedStrings?: number[]): void {
  const container = document.getElementById('fretboard-canvas-wrapper');
  if (!container) return;

  const totalFrets = 15;
  const stringNames = ['e', 'B', 'G', 'D', 'A', 'E']; // strings 1 to 6
  const stringFullNames = ['High E (1st)', 'B (2nd)', 'G (3rd)', 'D (4th)', 'A (5th)', 'Low E (6th)'];
  const width = 960;
  const height = 145;
  const nutX = 55;
  const fretWidth = (width - nutX - 20) / totalFrets;

  // Frets markers: single dots at 3, 5, 7, 9, 15; double dot at 12
  const inlays = [3, 5, 7, 9, 12, 15];

  let fretLines = '';
  for (let f = 1; f <= totalFrets; f++) {
    const x = nutX + f * fretWidth;
    fretLines += `
      <line x1="${x - 1}" y1="12" x2="${x - 1}" y2="${height - 18}" stroke="#0f172a" stroke-width="1" />
      <line x1="${x}" y1="12" x2="${x}" y2="${height - 18}" stroke="${f === 12 ? '#f1f5f9' : '#cbd5e1'}" stroke-width="${f === 12 ? 2.5 : 1.8}" />
      <line x1="${x + 1}" y1="12" x2="${x + 1}" y2="${height - 18}" stroke="#334155" stroke-width="1" />
      <text x="${x - fretWidth / 2}" y="${height - 4}" fill="rgba(255,255,255,0.4)" font-size="10" text-anchor="middle" font-weight="600" font-family="monospace">${f}</text>
    `;
  }

  let inlaysSvg = '';
  inlays.forEach(f => {
    const cx = nutX + f * fretWidth - fretWidth / 2;
    if (f === 12) {
      inlaysSvg += `
        <circle cx="${cx}" cy="${height / 2 - 20}" r="4" fill="#e2e8f0" opacity="0.65" />
        <circle cx="${cx}" cy="${height / 2 + 16}" r="4" fill="#e2e8f0" opacity="0.65" />
      `;
    } else {
      inlaysSvg += `<circle cx="${cx}" cy="${height / 2 - 2}" r="4" fill="#e2e8f0" opacity="0.65" />`;
    }
  });

  const stringColors = ['#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#d97706', '#b45309'];
  const stringWidths = [1.2, 1.6, 2.2, 2.8, 3.4, 4.0];

  let stringLines = '';
  let interactiveZones = '';

  for (let s = 1; s <= 6; s++) {
    const y = 18 + (s - 1) * 19;
    const isAllowed = !allowedStrings || allowedStrings.includes(s);
    const isSingleOrDual = allowedStrings && allowedStrings.length <= 2;
    const thickness = stringWidths[s - 1];
    const color = isAllowed ? (isSingleOrDual ? '#fbbf24' : stringColors[s - 1]) : '#334155';
    const opacity = isAllowed ? 1.0 : 0.18;

    // String shadow
    stringLines += `<line x1="${nutX}" y1="${y + 1}" x2="${width - 15}" y2="${y + 1}" stroke="#000000" stroke-width="${thickness}" opacity="${opacity * 0.5}" />`;
    // String wire
    stringLines += `<line x1="${nutX}" y1="${y}" x2="${width - 15}" y2="${y}" stroke="${color}" stroke-width="${isAllowed && isSingleOrDual ? thickness + 1.2 : thickness}" opacity="${opacity}" />`;
    
    // String label at headstock side
    const soloTag = isAllowed && allowedStrings && allowedStrings.length === 1 ? ' ★' : '';
    const labelColor = isAllowed ? (isSingleOrDual ? '#fbbf24' : 'rgba(255,255,255,0.85)') : 'rgba(255,255,255,0.2)';
    stringLines += `<text x="28" y="${y + 3.5}" fill="${labelColor}" font-size="10" font-weight="bold" text-anchor="middle" font-family="monospace">${stringNames[s - 1]}${soloTag}</text>`;

    // Clickable hit areas for each fret
    for (let f = 0; f <= totalFrets; f++) {
      const xStart = f === 0 ? 0 : nutX + (f - 1) * fretWidth;
      const xEnd = f === 0 ? nutX : nutX + f * fretWidth;
      interactiveZones += `
        <rect class="fret-click-target" data-string="${s}" data-fret="${f}" x="${xStart}" y="${y - 9}" width="${xEnd - xStart}" height="18" fill="transparent" style="cursor: pointer;" />
      `;
    }
  }

  // Active note highlight marker
  let activeMarkerSvg = '';
  if (activeNote) {
    const sIdx = activeNote.string; // 1 to 6
    const fIdx = activeNote.fret;   // 0 to 15
    const y = 18 + (sIdx - 1) * 19;
    const x = fIdx === 0 ? nutX / 2 + 10 : nutX + fIdx * fretWidth - fretWidth / 2;

    activeMarkerSvg = `
      <g class="active-note-pulse">
        <circle cx="${x}" cy="${y}" r="14" fill="rgba(251, 191, 36, 0.3)" class="animate-ping" />
        <circle cx="${x}" cy="${y}" r="11" fill="#fbbf24" stroke="#ffffff" stroke-width="2.5" filter="drop-shadow(0 0 6px rgba(251,191,36,0.8))" />
        <text x="${x}" y="${y + 3.5}" fill="#0f172a" font-size="10" font-weight="900" text-anchor="middle" font-family="monospace">${activeNote.noteName}</text>
      </g>
    `;
  }

  container.innerHTML = `
    <svg width="100%" height="auto" viewBox="0 0 ${width} ${height}" style="display: block; border-radius: 8px;">
      <defs>
        <!-- Dark Rosewood Fretboard Texture Gradient -->
        <linearGradient id="rosewoodNeck" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#181311" />
          <stop offset="25%" stop-color="#241c18" />
          <stop offset="50%" stop-color="#2a211c" />
          <stop offset="75%" stop-color="#241c18" />
          <stop offset="100%" stop-color="#181311" />
        </linearGradient>
        <!-- Bone Nut Gradient -->
        <linearGradient id="boneNut" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#cbd5e1" />
          <stop offset="50%" stop-color="#f8fafc" />
          <stop offset="100%" stop-color="#94a3b8" />
        </linearGradient>
      </defs>

      <!-- Fretboard Wooden Neck -->
      <rect x="${nutX}" y="12" width="${width - nutX - 15}" height="${height - 30}" fill="url(#rosewoodNeck)" rx="4" />

      <!-- Headstock Nut -->
      <rect x="${nutX - 6}" y="10" width="8" height="${height - 26}" fill="url(#boneNut)" rx="3" stroke="#475569" stroke-width="1" />
      
      <!-- Fret inlays (pearl markers) -->
      ${inlaysSvg}

      <!-- Nickel/Silver Fret Wires -->
      ${fretLines}
      
      <!-- Guitar Strings -->
      ${stringLines}
      
      <!-- Active Sounded Note Marker -->
      ${activeMarkerSvg}

      <!-- Transparent Interactive Click Zones -->
      ${interactiveZones}
    </svg>
  `;

  // Attach interactive click-to-sound listeners on fretboard
  const clickTargets = container.querySelectorAll('.fret-click-target');
  clickTargets.forEach(target => {
    target.addEventListener('click', (e) => {
      e.stopPropagation();
      const stringNum = parseInt(target.getAttribute('data-string') || '1', 10);
      const fretNum = parseInt(target.getAttribute('data-fret') || '0', 10);
      const noteName = TranscriptionService.getNoteName(stringNum, fretNum);

      TranscriptionService.playNote(stringNum, fretNum, 0.7);
      
      const noteDisplay = document.getElementById('tab-active-note-display');
      if (noteDisplay) {
        noteDisplay.innerHTML = `Plucked <b>${stringFullNames[stringNum - 1]}</b> • <b>Fret ${fretNum}</b> (${noteName})`;
      }

      renderInteractiveFretboard({
        string: stringNum,
        fret: fretNum,
        noteName: noteName,
        time: 0,
        duration: 0.5
      }, allowedStrings);
    });
  });
}

function renderNoteSequenceStrip(notes: TranscribedNote[]): void {
  const container = document.getElementById('note-sequence-strip');
  if (!container) return;

  const stringLabels = ['', 'High E', 'B', 'G', 'D', 'A', 'Low E'];

  container.innerHTML = notes.map((n, idx) => `
    <button type="button" class="btn-note-chip flex flex-col items-center justify-center p-2.5 rounded-xl bg-card-elevated border-glass hover:border-accent-color transition-all cursor-pointer flex-shrink-0" data-index="${idx}" style="min-width: 76px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02);">
      <span class="text-sm font-bold text-accent-color font-mono">${n.noteName}</span>
      <span class="text-xxs font-mono text-white mt-0.5">${stringLabels[n.string] || 'Str ' + n.string} • F${n.fret}</span>
      <span class="text-xxs text-muted-color mt-0.5">${n.time}s</span>
      ${n.chordSymbol ? `<span class="badge badge-success text-xxs py-0 px-1.5 mt-1 font-mono" style="font-size: 8.5px;">${n.chordSymbol}</span>` : ''}
    </button>
  `).join('');

  // Attach click listeners to each note card
  const chips = container.querySelectorAll('.btn-note-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const idx = parseInt(chip.getAttribute('data-index') || '0', 10);
      const note = notes[idx];
      if (note) {
        highlightActiveNote(note, idx);
        TranscriptionService.playNote(note.string, note.fret, 0.7);
      }
    });
  });
}

function highlightActiveNote(note: TranscribedNote, index: number): void {
  const stringNames = ['', '1 (High E)', '2 (B)', '3 (G)', '4 (D)', '5 (A)', '6 (Low E)'];
  const display = document.getElementById('tab-active-note-display');
  if (display) {
    display.innerHTML = `<b>String ${stringNames[note.string] || note.string}</b> • <b>Fret ${note.fret}</b> • Pitch <b>${note.noteName}</b> • ${note.chordSymbol ? `Chord ${note.chordSymbol}` : 'Melody Note'}`;
  }

  // Highlight fretboard
  renderInteractiveFretboard(note, currentAllowedStrings);

  // Highlight note chip in strip
  const chips = document.querySelectorAll('.btn-note-chip');
  chips.forEach((c, i) => {
    if (i === index) {
      c.classList.add('border-accent-color');
      c.setAttribute('style', 'min-width: 76px; border: 1px solid #fbbf24; background: rgba(251, 191, 36, 0.15); transform: scale(1.06);');
      c.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    } else {
      c.classList.remove('border-accent-color');
      c.setAttribute('style', 'min-width: 76px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02);');
    }
  });
}

function startPlayback(): void {
  if (!activeTranscription || activeTranscription.notes.length === 0) return;
  pauseTrackA();
  isAudioSynthesizing = true;

  const btnPlay = document.getElementById('btn-tab-play');
  const btnSoloB = document.getElementById('btn-solo-b');
  const statusBadge = document.getElementById('tab-playhead-status');
  if (btnPlay) btnPlay.innerHTML = icons.pause('w-4 h-4');
  if (btnSoloB) btnSoloB.innerHTML = `${icons.pause('w-3 h-3')} <span>Pause Synth</span>`;
  if (statusBadge) {
    statusBadge.textContent = `Playing (${playbackSpeed}x)`;
    statusBadge.className = 'badge badge-warning text-xxs py-0 px-1.5 animate-pulse';
  }

  TranscriptionService.playTranscriptionSequence(
    activeTranscription.notes,
    playbackSpeed,
    (note, index) => {
      highlightActiveNote(note, index);
    },
    () => {
      stopPlayback();
    }
  );
}

function pausePlayback(): void {
  TranscriptionService.stopPlayback();
  isAudioSynthesizing = false;
  const btnPlay = document.getElementById('btn-tab-play');
  const btnSoloB = document.getElementById('btn-solo-b');
  const statusBadge = document.getElementById('tab-playhead-status');
  if (btnPlay) btnPlay.innerHTML = icons.play('w-4 h-4');
  if (btnSoloB) btnSoloB.innerHTML = `${icons.play('w-3 h-3')} <span>Play Synth Tab</span>`;
  if (statusBadge) {
    statusBadge.textContent = 'Paused';
    statusBadge.className = 'badge badge-secondary text-xxs py-0 px-1.5';
  }
}

function stopPlayback(): void {
  TranscriptionService.stopPlayback();
  isAudioSynthesizing = false;
  const btnPlay = document.getElementById('btn-tab-play');
  const btnSoloB = document.getElementById('btn-solo-b');
  const statusBadge = document.getElementById('tab-playhead-status');
  const display = document.getElementById('tab-active-note-display');
  if (btnPlay) btnPlay.innerHTML = icons.play('w-4 h-4');
  if (btnSoloB) btnSoloB.innerHTML = `${icons.play('w-3 h-3')} <span>Play Synth Tab</span>`;
  if (statusBadge) {
    statusBadge.textContent = 'Ready';
    statusBadge.className = 'badge badge-success text-xxs py-0 px-1.5';
  }
  if (display) display.textContent = 'Click Play to synthesize notes';
  renderInteractiveFretboard(null, currentAllowedStrings);

  const chips = document.querySelectorAll('.btn-note-chip');
  chips.forEach(c => {
    c.setAttribute('style', 'min-width: 76px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02);');
  });
}

async function addTranscriptionToRoadmap(): Promise<void> {
  const user = appStore.getState().currentUser;
  if (!user || !activeTranscription) return;

  const { ProgressRepo } = await import('../repositories/progress.repo');
  const dbRoadmap = await ProgressRepo.getRoadmap(user.uid);
  
  let roadmapObj: any;
  let stagesObj: any[];

  if (dbRoadmap) {
    roadmapObj = dbRoadmap;
    stagesObj = (dbRoadmap as any).stages || [];
  } else {
    const localRoadmap = RoadmapService.getRoadmap(user.uid);
    roadmapObj = localRoadmap;
    stagesObj = localRoadmap.stages;
  }

  const activeStage = stagesObj.find(s => s.status === 'active') || stagesObj[0]!;
  
  const newTaskId = `task_tab_${Date.now()}`;
  const chordText = currentArrangementConfig.includeChords ? `Chords: ${activeTranscription.chords.join(' -> ')}` : 'Melody Solo Only';
  const newTask: RoadmapTask = {
    id: newTaskId,
    stageId: activeStage.id,
    title: `${activeTranscription.title} (${currentArrangementConfig.stringCount}-String)`,
    description: `Exact Note Tab Drill (${currentArrangementConfig.stringCount}-String Mode): ${chordText} at ${activeTranscription.tempo} BPM. Focus on string fretting clarity.`,
    type: 'exercise',
    status: 'pending',
    scheduledDate: new Date().toISOString(),
    completedAt: undefined,
    lessonId: undefined,
    exerciseId: newTaskId,
    songId: undefined,
    estimatedMinutes: 15,
    xpReward: 250
  };

  activeStage.tasks = activeStage.tasks || [];
  activeStage.tasks.push(newTask);

  await ProgressRepo.saveRoadmap(user.uid, roadmapObj, stagesObj);
  localStorage.setItem(`roadmap_${user.uid}`, JSON.stringify({ ...roadmapObj, stages: stagesObj }));

  dashboardStore.setState({
    activeTaskTitle: activeTranscription.title,
    activeTaskProgress: 0
  });

  alert(`Success! '${activeTranscription.title}' note drill added to your Roadmap!`);
  window.location.hash = '#home';
}
