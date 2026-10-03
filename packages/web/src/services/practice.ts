import { appStore, dashboardStore } from '../store';
import { GamificationService } from './gamification';
import { PracticeRepo, type PracticeSessionRecord } from '../repositories/practice.repo';
import { ProgressRepo } from '../repositories/progress.repo';
import { UsersRepo } from '../repositories/users.repo';
import type { PracticeSession } from '@guitarmind/core';

export class PracticeService {
  /**
   * Save a completed practice session and update progress, stats, and gamification.
   * Now uses PocketBase + localStorage instead of Supabase.
   */
  static async saveSession(
    session: Omit<PracticeSession, 'id' | 'userId' | 'xpEarned' | 'achievementsUnlocked' | 'skillLevelAtTime'>
  ): Promise<void> {
    const user = appStore.getState().currentUser;
    if (!user) return;

    const durationMinutes = Math.max(1, Math.round(session.durationSeconds / 60));

    // 1. Calculate XP earned
    const baseXP = durationMinutes * 15;
    const scoreBonus = Math.round((session.score.overall / 100) * 50);
    const xpEarned = baseXP + scoreBonus;

    const practiceRecord: PracticeSessionRecord = {
      userId: user.uid,
      type: (session as any).type || 'free_play',
      duration: session.durationSeconds,
      score: session.score.overall,
      bpm: session.bpm,
      notesHit: 0,
      notesMissed: 0,
      songId: (session as any).songId,
      chordProgression: (session as any).chordProgression,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    };

    try {
      // 2. Save session
      await PracticeRepo.createSession(practiceRecord);

      // 3. Log streak (no-op in offline mode)
      await ProgressRepo.logStreakActivity(user.uid, {
        userId: user.uid,
        streakCount: user.stats.currentStreak || 1,
        lastActivityDate: new Date().toISOString(),
      });

      // 4. Award XP — update user stats locally
      const updatedUser = {
        ...user,
        stats: {
          ...user.stats,
          totalXP: (user.stats.totalXP || 0) + xpEarned,
          totalSessions: (user.stats.totalSessions || 0) + 1,
          totalPracticeMinutes: (user.stats.totalPracticeMinutes || 0) + durationMinutes,
          currentStreak: (user.stats.currentStreak || 0) + (durationMinutes >= 5 ? 1 : 0),
          lastPracticeDate: new Date().toISOString(),
        },
      };
      appStore.setState({ currentUser: updatedUser });
      await UsersRepo.upsertUser(updatedUser);

      // 5. Sync Dashboard weekly minutes
      const dayOfWeek = (new Date().getDay() + 6) % 7; // Mon=0, Sun=6
      const currentWeekMinutes = [...dashboardStore.getState().weeklyPracticeMinutes];
      currentWeekMinutes[dayOfWeek] = (currentWeekMinutes[dayOfWeek] || 0) + durationMinutes;

      dashboardStore.setState({
        streak: updatedUser.stats.currentStreak,
        weeklyPracticeMinutes: currentWeekMinutes,
      });

      // 6. Check Achievements
      await GamificationService.checkAchievements();

      console.log('[PracticeService] Session saved successfully.');
    } catch (err) {
      console.error('[PracticeService] Error saving practice session:', err);
    }
  }
}
