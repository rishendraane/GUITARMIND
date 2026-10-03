import { appStore, dashboardStore } from '../store';
import { ACHIEVEMENT_DEFINITIONS } from '@guitarmind/core';
import { supabase } from '../lib/supabase';
import { UsersRepo } from '../repositories/users.repo';
import { ProgressRepo } from '../repositories/progress.repo';

export class GamificationService {
  /**
   * Award XP to user and check for level-ups via Supabase.
   */
  static async awardXP(amount: number): Promise<void> {
    const user = appStore.getState().currentUser;
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('award_user_xp', {
        p_user_id: user.uid,
        p_xp_amount: amount
      });

      if (error) throw error;

      // Update user state locally
      const freshUser = await UsersRepo.getUser(user.uid);
      if (freshUser) {
        appStore.setState({ currentUser: freshUser });
      }

      // Update dashboard store
      dashboardStore.setState({
        xp: freshUser ? freshUser.stats.totalXP : user.stats.totalXP,
        level: freshUser ? freshUser.stats.currentLevel : user.stats.currentLevel
      });

      if (data && data.leveled_up) {
        alert(`Level Up! You reached Level ${data.new_level}! Keep rocking!`);
      }

      // Check for achievements unlock after XP change
      await this.checkAchievements();
    } catch (err) {
      console.error('Error awarding XP in gamification service:', err);
    }
  }

  /**
   * Evaluate user stats and unlock achievements in Supabase.
   */
  static async checkAchievements(): Promise<void> {
    const user = appStore.getState().currentUser;
    if (!user) return;

    try {
      const stats = user.stats;
      
      // Fetch unlocked achievements from DB
      const dbAchievements = await ProgressRepo.getAchievements(user.uid);
      const currentUnlocked = dbAchievements.map(a => a.achievementId);
      const newUnlocked: string[] = [];

      // Achievement logic evaluation
      const checkAndUnlock = (id: string, condition: boolean) => {
        if (condition && !currentUnlocked.includes(id)) {
          newUnlocked.push(id);
        }
      };

      // Chords Mastered
      checkAndUnlock('first_chord', stats.chordsMastered >= 1);
      checkAndUnlock('chords_5', stats.chordsMastered >= 5);
      checkAndUnlock('chords_10', stats.chordsMastered >= 10);
      checkAndUnlock('chords_20', stats.chordsMastered >= 20);

      // Practice Streak
      checkAndUnlock('streak_3', stats.currentStreak >= 3);
      checkAndUnlock('streak_7', stats.currentStreak >= 7);
      checkAndUnlock('streak_14', stats.currentStreak >= 14);
      checkAndUnlock('streak_30', stats.currentStreak >= 30);
      checkAndUnlock('streak_100', stats.currentStreak >= 100);

      // Practice Time (convert minutes to hours)
      checkAndUnlock('practice_hours_1', stats.totalPracticeMinutes >= 60);
      checkAndUnlock('practice_hours_10', stats.totalPracticeMinutes >= 600);
      checkAndUnlock('practice_hours_50', stats.totalPracticeMinutes >= 3000);
      checkAndUnlock('practice_hours_100', stats.totalPracticeMinutes >= 6000);

      // Songs Mastered
      checkAndUnlock('first_song', stats.songsLearned >= 1);
      checkAndUnlock('songs_5', stats.songsLearned >= 5);
      checkAndUnlock('songs_10', stats.songsLearned >= 10);

      // Theory & Ear Training
      checkAndUnlock('theory_beginner', stats.theoryModulesCompleted >= 1);
      checkAndUnlock('ear_training_beginner', stats.lessonsCompleted >= 3);

      if (newUnlocked.length > 0) {
        const allUnlocked = [...currentUnlocked, ...newUnlocked];
        
        // Write each unlock to database
        let totalXPAwarded = 0;
        for (const id of newUnlocked) {
          const def = ACHIEVEMENT_DEFINITIONS[id];
          if (def) {
            await ProgressRepo.unlockAchievement(user.uid, {
              id: `ach_${id}_${Date.now()}`,
              achievementId: id,
              title: def.title,
              description: def.description,
              icon: def.icon,
              xpAwarded: def.xpAwarded,
              unlockedAt: new Date().toISOString(),
              isShared: false
            });
            totalXPAwarded += def.xpAwarded;
            alert(`Achievement Unlocked: ${def.title}\n${def.description}`);
          }
        }

        // Update local app state
        const freshUser = await UsersRepo.getUser(user.uid);
        if (freshUser) {
          appStore.setState({ currentUser: freshUser });
        }

        dashboardStore.setState({
          recentAchievements: allUnlocked
        });

        if (totalXPAwarded > 0) {
          await this.awardXP(totalXPAwarded);
        }
      }
    } catch (err) {
      console.error('Error checking achievements in gamification service:', err);
    }
  }
}

