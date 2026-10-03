/**
 * @module Weekly Report Types
 * Weekly practice session progress summary and trend analysis
 */

/** Trend arrow direction */
export type TrendDirection = 'up' | 'down' | 'stable';

/** Trend metric description */
export interface TrendMetric {
  /** Average value for this week (0-100) */
  average: number;
  /** Performance direction compared to last week */
  trend: TrendDirection;
}

/**
 * A weekly progress report for a user
 * Stored in Firestore at `users/{userId}/weekly_reports/{reportId}` (reportId: "2026-W22")
 */
export interface WeeklyReport {
  /** Report unique ID (e.g. "2026-W22") */
  id: string;
  /** ISO date string representing the start of the week (Monday) */
  weekStart: string;
  /** ISO date string representing the end of the week (Sunday) */
  weekEnd: string;
  /** Total practice time in minutes during the week */
  totalMinutes: number;
  /** Count of practice sessions saved */
  sessionsCount: number;
  /** Average session score (0-100) */
  averageScore: number;
  /** Chords that saw an increase in clarity score */
  chordsImproved: string[];
  /** New chords successfully learned this week */
  newChordsLearned: string[];
  /** Song IDs worked on during the week */
  songsWorkedOn: string[];
  /** Breakdown of core musical mechanics scores and trends */
  scoreBreakdown: {
    chordClarity: TrendMetric;
    rhythmAccuracy: TrendMetric;
    tempoConsistency: TrendMetric;
    techniqueForm?: TrendMetric;
  };
  /** AI Coach generated narrative summary of the week */
  aiSummary: string;
  /** AI Coach suggested practice focus objectives for next week */
  focusAreasNextWeek: string[];
  /** Timestamp when report was compiled (ISO string) */
  generatedAt: string;
}
