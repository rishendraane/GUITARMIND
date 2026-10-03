/**
 * @module Guitar Types
 * Guitar instrument definitions and specifications
 */

import type { GuitarType } from './user';

/** Guitar string specification */
export interface GuitarString {
  /** String number (1 = highest pitch, 6 = lowest pitch) */
  number: number;
  /** Note name (e.g., 'E4', 'B3') */
  note: string;
  /** Frequency in Hz for standard tuning */
  frequency: number;
  /** String gauge in inches (e.g., 0.010) */
  gauge?: number;
}

/** Fret marker position */
export interface FretMarker {
  /** Fret number */
  fret: number;
  /** Whether this is a double dot marker (e.g., 12th fret) */
  isDouble: boolean;
}

/**
 * Guitar instrument profile
 * Represents a specific guitar the user owns or uses
 */
export interface Guitar {
  /** Unique identifier */
  id: string;
  /** User-assigned name for this guitar */
  name: string;
  /** Guitar type (acoustic, electric, classical, bass) */
  type: GuitarType;
  /** Brand/manufacturer */
  brand?: string;
  /** Model name */
  model?: string;
  /** Number of strings (typically 6 or 7) */
  stringCount: number;
  /** Number of frets */
  fretCount: number;
  /** String definitions with tuning */
  strings: GuitarString[];
  /** Current tuning name (e.g., 'standard', 'dropD') */
  tuning: string;
  /** Photo URL of this guitar */
  photoURL?: string;
  /** Whether this is the user's primary guitar */
  isPrimary: boolean;
  /** Date the guitar was added */
  addedAt: string;
}

/** Standard 6-string guitar string definitions */
export const STANDARD_GUITAR_STRINGS: readonly GuitarString[] = [
  { number: 1, note: 'E4', frequency: 329.63 },
  { number: 2, note: 'B3', frequency: 246.94 },
  { number: 3, note: 'G3', frequency: 196.00 },
  { number: 4, note: 'D3', frequency: 146.83 },
  { number: 5, note: 'A2', frequency: 110.00 },
  { number: 6, note: 'E2', frequency: 82.41 },
] as const;

/** Fret markers for a standard guitar */
export const STANDARD_FRET_MARKERS: readonly FretMarker[] = [
  { fret: 3, isDouble: false },
  { fret: 5, isDouble: false },
  { fret: 7, isDouble: false },
  { fret: 9, isDouble: false },
  { fret: 12, isDouble: true },
  { fret: 15, isDouble: false },
  { fret: 17, isDouble: false },
  { fret: 19, isDouble: false },
  { fret: 21, isDouble: false },
  { fret: 24, isDouble: true },
] as const;
