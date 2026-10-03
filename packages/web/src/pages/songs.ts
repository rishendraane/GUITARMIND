import { appStore } from '../store';
import { renderNav, setupNavEvents } from '../components/nav';
import { AIService } from '../services/ai';
import type { Song, SongSection, Genre } from '@guitarmind/core';
import { SongsRepo } from '../repositories/songs.repo';
import { icons } from '../components/icons';

// Initial saved songs list in memory / cache
const DEFAULT_SONGS: (Song & { sections: SongSection[] })[] = [
  {
    id: 'song_heavens_door',
    title: "Knockin' on Heaven's Door",
    artist: "Bob Dylan (Classic)",
    genres: ['rock', 'folk'],
    difficulty: 'beginner',
    key: 'G',
    tempo: 72,
    timeSignature: '4/4',
    capo: null,
    tuning: 'Standard Tuning',
    requiredChords: ['G', 'D', 'Am', 'C'],
    requiredTechniques: ['Strumming'],
    estimatedLearningHours: 4,
    isAIGenerated: false,
    isUserGenerated: false,
    youtubeURL: undefined,
    sourceURL: undefined,
    timesPracticed: 1240,
    averageRating: 4.8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sections: [
      {
        id: 'sec_hd_intro',
        index: 0,
        name: 'Intro / Verse',
        chords: ['G', 'D', 'Am', 'Am', 'G', 'D', 'C', 'C'],
        strummingPattern: 'D D UD UD',
        tabs: 'G: 320003  D: xx0232  Am: x02210  C: x32010',
        lyrics: "Mama take this badge off of me... I can't use it anymore...",
        simplifiedChords: ['G', 'D', 'Am', 'C'],
        advancedChords: ['G', 'D', 'Am7', 'Cmaj7']
      }
    ]
  }
];

export const songsRoute = {
  path: '#songs',
  render: async () => {
    // Load saved songs from database
    let songs = await SongsRepo.listSongs();
    if (songs.length === 0) {
      // Seed default songs if database is empty
      for (const s of DEFAULT_SONGS) {
        await SongsRepo.saveSong(s);
      }
      songs = await SongsRepo.listSongs();
    }

    const songCards = songs
      .map(
        (s) => `
      <div class="song-list-item flex items-center justify-between p-3 rounded-lg hover:bg-glass cursor-pointer transition-all btn-view-song" data-id="${s.id}">
        <div class="flex items-center gap-3">
          <div class="song-item-cover w-11 h-11 rounded flex items-center justify-center text-white" style="background: linear-gradient(135deg, #111118 0%, #1a1a25 100%); border: 1px solid rgba(255, 255, 255, 0.05);">
            ${icons.music('w-5 h-5 text-muted')}
          </div>
          <div>
            <h4 class="m-0 text-sm font-semibold text-primary-color">${s.title}</h4>
            <p class="text-xs text-muted-color m-0 mt-0.5">${s.artist} • ${s.key} Key</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="badge ${s.difficulty === 'beginner' ? 'badge-success' : 'badge-warning'} text-xxs">${s.difficulty}</span>
          <span class="text-xs text-muted-color">${s.tempo} BPM</span>
        </div>
      </div>
    `
      )
      .join('');

    return `
      <div class="practice-page-container animate-fade-in mb-16">
        <main class="practice-main">
          
          <!-- Header -->
          <header class="flex justify-between items-center mb-6">
            <div>
              <h4 class="text-xs text-muted-color m-0 uppercase font-semibold">Musical Repository</h4>
              <h2 class="m-0">Song Hub</h2>
            </div>
            
            <div class="flex items-center gap-2">
              <button id="btn-open-transcriber" class="btn btn-secondary btn-sm flex items-center gap-1.5" onclick="window.location.hash='#youtube'">
                ${icons.music('w-4 h-4')}
                <span>Transcribe Song</span>
              </button>
              <button id="btn-open-creator" class="btn btn-primary btn-sm flex items-center gap-1.5">
                ${icons.sparkles('w-4 h-4')}
                <span>Generate AI Song</span>
              </button>
            </div>
          </header>

          <div class="grid-layout-columns">
            <!-- Left Side: Song Catalog -->
            <div class="flex flex-col">
              <div class="flex items-center justify-between mb-4">
                <h3 class="m-0 text-md font-semibold text-primary-color">My Library</h3>
                <span class="text-xxs text-muted-color">${songs.length} Tracks</span>
              </div>
              <div id="songs-list-container" class="flex flex-col gap-1.5 max-h-[500px] overflow-y-auto">
                ${songCards}
              </div>
            </div>

            <!-- Right Side: Spotify-style Song View Deck -->
            <div id="active-song-viewer" class="glass-card flex flex-col gap-4 animate-scale-in">
              <div id="viewer-placeholder" class="text-center py-16 flex flex-col items-center justify-center">
                <span class="w-16 h-16 flex items-center justify-center text-disabled mb-4 animate-float">${icons.music('w-12 h-12')}</span>
                <h4 class="m-0 font-bold text-md text-primary-color">No Track Selected</h4>
                <p class="text-xs text-muted-color max-w-xs mx-auto mt-2 leading-relaxed">Select a song from your library or click Generate to compose a fresh track with AI.</p>
              </div>

              <!-- Real Dynamic Spotify-Style Song Viewer (Hidden initially) -->
              <div id="viewer-content" class="hidden flex flex-col gap-5">
                <!-- Cover deck header -->
                <div class="flex items-center gap-4 border-b border-glass pb-4">
                  <div class="song-viewer-cover w-20 h-20 rounded-lg flex items-center justify-center text-white animate-pulse" style="background: linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 8px 24px rgba(124, 58, 237, 0.25);">
                    ${icons.music('w-8 h-8')}
                  </div>
                  <div class="flex-grow">
                    <div class="flex items-center gap-2">
                      <span id="view-song-difficulty" class="badge badge-success text-xxs">Beginner</span>
                    </div>
                    <h2 id="view-song-title" class="m-0 mt-1 text-2xl font-bold text-primary-color">Heaven's Door</h2>
                    <p id="view-song-artist" class="text-xs text-muted-color m-0 mt-0.5">Bob Dylan</p>
                  </div>
                </div>

                <!-- Song Player Bar Controls -->
                <div class="flex flex-col gap-2 p-3 bg-card-elevated border-glass rounded-lg">
                  <div class="flex justify-between items-center">
                    <div class="flex gap-2">
                      <button id="btn-play-song" class="btn btn-secondary btn-sm flex items-center gap-1.5">
                        <span id="play-song-icon" class="w-4 h-4 flex items-center justify-center">${icons.play('w-4 h-4 fill-current')}</span> 
                        <span id="play-song-text">Strum Progression</span>
                      </button>
                      <button id="btn-mark-mastered" class="btn btn-secondary btn-sm flex items-center gap-1.5">
                        <span>Mark Mastered</span>
                      </button>
                    </div>
                    <span class="text-xxs text-muted-color uppercase font-semibold font-mono tracking-wider">Audio Deck</span>
                  </div>
                  
                  <!-- Fake Seek Bar to look premium -->
                  <div class="w-full bg-glass border-glass rounded-full h-1.5 mt-2 relative overflow-hidden">
                    <div class="bg-primary-color h-full w-[25%]" style="border-radius: inherit;"></div>
                  </div>
                </div>

                <!-- Technical Specs Details -->
                <div class="grid grid-cols-4 gap-2 text-xs bg-glass p-3 rounded-lg border-glass text-center font-mono">
                  <div class="flex flex-col gap-1 border-r border-glass">
                    <span class="text-xxs uppercase text-muted-color">Key</span>
                    <span id="view-song-key" class="font-bold text-accent-color text-sm">G</span>
                  </div>
                  <div class="flex flex-col gap-1 border-r border-glass">
                    <span class="text-xxs uppercase text-muted-color">Tempo</span>
                    <span id="view-song-tempo" class="font-bold text-primary-color text-sm">72 BPM</span>
                  </div>
                  <div class="flex flex-col gap-1 border-r border-glass">
                    <span class="text-xxs uppercase text-muted-color">Tuning</span>
                    <span id="view-song-tuning" class="font-bold text-muted-color text-sm">Standard</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <span class="text-xxs uppercase text-muted-color">Meter</span>
                    <span id="view-song-signature" class="font-bold text-muted-color text-sm">4/4</span>
                  </div>
                </div>

                <!-- Sections -->
                <div class="flex flex-col gap-3">
                  <h4 class="m-0 text-sm font-semibold text-primary-color uppercase tracking-wider text-xs">Chord Sheets & Lyrics</h4>
                  <div id="view-song-sections" class="flex flex-col gap-4">
                    <!-- Dynamic sections go here -->
                  </div>
                </div>
              </div>
            </div>
          </div>

        </main>

        <!-- AI Generator Dialog Modal (Hidden by default) -->
        <div id="creator-modal-overlay" class="modal-overlay hidden">
          <div class="modal max-w-sm">
            <h3 class="text-center mb-4 flex items-center justify-center gap-1.5">
              <span class="w-5 h-5 text-accent-color flex items-center justify-center">${icons.sparkles('w-5 h-5')}</span>
              <span>AI Song Generator</span>
            </h3>
            
            <div class="input-group">
              <label class="input-label" for="song-genre">Genre</label>
              <select id="song-genre" class="select">
                <option value="Rock">Rock</option>
                <option value="Blues">Blues</option>
                <option value="Acoustic">Acoustic</option>
                <option value="Metal">Heavy Metal</option>
                <option value="Classical">Classical theme</option>
                <option value="Jazz">Jazz Chord Progression</option>
              </select>
            </div>

            <div class="input-group">
              <label class="input-label" for="song-mood">Mood</label>
              <select id="song-mood" class="select">
                <option value="Happy">Bright & Joyful</option>
                <option value="Dark">Sad & Dark</option>
                <option value="Epic">Epic & Grand</option>
                <option value="Chill">Chill & Mellow</option>
                <option value="Energetic">High Energy</option>
              </select>
            </div>

            <div class="input-group">
              <label class="input-label" for="song-tempo-input">Tempo Preference</label>
              <select id="song-tempo-input" class="select">
                <option value="slow">Slow (60-80 BPM)</option>
                <option value="medium" selected>Medium (90-110 BPM)</option>
                <option value="fast">Fast (120-140 BPM)</option>
              </select>
            </div>

            <div class="flex gap-3 mt-6">
              <button id="btn-creator-cancel" class="btn btn-secondary flex-1">Cancel</button>
              <button id="btn-creator-submit" class="btn btn-primary flex-1">
                <span>Generate</span>
              </button>
            </div>
          </div>
        </div>

        <!-- AI Progress Generating Overlay -->
        <div id="ai-loading-overlay" class="modal-overlay hidden">
          <div class="modal text-center max-w-xs flex flex-col items-center justify-center">
            <span class="w-12 h-12 flex items-center justify-center text-primary-color animate-spin mb-3">${icons.sparkles('w-12 h-12')}</span>
            <h3 class="mt-4 mb-2">Composing Original Song...</h3>
            <p class="text-xs text-muted-color">Our AI is designing standard chord tabs aligned with your mastered chords profile. Please wait...</p>
          </div>
        </div>

        <!-- Render Bottom Nav -->
        ${renderNav()}
      </div>
    `;
  },
  onMount: () => {
    setupNavEvents();
    setupSongsLogic();
  },
  onUnmount: () => {
    cleanupSongAudio();
  }
};

let activeSongId: string | null = null;
let isSongPlaying = false;
let songPlaybackInterval: number | null = null;
let songSynthNodes: OscillatorNode[] = [];
let songAudioCtx: AudioContext | null = null;

function setupSongsLogic(): void {
  // Modal toggling
  const btnOpenCreator = document.getElementById('btn-open-creator');
  const btnCancelCreator = document.getElementById('btn-creator-cancel');
  const overlayCreator = document.getElementById('creator-modal-overlay');

  if (btnOpenCreator && overlayCreator) {
    btnOpenCreator.addEventListener('click', () => {
      overlayCreator.classList.remove('hidden');
    });
  }

  if (btnCancelCreator && overlayCreator) {
    btnCancelCreator.addEventListener('click', () => {
      overlayCreator.classList.add('hidden');
    });
  }

  // Submit AI Generation
  const btnSubmitCreator = document.getElementById('btn-creator-submit');
  if (btnSubmitCreator) {
    btnSubmitCreator.addEventListener('click', () => {
      generateAISong();
    });
  }

  // Item click viewer binding
  const buttons = document.querySelectorAll('.btn-view-song');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id')!;
      loadSongIntoViewer(id);
    });
  });

  // Play button binding
  const btnPlay = document.getElementById('btn-play-song');
  if (btnPlay) {
    btnPlay.addEventListener('click', () => {
      if (isSongPlaying) {
        stopSongPlayback();
      } else {
        startSongPlayback();
      }
    });
  }

  // Mark mastered button binding
  const btnMarkMastered = document.getElementById('btn-mark-mastered');
  if (btnMarkMastered) {
    btnMarkMastered.addEventListener('click', async () => {
      const user = appStore.getState().currentUser;
      if (!user || !activeSongId) {
        alert('Please log in to track progress.');
        return;
      }

      const progress = await SongsRepo.getUserSongProgress(user.uid, activeSongId) as (any | null);
      const isCurrentlyMastered = progress?.status === 'mastered';
      
      const newStatus = isCurrentlyMastered ? 'learning' : 'mastered';
      const newProgressPercent = isCurrentlyMastered ? 50 : 100;

      await SongsRepo.updateUserSongProgress({
        userId: user.uid,
        songId: activeSongId,
        status: newStatus,
        progressPercent: newProgressPercent,
        highestScore: 100,
        lastPracticedAt: new Date().toISOString()
      });

      alert(`Song status updated to: ${newStatus.toUpperCase()}`);
      await loadSongIntoViewer(activeSongId);
    });
  }
}

async function loadSongIntoViewer(songId: string): Promise<void> {
  // Stop current plays
  stopSongPlayback();

  const song = await SongsRepo.getSong(songId);
  if (!song) return;

  activeSongId = songId;

  // Toggle placeholder/content
  const placeholder = document.getElementById('viewer-placeholder');
  const content = document.getElementById('viewer-content');
  if (placeholder) placeholder.classList.add('hidden');
  if (content) content.classList.remove('hidden');

  // Update Mark Mastered button text based on real database status
  const user = appStore.getState().currentUser;
  if (user) {
    const progress = await SongsRepo.getUserSongProgress(user.uid, songId) as any;
    const markMasteredBtn = document.getElementById('btn-mark-mastered') as HTMLButtonElement;
    if (markMasteredBtn) {
      if (progress && progress.status === 'mastered') {
        markMasteredBtn.innerHTML = `<span>${icons.check('w-3.5 h-3.5 inline')} Mastered</span>`;
        markMasteredBtn.className = 'btn btn-success btn-sm';
      } else {
        markMasteredBtn.innerHTML = '<span>Mark Mastered</span>';
        markMasteredBtn.className = 'btn btn-secondary btn-sm';
      }
    }
  }

  // Fill in details
  const title = document.getElementById('view-song-title');
  const artist = document.getElementById('view-song-artist');
  const key = document.getElementById('view-song-key');
  const tempo = document.getElementById('view-song-tempo');
  const tuning = document.getElementById('view-song-tuning');
  const signature = document.getElementById('view-song-signature');
  const difficulty = document.getElementById('view-song-difficulty');
  const sectionsCont = document.getElementById('view-song-sections');

  if (title) title.textContent = song.title;
  if (artist) artist.textContent = song.artist;
  if (key) key.textContent = song.key ?? null;
  if (tempo) tempo.textContent = `${song.tempo ?? ''} BPM`;
  if (tuning) tuning.textContent = song.tuning ?? null;
  if (signature) signature.textContent = song.timeSignature ?? null;
  
  if (difficulty) {
    difficulty.textContent = song.difficulty ?? null;
    difficulty.className = `badge ${song.difficulty === 'beginner' ? 'badge-success' : 'badge-warning'} text-xxs`;
  }

  // Draw sections
  if (sectionsCont) {
    sectionsCont.innerHTML = (song.sections || [])
      .map(
        (sec: any, sIdx: number) => `
      <div class="p-3 bg-card-elevated border-glass rounded-lg flex flex-col gap-2 relative">
        <div class="flex justify-between items-center">
          <span class="font-bold text-xs uppercase text-muted-color">${sec.name}</span>
          <span class="text-xxs font-mono text-primary-color-light">${sec.strummingPattern}</span>
        </div>
        
        <!-- Chords display row -->
        <div class="flex flex-wrap gap-2 my-1">
          ${sec.chords
            .map(
              (ch: string, cIdx: number) => `
            <div class="bg-glass border-glass px-3 py-1 font-mono rounded font-bold text-center view-chord-block" data-section="${sIdx}" data-chord="${cIdx}" style="min-width: 48px;">
              ${ch}
            </div>
          `
            )
            .join('')}
        </div>

        <p class="text-xs m-0 text-secondary-color italic">"${sec.lyrics}"</p>
        <div class="text-xxs text-muted-color font-mono border-t border-glass pt-2">Tabs: ${sec.tabs || 'Standard shapes'}</div>
      </div>
    `
      )
      .join('');
  }
}

async function generateAISong(): Promise<void> {
  const overlayCreator = document.getElementById('creator-modal-overlay');
  const overlayLoading = document.getElementById('ai-loading-overlay');
  
  const selectGenre = document.getElementById('song-genre') as HTMLSelectElement;
  const selectMood = document.getElementById('song-mood') as HTMLSelectElement;
  const selectTempo = document.getElementById('song-tempo-input') as HTMLSelectElement;

  if (overlayCreator) overlayCreator.classList.add('hidden');
  if (overlayLoading) overlayLoading.classList.remove('hidden');

  const genre = selectGenre.value;
  const mood = selectMood.value;
  const tempoType = selectTempo.value;

  const targetBpm = tempoType === 'slow' ? 70 : tempoType === 'medium' ? 95 : 125;

  const user = appStore.getState().currentUser;
  const hasKey = true;
  
  let newSong: Song & { sections: SongSection[] };

  if (hasKey) {
    try {
      const prompt = `
        Generate an original song outline for guitar practice in the genre: ${genre}, mood: ${mood}, tempo: ${targetBpm} BPM.
        Strictly output valid JSON matching the following structure:
        {
          "title": "A Creative Song Title",
          "artist": "AI Composer",
          "difficulty": "beginner",
          "key": "G",
          "tempo": ${targetBpm},
          "timeSignature": "4/4",
          "capo": null,
          "tuning": "Standard Tuning",
          "requiredChords": ["G", "C", "D"],
          "requiredTechniques": ["Strumming"],
          "estimatedLearningHours": 3,
          "sections": [
            {
              "name": "Chorus",
              "chords": ["G", "D", "C", "C"],
              "strummingPattern": "D DU UDU",
              "tabs": "G: 320003, D: xx0232, C: x32010",
              "lyrics": "Singing an original acoustic melody in time.",
              "simplifiedChords": ["G", "D", "C"],
              "advancedChords": ["G", "D", "C"]
            }
          ]
        }
      `;

      const response = await AIService.generateStructured<Song & { sections: SongSection[] }>({
        prompt,
        responseSchema: { type: 'object' } as any, // Cast as any to bypass deep validation check
        systemPrompt: 'You are an original songwriting companion. Output strictly valid JSON matching the exact schema.'
      });

      newSong = {
        ...response,
        id: `song_ai_${Date.now()}`,
        isAIGenerated: true,
        isUserGenerated: true,
        timesPracticed: 0,
        averageRating: 5.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (err) {
      console.warn('AI song generation failed, falling back to local template composer:', err);
    }
  }

  // Fallback local simulated composers
  if (!newSong!) {
    // Synthesize realistic local songs based on inputs
    const titles: Record<string, string[]> = {
      Rock: ['Neon Highway', 'Vapor Echoes', 'Desert Dust Riffs'],
      Blues: ['Midnight Fretboard Blues', 'Rainy Slide Licks', 'Delta Stomp'],
      Acoustic: ['Pine Creek Waltz', 'Morning Sun Rise', 'Golden Meadows'],
      Metal: ['Core Shredder', 'Iron Forge Power', 'Electric Storm'],
      Classical: ['Serenade in A Minor', 'Romance Theme', 'Adagio Study'],
      Jazz: ['Coffee House Groove', 'Swing Glide', 'Modal Jazz Cruise']
    };

    const localTitleList = titles[genre] || titles.Acoustic!;
    const title = localTitleList[Math.floor(Math.random() * localTitleList.length)]!;
    
    // Choose chords
    const genreChords: Record<string, string[]> = {
      Rock: ['G', 'D', 'C', 'D'],
      Blues: ['Am', 'Dm', 'Am', 'E7'],
      Acoustic: ['G', 'C', 'Em', 'C'],
      Metal: ['Em', 'C', 'D', 'Em'],
      Classical: ['Am', 'Dm', 'E7', 'Am'],
      Jazz: ['Cmaj7', 'Am7', 'Dm7', 'G7']
    };
    
    const chords = genreChords[genre] || ['G', 'C', 'D', 'G'];

    newSong = {
      id: `song_ai_${Date.now()}`,
      title,
      artist: "GuitarMind Composer",
      genres: [genre.toLowerCase() as any],
      difficulty: 'beginner',
      key: chords[0] || 'G',
      tempo: targetBpm,
      timeSignature: '4/4',
      capo: null,
      tuning: 'Standard Tuning',
      requiredChords: Array.from(new Set(chords)),
      requiredTechniques: ['Strumming'],
      estimatedLearningHours: 3,
      isAIGenerated: true,
      isUserGenerated: true,
      timesPracticed: 1,
      averageRating: 5.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sections: [
        {
          id: `sec_ai_${Date.now()}`,
          index: 0,
          name: 'Main Progression',
          chords: [...chords, ...chords],
          strummingPattern: genre === 'Metal' ? 'Down Power Chords' : 'D D UD UD',
          tabs: chords.map(c => `${c}: standard shape`).join(', '),
          lyrics: `Composing a custom ${mood.toLowerCase()} track for your practice routines.`,
          simplifiedChords: chords,
          advancedChords: chords.map(c => c + '7')
        }
      ]
    };
  }

  // Update database
  await SongsRepo.saveSong(newSong);

  // If user is logged in, log it in generated_songs
  if (user) {
    await SongsRepo.saveGeneratedSong({
      userId: user.uid,
      prompt: `genre: ${genre}, mood: ${mood}, tempo: ${targetBpm}`,
      difficulty: newSong.difficulty,
      includeChords: newSong.requiredChords,
      focusTechniques: newSong.requiredTechniques,
      genre: genre.toLowerCase() as Genre,
      songId: newSong.id
    });
  }

  // Hide loader
  if (overlayLoading) overlayLoading.classList.add('hidden');

  // Trigger page re-render to load new song cards
  const appContainer = document.getElementById('app');
  if (appContainer) {
    appContainer.innerHTML = await songsRoute.render();
    songsRoute.onMount();
  }

  // Select the newly generated song into the viewer
  await loadSongIntoViewer(newSong.id);
}

// ----------------------------------------------------
// Metronome / Strumming Backing Synthesizer
// ----------------------------------------------------
async function startSongPlayback(): Promise<void> {
  if (isSongPlaying || !activeSongId) return;

  const song = await SongsRepo.getSong(activeSongId);
  if (!song) return;

  ensureSongAudioContext();

  const bpm = song.tempo ?? 80;
  const beatDuration = 60 / bpm;
  const firstSection = song.sections?.[0];
  if (!firstSection) return;
  const chords = firstSection.chords;
  
  let currentChordIndex = 0;

  const playSongBeat = () => {
    if (!songAudioCtx || !isSongPlaying) return;

    // Highlight active chord block in viewer UI
    const blocks = document.querySelectorAll('.view-chord-block');
    blocks.forEach((block) => {
      const cIdx = parseInt(block.getAttribute('data-chord')!, 10);
      if (cIdx === currentChordIndex) {
        block.classList.add('fretboard-widget-active');
      } else {
        block.classList.remove('fretboard-widget-active');
      }
    });

    const activeChord = chords[currentChordIndex]!;
    
    // Map chord notes
    const chordNotesMap: Record<string, string[]> = {
      G: ['G3', 'B3', 'D4'],
      C: ['C3', 'E3', 'G3'],
      D: ['D3', 'F#3', 'A3'],
      Am: ['A3', 'C4', 'E4'],
      Dm: ['D3', 'F3', 'A3'],
      E7: ['E3', 'G#3', 'B3', 'D4'],
      Em: ['E3', 'G3', 'B3'],
      Cmaj7: ['C3', 'E3', 'G3', 'B3'],
      Am7: ['A3', 'C4', 'E4', 'G4'],
      Dm7: ['D3', 'F3', 'A3', 'C4'],
      G7: ['G3', 'B3', 'D4', 'F4']
    };

    const notes = chordNotesMap[activeChord] || ['G3', 'B3', 'D4'];
    const frequencies = notes.map(n => getFrequencyForNoteName(n));
    const now = songAudioCtx.currentTime;

    // Stop active oscillators
    songSynthNodes.forEach(n => {
      try { n.stop(); } catch(e){}
    });
    songSynthNodes = [];

    // Synthesize notes in strumming rhythm
    frequencies.forEach((freq, idx) => {
      if (!songAudioCtx) return;
      const osc = songAudioCtx.createOscillator();
      const gainNode = songAudioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(songAudioCtx.destination);
      
      osc.frequency.setValueAtTime(freq, now);
      osc.type = 'triangle'; // soft warm triangle strings

      // Filter lowpass
      const filter = songAudioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);
      osc.disconnect(gainNode);
      osc.connect(filter);
      filter.connect(gainNode);
      osc.connect(gainNode);

      // Strum arpeggiation (offset notes by 35ms to simulate acoustic strum!)
      const strumOffset = idx * 0.035;

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.08, now + strumOffset + 0.04);
      gainNode.gain.setValueAtTime(0.08, now + beatDuration - 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + beatDuration);

      osc.start(now + strumOffset);
      osc.stop(now + beatDuration);
      songSynthNodes.push(osc);
    });

    currentChordIndex = (currentChordIndex + 1) % chords.length;
  };

  playSongBeat(); // start first beat
  songPlaybackInterval = window.setInterval(playSongBeat, beatDuration * 1000);
  isSongPlaying = true;

  const btnIcon = document.getElementById('play-song-icon');
  const btnText = document.getElementById('play-song-text');
  const btnPlay = document.getElementById('btn-play-song');

  if (btnIcon) btnIcon.innerHTML = icons.pause('w-4 h-4 text-black fill-current');
  if (btnText) btnText.textContent = 'Stop Strum';
  if (btnPlay) btnPlay.classList.add('btn-primary');
}

function stopSongPlayback(): void {
  if (!isSongPlaying) return;

  if (songPlaybackInterval) {
    clearInterval(songPlaybackInterval);
    songPlaybackInterval = null;
  }
  isSongPlaying = false;

  songSynthNodes.forEach(n => {
    try { n.stop(); } catch(e){}
  });
  songSynthNodes = [];

  const blocks = document.querySelectorAll('.view-chord-block');
  blocks.forEach(b => b.classList.remove('fretboard-widget-active'));

  const btnIcon = document.getElementById('play-song-icon');
  const btnText = document.getElementById('play-song-text');
  const btnPlay = document.getElementById('btn-play-song');

  if (btnIcon) btnIcon.innerHTML = icons.play('w-4 h-4 fill-current');
  if (btnText) btnText.textContent = 'Strum Progression';
  if (btnPlay) btnPlay.classList.remove('btn-primary');
}

function getFrequencyForNoteName(note: string): number {
  const notesMap: Record<string, number> = {
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88
  };
  return notesMap[note] || 440.0;
}

function ensureSongAudioContext(): void {
  if (!songAudioCtx) {
    songAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (songAudioCtx.state === 'suspended') {
    songAudioCtx.resume();
  }
}

function cleanupSongAudio(): void {
  stopSongPlayback();
  if (songAudioCtx) {
    songAudioCtx.close();
    songAudioCtx = null;
  }
}
