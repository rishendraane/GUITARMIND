/**
 * @module Theory Types
 * Music theory modules, structures, and progression tracking
 */

import type { SkillLevel } from './user';
import type { QuizQuestion } from './lesson';

/** Category of music theory */
export type TheoryCategory = 'notes' | 'scales' | 'chords' | 'harmony' | 'modes' | 'rhythm' | 'intervals';

/** Interactive visual aid inside a theory page */
export interface TheoryInteractiveElement {
  /** Component display type */
  type: 'fretboard_diagram' | 'chord_chart' | 'scale_diagram' | 'audio_example' | 'interactive_circle_of_fifths';
  /** Configuration parameters */
  data: Record<string, any>;
}

/**
 * A static music theory topic module
 * Stored in Firestore at `theory_modules/{moduleId}`
 */
export interface TheoryModule {
  /** Unique module ID */
  id: string;
  /** Display title (e.g. "The Major Scale Formula") */
  title: string;
  /** Category */
  category: TheoryCategory;
  /** Targeted difficulty */
  difficulty: SkillLevel;
  /** Ordering position inside category list (1-based) */
  order: number;
  /** Rich text theory explanations in markdown */
  content: string;
  /** Embedded interactive widgets */
  interactiveElements: TheoryInteractiveElement[];
  /** Quiz questions to test retention */
  quizQuestions: QuizQuestion[];
  /** Prerequisite theory module IDs */
  prerequisites: string[];
  /** XP rewarded on pass score */
  xpReward: number;
  /** Timestamp when added (ISO string) */
  createdAt: string;
}

/**
 * User progression record through a music theory module
 * Stored in Firestore at `users/{userId}/theory_progress/{moduleId}`
 */
export interface TheoryProgress {
  /** Associated module ID */
  moduleId: string;
  /** Whether the user has completed and passed the module quiz */
  completed: boolean;
  /** Highest score achieved on the quiz (0-100) */
  highestScore: number;
  /** Attempts count */
  attemptsCount: number;
  /** When first completed (ISO string) */
  completedAt?: string;
  /** When last attempted (ISO string) */
  lastAttemptedAt: string;
}
