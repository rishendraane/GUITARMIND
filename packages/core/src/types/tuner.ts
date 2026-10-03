/**
 * @module Tuner Types
 * Guitar tuner pitch detection and tuning target configurations
 */

/** Tuning string definition */
export interface TuningString {
  /** String index (1 = highest pitch string, e.g. E4) */
  index: number;
  /** Musical pitch name */
  noteName: string;
  /** Target frequency in Hz */
  targetFrequency: number;
}

/** Config for a specific tuning setup */
export interface TuningConfig {
  /** Short identifier (e.g. 'standard', 'dropD') */
  id: string;
  /** Display name (e.g. 'Drop D') */
  name: string;
  /** Target frequencies for each string */
  strings: TuningString[];
}

/** Current status of the tuner */
export interface TunerState {
  /** Selected tuning ID */
  tuningId: string;
  /** Active string index being tuned (1-based, undefined if no pitch) */
  activeStringIndex?: number;
  /** Expected frequency of active string */
  targetFrequency?: number;
  /** Current pitch frequency in Hz detected */
  detectedFrequency: number;
  /** Closest note name detected */
  closestNote: string;
  /** Difference in cents from target (-50 to +50) */
  centsDeviation: number;
  /** Status string: 'flat' (too low), 'sharp' (too high), 'in_tune' (perfect) */
  tuneStatus: 'flat' | 'sharp' | 'in_tune' | 'idle';
  /** Sound level in db (helps user know if they are strumming) */
  amplitude: number;
}

/** Predefined tunings for a standard 6-string guitar */
export const TUNING_PRESETS: Record<string, TuningConfig> = {
  standard: {
    id: 'standard',
    name: 'Standard Tuning (EADGBE)',
    strings: [
      { index: 1, noteName: 'E4', targetFrequency: 329.63 },
      { index: 2, noteName: 'B3', targetFrequency: 246.94 },
      { index: 3, noteName: 'G3', targetFrequency: 196.00 },
      { index: 4, noteName: 'D3', targetFrequency: 146.83 },
      { index: 5, noteName: 'A2', targetFrequency: 110.00 },
      { index: 6, noteName: 'E2', targetFrequency: 82.41 }
    ]
  },
  dropD: {
    id: 'dropD',
    name: 'Drop D (DADGBE)',
    strings: [
      { index: 1, noteName: 'E4', targetFrequency: 329.63 },
      { index: 2, noteName: 'B3', targetFrequency: 246.94 },
      { index: 3, noteName: 'G3', targetFrequency: 196.00 },
      { index: 4, noteName: 'D3', targetFrequency: 146.83 },
      { index: 5, noteName: 'A2', targetFrequency: 110.00 },
      { index: 6, noteName: 'D2', targetFrequency: 73.42 }
    ]
  },
  halfStepDown: {
    id: 'halfStepDown',
    name: 'Half Step Down (Eb Ab Db Gb Bb Eb)',
    strings: [
      { index: 1, noteName: 'Eb4', targetFrequency: 311.13 },
      { index: 2, noteName: 'Bb3', targetFrequency: 233.08 },
      { index: 3, noteName: 'Gb3', targetFrequency: 185.00 },
      { index: 4, noteName: 'Db3', targetFrequency: 138.59 },
      { index: 5, noteName: 'Ab2', targetFrequency: 103.83 },
      { index: 6, noteName: 'Eb2', targetFrequency: 77.78 }
    ]
  },
  openG: {
    id: 'openG',
    name: 'Open G (DGDGBD)',
    strings: [
      { index: 1, noteName: 'D4', targetFrequency: 293.66 },
      { index: 2, noteName: 'B3', targetFrequency: 246.94 },
      { index: 3, noteName: 'G3', targetFrequency: 196.00 },
      { index: 4, noteName: 'D3', targetFrequency: 146.83 },
      { index: 5, noteName: 'G2', targetFrequency: 98.00 },
      { index: 6, noteName: 'D2', targetFrequency: 73.42 }
    ]
  },
  dadgad: {
    id: 'dadgad',
    name: 'DADGAD',
    strings: [
      { index: 1, noteName: 'D4', targetFrequency: 293.66 },
      { index: 2, noteName: 'A3', targetFrequency: 220.00 },
      { index: 3, noteName: 'G3', targetFrequency: 196.00 },
      { index: 4, noteName: 'D3', targetFrequency: 146.83 },
      { index: 5, noteName: 'A2', targetFrequency: 110.00 },
      { index: 6, noteName: 'D2', targetFrequency: 73.42 }
    ]
  },
  openD: {
    id: 'openD',
    name: 'Open D (DADF#AD)',
    strings: [
      { index: 1, noteName: 'D4', targetFrequency: 293.66 },
      { index: 2, noteName: 'A3', targetFrequency: 220.00 },
      { index: 3, noteName: 'F#3', targetFrequency: 185.00 },
      { index: 4, noteName: 'D3', targetFrequency: 146.83 },
      { index: 5, noteName: 'A2', targetFrequency: 110.00 },
      { index: 6, noteName: 'D2', targetFrequency: 73.42 }
    ]
  }
} as const;
