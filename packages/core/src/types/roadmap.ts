/**
 * @module Roadmap Types
 * Adaptive guitar learning roadmaps, stages, and tasks
 */

/** Status of a stage or task */
export type CompletionStatus = 'locked' | 'pending' | 'in_progress' | 'completed' | 'skipped';

/** Type of task in the roadmap */
export type RoadmapTaskType =
  | 'lesson'
  | 'exercise'
  | 'practice'
  | 'theory'
  | 'ear_training'
  | 'song'
  | 'milestone_check';

/**
 * Task in a roadmap stage
 * Stored in Firestore at `users/{userId}/roadmap/active/stages/{stageId}/tasks/{taskId}`
 */
export interface RoadmapTask {
  /** Unique task identifier */
  id: string;
  /** ID of the stage this task belongs to */
  stageId: string;
  /** Display title */
  title: string;
  /** Detailed description/instructions */
  description: string;
  /** Type of activity */
  type: RoadmapTaskType;
  /** Completion status */
  status: CompletionStatus;
  /** Estimated duration in minutes */
  estimatedMinutes: number;
  /** XP rewarded on completion */
  xpReward: number;
  /** Linked lesson ID (if applicable) */
  lessonId?: string;
  /** Linked exercise ID (if applicable) */
  exerciseId?: string;
  /** Linked song ID (if applicable) */
  songId?: string;
  /** Scheduled date for this task (ISO string) */
  scheduledDate?: string;
  /** Timestamp when completed (ISO string) */
  completedAt?: string;
}

/**
 * Stage in a learning roadmap
 * Stored in Firestore at `users/{userId}/roadmap/active/stages/{stageId}`
 */
export interface RoadmapStage {
  /** Unique stage identifier */
  id: string;
  /** Index of stage (0-based) */
  index: number;
  /** Stage title (e.g. "Open Chord Foundations") */
  title: string;
  /** Detailed description of stage outcomes */
  description: string;
  /** Status of the stage */
  status: 'locked' | 'active' | 'completed';
  /** Estimated days to complete the stage */
  estimatedDays: number;
  /** Start timestamp (ISO string) */
  startedAt?: string;
  /** Completion timestamp (ISO string) */
  completedAt?: string;
  /** Target skills to master in this stage */
  targetSkills: string[];
  /** Tasks that belong to this stage */
  tasks?: RoadmapTask[];
}

/**
 * Personalized guitar learning roadmap
 * Stored in Firestore at `users/{userId}/roadmap/active`
 */
export interface Roadmap {
  /** Unique roadmap identifier (usually 'active') */
  id: string;
  /** Timestamp when generated (ISO string) */
  generatedAt: string;
  /** Timestamp when last adapted/updated (ISO string) */
  lastAdaptedAt: string;
  /** Current active stage index */
  currentStageIndex: number;
  /** Total number of stages */
  totalStages: number;
  /** Estimated date of total completion (ISO string) */
  estimatedCompletionDate: string;
  /** Current areas of practice focus */
  currentFocus: string[];
  /** Mastery percentages for various categories (0-100) */
  masteryLevels: {
    /** Chord masteries, e.g. { 'C': 95, 'Am': 80 } */
    chords: Record<string, number>;
    /** Scale masteries, e.g. { 'C_Major_Pentatonic': 70 } */
    scales: Record<string, number>;
    /** Technique masteries, e.g. { 'hammer_on': 50, 'barre_chords': 10 } */
    techniques: Record<string, number>;
    /** Theory topic masteries */
    theory: Record<string, number>;
    /** Ear training exercise masteries */
    earTraining: Record<string, number>;
  };
}
