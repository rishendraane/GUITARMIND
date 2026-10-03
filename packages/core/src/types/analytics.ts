/**
 * @module Analytics Types
 * Analytics event definitions and telemetry tracking constants
 */

/** Event definition structure */
export interface AnalyticsEventDefinition {
  /** Event name string */
  name: string;
  /** Description of when this event is fired */
  description: string;
  /** Expected parameters payload keys */
  parameters?: string[];
}

/** Fired events inside GuitarMind AI */
export const ANALYTICS_EVENTS = {
  // Authentication & Onboarding
  APP_OPENED: {
    name: 'app_opened',
    description: 'Fired when the user launches the application'
  },
  SIGN_UP_COMPLETED: {
    name: 'sign_up_completed',
    description: 'Fired when registration completes successfully',
    parameters: ['method']
  },
  ONBOARDING_STARTED: {
    name: 'onboarding_started',
    description: 'Fired when onboarding starts'
  },
  ONBOARDING_COMPLETED: {
    name: 'onboarding_completed',
    description: 'Fired when onboarding profile is successfully built and saved'
  },

  // Practice & Training
  PRACTICE_STARTED: {
    name: 'practice_started',
    description: 'Fired when a new practice session is started',
    parameters: ['type', 'guitarId', 'tuning']
  },
  PRACTICE_COMPLETED: {
    name: 'practice_completed',
    description: 'Fired when a practice session is saved',
    parameters: ['durationSeconds', 'overallScore', 'xpEarned', 'completed']
  },
  EXERCISE_ATTEMPTED: {
    name: 'exercise_attempted',
    description: 'Fired when an interactive exercise starts/finishes',
    parameters: ['exerciseId', 'type', 'score', 'tempoBPM']
  },
  SONG_PLAYED: {
    name: 'song_played',
    description: 'Fired when practicing a song',
    parameters: ['songId', 'tempoBPM', 'score']
  },

  // AI & Coach interactions
  COACH_CHAT_SENT: {
    name: 'coach_chat_sent',
    description: 'Fired when user sends a message to the AI coach',
    parameters: ['personalityId', 'messageLength']
  },
  COACH_CHAT_RECEIVED: {
    name: 'coach_chat_received',
    description: 'Fired when coach responds',
    parameters: ['personalityId', 'tokens', 'latencyMs']
  },
  COACH_SWITCHED: {
    name: 'coach_switched',
    description: 'Fired when coach personality is updated',
    parameters: ['oldPersonalityId', 'newPersonalityId']
  },

  // Tools & Utilities
  TUNER_OPENED: {
    name: 'tuner_opened',
    description: 'Fired when entering the tuner module'
  },
  TUNER_STRING_TUNED: {
    name: 'tuner_string_tuned',
    description: 'Fired when a guitar string is confirmed in-tune',
    parameters: ['tuningId', 'stringNumber']
  },
  METRONOME_TOGGLED: {
    name: 'metronome_toggled',
    description: 'Fired when turning metronome on or off',
    parameters: ['bpm', 'enabled']
  },

  // Roadmap & Progression
  ROADMAP_ADAPTED: {
    name: 'roadmap_adapted',
    description: 'Fired when the AI alters the roadmap based on performance',
    parameters: ['reason', 'stageIndex']
  },
  ACHIEVEMENT_UNLOCKED: {
    name: 'achievement_unlocked',
    description: 'Fired when a new badge/achievement is unlocked',
    parameters: ['achievementId', 'xpAwarded']
  },
  LEVEL_UP: {
    name: 'level_up',
    description: 'Fired when user reaches a new experience level',
    parameters: ['oldLevel', 'newLevel']
  },

  // Lessons & Theory
  LESSON_STARTED: {
    name: 'lesson_started',
    description: 'Fired when starting a structured lesson',
    parameters: ['lessonId', 'category']
  },
  LESSON_STEP_COMPLETED: {
    name: 'lesson_step_completed',
    description: 'Fired when passing a step of a lesson',
    parameters: ['lessonId', 'stepIndex', 'stepType']
  },
  LESSON_COMPLETED: {
    name: 'lesson_completed',
    description: 'Fired when lesson is finished',
    parameters: ['lessonId', 'xpEarned']
  },
  THEORY_QUIZ_COMPLETED: {
    name: 'theory_quiz_completed',
    description: 'Fired when completing a music theory quiz',
    parameters: ['moduleId', 'score', 'completed']
  },

  // System & Error logs
  ERROR_ENCOUNTERED: {
    name: 'error_encountered',
    description: 'Fired when a client-side execution exception occurs',
    parameters: ['code', 'message', 'module']
  }
} as const;
