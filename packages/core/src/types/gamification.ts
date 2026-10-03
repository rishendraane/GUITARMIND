/**
 * @module Gamification Types
 * Achievement, XP tracking, level progression, and challenge models
 */

/** Type of challenge frequency */
export type ChallengePeriod = 'daily' | 'weekly' | 'special';

/** Requirement metric for challenges */
export type ChallengeRequirementType =
  | 'practice_minutes'
  | 'sessions_count'
  | 'chord_mastery'
  | 'song_complete'
  | 'streak_days'
  | 'xp_earned';

/**
 * An achievement earned by a user
 * Stored in Firestore at `users/{userId}/achievements/{achievementId}`
 */
export interface Achievement {
  /** Unique ID of the earned achievement */
  id: string;
  /** Achievement identifier code (e.g. 'first_chord') */
  achievementId: string;
  /** Display title */
  title: string;
  /** Description explaining how it was unlocked */
  description: string;
  /** Icon/Badge code */
  icon: string;
  /** XP awarded on unlock */
  xpAwarded: number;
  /** Timestamp when unlocked (ISO string) */
  unlockedAt: string;
  /** Whether the user has shared it on social feed */
  isShared: boolean;
  /** Share image asset URL (if generated) */
  shareImageURL?: string;
}

/**
 * A practice challenge
 * Stored in Firestore at `challenges/{challengeId}`
 */
export interface Challenge {
  /** Unique challenge ID */
  id: string;
  /** Title of the challenge */
  title: string;
  /** Detailed description of what to do */
  description: string;
  /** Challenge period (daily/weekly) */
  period: ChallengePeriod;
  /** Requirement definition */
  requirement: {
    type: ChallengeRequirementType;
    target: number;
  };
  /** XP rewarded on complete */
  xpReward: number;
  /** Start time of validity (ISO string) */
  activeFrom: string;
  /** End time of validity (ISO string) */
  activeTo: string;
  /** Date when this challenge was created (ISO string) */
  createdAt: string;
}

/**
 * Full gamification state for a user
 */
export interface GamificationState {
  /** Current user level */
  level: number;
  /** Current XP in the current level */
  currentXP: number;
  /** Total cumulative XP earned */
  totalXP: number;
  /** XP required to advance to the next level */
  xpNeededForNextLevel: number;
  /** Daily streak count */
  currentStreak: number;
  /** Longest daily streak achieved */
  longestStreak: number;
  /** Timestamp of the last XP-earning event (ISO string) */
  lastEarnedAt?: string;
}

/**
 * Level up trigger result
 */
export interface LevelUpResult {
  /** Previous level */
  oldLevel: number;
  /** New level */
  newLevel: number;
  /** Title unlocked, if any */
  titleUnlocked?: string;
  /** Rewards unlocked (e.g. ['new_avatars', 'exclusive_backing_tracks']) */
  rewardsUnlocked: string[];
}

/** XP required for each level (level 0 to 100) */
export const XP_PER_LEVEL: readonly number[] = (() => {
  const levels = [0]; // Level 0 requires 0 XP
  let cumulative = 0;
  for (let lvl = 1; lvl <= 100; lvl++) {
    // XP increases quadratically: lvl 1 = 500, lvl 2 = 1200, lvl 3 = 2000, lvl 4 = 3000...
    cumulative += Math.round((lvl * 500) + (lvl * lvl * 100));
    levels.push(cumulative);
  }
  return levels;
})() as readonly number[];

/** Static definitions for achievements */
export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpAwarded: number;
  category: 'chords' | 'songs' | 'streak' | 'practice' | 'theory' | 'ear_training' | 'special';
}

/** The 20 core achievements for GuitarMind AI */
export const ACHIEVEMENT_DEFINITIONS: Record<string, AchievementDefinition> = {
  first_chord: {
    id: 'first_chord',
    title: 'First Chord Mastered',
    description: 'Play your first clean chord with 90%+ clarity.',
    icon: '🌱',
    xpAwarded: 100,
    category: 'chords'
  },
  first_song: {
    id: 'first_song',
    title: 'Hello World of Guitar',
    description: 'Complete your first full song practice session.',
    icon: '🎵',
    xpAwarded: 250,
    category: 'songs'
  },
  streak_3: {
    id: 'streak_3',
    title: 'Getting Warm',
    description: 'Maintain a 3-day practice streak.',
    icon: '🔥',
    xpAwarded: 100,
    category: 'streak'
  },
  streak_7: {
    id: 'streak_7',
    title: 'Habit Builder',
    description: 'Maintain a 7-day practice streak.',
    icon: '📅',
    xpAwarded: 250,
    category: 'streak'
  },
  streak_14: {
    id: 'streak_14',
    title: 'Dedicated Player',
    description: 'Maintain a 14-day practice streak.',
    icon: '🏆',
    xpAwarded: 500,
    category: 'streak'
  },
  streak_30: {
    id: 'streak_30',
    title: 'Unstoppable Riffing',
    description: 'Maintain a 30-day practice streak.',
    icon: '🚀',
    xpAwarded: 1000,
    category: 'streak'
  },
  streak_100: {
    id: 'streak_100',
    title: 'Guitar Immortal',
    description: 'Maintain an incredible 100-day practice streak.',
    icon: '⚡',
    xpAwarded: 2500,
    category: 'streak'
  },
  chords_5: {
    id: 'chords_5',
    title: 'Chord Collector',
    description: 'Master 5 distinct open chords.',
    icon: '🎸',
    xpAwarded: 200,
    category: 'chords'
  },
  chords_10: {
    id: 'chords_10',
    title: 'Fretboard Navigator',
    description: 'Master 10 distinct chords including barre chords.',
    icon: '💫',
    xpAwarded: 400,
    category: 'chords'
  },
  chords_20: {
    id: 'chords_20',
    title: 'Chord Wizard',
    description: 'Master 20 distinct chords including extensions (7ths, 9ths).',
    icon: '🔮',
    xpAwarded: 800,
    category: 'chords'
  },
  songs_1: {
    id: 'songs_1',
    title: 'Solo Performance',
    description: 'Play a full song at 100% target tempo.',
    icon: '🌟',
    xpAwarded: 300,
    category: 'songs'
  },
  songs_5: {
    id: 'songs_5',
    title: 'Setlist Ready',
    description: 'Learn and complete 5 songs in your repertoire.',
    icon: '🎼',
    xpAwarded: 600,
    category: 'songs'
  },
  songs_10: {
    id: 'songs_10',
    title: 'Gig Ready',
    description: 'Learn and complete 10 songs in your repertoire.',
    icon: '🎙️',
    xpAwarded: 1200,
    category: 'songs'
  },
  practice_hours_1: {
    id: 'practice_hours_1',
    title: 'Putting in the Time',
    description: 'Accumulate 1 hour of total practice time.',
    icon: '⏱️',
    xpAwarded: 100,
    category: 'practice'
  },
  practice_hours_10: {
    id: 'practice_hours_10',
    title: 'Ten-Hour Milestone',
    description: 'Accumulate 10 hours of total practice time.',
    icon: '⏳',
    xpAwarded: 500,
    category: 'practice'
  },
  practice_hours_50: {
    id: 'practice_hours_50',
    title: 'Halfway to Mastery',
    description: 'Accumulate 50 hours of total practice time.',
    icon: '⏰',
    xpAwarded: 1000,
    category: 'practice'
  },
  practice_hours_100: {
    id: 'practice_hours_100',
    title: 'Centurion Shredder',
    description: 'Accumulate 100 hours of total practice time.',
    icon: '👑',
    xpAwarded: 2000,
    category: 'practice'
  },
  perfect_session: {
    id: 'perfect_session',
    title: 'Flawless Execution',
    description: 'Achieve a 100% score on any exercise or song.',
    icon: '💎',
    xpAwarded: 500,
    category: 'special'
  },
  theory_beginner: {
    id: 'theory_beginner',
    title: 'Smart Musician',
    description: 'Complete the Beginner Music Theory modules.',
    icon: '💡',
    xpAwarded: 300,
    category: 'theory'
  },
  ear_training_beginner: {
    id: 'ear_training_beginner',
    title: 'Musical Ear',
    description: 'Unlock 90%+ accuracy on pitch/interval matching.',
    icon: '👂',
    xpAwarded: 300,
    category: 'ear_training'
  }
} as const;
