/**
 * @module Audio Types
 * Audio processing, pitch detection, chord recognition, and rhythm analysis
 */

/** Single pitch detection result */
export interface PitchResult {
  /** Frequency detected in Hz */
  frequency: number;
  /** Signal clarity/confidence (0.0 to 1.0) */
  clarity: number;
  /** Closest note name (e.g. 'A4') */
  noteName: string;
  /** Cent deviation from the target note (-50 to +50) */
  cents: number;
}

/** Chord detection result */
export interface ChordDetectionResult {
  /** Chord name (e.g., 'C', 'Am', 'G7') */
  chordName: string;
  /** Detection confidence (0.0 to 1.0) */
  confidence: number;
  /** Semitone frequencies vector (chroma vector of 12 elements) */
  chromaVector: number[];
  /** Timestamp when detected in milliseconds */
  timestampMs: number;
}

/** Rhythm analysis of a performance segment */
export interface RhythmAnalysis {
  /** Performance tempo in BPM */
  detectedBpm: number;
  /** Expected tempo in BPM */
  targetBpm: number;
  /** Percentage of notes played on-beat (0.0 to 1.0) */
  accuracy: number;
  /** List of offsets from the beat in seconds (negative = rushed, positive = dragged) */
  offsets: number[];
  /** Rating label ('perfect', 'good', 'rushed', 'dragged', 'poor') */
  rating: 'perfect' | 'good' | 'rushed' | 'dragged' | 'poor';
}

/** Definition structure of a chord template */
export interface ChordTemplate {
  /** Chord name (e.g. 'C') */
  name: string;
  /** Semitones relative to root, e.g. major [0, 4, 7] */
  semitones: number[];
  /** Note names, e.g. ['C', 'E', 'G'] */
  notes: string[];
}

/** Constant templates mapping 30 common chords to notes */
export const CHORD_TEMPLATES: Record<string, ChordTemplate> = {
  // Major Chords
  C: { name: 'C', semitones: [0, 4, 7], notes: ['C', 'E', 'G'] },
  A: { name: 'A', semitones: [0, 4, 7], notes: ['A', 'C#', 'E'] },
  G: { name: 'G', semitones: [0, 4, 7], notes: ['G', 'B', 'D'] },
  E: { name: 'E', semitones: [0, 4, 7], notes: ['E', 'G#', 'B'] },
  D: { name: 'D', semitones: [0, 4, 7], notes: ['D', 'F#', 'A'] },
  F: { name: 'F', semitones: [0, 4, 7], notes: ['F', 'A', 'C'] },
  B: { name: 'B', semitones: [0, 4, 7], notes: ['B', 'D#', 'F#'] },

  // Minor Chords
  Cm: { name: 'Cm', semitones: [0, 3, 7], notes: ['C', 'Eb', 'G'] },
  Am: { name: 'Am', semitones: [0, 3, 7], notes: ['A', 'C', 'E'] },
  Gm: { name: 'Gm', semitones: [0, 3, 7], notes: ['G', 'Bb', 'D'] },
  Em: { name: 'Em', semitones: [0, 3, 7], notes: ['E', 'G', 'B'] },
  Dm: { name: 'Dm', semitones: [0, 3, 7], notes: ['D', 'F', 'A'] },
  Fm: { name: 'Fm', semitones: [0, 3, 7], notes: ['F', 'Ab', 'C'] },
  Bm: { name: 'Bm', semitones: [0, 3, 7], notes: ['B', 'D', 'F#'] },

  // Dominant 7th Chords
  C7: { name: 'C7', semitones: [0, 4, 7, 10], notes: ['C', 'E', 'G', 'Bb'] },
  A7: { name: 'A7', semitones: [0, 4, 7, 10], notes: ['A', 'C#', 'E', 'G'] },
  G7: { name: 'G7', semitones: [0, 4, 7, 10], notes: ['G', 'B', 'D', 'F'] },
  E7: { name: 'E7', semitones: [0, 4, 7, 10], notes: ['E', 'G#', 'B', 'D'] },
  D7: { name: 'D7', semitones: [0, 4, 7, 10], notes: ['D', 'F#', 'A', 'C'] },

  // Major 7th Chords
  Cmaj7: { name: 'Cmaj7', semitones: [0, 4, 7, 11], notes: ['C', 'E', 'G', 'B'] },
  Amaj7: { name: 'Amaj7', semitones: [0, 4, 7, 11], notes: ['A', 'C#', 'E', 'G#'] },
  Gmaj7: { name: 'Gmaj7', semitones: [0, 4, 7, 11], notes: ['G', 'B', 'D', 'F#'] },
  Fmaj7: { name: 'Fmaj7', semitones: [0, 4, 7, 11], notes: ['F', 'A', 'C', 'E'] },
  Dmaj7: { name: 'Dmaj7', semitones: [0, 4, 7, 11], notes: ['D', 'F#', 'A', 'C#'] },

  // Minor 7th Chords
  Am7: { name: 'Am7', semitones: [0, 3, 7, 10], notes: ['A', 'C', 'E', 'G'] },
  Em7: { name: 'Em7', semitones: [0, 3, 7, 10], notes: ['E', 'G', 'B', 'D'] },
  Dm7: { name: 'Dm7', semitones: [0, 3, 7, 10], notes: ['D', 'F', 'A', 'C'] },

  // Suspended Chords (sus2 / sus4)
  Asus2: { name: 'Asus2', semitones: [0, 2, 7], notes: ['A', 'B', 'E'] },
  Dsus2: { name: 'Dsus2', semitones: [0, 2, 7], notes: ['D', 'E', 'A'] },
  Esus4: { name: 'Esus4', semitones: [0, 5, 7], notes: ['E', 'A', 'B'] },
  Asus4: { name: 'Asus4', semitones: [0, 5, 7], notes: ['A', 'D', 'E'] },
  Dsus4: { name: 'Dsus4', semitones: [0, 5, 7], notes: ['D', 'G', 'A'] }
} as const;
