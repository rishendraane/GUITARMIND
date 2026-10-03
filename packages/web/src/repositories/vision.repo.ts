import pb from '../lib/pocketbase';

export interface PostureAnalysisData {
  spineAngle: number;
  shoulderTilt: number;
  neckAngle: number;
  wristAngle: number;
  score: number;
  warnings: string[];
  postureState?: string;
  shoulderAngle?: number;
}

export interface GuitarScanData {
  guitarType: string;
  orientation: string;
  confidence: number;
  lineDensity?: number;
}

const localKey = (userId: string) => `guitarmind_vision_${userId}`;
const isOffline = (userId: string) => userId === 'offline_user_id' || !navigator.onLine;

export class VisionRepo {
  static async savePostureAnalysis(userId: string, data: PostureAnalysisData): Promise<boolean> {
    const key = localKey(userId);
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.unshift({ type: 'posture', data, savedAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));

    if (isOffline(userId)) return true;

    try {
      await pb.create('vision_analysis', {
        user_id: userId,
        analysis_type: 'posture',
        posture_data: data,
        score: data.score,
        feedback: data.warnings.join('; '),
        analyzed_at: new Date().toISOString(),
      });
      return true;
    } catch {
      return true;
    }
  }

  static async saveGuitarScan(userId: string, data: GuitarScanData): Promise<boolean> {
    const key = localKey(userId);
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.unshift({ type: 'guitar_scan', data, savedAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));

    if (isOffline(userId)) return true;

    try {
      await pb.create('vision_analysis', {
        user_id: userId,
        analysis_type: 'guitar_scan',
        fret_data: data,
        score: data.confidence * 100,
        analyzed_at: new Date().toISOString(),
      });
      return true;
    } catch {
      return true;
    }
  }

  static async getRecentAnalyses(userId: string, limit = 10): Promise<any[]> {
    const cached = JSON.parse(localStorage.getItem(localKey(userId)) || '[]');
    if (isOffline(userId)) return cached.slice(0, limit);

    try {
      const res = await pb.list('vision_analysis', {
        filter: `user_id="${userId}"`,
        sort: '-analyzed_at',
        perPage: limit,
      });
      return res.items;
    } catch {
      return cached.slice(0, limit);
    }
  }
}
