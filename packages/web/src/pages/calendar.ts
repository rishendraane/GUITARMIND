import { appStore, dashboardStore } from '../store';
import { renderNav, setupNavEvents } from '../components/nav';
import { router } from '../router';
import type { CalendarEvent, CalendarEventType } from '@guitarmind/core';
import { CalendarRepo } from '../repositories/calendar.repo';
import { icons } from '../components/icons';

export const calendarRoute = {
  path: '#calendar',
  render: async () => {
    const user = appStore.getState().currentUser;
    const userId = user ? user.uid : 'anonymous';
    const events = userId !== 'anonymous' ? await CalendarRepo.listEvents(userId) : [];

    // Filter events
    const upcomingEvents = events.filter(e => e.status === 'scheduled').sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
    const pastEvents = events.filter(e => e.status === 'completed' || e.status === 'missed').sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime());

    const upcomingListHTML = upcomingEvents.length > 0 
      ? upcomingEvents.map(e => renderEventCard(e)).join('')
      : `<div class="text-center py-6 text-muted-color text-xs bg-glass border-glass rounded-lg flex flex-col items-center justify-center">
          <p class="m-0">No upcoming practice sessions scheduled.</p>
          <button id="btn-quick-generate" class="btn btn-secondary btn-sm mt-3 flex items-center gap-1.5">${icons.sparkles('w-3.5 h-3.5')} Generate AI Practice Routine</button>
         </div>`;

    const pastListHTML = pastEvents.length > 0
      ? pastEvents.slice(0, 5).map(e => renderEventCard(e)).join('')
      : `<div class="text-center py-4 text-muted-color text-xs bg-glass border-glass rounded-lg border-dashed">No past sessions logged.</div>`;

    // Type Options
    const typeOptions = [
      { value: 'practice_session', label: 'Practice Routine' },
      { value: 'interactive_lesson', label: 'Theory & Lesson' },
      { value: 'jam_mode', label: 'Backing Jam Session' },
      { value: 'custom', label: 'Custom Drill' }
    ].map(o => `<option value="${o.value}">${o.label}</option>`).join('');

    return `
      <div class="practice-page-container animate-fade-in mb-16">
        <main class="practice-main">
          
          <!-- Header -->
          <header class="flex justify-between items-center mb-6">
            <div>
              <h4 class="text-xs text-muted-color m-0 uppercase font-semibold">Learning Planner</h4>
              <h2 class="m-0">Practice Calendar</h2>
            </div>
            <div class="flex items-center gap-2">
              <button id="btn-export-ical" class="btn btn-secondary btn-sm flex items-center gap-1.5" title="Export schedule to device calendar (.ics)">
                ${icons.save('w-4 h-4')} Export to Device
              </button>
            </div>
          </header>

          <div class="grid-layout-columns" style="grid-template-columns: 1.5fr 1fr;">
            
            <!-- Left Side: Schedule Timelines -->
            <div class="flex flex-col gap-6">
              
              <div class="glass-card bg-primary-glow border-glass flex items-center justify-between p-4">
                <div class="flex items-center gap-3">
                  <span class="text-accent-color w-6 h-6 flex items-center justify-center">${icons.sparkles('w-5 h-5')}</span>
                  <div>
                    <h4 class="m-0 text-sm font-semibold">Daily Habit Assistant</h4>
                    <p class="text-xs text-muted-color m-0">Synchronize your practice to keep your Level & Streak active!</p>
                  </div>
                </div>
                <button id="btn-trigger-ai-schedule" class="btn btn-primary btn-sm">Auto Plan Week</button>
              </div>

              <!-- Upcoming Schedule -->
              <section class="glass-card">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="m-0">Upcoming Practice Sessions</h3>
                  <span class="badge badge-warning text-xxs font-mono font-bold">${upcomingEvents.length} Slots</span>
                </div>
                <div class="flex flex-col gap-3">
                  ${upcomingListHTML}
                </div>
              </section>

              <!-- Recently Completed / Missed History -->
              <section class="glass-card">
                <h3 class="mb-4">Logged History</h3>
                <div class="flex flex-col gap-2">
                  ${pastListHTML}
                </div>
              </section>

            </div>

            <!-- Right Side: Schedule Form & Sync Card -->
            <div class="flex flex-col gap-6">
              
              <!-- Quick Scheduling Form -->
              <section class="glass-card">
                <h3>Schedule New Session</h3>
                <p class="text-xs text-muted-color mb-4">Plan a custom guitar practice target in your training timeline.</p>
                
                <form id="schedule-session-form" class="flex flex-col gap-3">
                  <div class="input-group">
                    <label class="input-label" for="sched-title">Event Title</label>
                    <input type="text" id="sched-title" class="input" placeholder="e.g. Fretboard Navigation Drill" required />
                  </div>
                  
                  <div class="input-group">
                    <label class="input-label" for="sched-type">Session Category</label>
                    <select id="sched-type" class="select">
                      ${typeOptions}
                    </select>
                  </div>
                  
                  <div class="grid grid-cols-2 gap-3">
                    <div class="input-group">
                      <label class="input-label" for="sched-start">Date & Time</label>
                      <input type="datetime-local" id="sched-start" class="input" required />
                    </div>
                    <div class="input-group">
                      <label class="input-label" for="sched-duration">Duration</label>
                      <select id="sched-duration" class="select">
                        <option value="15">15 min</option>
                        <option value="30" selected>30 min</option>
                        <option value="45">45 min</option>
                        <option value="60">60 min</option>
                      </select>
                    </div>
                  </div>
                  
                  <div class="input-group">
                    <label class="input-label" for="sched-notes">Description / Focus Notes</label>
                    <textarea id="sched-notes" class="input" rows="2" placeholder="e.g. Master clean finger placement on the first 3 strings. Avoid fret buzzing."></textarea>
                  </div>
                  
                  <button type="submit" class="btn btn-primary w-full mt-2">
                    <span>Schedule Practice Slot</span>
                  </button>
                </form>
              </section>

              <!-- External Calendar info card -->
              <section class="glass-card">
                <h3>Device Integration Sync</h3>
                <p class="text-xs text-muted-color leading-relaxed mb-4">
                  Export your scheduled guitar lessons to standard <strong>iCalendar (.ics)</strong> formats. This file format is fully compatible with:
                </p>
                <ul class="text-xs text-muted-color pl-0 mb-4 flex flex-col gap-2" style="list-style: none;">
                  <li class="flex items-center gap-2">${icons.calendar('w-3.5 h-3.5 text-primary-color')} Google Calendar (Mobile & Web)</li>
                  <li class="flex items-center gap-2">${icons.calendar('w-3.5 h-3.5 text-accent-color')} Apple Calendar (iOS & Mac)</li>
                  <li class="flex items-center gap-2">${icons.calendar('w-3.5 h-3.5 text-muted-color')} Microsoft Outlook Desktop / OWA</li>
                </ul>
                <div class="p-3 bg-card-elevated border-glass rounded-lg text-xxs text-success font-semibold text-center flex items-center justify-center gap-1.5">
                  ${icons.sparkles('w-4 h-4')} Tip: Run "Auto Plan Week" first to download a complete 7-day routine in one click!
                </div>
              </section>

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
    setupCalendarLogic();
  },
  onUnmount: () => {
    // Unmount tasks
  }
};

// Calendar data is now handled via CalendarRepo

// ----------------------------------------------------
// Event Render Helpers
// ----------------------------------------------------
function renderEventCard(e: CalendarEvent): string {
  const start = new Date(e.scheduledStart);
  const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = start.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
  
  // Calculate duration in minutes
  const end = new Date(e.scheduledEnd);
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);

  // Type details
  const typeMap: Record<CalendarEventType, { name: string; iconHTML: string; colorClass: string }> = {
    practice_session: { name: 'Practice', iconHTML: icons.clock('w-5 h-5 text-primary-color'), colorClass: 'badge-primary' },
    interactive_lesson: { name: 'Lesson', iconHTML: icons.bookOpen('w-5 h-5 text-warning'), colorClass: 'badge-warning' },
    jam_mode: { name: 'Jam Mode', iconHTML: icons.music('w-5 h-5 text-success'), colorClass: 'badge-success' },
    custom: { name: 'Custom', iconHTML: icons.disc('w-5 h-5 text-muted'), colorClass: 'badge-secondary' }
  };

  const typeInfo = typeMap[e.type] || typeMap.custom;

  // Status badge
  let statusBadge = '';
  if (e.status === 'completed') {
    statusBadge = `<span class="badge badge-success text-xxs font-bold">Logged</span>`;
  } else if (e.status === 'missed') {
    statusBadge = `<span class="badge badge-danger text-xxs font-bold">Missed</span>`;
  } else {
    statusBadge = `<span class="badge badge-primary text-xxs font-bold">${timeStr}</span>`;
  }

  // Buttons available if upcoming
  const actionButtons = e.status === 'scheduled'
    ? `
      <div class="flex gap-2 justify-end mt-3">
        <button class="btn btn-secondary btn-xs btn-remove-event" data-id="${e.id}">Remove</button>
        <button class="btn btn-secondary btn-xs btn-complete-event" data-id="${e.id}">Mark Done</button>
        <button class="btn btn-primary btn-xs btn-start-practice-event flex items-center gap-1" data-id="${e.id}" data-title="${e.title}" data-type="${e.type}">
          ${icons.play('w-3 h-3 text-black fill-current')} Start
        </button>
      </div>
    `
    : `
      <div class="flex gap-2 justify-end mt-3">
        <button class="btn btn-secondary btn-xs btn-remove-event" data-id="${e.id}">Delete Record</button>
      </div>
    `;

  return `
    <div class="p-4 bg-card-elevated border-glass rounded-lg flex flex-col gap-1 transition-all hover:border-white-glow relative overflow-hidden" id="event-card-${e.id}">
      <div class="flex justify-between items-start">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 flex items-center justify-center">${typeInfo.iconHTML}</span>
          <div>
            <h4 class="m-0 text-sm font-semibold">${e.title}</h4>
            <p class="text-xxs text-muted-color m-0">${dateStr} • ${durationMin} mins</p>
          </div>
        </div>
        <div class="flex flex-col items-end gap-1">
          <span class="badge ${typeInfo.colorClass} text-xxs uppercase font-semibold">${typeInfo.name}</span>
          ${statusBadge}
        </div>
      </div>
      
      ${e.description ? `<p class="text-xs text-muted-color mt-2 border-l border-glass pl-2 mb-0 leading-relaxed">${e.description}</p>` : ''}
      
      ${actionButtons}
    </div>
  `;
}

// ----------------------------------------------------
// Interactive Events Bindings & ICS Generator
// ----------------------------------------------------
function setupCalendarLogic(): void {
  const user = appStore.getState().currentUser;
  const userId = user ? user.uid : 'anonymous';

  // 1. Submit Form
  const form = document.getElementById('schedule-session-form') as HTMLFormElement;
  if (form) {
    // Populate default datetime to 1 hour from now
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0);
    const startInput = document.getElementById('sched-start') as HTMLInputElement;
    if (startInput) {
      // Formats string to YYYY-MM-DDTHH:MM local format matching datetime-local input value format
      const tzOffset = nextHour.getTimezoneOffset() * 60000;
      const localISODate = new Date(nextHour.getTime() - tzOffset).toISOString().slice(0, 16);
      startInput.value = localISODate;
    }

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();

      const titleInput = document.getElementById('sched-title') as HTMLInputElement;
      const typeSelect = document.getElementById('sched-type') as HTMLSelectElement;
      const durationSelect = document.getElementById('sched-duration') as HTMLSelectElement;
      const notesArea = document.getElementById('sched-notes') as HTMLTextAreaElement;

      const title = titleInput.value.trim();
      const type = typeSelect.value as CalendarEventType;
      const startVal = startInput.value;
      const duration = parseInt(durationSelect.value, 10);
      const description = notesArea.value.trim();

      if (!title || !startVal) return;

      const startDate = new Date(startVal);
      const endDate = new Date(startDate.getTime() + duration * 60000);

      const newEvent: CalendarEvent = {
        id: CalendarRepo.generateUUID(),
        title,
        description: description || undefined,
        scheduledStart: startDate.toISOString(),
        scheduledEnd: endDate.toISOString(),
        type,
        status: 'scheduled',
        reminderSent: false,
        createdAt: new Date().toISOString()
      };

      if (userId !== 'anonymous') {
        await CalendarRepo.createEvent(userId, newEvent);
      }

      alert(`Practice scheduled: "${title}"`);
      router.navigate('#calendar'); // Triggers rerender
    });
  }

  // 2. Button quick generate
  const btnQuickGen = document.getElementById('btn-quick-generate');
  const btnTriggerAI = document.getElementById('btn-trigger-ai-schedule');

  const runRoutineGenerator = async () => {
    const activeTask = dashboardStore.getState().activeTaskTitle || 'Guitar Open Chords';
    const baseDate = new Date();
    
    // Recommended weekly progression steps
    const routinePlans = [
      { days: 0, title: 'Warmup & Chromatic Coordination', desc: 'Focus on index-to-pinky coordination and guitar posture.', type: 'practice_session' as CalendarEventType },
      { days: 1, title: `Target Practice: ${activeTask}`, desc: 'Drill G to C and chord transitions. Ensure clean note ringing.', type: 'practice_session' as CalendarEventType },
      { days: 2, title: 'AI Jam: Metronome Syncing', desc: 'Play backing rhythm alongside simulated drum synth loop.', type: 'jam_mode' as CalendarEventType },
      { days: 3, title: 'Interactive Fretboard explorer', desc: 'Identify E2 to E4 pitch note locations on guitar fret strings.', type: 'interactive_lesson' as CalendarEventType },
      { days: 4, title: 'Ear Gym: Minor/Major Training', desc: 'Assess interval sound differences and guess chord qualities.', type: 'interactive_lesson' as CalendarEventType },
      { days: 5, title: 'Structured Jam Session licks', desc: 'Perform the progression to chord charts with backing backing tracks.', type: 'jam_mode' as CalendarEventType },
      { days: 6, title: 'AI Coach Week Assessment', desc: 'Complete 15 minutes of uninterrupted practice and fetch coach insights.', type: 'practice_session' as CalendarEventType }
    ];

    const newEvents: CalendarEvent[] = routinePlans.map((plan) => {
      const start = new Date(baseDate);
      start.setDate(start.getDate() + plan.days);
      start.setHours(18, 0, 0, 0); // 6:00 PM standard practice hour

      const end = new Date(start);
      end.setMinutes(start.getMinutes() + 30); // 30 mins session duration

      return {
        id: CalendarRepo.generateUUID(),
        title: plan.title,
        description: plan.desc,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        type: plan.type,
        status: 'scheduled',
        reminderSent: false,
        createdAt: new Date().toISOString()
      };
    });

    if (userId !== 'anonymous') {
      const currentEvents = await CalendarRepo.listEvents(userId);
      const scheduledEvents = currentEvents.filter(e => e.status === 'scheduled');
      await Promise.all(scheduledEvents.map(e => CalendarRepo.deleteEvent(e.id)));
      await Promise.all(newEvents.map(event => CalendarRepo.createEvent(userId, event)));
    }

    alert('Practice routine generated! 7 upcoming practice slots added to your schedule.');
    router.navigate('#calendar'); // Triggers rerender
  };

  if (btnQuickGen) btnQuickGen.addEventListener('click', runRoutineGenerator);
  if (btnTriggerAI) btnTriggerAI.addEventListener('click', runRoutineGenerator);

  // 3. Remove/Complete/Start actions (via event delegation)
  const removeButtons = document.querySelectorAll('.btn-remove-event');
  removeButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!id) return;
      if (userId !== 'anonymous') {
        await CalendarRepo.deleteEvent(id);
      }
      
      const card = document.getElementById(`event-card-${id}`);
      if (card) card.remove();
    });
  });

  const completeButtons = document.querySelectorAll('.btn-complete-event');
  completeButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!id) return;
      
      // Update event status
      if (userId !== 'anonymous') {
        await CalendarRepo.updateEvent(id, { status: 'completed' });
        const ev = await CalendarRepo.getEvent(id);
        if (ev) {
          // Award gamification rewards
          const start = new Date(ev.scheduledStart);
          const end = new Date(ev.scheduledEnd);
          const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);

          const currentDashState = dashboardStore.getState();
          
          // Add minutes to today (assume index 1 corresponding to Tuesday or whichever weekday is active, e.g. base date weekday)
          const todayDayIndex = (new Date().getDay() + 6) % 7; // Mon is 0, Sun is 6
          const minsArray = [...currentDashState.weeklyPracticeMinutes];
          minsArray[todayDayIndex] = (minsArray[todayDayIndex] || 0) + durationMin;

          dashboardStore.setState({
            xp: currentDashState.xp + 50,
            weeklyPracticeMinutes: minsArray
          });

          alert(`Practice Logged! +50 XP and +${durationMin} min added to stats.`);
          router.navigate('#calendar'); // rerender
        }
      }
    });
  });

  const startPracticeButtons = document.querySelectorAll('.btn-start-practice-event');
  startPracticeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const title = btn.getAttribute('data-title') || 'Practice Practice';
      const type = btn.getAttribute('data-type');
      if (!id) return;

      // Update current roadmap goal to align with event title
      dashboardStore.setState({
        activeTaskTitle: title
      });

      // Navigate to Practice or Jam modes
      if (type === 'jam_mode') {
        window.location.hash = '#jam';
      } else {
        window.location.hash = '#practice';
      }
    });
  });

  // 4. Exporter
  const btnExport = document.getElementById('btn-export-ical');
  if (btnExport) {
    btnExport.addEventListener('click', async () => {
      const events = userId !== 'anonymous' ? await CalendarRepo.listEvents(userId) : [];
      if (events.length === 0) {
        alert('Cannot export an empty calendar schedule. Generate a plan first!');
        return;
      }

      const icalContent = buildICalString(events);
      downloadICSFile(icalContent);
    });
  }
}

// ----------------------------------------------------
// iCalendar Exporter Generator
// ----------------------------------------------------
function buildICalString(events: CalendarEvent[]): string {
  const formatICalDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GuitarMind AI//Practice Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  events.forEach(e => {
    // Generate clean event descriptions
    const desc = `${e.description || 'Routine practice slot.'}\\nCategory: ${e.type}\\nStatus: ${e.status}`;
    
    ics.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@guitarmind.ai`,
      `DTSTAMP:${formatICalDate(e.createdAt || new Date().toISOString())}`,
      `DTSTART:${formatICalDate(e.scheduledStart)}`,
      `DTEND:${formatICalDate(e.scheduledEnd)}`,
      `SUMMARY:Guitar Practice: ${e.title}`,
      `DESCRIPTION:${desc}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

function downloadICSFile(content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'guitarmind_practice_schedule.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
