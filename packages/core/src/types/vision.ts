/**
 * @module Vision Types
 * Computer vision model configurations, hand tracking landmarks, finger placement, and posture analysis
 */

/** MediaPipe Hand Landmark indexes */
export enum HandLandmark {
  WRIST = 0,
  THUMB_CMC = 1,
  THUMB_MCP = 2,
  THUMB_IP = 3,
  THUMB_TIP = 4,
  INDEX_FINGER_MCP = 5,
  INDEX_FINGER_PIP = 6,
  INDEX_FINGER_DIP = 7,
  INDEX_FINGER_TIP = 8,
  MIDDLE_FINGER_MCP = 9,
  MIDDLE_FINGER_PIP = 10,
  MIDDLE_FINGER_DIP = 11,
  MIDDLE_FINGER_TIP = 12,
  RING_FINGER_MCP = 13,
  RING_FINGER_PIP = 14,
  RING_FINGER_DIP = 15,
  RING_FINGER_TIP = 16,
  PINKY_MCP = 17,
  PINKY_PIP = 18,
  PINKY_DIP = 19,
  PINKY_TIP = 20
}

/** Position of a finger on the guitar fretboard */
export interface FingerPosition {
  /** Finger name (1 = Index, 2 = Middle, 3 = Ring, 4 = Pinky, T = Thumb) */
  finger: '1' | '2' | '3' | '4' | 'T';
  /** String number (1 = highest E, 6 = lowest E) */
  stringNumber: number;
  /** Fret number (0 = open) */
  fret: number;
}

/** Real-time posture analysis */
export interface PostureAnalysis {
  /** Back spinal angle (degrees) */
  spineAngle: number;
  /** Shoulder slope tilt (degrees) */
  shoulderTilt: number;
  /** Neck forward bend angle (degrees) */
  neckAngle: number;
  /** Fretting hand wrist flex angle (degrees) */
  wristAngle: number;
  /** Overall posture rating (0-100) */
  score: number;
  /** Ergonomics warnings or actionable feedback items */
  warnings: string[];
}

/** Result of scanning a guitar via camera */
export interface GuitarScanResult {
  /** Detected guitar type */
  guitarType: 'acoustic' | 'electric' | 'classical' | 'unknown';
  /** Detected orientation ('left-handed' | 'right-handed') */
  orientation: 'left-handed' | 'right-handed';
  /** Visual bounding box coordinates */
  boundingBox?: { xMin: number; yMin: number; xMax: number; yMax: number };
  /** Detection confidence (0.0 to 1.0) */
  confidence: number;
}

/** Chord finger shape blueprint */
export interface ChordShape {
  /** Chord name (e.g. 'C') */
  name: string;
  /** Fret values per string: 1-indexed string numbers [string6, string5, string4, string3, string2, string1]
   * value: fret number, -1 for muted/unused, 0 for open
   */
  frets: [number, number, number, number, number, number];
  /** Finger placements */
  fingers: FingerPosition[];
}

/** Predefined fretboard shapes for 10 common open chords */
export const CHORD_SHAPES: Record<string, ChordShape> = {
  C: {
    name: 'C',
    frets: [-1, 3, 2, 0, 1, 0],
    fingers: [
      { finger: '3', stringNumber: 5, fret: 3 },
      { finger: '2', stringNumber: 4, fret: 2 },
      { finger: '1', stringNumber: 2, fret: 1 }
    ]
  },
  A: {
    name: 'A',
    frets: [-1, 0, 2, 2, 2, 0],
    fingers: [
      { finger: '1', stringNumber: 4, fret: 2 },
      { finger: '2', stringNumber: 3, fret: 2 },
      { finger: '3', stringNumber: 2, fret: 2 }
    ]
  },
  G: {
    name: 'G',
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [
      { finger: '2', stringNumber: 6, fret: 3 },
      { finger: '1', stringNumber: 5, fret: 2 },
      { finger: '3', stringNumber: 1, fret: 3 }
    ]
  },
  E: {
    name: 'E',
    frets: [0, 2, 2, 1, 0, 0],
    fingers: [
      { finger: '2', stringNumber: 5, fret: 2 },
      { finger: '3', stringNumber: 4, fret: 2 },
      { finger: '1', stringNumber: 3, fret: 1 }
    ]
  },
  D: {
    name: 'D',
    frets: [-1, -1, 0, 2, 3, 2],
    fingers: [
      { finger: '1', stringNumber: 3, fret: 2 },
      { finger: '3', stringNumber: 2, fret: 3 },
      { finger: '2', stringNumber: 1, fret: 2 }
    ]
  },
  Am: {
    name: 'Am',
    frets: [-1, 0, 2, 2, 1, 0],
    fingers: [
      { finger: '2', stringNumber: 4, fret: 2 },
      { finger: '3', stringNumber: 3, fret: 2 },
      { finger: '1', stringNumber: 2, fret: 1 }
    ]
  },
  Em: {
    name: 'Em',
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [
      { finger: '2', stringNumber: 5, fret: 2 },
      { finger: '3', stringNumber: 4, fret: 2 }
    ]
  },
  Dm: {
    name: 'Dm',
    frets: [-1, -1, 0, 2, 3, 1],
    fingers: [
      { finger: '2', stringNumber: 3, fret: 2 },
      { finger: '3', stringNumber: 2, fret: 3 },
      { finger: '1', stringNumber: 1, fret: 1 }
    ]
  },
  F: {
    name: 'F',
    frets: [1, 3, 3, 2, 1, 1],
    fingers: [
      { finger: '1', stringNumber: 6, fret: 1 }, // Barre
      { finger: '3', stringNumber: 5, fret: 3 },
      { finger: '4', stringNumber: 4, fret: 3 },
      { finger: '2', stringNumber: 3, fret: 2 }
    ]
  },
  B7: {
    name: 'B7',
    frets: [-1, 2, 1, 2, 0, 2],
    fingers: [
      { finger: '2', stringNumber: 5, fret: 2 },
      { finger: '1', stringNumber: 4, fret: 1 },
      { finger: '3', stringNumber: 3, fret: 2 },
      { finger: '4', stringNumber: 1, fret: 2 }
    ]
  }
} as const;
