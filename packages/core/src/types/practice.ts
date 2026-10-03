/**
 * @module Practice Types
 * Practice session tracking and scoring
 */

import type { SkillLevel } from './user';

/** Type of activity performed during practice */
export type PracticeActivityType =
  | 'chord_practice'
  | 'scale_practice'
  | 'song_practice'
  | 'theory_study'
  | 'ear_training'
  | 'rhythm_training'
  | 'fingerpicking'
  | 'strumming'
  | 'improvisation'
  | 'sight_reading'
  | 'technique'
  | 'warmup'
  | 'free_play';

/** Mood/energy level before/after practice */
export type PracticeMood = 'energized' | 'focused' | 'relaxed' | 'tired' | 'frustrated' | 'neutral';

/** Individual activity within a practice session */
export interface PracticeActivity {
  /** Activity type */
  type: PracticeActivityType;
  /** Human-readable name of the activity */
  name: string;
  /** Duration in seconds */
  durationSeconds: number;
  /** Score achieved (0-100) */
  score?: number;
  /** BPM used during this activity */
  bpm?: number;
  /** Specific items practiced (chord names, scale names, etc.) */
  items: string[];
  /** Notes about this activity */
  notes?: string;
  /** Whether the AI provided real-time feedback */
  aiAssisted: boolean;
}

/** Score breakdown for a practice session */
export interface SessionScore {
  /** Overall session score (0-100) */
  overall: number;
  /** Rhythm accuracy (0-100) */
  rhythm: number;
  /** Pitch accuracy (0-100) — for melody/single note work */
  pitch: number;
  /** Timing consistency (0-100) */
  timing: number;
  /** Chord transition speed score (0-100) */
  chordTransitions: number;
  /** Technique/form score from vision analysis (0-100) */
  technique: number;
  /** Improvement from previous session (-100 to +100) */
  improvementDelta: number;
}

/**
 * A complete practice session record
 * Stored in Firestore at `users/{userId}/sessions/{sessionId}`
 */
export interface PracticeSession {
  /** Unique session identifier */
  id: string;
  /** User who performed the session */
  userId: string;
  /** Session start timestamp (ISO 8601) */
  startedAt: string;
  /** Session end timestamp (ISO 8601) */
  endedAt: string;
  /** Total session duration in seconds */
  durationSeconds: number;
  /** Activities performed during the session */
  activities: PracticeActivity[];
  /** Composite scores for the session */
  score: SessionScore;
  /** XP earned from this session */
  xpEarned: number;
  /** Achievements unlocked during this session */
  achievementsUnlocked: string[];
  /** Skill level at time of session */
  skillLevelAtTime: SkillLevel;
  /** Mood before session */
  moodBefore?: PracticeMood;
  /** Mood after session */
  moodAfter?: PracticeMood;
  /** AI-generated session summary */
  aiSummary?: string;
  /** AI-generated improvement suggestions */
  aiSuggestions?: string[];
  /** Audio recording URL (if recorded) */
  recordingURL?: string;
  /** Related roadmap task ID */
  roadmapTaskId?: string;
  /** Related lesson ID */
  lessonId?: string;
  /** Whether the session was completed or abandoned */
  completed: boolean;
  /** Metronome BPM used */
  bpm?: number;
  /** Tuning used during session */
  tuning: string;
  /** Guitar ID used */
  guitarId?: string;
}

/** Practice session summary for dashboard display */
export interface PracticeSessionSummary {
  /** Session ID */
  id: string;
  /** Start date */
  date: string;
  /** Duration in minutes */
  durationMinutes: number;
  /** Overall score */
  score: number;
  /** XP earned */
  xpEarned: number;
  /** Primary activity type */
  primaryActivity: PracticeActivityType;
  /** Whether it was completed */
  completed: boolean;
}

/** Weekly practice stats aggregation */
export interface WeeklyPracticeStats {
  /** Start of week (ISO date) */
  weekStart: string;
  /** Total minutes practiced */
  totalMinutes: number;
  /** Number of sessions */
  sessionCount: number;
  /** Average score */
  averageScore: number;
  /** Total XP earned */
  totalXP: number;
  /** Daily breakdown (Mon-Sun) */
  dailyMinutes: [number, number, number, number, number, number, number];
  /** Most practiced activity */
  topActivity: PracticeActivityType;
  /** Goal completion percentage */
  goalCompletion: number;
}
