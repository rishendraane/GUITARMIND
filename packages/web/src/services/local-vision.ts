/**
 * @module LocalVisionService
 * Communicates with the local Flask server on port 5000 to perform image recognition tasks.
 */

export interface LocalVisionResult {
  success: boolean;
  guitarDetected: boolean;
  guitarStyle: 'acoustic' | 'electric' | 'classical' | 'unknown';
  chordDetected: string | null;
  confidence: number;
  postureMetrics?: {
    spineAngle: number;
    neckAngle: number;
    shoulderTilt: number;
    wristFlex: number;
    score: number;
    warnings: string[];
  };
  error?: string;
}

export class LocalVisionService {
  private static SERVER_URL = 'http://127.0.0.1:5000';

  /**
   * Check if the local vision server is running and accessible.
   */
  static async checkStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.SERVER_URL}/api/status`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(1000) // 1 second timeout
      });
      if (!response.ok) return false;
      const data = await response.json();
      return data.status === 'online';
    } catch {
      return false;
    }
  }

  /**
   * Send a base64-encoded image to the local server for prediction.
   */
  static async analyzeImage(base64Image: string): Promise<LocalVisionResult> {
    try {
      const response = await fetch(`${this.SERVER_URL}/api/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ image: base64Image }),
        signal: AbortSignal.timeout(6000) // 6 second timeout
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown analysis error');
      }

      return {
        success: true,
        guitarDetected: data.guitar_detected,
        guitarStyle: data.guitar_style,
        chordDetected: data.chord_detected,
        confidence: data.confidence,
        postureMetrics: data.posture_metrics ? {
          spineAngle: data.posture_metrics.spine_angle,
          neckAngle: data.posture_metrics.neck_angle,
          shoulderTilt: data.posture_metrics.shoulder_tilt,
          wristFlex: data.posture_metrics.wrist_flex,
          score: data.posture_metrics.score,
          warnings: data.posture_metrics.warnings
        } : undefined
      };
    } catch (err: any) {
      console.warn('Local vision server analysis failed:', err.message || err);
      return {
        success: false,
        guitarDetected: false,
        guitarStyle: 'unknown',
        chordDetected: null,
        confidence: 0,
        error: err.message || String(err)
      };
    }
  }
}
