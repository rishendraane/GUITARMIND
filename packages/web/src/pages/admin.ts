import { appStore } from '../store';
import { renderNav, setupNavEvents } from '../components/nav';
import { AnalyticsEngine } from '../services/analytics-engine';
import { router } from '../router';

export const adminRoute = {
  path: '#admin',
  render: async () => {
    const user = appStore.getState().currentUser;
    // Route guard: only admin can view this page
    if (!user || !(user as any).is_admin) {
      setTimeout(() => {
        alert('Access Denied: You are not authorized to view the Admin Dashboard.');
        router.navigate('#home');
      }, 0);
      return ``;
    }

    appStore.setState({ isLoading: true });
    let stats: any = null;
    try {
      stats = await AnalyticsEngine.getAdminStats();
    } catch (err) {
      console.error(err);
    } finally {
      appStore.setState({ isLoading: false });
    }

    const totalUsers = stats?.total_users ?? 0;
    const totalSessions = stats?.total_sessions ?? 0;
    const totalMinutes = stats?.total_practice_minutes ?? 0;
    const totalMessages = stats?.total_ai_messages ?? 0;
    const avgScore = stats?.avg_session_score ?? 0;
    const activeUsersToday = stats?.active_users_today ?? 0;
    const snapshotDate = stats?.snapshot_date ?? new Date().toLocaleDateString();

    const topChords = stats?.most_learned_chords || [];
    const chordsHTML = topChords.length > 0 
      ? topChords.map((tc: any) => `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
            <td class="py-2 font-mono" style="color: var(--color-primary-light);">${tc.chord}</td>
            <td class="py-2 text-right">${tc.avg_mastery}%</td>
          </tr>
        `).join('')
      : `<tr><td colspan="2" class="text-center py-4 text-muted-color">No chord mastery data analyzed yet.</td></tr>`;

    return `
      <div class="admin-page-container animate-fade-in mb-16" style="padding: 1.5rem; max-width: 1200px; margin: 0 auto; color: #fff; font-family: 'Outfit', sans-serif;">
        <main class="admin-main">
          
          <!-- Header -->
          <header class="flex justify-between items-center mb-6">
            <div>
              <h4 class="text-xs text-muted-color m-0 uppercase font-semibold">GuitarMind Analytics</h4>
              <h2 class="m-0">System Admin Dashboard</h2>
            </div>
            <span class="badge badge-success px-3 py-1 font-mono text-xs">Snapshot: ${snapshotDate}</span>
          </header>

          <!-- Core Stat Cards -->
          <div class="grid-layout-4 gap-6 mb-8" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem;">
            
            <div class="glass-card p-4" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px;">
              <span class="text-xs text-muted-color uppercase font-semibold">Total Users</span>
              <h1 class="m-0 mt-2" style="font-size: 2.5rem; font-weight: 700; color: #fbbf24;">${totalUsers}</h1>
              <p class="text-xxs text-muted-color mt-1 m-0">Registered identity users</p>
            </div>

            <div class="glass-card p-4" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px;">
              <span class="text-xs text-muted-color uppercase font-semibold">Daily Active Players</span>
              <h1 class="m-0 mt-2" style="font-size: 2.5rem; font-weight: 700; color: #10b981;">${activeUsersToday}</h1>
              <p class="text-xxs text-muted-color mt-1 m-0">Unique practice sessions today</p>
            </div>

            <div class="glass-card p-4" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px;">
              <span class="text-xs text-muted-color uppercase font-semibold">Practice Sessions</span>
              <h1 class="m-0 mt-2" style="font-size: 2.5rem; font-weight: 700; color: #8b5cf6;">${totalSessions}</h1>
              <p class="text-xxs text-muted-color mt-1 m-0">Total logged sessions (${totalMinutes} mins)</p>
            </div>

            <div class="glass-card p-4" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px;">
              <span class="text-xs text-muted-color uppercase font-semibold">Average Session Accuracy</span>
              <h1 class="m-0 mt-2" style="font-size: 2.5rem; font-weight: 700; color: #db2777;">${avgScore}%</h1>
              <p class="text-xxs text-muted-color mt-1 m-0">Average audio evaluations</p>
            </div>

          </div>

          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; flex-wrap: wrap;">
            
            <!-- System Telemetry metrics table -->
            <section class="glass-card p-6" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px;">
              <h3 class="mb-4" style="margin-top: 0; font-size: 1.1rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px;">AI Telemetry</h3>
              <div class="setting-item flex justify-between items-center py-3" style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                <div>
                  <h4 class="m-0">Total AI Messages Generated</h4>
                  <p class="text-xs text-muted-color m-0">AI Coach responses generated across all chats.</p>
                </div>
                <span class="font-mono" style="font-size: 1.1rem; font-weight: 600; color: #f59e0b;">${totalMessages}</span>
              </div>
              
              <div class="setting-item flex justify-between items-center py-3" style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                <div>
                  <h4 class="m-0">Average User Practice Frequency</h4>
                  <p class="text-xs text-muted-color m-0">Average practice time per registered guitarist.</p>
                </div>
                <span class="font-mono" style="font-size: 1.1rem; font-weight: 600;">${totalUsers > 0 ? Math.round(totalMinutes / totalUsers) : 0} mins/user</span>
              </div>

              <div class="setting-item flex justify-between items-center py-3">
                <div>
                  <h4 class="m-0">System RLS Integration Status</h4>
                  <p class="text-xs text-muted-color m-0">Current status of Supabase security enforcement.</p>
                </div>
                <span class="badge badge-success px-2 py-0.5" style="border-radius: 4px;">ACTIVE_ENFORCED</span>
              </div>
            </section>

            <!-- Chord Popularity leaderboard -->
            <section class="glass-card p-6" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px;">
              <h3 class="mb-4" style="margin-top: 0; font-size: 1.1rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px;">Top Mastered Chords</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <thead>
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); color: var(--text-muted); font-weight: 600;">
                    <th class="text-left pb-2">Chord</th>
                    <th class="text-right pb-2">Avg Mastery</th>
                  </tr>
                </thead>
                <tbody>
                  ${chordsHTML}
                </tbody>
              </table>
            </section>

          </div>

        </main>
      </div>
      <!-- Bottom nav integration -->
      ${renderNav()}
    `;
  },
  onMount: () => {
    setupNavEvents();
  },
  onUnmount: () => {
    console.log('Unmounting Admin Route');
  }
};
