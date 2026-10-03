import { appStore, dashboardStore } from '../store';
import { renderNav, setupNavEvents } from '../components/nav';
import { RoadmapService } from '../services/roadmap';
import type { RoadmapTask, SongTranscriptionResult, TranscribedNote } from '@guitarmind/core';
import { SongsRepo } from '../repositories/songs.repo';
import { icons } from '../components/icons';
import { TranscriptionService, type AudioAnalysisSummary } from '../services/transcription';

let activeTranscription: SongTranscriptionResult | null = null;
let currentSourceMode: 'link' | 'upload' = 'link';
let uploadedAudioFile: File | null = null;
let uploadedAudioAnalysis: AudioAnalysisSummary | null = null;
let playbackSpeed: number = 1.0;
let isAudioSynthesizing: boolean = false;

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
      <div class="practice-page-container animate-fade-in mb-16">
        <main class="practice-main">
          
          <!-- Header -->
          <header class="flex justify-between items-center mb-6">
            <div>
              <h4 class="text-xs text-muted-color m-0 uppercase font-semibold">AI Musical Perception</h4>
              <h2 class="m-0">AI Song & Tab Transcriber</h2>
              <p class="text-xs text-muted-color m-0 mt-1">Upload song audio or paste a link. Our AI extracts exact note-by-note tabs, chords, and animated fretboard fingerings.</p>
            </div>
          </header>

          <div class="grid-layout-columns">
            <!-- Left Side: Source Input & Results -->
            <div class="flex flex-col gap-6">
              
              <!-- Input Selector Card -->
              <div class="glass-card">
                <!-- Mode Switcher Tabs -->
                <div class="flex gap-2 p-1 bg-card-elevated border-glass rounded-lg mb-4 w-fit">
                  <button type="button" id="tab-mode-link" class="btn btn-sm ${currentSourceMode === 'link' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-1.5 text-xs">
                    ${icons.video('w-3.5 h-3.5')}
                    <span>Song Link / YouTube</span>
                  </button>
                  <button type="button" id="tab-mode-upload" class="btn btn-sm ${currentSourceMode === 'upload' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-1.5 text-xs">
                    ${icons.upload('w-3.5 h-3.5')}
                    <span>Upload Audio File</span>
                  </button>
                </div>

                <!-- Link Mode Container -->
                <div id="container-link-mode" class="${currentSourceMode === 'link' ? '' : 'hidden'}">
                  <p class="text-xs text-muted-color mb-3">Paste any YouTube song or acoustic tutorial link below to transcribe the exact notes.</p>
                  <div class="flex gap-2">
                    <input type="text" id="youtube-url-input" placeholder="https://www.youtube.com/watch?v=..." class="input" style="flex-grow: 1;" />
                    <button id="btn-analyze-song" class="btn btn-primary flex items-center gap-1.5">
                      ${icons.sparkles('w-4 h-4')}
                      <span>Transcribe Notes</span>
                    </button>
                  </div>
                </div>

                <!-- Upload Mode Container -->
                <div id="container-upload-mode" class="${currentSourceMode === 'upload' ? '' : 'hidden'}">
                  <p class="text-xs text-muted-color mb-3">Upload any MP3, WAV, M4A, or OGG audio recording from your computer.</p>
                  <div id="audio-drop-zone" class="border-2 border-dashed border-glass rounded-lg p-6 text-center cursor-pointer hover:border-primary-color transition-colors flex flex-col items-center justify-center gap-2" style="background: rgba(255,255,255,0.01);">
                    <div class="w-12 h-12 rounded-full bg-glass border-glass flex items-center justify-center text-primary-color mb-1">
                      ${icons.upload('w-6 h-6')}
                    </div>
                    <h5 class="m-0 text-sm font-semibold">Drop audio file here or click to browse</h5>
                    <p class="text-xxs text-muted-color m-0">Supports MP3, WAV, M4A, OGG up to 25MB</p>
                    <input type="file" id="audio-file-input" accept="audio/*" class="hidden" />
                  </div>
                  
                  <div id="audio-file-preview" class="hidden mt-3 p-3 bg-card-elevated border-glass rounded-lg flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <span class="text-primary-color">${icons.music('w-5 h-5')}</span>
                      <div>
                        <div id="audio-file-name" class="text-xs font-semibold text-primary-color">song.mp3</div>
                        <div id="audio-file-meta" class="text-xxs text-muted-color">Ready for frequency scanning</div>
                      </div>
                    </div>
                    <button id="btn-analyze-upload" class="btn btn-primary btn-sm flex items-center gap-1.5">
                      ${icons.sparkles('w-3.5 h-3.5')}
                      <span>Transcribe Audio</span>
                    </button>
                  </div>
                </div>

              </div>

              <!-- Output Note & Tab Studio Deck (Hidden by default) -->
              <div id="youtube-output-card" class="glass-card hidden flex flex-col gap-5 animate-scale-in">
                
                <!-- Transcription Header -->
                <div class="flex justify-between items-start border-b border-glass pb-4">
                  <div>
                    <span class="badge badge-warning text-xxs flex items-center gap-1 w-fit mb-1.5">
                      ${icons.sparkles('w-3 h-3')} AI Exact Note Transcription
                    </span>
                    <h3 id="yt-lesson-title" class="m-0 text-lg font-bold">Stairway to Heaven Acoustic Intro</h3>
                    <p id="yt-artist-subtitle" class="text-xs text-muted-color m-0 mt-0.5">Led Zeppelin • Standard Tuning</p>
                  </div>
                  <div class="flex gap-2">
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

                <!-- Song Metadata Badges -->
                <div class="flex flex-wrap gap-2 text-xs">
                  <span class="badge badge-info text-xxs py-1 px-2.5">Key: <b id="yt-meta-key" class="text-white ml-1">E Minor</b></span>
                  <span class="badge badge-secondary text-xxs py-1 px-2.5">Tempo: <b id="yt-meta-bpm" class="text-white ml-1">105 BPM</b></span>
                  <span class="badge badge-secondary text-xxs py-1 px-2.5">Time: <b id="yt-meta-time" class="text-white ml-1">4/4</b></span>
                  <span class="badge badge-secondary text-xxs py-1 px-2.5">Capo: <b id="yt-meta-capo" class="text-white ml-1">None</b></span>
                  <span class="badge badge-secondary text-xxs py-1 px-2.5">Tuning: <b id="yt-meta-tuning" class="text-white ml-1">E A D G B E</b></span>
                </div>

                <!-- Chords in Progression -->
                <div>
                  <span class="text-xxs font-bold uppercase tracking-wider text-muted-color block mb-2">Chord Progression</span>
                  <div id="yt-chords-container" class="flex flex-wrap gap-2">
                    <!-- Populated dynamically -->
                  </div>
                </div>

                <!-- SYNTHESIS PLAYBACK CONTROLLER -->
                <div class="p-4 bg-card-elevated border-glass rounded-lg flex flex-col gap-3" style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06);">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <button id="btn-tab-play" class="btn btn-primary btn-icon flex items-center justify-center" style="width: 40px; height: 40px; border-radius: 50%;">
                        ${icons.play('w-4 h-4')}
                      </button>
                      <button id="btn-tab-stop" class="btn btn-secondary btn-icon flex items-center justify-center" style="width: 36px; height: 36px; border-radius: 50%;" title="Stop Playback">
                        <span style="display: block; width: 12px; height: 12px; background: currentColor; border-radius: 2px;"></span>
                      </button>
                      <div>
                        <div class="text-xs font-bold text-white flex items-center gap-2">
                          <span>Guitar Synthesizer</span>
                          <span id="tab-playhead-status" class="badge badge-success text-xxs py-0 px-1.5">Ready</span>
                        </div>
                        <div id="tab-active-note-display" class="text-xxs font-mono text-primary-color-light mt-0.5">Click Play to listen to exact notes</div>
                      </div>
                    </div>

                    <!-- Speed Selector -->
                    <div class="flex items-center gap-2">
                      <span class="text-xxs text-muted-color uppercase font-semibold">Speed:</span>
                      <select id="tab-speed-select" class="select text-xs py-1 px-2" style="background: #111116; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: #fff;">
                        <option value="0.5">0.5x (Slow)</option>
                        <option value="0.75">0.75x (Practice)</option>
                        <option value="1.0" selected>1.0x (Normal)</option>
                        <option value="1.25">1.25x (Fast)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- INTERACTIVE ANIMATED GUITAR FRETBOARD -->
                <div class="flex flex-col gap-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-muted-color">Visual Fretboard Position</span>
                    <span class="text-xxs text-muted-color font-mono">Frets 0 - 15 • Strings 1 to 6</span>
                  </div>
                  <div class="fretboard-visualizer-container overflow-x-auto p-3 bg-card-elevated border-glass rounded-lg" style="background: #09090d; border: 1px solid rgba(255,255,255,0.08);">
                    <div id="fretboard-canvas-wrapper" class="relative" style="min-width: 680px; height: 130px;">
                      <!-- Fretboard drawn via dynamic SVG -->
                    </div>
                  </div>
                </div>

                <!-- NOTE-BY-NOTE SEQUENCE CARDS -->
                <div class="flex flex-col gap-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-muted-color">Exact Note Sequence (Click note to sound)</span>
                    <span id="note-count-badge" class="text-xxs text-muted-color font-mono">19 Notes</span>
                  </div>
                  <div id="note-sequence-strip" class="flex gap-2 overflow-x-auto pb-2" style="scrollbar-width: thin;">
                    <!-- Note chips rendered here -->
                  </div>
                </div>

                <!-- ASCII TABLATURE STAFF -->
                <div class="flex flex-col gap-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-muted-color">Standard Tablature (ASCII Tab)</span>
                    <button id="btn-copy-tab" class="btn btn-secondary btn-sm flex items-center gap-1.5 py-1 px-2.5 text-xs">
                      ${icons.copy('w-3.5 h-3.5')}
                      <span id="copy-btn-text">Copy Tab</span>
                    </button>
                  </div>
                  <pre id="ascii-tab-block" class="p-4 bg-black rounded-lg border-glass text-xs font-mono overflow-x-auto text-success" style="line-height: 1.5; letter-spacing: 0.05em; border: 1px solid rgba(52, 211, 153, 0.2);"></pre>
                </div>

                <!-- Structured Practice Drills -->
                <div class="flex flex-col gap-3 mt-1">
                  <h4 class="text-sm font-semibold m-0">Recommended Practice Routine</h4>
                  <div class="flex flex-col gap-2" id="yt-steps-container">
                    <!-- Steps go here -->
                  </div>
                </div>

              </div>

            </div>

            <!-- Right Side: Recent Transcriptions -->
            <div class="glass-card flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <h3 class="m-0">Recent Transcriptions</h3>
                <span class="badge badge-info text-xxs">${recentImports.length} Saved</span>
              </div>
              <p class="text-xs text-muted-color m-0">Previously extracted songs and lessons saved to your library.</p>
              <div class="flex flex-col gap-2.5 mt-1" id="recent-imports-list">
                ${importsHtml}
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
            <h3 class="mb-2 text-base font-semibold" id="transcribe-loading-title">Analyzing Song Frequencies...</h3>
            <p class="text-xs text-muted-color leading-relaxed m-0" id="transcribe-loading-desc">Decoding audio spectrum, identifying fundamental notes, and aligning guitar fret positions...</p>
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
  },
  onUnmount: () => {
    TranscriptionService.stopPlayback();
    isAudioSynthesizing = false;
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

  if (btnAnalyzeUpload) {
    btnAnalyzeUpload.addEventListener('click', () => {
      if (!uploadedAudioFile) {
        alert('Please select an audio file first.');
        return;
      }
      runTranscription({
        sourceType: 'upload',
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

  // Playback Synthesizer Controls
  const btnPlay = document.getElementById('btn-tab-play');
  const btnStop = document.getElementById('btn-tab-stop');
  const speedSelect = document.getElementById('tab-speed-select') as HTMLSelectElement;

  if (speedSelect) {
    speedSelect.addEventListener('change', () => {
      playbackSpeed = parseFloat(speedSelect.value) || 1.0;
      if (isAudioSynthesizing && activeTranscription) {
        // restart with new speed
        startPlayback();
      }
    });
  }

  if (btnPlay) {
    btnPlay.addEventListener('click', () => {
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

  // Save to Songs Button
  const btnSaveToSongs = document.getElementById('btn-save-to-songs');
  if (btnSaveToSongs) {
    btnSaveToSongs.addEventListener('click', async () => {
      if (!activeTranscription) return;
      const user = appStore.getState().currentUser;
      const uid = user ? user.uid : 'anonymous';

      await SongsRepo.saveSong({
        userId: uid,
        title: activeTranscription.title,
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

async function runTranscription(params: {
  sourceType: 'link' | 'upload';
  sourceUrl?: string;
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

  // If link, fetch YouTube oEmbed
  if (params.sourceType === 'link' && params.sourceUrl && !detectedTitle) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(params.sourceUrl)}&format=json`;
      const res = await fetch(oembedUrl);
      if (res.ok) {
        const metadata = await res.json();
        detectedTitle = metadata.title;
        detectedArtist = metadata.author_name;
      }
    } catch {
      // Continue with link string
    }
  }

  if (loadingTitle) loadingTitle.textContent = "AI Transcribing Exact Notes...";
  if (loadingDesc) loadingDesc.textContent = "Extracting string frets, note frequencies, timing, and formatting guitar tablature...";

  try {
    const result = await TranscriptionService.transcribeSong({
      ...params,
      titleOverride: detectedTitle,
      artistOverride: detectedArtist
    });

    activeTranscription = result;
    renderTranscriptionOutput(result);

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

function renderTranscriptionOutput(res: SongTranscriptionResult): void {
  // 1. Text metadata
  const title = document.getElementById('yt-lesson-title');
  const artist = document.getElementById('yt-artist-subtitle');
  const metaKey = document.getElementById('yt-meta-key');
  const metaBpm = document.getElementById('yt-meta-bpm');
  const metaTime = document.getElementById('yt-meta-time');
  const metaCapo = document.getElementById('yt-meta-capo');
  const metaTuning = document.getElementById('yt-meta-tuning');
  const chordsCont = document.getElementById('yt-chords-container');
  const asciiTabBlock = document.getElementById('ascii-tab-block');
  const stepsCont = document.getElementById('yt-steps-container');
  const noteCountBadge = document.getElementById('note-count-badge');

  if (title) title.textContent = res.title;
  if (artist) artist.textContent = `${res.artist} • ${res.tuning}`;
  if (metaKey) metaKey.textContent = res.key;
  if (metaBpm) metaBpm.textContent = `${res.tempo} BPM`;
  if (metaTime) metaTime.textContent = res.timeSignature;
  if (metaCapo) metaCapo.textContent = res.capo ? `Fret ${res.capo}` : 'None';
  if (metaTuning) metaTuning.textContent = res.tuning;
  if (asciiTabBlock) asciiTabBlock.textContent = res.tabStaff;
  if (noteCountBadge) noteCountBadge.textContent = `${res.notes.length} Exact Notes`;

  // 2. Chords Pills
  if (chordsCont) {
    chordsCont.innerHTML = res.chords.map(c => `
      <span class="badge badge-success px-2.5 py-1 text-xs font-bold" style="background: rgba(52, 211, 153, 0.15); color: rgb(52, 211, 153); border: 1px solid rgba(52, 211, 153, 0.3);">
        ${c}
      </span>
    `).join('');
  }

  // 3. Recommended Steps
  if (stepsCont && res.steps) {
    stepsCont.innerHTML = res.steps.map(s => `
      <div class="flex items-start gap-3 bg-card-elevated border-glass p-3 rounded-lg">
        <div class="level-badge py-0 px-2 text-xs" style="border-radius: 4px; box-shadow: none;">${s.index + 1}</div>
        <div>
          <h5 class="m-0 text-sm font-semibold">${s.name}</h5>
          <p class="text-xs text-muted-color mt-1 m-0">${s.desc}</p>
        </div>
      </div>
    `).join('');
  }

  // 4. Draw Initial Fretboard SVG
  renderInteractiveFretboard(null);

  // 5. Render Note Strip Chips
  renderNoteSequenceStrip(res.notes);
}

function renderInteractiveFretboard(activeNote: TranscribedNote | null): void {
  const container = document.getElementById('fretboard-canvas-wrapper');
  if (!container) return;

  const totalFrets = 15;
  const stringNames = ['e', 'B', 'G', 'D', 'A', 'E']; // 1 to 6
  const width = 680;
  const height = 130;
  const nutWidth = 14;
  const fretWidth = (width - nutWidth) / totalFrets;

  // Markers at frets 3, 5, 7, 9, 12
  const inlays = [3, 5, 7, 9, 12];

  let fretLines = '';
  for (let f = 1; f <= totalFrets; f++) {
    const x = nutWidth + f * fretWidth;
    fretLines += `<line x1="${x}" y1="10" x2="${x}" y2="${height - 10}" stroke="rgba(255,255,255,0.18)" stroke-width="${f === 12 ? 2.5 : 1.5}" />`;
    fretLines += `<text x="${x - fretWidth / 2}" y="${height - 2}" fill="rgba(255,255,255,0.3)" font-size="9" text-anchor="middle" font-family="monospace">${f}</text>`;
  }

  let inlaysSvg = '';
  inlays.forEach(f => {
    const cx = nutWidth + f * fretWidth - fretWidth / 2;
    if (f === 12) {
      inlaysSvg += `<circle cx="${cx}" cy="${height / 2 - 16}" r="3.5" fill="rgba(255,255,255,0.25)" />`;
      inlaysSvg += `<circle cx="${cx}" cy="${height / 2 + 16}" r="3.5" fill="rgba(255,255,255,0.25)" />`;
    } else {
      inlaysSvg += `<circle cx="${cx}" cy="${height / 2}" r="3.5" fill="rgba(255,255,255,0.25)" />`;
    }
  });

  let stringLines = '';
  for (let s = 1; s <= 6; s++) {
    const y = 14 + (s - 1) * 19;
    const thickness = 1 + (s - 1) * 0.4;
    stringLines += `<line x1="${nutWidth}" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(255,255,255,${0.35 + s * 0.08})" stroke-width="${thickness}" />`;
    stringLines += `<text x="5" y="${y + 3.5}" fill="rgba(255,255,255,0.6)" font-size="10" font-weight="bold" font-family="monospace">${stringNames[s - 1]}</text>`;
  }

  // Active note highlight marker
  let activeMarkerSvg = '';
  if (activeNote) {
    const sIdx = activeNote.string; // 1 to 6
    const fIdx = activeNote.fret;   // 0 to 15
    const y = 14 + (sIdx - 1) * 19;
    const x = fIdx === 0 ? nutWidth / 2 : nutWidth + fIdx * fretWidth - fretWidth / 2;

    activeMarkerSvg = `
      <g class="active-note-pulse">
        <circle cx="${x}" cy="${y}" r="11" fill="rgba(251, 191, 36, 0.4)" class="animate-ping" />
        <circle cx="${x}" cy="${y}" r="9" fill="#fbbf24" stroke="#ffffff" stroke-width="2" />
        <text x="${x}" y="${y + 3.5}" fill="#000000" font-size="9" font-weight="bold" text-anchor="middle" font-family="sans-serif">${activeNote.noteName}</text>
      </g>
    `;
  }

  container.innerHTML = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%;">
      <!-- Nut / Zero Fret -->
      <rect x="${nutWidth - 4}" y="10" width="6" height="${height - 20}" fill="#e2e8f0" rx="2" />
      
      <!-- Fret lines -->
      ${fretLines}
      
      <!-- Fret dot inlays -->
      ${inlaysSvg}
      
      <!-- Guitar Strings -->
      ${stringLines}
      
      <!-- Highlighted Active Note -->
      ${activeMarkerSvg}
    </svg>
  `;
}

function renderNoteSequenceStrip(notes: TranscribedNote[]): void {
  const container = document.getElementById('note-sequence-strip');
  if (!container) return;

  const stringLabels = ['', 'High E', 'B', 'G', 'D', 'A', 'Low E'];

  container.innerHTML = notes.map((n, idx) => `
    <button type="button" class="btn-note-chip flex flex-col items-center justify-center p-2 rounded-lg bg-card-elevated border-glass hover:border-accent-color transition-all cursor-pointer flex-shrink-0" data-index="${idx}" style="min-width: 68px; border: 1px solid rgba(255,255,255,0.06);">
      <span class="text-xs font-bold text-accent-color">${n.noteName}</span>
      <span class="text-xxs font-mono text-white mt-0.5">${stringLabels[n.string] || 'S' + n.string} • F${n.fret}</span>
      <span class="text-xxs text-muted-color mt-0.5">${n.time}s</span>
      ${n.chordSymbol ? `<span class="badge badge-success text-xxs py-0 px-1 mt-1" style="font-size: 8px;">${n.chordSymbol}</span>` : ''}
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
  renderInteractiveFretboard(note);

  // Highlight note chip in strip
  const chips = document.querySelectorAll('.btn-note-chip');
  chips.forEach((c, i) => {
    if (i === index) {
      c.classList.add('border-accent-color');
      c.setAttribute('style', 'min-width: 64px; border: 1px solid #fbbf24; background: rgba(251, 191, 36, 0.12); transform: scale(1.05);');
      c.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    } else {
      c.classList.remove('border-accent-color');
      c.setAttribute('style', 'min-width: 64px; border: 1px solid rgba(255,255,255,0.06);');
    }
  });
}

function startPlayback(): void {
  if (!activeTranscription || activeTranscription.notes.length === 0) return;
  isAudioSynthesizing = true;

  const btnPlay = document.getElementById('btn-tab-play');
  const statusBadge = document.getElementById('tab-playhead-status');
  if (btnPlay) btnPlay.innerHTML = icons.pause('w-4 h-4');
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
      // On completed playback
      stopPlayback();
    }
  );
}

function pausePlayback(): void {
  TranscriptionService.stopPlayback();
  isAudioSynthesizing = false;
  const btnPlay = document.getElementById('btn-tab-play');
  const statusBadge = document.getElementById('tab-playhead-status');
  if (btnPlay) btnPlay.innerHTML = icons.play('w-4 h-4');
  if (statusBadge) {
    statusBadge.textContent = 'Paused';
    statusBadge.className = 'badge badge-secondary text-xxs py-0 px-1.5';
  }
}

function stopPlayback(): void {
  TranscriptionService.stopPlayback();
  isAudioSynthesizing = false;
  const btnPlay = document.getElementById('btn-tab-play');
  const statusBadge = document.getElementById('tab-playhead-status');
  const display = document.getElementById('tab-active-note-display');
  if (btnPlay) btnPlay.innerHTML = icons.play('w-4 h-4');
  if (statusBadge) {
    statusBadge.textContent = 'Ready';
    statusBadge.className = 'badge badge-success text-xxs py-0 px-1.5';
  }
  if (display) display.textContent = 'Click Play to listen to exact notes';
  renderInteractiveFretboard(null);

  const chips = document.querySelectorAll('.btn-note-chip');
  chips.forEach(c => {
    c.setAttribute('style', 'min-width: 64px; border: 1px solid rgba(255,255,255,0.06);');
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
  const newTask: RoadmapTask = {
    id: newTaskId,
    stageId: activeStage.id,
    title: activeTranscription.title,
    description: `Exact Note Tab Drill: ${activeTranscription.chords.join(' -> ')} at ${activeTranscription.tempo} BPM. Focus on string fretting clarity.`,
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
