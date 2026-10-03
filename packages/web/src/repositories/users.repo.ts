import pb from '../lib/pocketbase';
import type { User, UserStats } from '@guitarmind/core';

const OFFLINE_PREFIX = 'guitarmind_offline_user_';

function localKey(userId: string) {
  return OFFLINE_PREFIX + userId;
}

function isOffline(userId: string) {
  return userId === 'offline_user_id' || !navigator.onLine;
}

/** Map a PocketBase users_profile record → GuitarMind User object */
function mapRecord(r: any): User {
  const ai = r.ai_config || {};
  return {
    uid: r.user_id,
    displayName: r.name || '',
    email: r.email || '',
    photoURL: r.avatar_url || '',
    onboardingComplete: r.onboarding_complete || false,
    createdAt: r.created_at || r.created,
    updatedAt: r.updated_at || r.updated,
    lastLoginAt: r.updated_at || r.updated,
    isPremium: false,
    unlockedAchievements: [],
    coachPersonality: r.preferred_coach || 'maya',
    profile: {
      age: 0,
      country: '',
      timezone: 'UTC',
    },
    musicalBackground: {
      skillLevel: r.skill_level || 'beginner',
      yearsPlaying: r.years_playing || 0,
      favoriteGenres: r.favorite_genres || [],
      guitarTypes: r.guitar_type ? [r.guitar_type] : ['acoustic'],
      favoriteArtists: r.favorite_artists || [],
      targetSongs: r.target_songs || [],
      otherInstruments: [],
      canReadSheetMusic: false,
      knowsMusicTheory: false,
      canReadTabs: true,
      knowsBasicChords: false,
      hasPlayedBefore: (r.years_playing || 0) > 0,
    } as any,
    goals: {
      primaryGoal: (r.learning_goals || [])[0] || '',
      dailyPracticeMinutes: 20,
      practiceDays: [1, 2, 3, 4, 5],
      shortTermGoals: r.learning_goals || [],
      longTermGoals: [],
    },
    aiConfig: {
      provider: ai.provider || 'ollama',
      model: ai.model || 'llama3.2',
      temperature: 0.7,
      maxTokens: 1024,
      streaming: false,
      apiKeyEncrypted: ai.apiKey || '',
    },
    stats: {
      totalSessions: 0,
      totalPracticeMinutes: 0,
      currentStreak: r.streak || 0,
      longestStreak: r.streak || 0,
      chordsMastered: 0,
      songsLearned: 0,
      scalesMastered: 0,
      totalXP: r.xp || 0,
      currentLevel: Math.floor((r.xp || 0) / 100) + 1,
      averageSessionScore: 0,
      lastPracticeDate: '',
      achievementsUnlocked: 0,
      lessonsCompleted: 0,
      theoryModulesCompleted: 0,
    },
    calendarIntegrations: [],
    settings: {
      theme: 'dark',
      language: 'en',
      pushNotifications: true,
      emailNotifications: false,
      soundEffects: true,
      hapticFeedback: true,
      defaultBPM: 80,
      preferredTuning: 'standard',
      notationPreference: 'tab',
      autoRecordSessions: false,
      countdownDuration: 3,
      learningStyle: 'visual',
    },
  };
}

export class UsersRepo {
  /** Fetch user by their local ID */
  static async getUser(userId: string): Promise<User | null> {
    // Always load from local cache first
    const cached = localStorage.getItem(localKey(userId));
    if (cached) {
      try { return JSON.parse(cached); } catch { /* ignore */ }
    }

    if (isOffline(userId)) return null;

    try {
      const record = await pb.getFirst('users_profile', `user_id="${userId}"`);
      if (!record) return null;
      const user = mapRecord(record);
      localStorage.setItem(localKey(userId), JSON.stringify(user));
      return user;
    } catch (err) {
      console.warn('[UsersRepo] getUser PB error, using cache:', err);
      return null;
    }
  }

  /** Create or update user in PocketBase and localStorage */
  static async upsertUser(user: User): Promise<boolean> {
    // Always persist to localStorage
    localStorage.setItem(localKey(user.uid), JSON.stringify(user));

    if (isOffline(user.uid)) return true;

    const body = {
      user_id: user.uid,
      name: user.displayName,
      email: user.email,
      avatar_url: user.photoURL || '',
      skill_level: user.musicalBackground.skillLevel,
      guitar_type: user.musicalBackground.guitarTypes[0] || 'acoustic',
      years_playing: user.musicalBackground.yearsPlaying || 0,
      favorite_genres: user.musicalBackground.favoriteGenres,
      favorite_artists: user.musicalBackground.favoriteArtists || [],
      target_songs: user.musicalBackground.targetSongs || [],
      learning_goals: user.goals.shortTermGoals || [],
      xp: user.stats.totalXP,
      streak: user.stats.currentStreak,
      preferred_coach: user.coachPersonality,
      ai_config: user.aiConfig || {},
      onboarding_complete: user.onboardingComplete,
      created_at: user.createdAt,
      updated_at: new Date().toISOString(),
    };

    try {
      await pb.upsert('users_profile', `user_id="${user.uid}"`, body);
      return true;
    } catch (err) {
      console.warn('[UsersRepo] upsertUser PB error (saved locally):', err);
      return true; // local save succeeded
    }
  }

  /** Update only the stats fields */
  static async updateStats(userId: string, stats: Partial<UserStats>): Promise<boolean> {
    // Merge into local cache
    const cached = localStorage.getItem(localKey(userId));
    if (cached) {
      try {
        const user = JSON.parse(cached);
        user.stats = { ...user.stats, ...stats };
        localStorage.setItem(localKey(userId), JSON.stringify(user));
      } catch { /* ignore */ }
    }

    if (isOffline(userId)) return true;

    const body: any = { updated_at: new Date().toISOString() };
    if (stats.totalXP !== undefined) body.xp = stats.totalXP;
    if (stats.currentStreak !== undefined) body.streak = stats.currentStreak;

    try {
      const existing = await pb.getFirst('users_profile', `user_id="${userId}"`);
      if (existing) {
        await pb.update('users_profile', existing.id, body);
      }
      return true;
    } catch (err) {
      console.warn('[UsersRepo] updateStats PB error (saved locally):', err);
      return true;
    }
  }
}
