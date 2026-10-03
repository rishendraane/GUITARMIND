import { appStore, dashboardStore } from '../store';
import { renderNav, setupNavEvents } from '../components/nav';
import { UsersRepo } from '../repositories/users.repo';
import { ChordsRepo } from '../repositories/chords.repo';
import { ProgressRepo } from '../repositories/progress.repo';
import { SongsRepo } from '../repositories/songs.repo';
import { CalendarRepo } from '../repositories/calendar.repo';
import { PracticeRepo } from '../repositories/practice.repo';
import { icons } from '../components/icons';

let cachedSessionsList: any[] | null = null;

const drawHeatmap = (sessions: any[]) => {
  const canvas = document.getElementById('practice-heatmap-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const today = new Date();
  today.setHours(0,0,0,0);

  // Set up start date (52 weeks + today's day of week ago)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (52 * 7 + today.getDay()));
  startDate.setHours(0,0,0,0);

  // Map of date string YYYY-MM-DD -> total duration in seconds
  const practiceMap = new Map<string, number>();
  sessions.forEach(s => {
    const d = new Date(s.startedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    practiceMap.set(key, (practiceMap.get(key) || 0) + s.durationSeconds);
  });

  const cellWidth = 8;
  const cellHeight = 8;
  const gap = 2;
  const startX = 20; // Margin for day labels (M, W, F)
  const startY = 15; // Margin for month labels

  // Helper to draw rounded rectangle
  const drawCell = (x: number, y: number, w: number, h: number, r: number, color: string) => {
    ctx.fillStyle = color;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.fill();
    }
  };

  // Draw day-of-week labels (M, W, F)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '8px system-ui, -apple-system, sans-serif';
  ctx.fillText('M', 5, startY + 1 * (cellHeight + gap) + 7);
  ctx.fillText('W', 5, startY + 3 * (cellHeight + gap) + 7);
  ctx.fillText('F', 5, startY + 5 * (cellHeight + gap) + 7);

  // Draw month labels
  let lastMonth = -1;
  let lastLabelCol = -1;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let c = 0; c < 53; c++) {
    const colDate = new Date(startDate);
    colDate.setDate(startDate.getDate() + (c * 7));
    const month = colDate.getMonth();
    if (month !== lastMonth && (c - lastLabelCol) >= 4) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(monthNames[month], startX + c * (cellWidth + gap), 8);
      lastMonth = month;
      lastLabelCol = c;
    }
  }

  // Draw cells
  for (let c = 0; c < 53; c++) {
    for (let r = 0; r < 7; r++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + (c * 7 + r));
      cellDate.setHours(0,0,0,0);

      if (cellDate > today) {
        continue; // Don't draw future cells
      }

      const key = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
      const duration = practiceMap.get(key) || 0;

      let color = 'rgba(255, 255, 255, 0.08)'; // Default empty cell color
      if (duration > 0) {
        // Highlighting active practice logs in purple (#a78bfa) with opacity based on duration
        if (duration < 300) {
          color = 'rgba(167, 139, 250, 0.4)'; // Less than 5m
        } else if (duration < 900) {
          color = 'rgba(167, 139, 250, 0.6)'; // Less than 15m
        } else if (duration < 1800) {
          color = 'rgba(167, 139, 250, 0.8)'; // Less than 30m
        } else {
          color = '#a78bfa'; // 30m or more
        }
      }

      const x = startX + c * (cellWidth + gap);
      const y = startY + r * (cellHeight + gap);
      drawCell(x, y, cellWidth, cellHeight, 1.5, color);
    }
  }
};

export const dashboardRoute = {
  path: '#home',
  render: async () => {
    const user = appStore.getState().currentUser;
    const name = user ? user.displayName : 'Guitarist';
    const coachId = user ? user.coachPersonality : 'maya';

    // Fetch next scheduled calendar event from Supabase DB
    let nextSessionHTML = '';
    if (user) {
      try {
        const events = await CalendarRepo.listEvents(user.uid);
        const upcoming = events
          .filter((e: any) => e.status !== 'completed' && e.status !== 'cancelled')
          .sort((a: any, b: any) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
        if (upcoming.length > 0) {
          const nextEv = upcoming[0];
          const start = new Date(nextEv.scheduledStart);
          const dateStr = start.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
          const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          nextSessionHTML = `
            <div class="glass-card bg-primary-glow border-glass flex justify-between items-center p-4 cursor-pointer glass-card-hover" onclick="window.location.hash='#calendar'">
              <div class="flex items-center gap-3">
                <span class="text-primary-color w-6 h-6 flex items-center justify-center">${icons.calendar('w-5 h-5')}</span>
                <div>
                  <span class="text-xs text-muted-color uppercase font-semibold">Next Practice Session</span>
                  <h4 class="m-0 text-sm font-semibold">${nextEv.title}</h4>
                  <p class="text-xxs text-muted-color m-0">${dateStr} @ ${timeStr}</p>
                </div>
              </div>
              <span class="text-xs text-accent-color font-bold flex items-center gap-1">View Planner ${icons.chevronRight('w-3 h-3 inline')}</span>
            </div>
          `;
        }
      } catch (err) {
        console.error('Error fetching calendar events in dashboard render:', err);
      }
    }

    if (!nextSessionHTML) {
      nextSessionHTML = `
        <div class="glass-card border-glass border-dashed flex justify-between items-center p-4 cursor-pointer glass-card-hover" onclick="window.location.hash='#calendar'">
          <div class="flex items-center gap-3">
            <span class="text-muted-color w-6 h-6 flex items-center justify-center">${icons.calendar('w-5 h-5')}</span>
            <div>
              <span class="text-xs text-muted-color uppercase font-semibold">Guitar Schedule</span>
              <h4 class="m-0 text-sm font-semibold text-muted-color">No practice slot scheduled</h4>
              <p class="text-xxs text-disabled m-0">Set up a daily routine to accelerate learning</p>
            </div>
          </div>
          <span class="text-xs text-muted-color flex items-center gap-1">Schedule ${icons.sparkles('w-3 h-3 inline')}</span>
        </div>
      `;
    }

    // Get time-based greeting
    const hours = new Date().getHours();
    let greeting = 'Good morning';
    if (hours >= 12 && hours < 17) greeting = 'Good afternoon';
    else if (hours >= 17) greeting = 'Good evening';

    const dashState = dashboardStore.getState();
    const ownsGuitar = !!(user?.musicalBackground?.guitarTypes && user.musicalBackground.guitarTypes.length > 0);
    const lessonTitle = ownsGuitar ? dashState.activeTaskTitle : "Acquire Your First Guitar";
    const lessonDesc = ownsGuitar ? "Master G Major & C Major smooth transition licks." : "Explore shapes, steel vs nylon strings, and get budget recommendations.";
    const lessonBtnText = ownsGuitar ? "Start Practice" : "Consult AI Coach";
    const lessonProgress = ownsGuitar ? dashState.activeTaskProgress : 0;

    // Map coach personality names
    const coachNames: Record<string, string> = {
      maya: 'Maya',
      axel: 'Axel',
      professor_chen: 'Professor Chen',
      maestro_antonio: 'Maestro Antonio'
    };

    const coachTaglines: Record<string, string> = {
      maya: 'AI Guitar Mentor',
      axel: 'Lead Rockstar Coach',
      professor_chen: 'Music Theorist & Critic',
      maestro_antonio: 'Classical Artistry Coach'
    };

    const coachName = coachNames[coachId] || 'Maya';
    const coachTagline = coachTaglines[coachId] || 'AI Guitar Mentor';

    // Fetch Chord Mastery profiles from Supabase DB
    let chordMasteryHTML = '';
    if (user) {
      try {
        const chordMastery = await ChordsRepo.getChordMastery(user.uid);
        if (chordMastery.length > 0) {
          chordMasteryHTML = chordMastery
            .map(
              (c: any) => `
            <div class="chord-progress-row flex items-center justify-between text-xs p-2 rounded bg-card-elevated border-glass" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span class="font-semibold text-white">${c.chord} Chord</span>
              <div class="flex items-center gap-2" style="display: flex; align-items: center; gap: 8px;">
                <div class="progress-bar-bg w-24 h-1.5 rounded-full overflow-hidden" style="width: 96px; height: 6px; border-radius: 9999px; background: rgba(255,255,255,0.05); overflow: hidden;">
                  <div class="progress-bar-fill h-full" style="height: 100%; width: ${c.score}%; background: var(--color-primary);"></div>
                </div>
                <span class="font-bold text-right" style="min-width: 30px; text-align: right;">${c.score}%</span>
              </div>
            </div>
          `
            )
            .join('');
        }
      } catch (err) {
        console.error('Error fetching chord mastery in dashboard render:', err);
      }
    }
    if (!chordMasteryHTML) {
      chordMasteryHTML = `
        <div class="text-center text-xs text-muted-color py-4">
          No chords practiced yet. Start tuning/practicing to build chord memory profiles!
        </div>
      `;
    }

    // Calculate weekly bar heights for CSS-only chart
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxMinutes = Math.max(...dashState.weeklyPracticeMinutes, 30);
    const chartBarsHTML = weekdays
      .map((day, idx) => {
        const mins = dashState.weeklyPracticeMinutes[idx] || 0;
        const heightPercent = Math.round((mins / maxMinutes) * 100);
        return `
          <div class="chart-bar-col">
            <div class="chart-bar-track">
              <div class="chart-bar-fill" style="height: ${heightPercent}%"></div>
            </div>
            <span class="chart-bar-label">${day}</span>
          </div>
        `;
      })
      .join('');

    return `
      <div class="dashboard-page-container animate-fade-in mb-16">
        <!-- Main Scrollable Content -->
        <main class="dashboard-main">
          
          <!-- Header section -->
          <header class="dashboard-header flex justify-between items-center mb-6">
            <div class="flex items-center gap-3">
              <div class="avatar avatar-md flex justify-center items-center bg-glass border-glass text-primary-color">
                ${icons.user('w-5 h-5')}
              </div>
              <div>
                <h4 class="greeting-subtitle m-0 text-muted-color">${greeting},</h4>
                <h2 class="user-display-name m-0">${name}</h2>
              </div>
            </div>
            
            <div class="flex items-center gap-3">
              <div class="level-badge">Lvl ${dashState.level}</div>
              <div class="streak-counter flex items-center gap-1 bg-glass border-glass rounded px-3 py-1">
                <span class="text-accent-color w-4 h-4 flex items-center justify-center">${icons.flame('w-4 h-4')}</span>
                <span class="text-xs font-semibold">${dashState.streak} Days</span>
              </div>
            </div>
          </header>

          <!-- TODAY'S MISSION Hero Card -->
          <section class="mb-6">
            <div class="glass-card main-lesson-card flex justify-between items-center relative overflow-hidden p-5" style="border: 1px solid var(--border-glass);">
              <div class="lesson-glow-bg"></div>
              <div class="flex flex-col gap-2 relative z-10 flex-grow pr-4">
                <span class="badge badge-success uppercase tracking-wider text-xxs px-2 py-0.5" style="border: 1px solid var(--border-glass);">Today's Mission</span>
                <h2 class="lesson-title mt-1 mb-1 font-bold text-lg md:text-xl">${lessonTitle}</h2>
                <p class="text-xs text-muted-color leading-relaxed max-w-md">${lessonDesc}</p>
                
                <div class="flex items-center gap-4 mt-2 text-xxs text-muted-color">
                  <span class="flex items-center gap-1">${icons.award('w-3.5 h-3.5 text-accent-color')} 150 XP Reward</span>
                  <span>•</span>
                  <span class="flex items-center gap-1">${icons.clock('w-3.5 h-3.5')} 10 mins duration</span>
                </div>

                <button id="btn-start-lesson" class="btn btn-primary mt-4 flex items-center gap-2 w-fit py-2.5 px-5">
                  <span>${lessonBtnText}</span>
                  <span class="w-4 h-4 flex items-center justify-center">${icons.play('w-4 h-4 fill-current')}</span>
                </button>
              </div>

              <div class="lesson-progress-circle relative z-10 flex-shrink-0" style="filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.2));">
                <svg width="96" height="96" class="progress-ring">
                  <circle class="progress-ring-circle-bg" stroke="rgba(255,255,255,0.05)" stroke-width="6" fill="transparent" r="36" cx="48" cy="48" />
                  <circle class="progress-ring-circle" stroke="#fbbf24" stroke-width="6" fill="transparent" r="36" cx="48" cy="48" stroke-dasharray="226" stroke-dashoffset="${226 - (226 * lessonProgress) / 100}" />
                </svg>
                <div class="progress-ring-text font-bold" style="font-size: 13px;">${lessonProgress}%</div>
              </div>
            </div>
          </section>

          <!-- Daily Quests Checklist -->
          <section class="mb-6">
            <div class="glass-card">
              <div class="flex justify-between items-center mb-4">
                <h3 class="m-0 font-bold text-lg">Daily Quests</h3>
                <span class="text-xs text-muted-color">Resets in 11h</span>
              </div>
              <div class="flex flex-col gap-3">
                <div class="quest-row flex items-center justify-between p-3 bg-card-elevated border-glass rounded-lg">
                  <div class="flex items-center gap-3">
                    <span class="text-accent-color w-6 h-6 flex items-center justify-center">${icons.disc('w-5 h-5')}</span>
                    <div>
                      <h4 class="m-0 text-sm font-semibold">Harmonic Strum Tuning</h4>
                      <p class="text-xxs text-muted-color m-0">Calibrate your pitch in the Tuner before practice</p>
                    </div>
                  </div>
                  <div class="checkbox-wrapper flex items-center justify-center border border-glass w-6 h-6 rounded-full cursor-pointer hover:border-accent">
                    ${ownsGuitar ? icons.check('w-4 h-4 text-accent-color opacity-30') : icons.lock('w-3 h-3 text-disabled')}
                  </div>
                </div>

                <div class="quest-row flex items-center justify-between p-3 bg-card-elevated border-glass rounded-lg">
                  <div class="flex items-center gap-3">
                    <span class="text-primary-color-dark w-6 h-6 flex items-center justify-center">${icons.clock('w-5 h-5')}</span>
                    <div>
                      <h4 class="m-0 text-sm font-semibold">15 Minutes of Daily Licks</h4>
                      <p class="text-xxs text-muted-color m-0">Complete one full chord transition loop in the studio</p>
                    </div>
                  </div>
                  <div class="checkbox-wrapper flex items-center justify-center border border-glass w-6 h-6 rounded-full cursor-pointer hover:border-primary-color">
                    ${ownsGuitar ? icons.check('w-4 h-4 text-primary-color opacity-30') : icons.lock('w-3 h-3 text-disabled')}
                  </div>
                </div>

                <div class="quest-row flex items-center justify-between p-3 bg-card-elevated border-glass rounded-lg" onclick="window.location.hash='#coach'">
                  <div class="flex items-center gap-3">
                    <span class="text-success w-6 h-6 flex items-center justify-center">${icons.messageSquare('w-5 h-5')}</span>
                    <div>
                      <h4 class="m-0 text-sm font-semibold">AI Coach Alignment</h4>
                      <p class="text-xxs text-muted-color m-0">Consult your coach for today's custom training recommendation</p>
                    </div>
                  </div>
                  <div class="checkbox-wrapper flex items-center justify-center border border-glass w-6 h-6 rounded-full cursor-pointer hover:border-success">
                    ${icons.check('w-4 h-4 text-success opacity-30')}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Core Grid Dashboard Layout -->
          <div class="grid-layout-columns">
            <!-- Learning Journey Timeline & Heatmaps -->
            <div class="flex flex-col gap-6">
              
              <!-- Duolingo-style Learning Journey timeline -->
              <section class="glass-card">
                <h3 class="mb-4 font-bold text-lg">Learning Journey</h3>
                
                <div class="duolingo-roadmap flex flex-col items-center gap-16 relative py-6" style="min-height: 380px;">
                  <!-- Center path line -->
                  <div class="absolute top-0 bottom-0 w-0.5 z-0" style="background: rgba(255,255,255,0.06); left: 50%; transform: translateX(-50%);"></div>
                  
                  <!-- Stage 1 (Completed) -->
                  <div class="roadmap-node-duo flex flex-col items-center relative z-10" style="transform: translateX(-50px); margin-bottom: 20px;">
                    <button class="node-circle flex items-center justify-center cursor-pointer" style="width: 52px; height: 52px; border-radius: 50%; border: 3px solid #10B981; background: rgba(16, 185, 129, 0.1);" onclick="alert('Stage 1: Guitar Anatomy & Open Chords (Completed)')">
                      ${icons.check('w-5 h-5 text-success')}
                    </button>
                    <div class="node-label-card mt-2 text-center" style="width: 160px; position: absolute; top: 56px;">
                      <h5 class="m-0 text-xs font-bold text-white">Stage 1: Basics</h5>
                      <span class="text-xxs text-success font-semibold">Completed</span>
                    </div>
                  </div>

                  <!-- Stage 2 (Active) -->
                  <div class="roadmap-node-duo flex flex-col items-center relative z-10" style="transform: translateX(50px); margin-bottom: 20px;">
                    <button class="node-circle flex items-center justify-center cursor-pointer animate-pulse" style="width: 58px; height: 58px; border-radius: 50%; border: 3px solid #fbbf24; background: rgba(251, 191, 36, 0.1);" onclick="window.location.hash='#practice'">
                      ${icons.play('w-5 h-5 text-accent-color fill-current')}
                    </button>
                    <div class="node-label-card mt-2 text-center" style="width: 160px; position: absolute; top: 62px;">
                      <h5 class="m-0 text-xs font-bold text-white">Stage 2: Minors</h5>
                      <span class="text-xxs text-accent-color font-semibold">Active</span>
                    </div>
                  </div>

                  <!-- Stage 3 (Locked) -->
                  <div class="roadmap-node-duo flex flex-col items-center relative z-10" style="transform: translateX(-50px);">
                    <button class="node-circle flex items-center justify-center cursor-not-allowed" style="width: 52px; height: 52px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.01);" disabled>
                      ${icons.lock('w-5 h-5 text-muted-color')}
                    </button>
                    <div class="node-label-card mt-2 text-center" style="width: 160px; position: absolute; top: 56px;">
                      <h5 class="m-0 text-xs font-bold text-muted-color">Stage 3: Song Master</h5>
                      <span class="text-xxs text-muted-color">Locked</span>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Next Session Card -->
              ${nextSessionHTML}

              <!-- Practice Heatmap (GitHub style) -->
              <section class="glass-card">
                <div class="flex justify-between items-center mb-3">
                  <h3 class="m-0 font-bold text-lg">Practice Heatmap</h3>
                  <span class="text-xxs text-muted-color">Year view</span>
                </div>
                <div class="flex flex-col gap-1 items-center bg-glass border-glass p-3 rounded-lg overflow-x-auto" style="background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.04);">
                  <canvas id="practice-heatmap-canvas" width="600" height="90" style="width: 100%; max-width: 600px; height: 90px;"></canvas>
                </div>
              </section>

              <!-- Weekly Minutes Chart -->
              <section class="glass-card">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="m-0 font-bold text-lg">Practice Tracker</h3>
                  <span class="text-xs text-muted-color">Daily Goal: 30m</span>
                </div>
                <div class="weekly-bar-chart">
                  ${chartBarsHTML}
                </div>
              </section>

            </div>

            <!-- Quick Action & Chord Mastery Column -->
            <div class="flex flex-col gap-6">
              
              <!-- AI Coach Card -->
              <section class="glass-card flex items-center gap-4 cursor-pointer glass-card-hover" id="coach-quick-card" style="border: 1px solid rgba(255,255,255,0.04);">
                <div class="coach-bubble-avatar relative w-12 h-12 flex justify-center items-center rounded-full bg-card-elevated border-glass">
                  ${icons.user('w-6 h-6 text-primary-color')}
                  <span class="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border border-black animate-pulse"></span>
                </div>
                <div class="flex-grow">
                  <div class="flex items-center gap-2">
                    <h4 class="m-0 font-semibold text-sm">${coachName}</h4>
                    <span class="badge badge-success py-0 px-2 text-xxs font-normal uppercase tracking-wider" style="border: 1px solid var(--border-glass);">${coachTagline}</span>
                  </div>
                  <p class="text-xs text-muted-color mt-1">"Hey there! Ready to practice changing chords today?"</p>
                </div>
              </section>

              <!-- Quick Activities Grid -->
              <section class="glass-card">
                <h3 class="mb-4 font-bold text-lg">Quick Activities</h3>
                <div class="quick-actions-grid grid grid-cols-3 gap-3">
                  <button class="btn btn-secondary flex-col items-center gap-2 p-4" onclick="window.location.hash='#tuner'">
                    <span class="w-6 h-6 flex items-center justify-center text-primary-color">${icons.disc('w-6 h-6')}</span>
                    <span class="text-xs">${ownsGuitar ? 'Tuner' : 'Buying Guide'}</span>
                  </button>
                  <button class="btn btn-secondary flex-col items-center gap-2 p-4" onclick="window.location.hash='#coach'">
                    <span class="w-6 h-6 flex items-center justify-center text-primary-color">${icons.messageSquare('w-6 h-6')}</span>
                    <span class="text-xs">Coach Chat</span>
                  </button>
                  <button class="btn btn-secondary flex-col items-center gap-2 p-4" onclick="${ownsGuitar ? "window.location.hash='#practice'" : "alert('Practice Studio requires a guitar. Ask our Coach for recommendations!')"}">
                    <span class="w-6 h-6 flex items-center justify-center text-primary-color">${icons.clock('w-6 h-6')}</span>
                    <span class="text-xs">${ownsGuitar ? 'Practice' : 'Practice (Locked)'}</span>
                  </button>
                  <button class="btn btn-secondary flex-col items-center gap-2 p-4" onclick="window.location.hash='#jam'">
                    <span class="w-6 h-6 flex items-center justify-center text-primary-color">${icons.music('w-6 h-6')}</span>
                    <span class="text-xs">Jam Mode</span>
                  </button>
                  <button class="btn btn-secondary flex-col items-center gap-2 p-4" onclick="window.location.hash='#theory'">
                    <span class="w-6 h-6 flex items-center justify-center text-primary-color">${icons.bookOpen('w-6 h-6')}</span>
                    <span class="text-xs">Theory</span>
                  </button>
                  <button class="btn btn-secondary flex-col items-center gap-2 p-4" onclick="window.location.hash='#songs'">
                    <span class="w-6 h-6 flex items-center justify-center text-primary-color">${icons.music('w-6 h-6')}</span>
                    <span class="text-xs">Song Hub</span>
                  </button>
                  <button class="btn btn-secondary flex-col items-center gap-2 p-4" onclick="window.location.hash='#youtube'">
                    <span class="w-6 h-6 flex items-center justify-center text-primary-color">${icons.video('w-6 h-6')}</span>
                    <span class="text-xs">YouTube AI</span>
                  </button>
                  <button class="btn btn-secondary flex-col items-center gap-2 p-4" onclick="window.location.hash='#eartraining'">
                    <span class="w-6 h-6 flex items-center justify-center text-primary-color">${icons.headphones('w-6 h-6')}</span>
                    <span class="text-xs">Ear Gym</span>
                  </button>
                  <button class="btn btn-secondary flex-col items-center gap-2 p-4" onclick="window.location.hash='#vision'">
                    <span class="w-6 h-6 flex items-center justify-center text-primary-color">${icons.eye('w-6 h-6')}</span>
                    <span class="text-xs">Posture AI</span>
                  </button>
                </div>
              </section>

              <!-- Chord Mastery Tracker -->
              <section class="glass-card">
                <h3 class="mb-4 font-bold text-lg">Chord Mastery Tracker</h3>
                <div class="flex flex-col gap-3" id="chord-mastery-list">
                  <!-- Dynamically populated -->
                  ${chordMasteryHTML}
                </div>
              </section>

              <!-- Recent Achievements -->
              <section class="glass-card">
                <h3 class="mb-3 font-bold text-lg">Unlocked Achievements</h3>
                <div class="achievements-scroll flex gap-3 overflow-y-hidden overflow-x-auto pb-2">
                  <div class="achievement-badge-card flex flex-col items-center p-3 text-center cursor-pointer glass-card glass-card-hover" title="First Chord Mastered">
                    <span class="badge-icon w-8 h-8 flex items-center justify-center text-accent-color mb-1">${icons.music('w-6 h-6')}</span>
                    <span class="badge-title text-xxs font-semibold">First Chord</span>
                  </div>
                  <div class="achievement-badge-card badge-card-locked flex flex-col items-center p-3 text-center cursor-pointer glass-card opacity-50" title="Practice for 7 Days Straight">
                    <span class="badge-icon w-8 h-8 flex items-center justify-center text-disabled mb-1">${icons.calendar('w-6 h-6')}</span>
                    <span class="badge-title text-xxs font-semibold">Habit Maker</span>
                  </div>
                  <div class="achievement-badge-card badge-card-locked flex flex-col items-center p-3 text-center cursor-pointer glass-card opacity-50" title="Master 10 Chords">
                    <span class="badge-icon w-8 h-8 flex items-center justify-center text-disabled mb-1">${icons.award('w-6 h-6')}</span>
                    <span class="badge-title text-xxs font-semibold">Fretboarder</span>
                  </div>
                </div>
              </section>

            </div>
          </div>

        </main>
        
        <!-- Share Modal Overlay -->
        <div id="share-modal-overlay" class="modal-overlay hidden">
          <div class="modal text-center max-w-sm">
            <h3 class="mb-2 flex items-center justify-center gap-2">
              <span class="text-accent-color w-6 h-6 flex items-center justify-center">${icons.award('w-6 h-6')}</span>
              <span>Share Achievement</span>
            </h3>
            <p class="text-xs text-muted-color">Show off your hard-earned milestone to your friends!</p>
            
            <div class="glass-card bg-primary-glow border-glass p-6 my-4 flex flex-col items-center">
              <span id="share-badge-icon" class="w-12 h-12 flex items-center justify-center text-accent-color mb-3">${icons.music('w-10 h-10')}</span>
              <h4 id="share-badge-title" class="m-0 font-bold">First Chord</h4>
              <p class="text-xs text-muted-color mt-3 leading-relaxed">
                "I just unlocked the <strong id="share-badge-name-bold">First Chord</strong> achievement on GuitarMind AI! Leveling up my guitar skills step by step."
              </p>
            </div>
            
            <div class="flex gap-2">
              <button id="btn-share-copy" class="btn btn-secondary flex-grow py-2 text-xs">Copy Link</button>
              <button id="btn-share-twitter" class="btn btn-primary flex-grow py-2 text-xs">Post on X</button>
            </div>
            
            <button id="btn-share-close" class="btn btn-secondary btn-sm w-full mt-3">Close</button>
          </div>
        </div>

        <!-- Render Bottom Nav -->
        ${renderNav()}
      </div>
    `;
  },
  onMount: () => {
    setupNavEvents();
    
    // Bind click to start lesson
    const btnStart = document.getElementById('btn-start-lesson');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        const user = appStore.getState().currentUser;
        const ownsGuitar = !!(user?.musicalBackground?.guitarTypes && user.musicalBackground.guitarTypes.length > 0);
        window.location.hash = ownsGuitar ? '#practice' : '#coach';
      });
    }

    const coachCard = document.getElementById('coach-quick-card');
    if (coachCard) {
      coachCard.addEventListener('click', () => {
        window.location.hash = '#coach';
      });
    }

    // Fetch real practice stats from Supabase
    const loadDashboardData = async () => {
      const user = appStore.getState().currentUser;
      if (!user) return;

      try {
        let sessionsList = cachedSessionsList;
        if (!sessionsList) {
          const freshUser = await UsersRepo.getUser(user.uid);
          if (freshUser) {
            appStore.setState({ currentUser: freshUser });
          }

          const chordMastery = await ChordsRepo.getChordMastery(user.uid);
          const chordsCount = chordMastery.length;

          // Get weekly practice minutes (Mon-Sun)
          const weeklyMinutes = [0, 0, 0, 0, 0, 0, 0];
          const startOfWeek = new Date();
          const day = startOfWeek.getDay();
          const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
          const monday = new Date(startOfWeek.setDate(diff));
          monday.setHours(0,0,0,0);

          sessionsList = await PracticeRepo.listSessions(user.uid);
          cachedSessionsList = sessionsList;
          sessionsList.forEach(session => {
            const sessionDate = new Date(session.startedAt);
            if (sessionDate >= monday) {
              let wDay = sessionDate.getDay() - 1;
              if (wDay === -1) wDay = 6;
              weeklyMinutes[wDay] += Math.round(session.durationSeconds / 60) || 0;
            }
          });

          // Fetch user songs count
          const songProgress = await SongsRepo.listUserSongProgress(user.uid);
          const songsCount = songProgress.filter(s => s.status === 'mastered').length;

          // Achievements unlocked
          const achievements = await ProgressRepo.getAchievements(user.uid);
          const recentAchievements = achievements.slice(-3).map(a => a.title);

          dashboardStore.setState({
            streak: freshUser ? freshUser.stats.currentStreak : user.stats.currentStreak,
            xp: freshUser ? freshUser.stats.totalXP : user.stats.totalXP,
            level: freshUser ? freshUser.stats.currentLevel : user.stats.currentLevel,
            chordsCount,
            songsCount,
            weeklyPracticeMinutes: weeklyMinutes,
            recentAchievements
          });
        }

        // Trigger dynamic re-render once dashboard state is loaded
        const appContainer = document.getElementById('app');
        if (appContainer && window.location.hash === '#home') {
          const renderedEl = document.getElementById('dashboard-stats-loaded');
          if (!renderedEl) {
            dashboardRoute.render().then((html) => {
              appContainer.innerHTML = html + '<div id="dashboard-stats-loaded" class="hidden"></div>';
              dashboardRoute.onMount();
            });
          } else {
            drawHeatmap(sessionsList);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      }
    };
    loadDashboardData();

    // Click achievements to open sharing card
    const badges = document.querySelectorAll('.achievement-badge-card');
    const shareOverlay = document.getElementById('share-modal-overlay');
    const shareIcon = document.getElementById('share-badge-icon');
    const shareTitle = document.getElementById('share-badge-title');
    const shareNameBold = document.getElementById('share-badge-name-bold');
    const btnShareClose = document.getElementById('btn-share-close');
    const btnShareCopy = document.getElementById('btn-share-copy');
    const btnShareTwitter = document.getElementById('btn-share-twitter');

    badges.forEach(badge => {
      badge.addEventListener('click', () => {
        // If locked, don't share
        if (badge.classList.contains('badge-card-locked')) {
          alert('Master more practice exercises to unlock and share this milestone badge!');
          return;
        }
        
        const iconHTML = badge.querySelector('.badge-icon')?.innerHTML || '';
        const title = badge.querySelector('.badge-title')?.textContent || 'First Chord';
        
        if (shareIcon) shareIcon.innerHTML = iconHTML;
        if (shareTitle) shareTitle.textContent = title;
        if (shareNameBold) shareNameBold.textContent = title;
        
        if (shareOverlay) shareOverlay.classList.remove('hidden');
      });
    });

    if (btnShareClose && shareOverlay) {
      btnShareClose.addEventListener('click', () => {
        shareOverlay.classList.add('hidden');
      });
    }

    if (btnShareCopy) {
      btnShareCopy.addEventListener('click', () => {
        navigator.clipboard.writeText('Join me on GuitarMind AI to master guitar! https://guitarmind.ai');
        btnShareCopy.textContent = 'Copied Link!';
        setTimeout(() => btnShareCopy.textContent = 'Copy Link', 2000);
      });
    }

    if (btnShareTwitter) {
      btnShareTwitter.addEventListener('click', () => {
        alert('Sharing preview opened in a simulation card!');
        if (shareOverlay) shareOverlay.classList.add('hidden');
      });
    }
  },
  onUnmount: () => {
    console.log('Unmounting Dashboard Route');
    cachedSessionsList = null;
  }
};
