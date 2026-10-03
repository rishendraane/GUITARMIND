/**
 * @module Lesson Types
 * Interactive guitar lessons, stages, quizzes and exercises
 */

import type { SkillLevel } from './user';

/** Lesson category classification */
export type LessonCategory =
  | 'chords'
  | 'strumming'
  | 'fingerstyle'
  | 'theory'
  | 'technique'
  | 'ear_training'
  | 'rhythm';

/** Lesson step types */
export type LessonStepType = 'explanation' | 'demonstration' | 'practice' | 'quiz' | 'exercise';

/** Exercise types for testing and practical execution */
export type ExerciseType =
  | 'chord_change'
  | 'strumming'
  | 'fingerpicking'
  | 'scale'
  | 'rhythm_matching'
  | 'ear_interval'
  | 'ear_chord'
  | 'theory_multiple_choice';

/**
 * Quiz question representation
 */
export interface QuizQuestion {
  /** The question string */
  question: string;
  /** Selectable choices */
  options: string[];
  /** Correct choice index (0-based) */
  correctIndex: number;
  /** Explanatory text shown after answering */
  explanation: string;
}

/**
 * Single step inside a lesson
 * Stored in Firestore at `lessons/{lessonId}/steps/{stepId}`
 */
export interface LessonStep {
  /** Step ID */
  id: string;
  /** Step order (0-based) */
  index: number;
  /** Type of instruction */
  type: LessonStepType;
  /** Title of the step */
  title: string;
  /** Instruction content in markdown */
  content: string;
  /** Video tutorial or visual aid URL */
  mediaURL?: string;
  /** Associated interactive exercise ID */
  exerciseId?: string;
  /** Quiz question definitions, if step type is 'quiz' */
  quiz?: QuizQuestion;
}

/**
 * A lesson in the database
 * Stored in Firestore at `lessons/{lessonId}`
 */
export interface Lesson {
  /** Unique lesson ID */
  id: string;
  /** Title of the lesson */
  title: string;
  /** High-level description of what the lesson covers */
  description: string;
  /** Lesson category */
  category: LessonCategory;
  /** Targeted skill level */
  difficulty: SkillLevel;
  /** Estimated time needed in minutes */
  estimatedMinutes: number;
  /** XP rewarded on complete */
  xpReward: number;
  /** Prerequisite lesson IDs */
  prerequisites: string[];
  /** Specific skill names taught (e.g. ['chord_G', 'tempo_80']) */
  skillsTaught: string[];
  /** Total count of steps in this lesson */
  stepsCount: number;
  /** Steps in this lesson */
  steps?: LessonStep[];
  /** Whether the lesson was generated dynamically by AI for the user */
  isAIGenerated: boolean;
  /** Timestamp when added (ISO string) */
  createdAt: string;
}

/**
 * Interactive practice exercise
 * Stored in Firestore at `exercises/{exerciseId}`
 */
export interface Exercise {
  /** Unique exercise ID */
  id: string;
  /** Title of the exercise */
  title: string;
  /** Instructions explaining how to practice */
  description: string;
  /** Classification of exercise */
  type: ExerciseType;
  /** Targeted skill level */
  difficulty: SkillLevel;
  /** Speed in BPM (Beats Per Minute) */
  tempo: number;
  /** Chords used in this exercise */
  chords: string[];
  /** Time signature (e.g. '4/4') */
  timeSignature: string;
  /** Target duration in seconds */
  durationSeconds: number;
  /** Criteria used to score the user's execution */
  evaluationCriteria: {
    /** Target metric: 'chord_clarity', 'rhythm_accuracy', 'pitch_accuracy', 'tempo_consistency' */
    metric: string;
    /** Score weight factor (0.0 to 1.0) */
    weight: number;
    /** Minimum score (0-100) required to pass this metric */
    passThreshold: number;
  }[];
  /** Step-by-step text instruction */
  instructions: string;
  /** Tablature markup / ASCII representation of what to play */
  tabNotation?: string;
  /** Audio backing track URL for play-along */
  backingTrackURL?: string;
  /** XP rewarded on successful completion */
  xpReward: number;
  /** Timestamp when created (ISO string) */
  createdAt: string;
}
