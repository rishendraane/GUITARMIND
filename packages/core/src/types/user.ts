/**
 * @module User Types
 * Complete user profile and settings for GuitarMind AI
 */

/** Skill level categories for guitar players */
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/** Musical genre preferences */
export type Genre =
  | 'rock'
  | 'blues'
  | 'jazz'
  | 'classical'
  | 'country'
  | 'folk'
  | 'metal'
  | 'pop'
  | 'funk'
  | 'r&b'
  | 'reggae'
  | 'flamenco'
  | 'acoustic'
  | 'fingerstyle'
  | 'worship';

/** Guitar type the user plays */
export type GuitarType = 'acoustic' | 'electric' | 'classical' | 'bass';

/** Learning style preference */
export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'reading';

/** Coach personality identifier */
export type CoachPersonalityId = 'maya' | 'axel' | 'professor_chen' | 'maestro_antonio' | 'general';

/** AI provider names supported */
export type AIProviderName = 'google' | 'openai' | 'anthropic' | 'groq' | 'gemini' | 'claude' | 'nvidia' | 'openrouter';

/** Calendar provider for integration */
export type CalendarProvider = 'google' | 'apple' | 'outlook';

/** User's musical background information */
export interface MusicalBackground {
  /** Current skill level self-assessment */
  skillLevel: SkillLevel;
  /** Number of years playing guitar */
  yearsPlaying: number;
  /** Preferred musical genres */
  favoriteGenres: Genre[];
  /** Type(s) of guitar the user plays */
  guitarTypes: GuitarType[];
  /** Artists or bands the user is inspired by */
  favoriteArtists: string[];
  /** Songs the user wants to learn */
  targetSongs: string[];
  /** Instruments the user can play besides guitar */
  otherInstruments: string[];
  /** Whether user can read sheet music */
  canReadSheetMusic: boolean;
  /** Whether user knows basic music theory */
  knowsMusicTheory: boolean;
}

/** User's learning goals */
export interface UserGoals {
  /** Primary objective (e.g., "learn my first song", "master jazz improvisation") */
  primaryGoal: string;
  /** Target practice minutes per day */
  dailyPracticeMinutes: number;
  /** Preferred days of the week for practice (0=Sun, 6=Sat) */
  practiceDays: number[];
  /** Short-term goals (next 2 weeks) */
  shortTermGoals: string[];
  /** Long-term goals (next 3-6 months) */
  longTermGoals: string[];
  /** Target date for achieving primary goal */
  targetDate?: string;
}

/** AI model configuration */
export interface AIConfig {
  /** Selected AI provider */
  provider: AIProviderName;
  /** Model identifier (e.g., 'gemini-2.0-flash', 'gpt-4o') */
  model: string;
  /** Temperature for generation (0-2) */
  temperature: number;
  /** Maximum tokens for responses */
  maxTokens: number;
  /** Whether to stream responses */
  streaming: boolean;
  /** Decrypted client-side api key placeholder or local storage encrypted payload */
  apiKeyEncrypted?: string;
  /** IV used for client-side api key decryption */
  apiKeyIV?: string;
  /** Whether the current API configuration is validated */
  validated?: boolean;
}

/** User practice statistics */
export interface UserStats {
  /** Total number of practice sessions completed */
  totalSessions: number;
  /** Total practice time in minutes */
  totalPracticeMinutes: number;
  /** Current daily streak count */
  currentStreak: number;
  /** Longest daily streak ever achieved */
  longestStreak: number;
  /** Total number of chords mastered */
  chordsMastered: number;
  /** Total number of songs learned */
  songsLearned: number;
  /** Total number of scales mastered */
  scalesMastered: number;
  /** Total XP earned across all activities */
  totalXP: number;
  /** Current level */
  currentLevel: number;
  /** Average session score (0-100) */
  averageSessionScore: number;
  /** Date of last practice session */
  lastPracticeDate: string;
  /** Total number of achievements unlocked */
  achievementsUnlocked: number;
  /** Lessons completed count */
  lessonsCompleted: number;
  /** Theory modules completed */
  theoryModulesCompleted: number;
}

/** User's calendar integration configuration */
export interface CalendarIntegration {
  /** Calendar provider */
  provider: CalendarProvider;
  /** Whether integration is currently active */
  enabled: boolean;
  /** OAuth access token */
  accessToken?: string;
  /** OAuth refresh token */
  refreshToken?: string;
  /** Token expiration timestamp */
  tokenExpiry?: string;
  /** Calendar ID for practice events */
  calendarId?: string;
  /** Whether to auto-create practice reminders */
  autoReminders: boolean;
  /** Reminder time in minutes before session */
  reminderMinutesBefore: number;
}

/** App-level settings */
export interface UserSettings {
  /** Dark or light theme */
  theme: 'dark' | 'light' | 'system';
  /** Application language */
  language: string;
  /** Whether to enable push notifications */
  pushNotifications: boolean;
  /** Whether to enable email notifications */
  emailNotifications: boolean;
  /** Whether to enable sound effects */
  soundEffects: boolean;
  /** Whether to enable haptic feedback (mobile) */
  hapticFeedback: boolean;
  /** Audio input device ID */
  audioInputDeviceId?: string;
  /** Audio output device ID */
  audioOutputDeviceId?: string;
  /** Video input device ID (for vision features) */
  videoInputDeviceId?: string;
  /** Metronome default BPM */
  defaultBPM: number;
  /** Preferred tuning */
  preferredTuning: string;
  /** Whether to show tablature or standard notation */
  notationPreference: 'tab' | 'standard' | 'both';
  /** Whether to auto-record practice sessions */
  autoRecordSessions: boolean;
  /** Practice session countdown duration in seconds */
  countdownDuration: number;
  /** Preferred learning style */
  learningStyle: LearningStyle;
}

/** User's personal profile information */
export interface UserProfile {
  /** User's age */
  age: number;
  /** Country of residence */
  country: string;
  /** System timezone name */
  timezone: string;
}

/**
 * Complete GuitarMind user profile
 * Stored in Firestore at `users/{userId}`
 */
export interface User {
  /** Firebase Auth UID */
  uid: string;
  /** User's display name */
  displayName: string;
  /** Email address */
  email: string;
  /** Profile photo URL */
  photoURL?: string;
  /** Personal profile details */
  profile: UserProfile;
  /** Musical background and experience */
  musicalBackground: MusicalBackground;
  /** Learning goals and targets */
  goals: UserGoals;
  /** AI model and behavior configuration */
  aiConfig: AIConfig;
  /** Selected AI coach personality */
  coachPersonality: CoachPersonalityId;
  /** Cumulative practice statistics */
  stats: UserStats;
  /** Connected calendar integrations */
  calendarIntegrations: CalendarIntegration[];
  /** App settings and preferences */
  settings: UserSettings;
  /** Account creation timestamp */
  createdAt: string;
  /** Last profile update timestamp */
  updatedAt: string;
  /** Last login timestamp */
  lastLoginAt: string;
  /** Whether the user has completed onboarding */
  onboardingComplete: boolean;
  /** Current roadmap ID the user is following */
  currentRoadmapId?: string;
  /** IDs of unlocked achievements */
  unlockedAchievements: string[];
  /** Premium subscription status */
  isPremium: boolean;
  /** Subscription expiration date */
  premiumExpiresAt?: string;
  /** Firebase Cloud Messaging token for push notifications */
  fcmToken?: string;
}
