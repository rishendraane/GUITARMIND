import pb from '../lib/pocketbase';

export interface RoadmapStage {
  index: number;
  title: string;
  status: 'locked' | 'active' | 'completed';
  completedAt?: string;
}

export interface RoadmapProgress {
  userId: string;
  roadmapId: string;
  stages: RoadmapStage[];
  currentStage: number;
}

const localKey = (userId: string) => `guitarmind_roadmap_${userId}`;
const memoriesKey = (userId: string) => `guitarmind_memories_${userId}`;
const isOffline = (userId: string) => userId === 'offline_user_id' || !navigator.onLine;

export class ProgressRepo {
  // --- Roadmap ---

  static async getRoadmapProgress(userId: string): Promise<RoadmapProgress | null> {
    const cached = localStorage.getItem(localKey(userId));
    if (cached) {
      try { return JSON.parse(cached); } catch { /* ignore */ }
    }
    if (isOffline(userId)) return null;

    try {
      const rec = await pb.getFirst('roadmap_progress', `user_id="${userId}"`);
      if (!rec) return null;
      const result: RoadmapProgress = {
        userId: rec.user_id,
        roadmapId: rec.roadmap_id,
        stages: rec.stages || [],
        currentStage: rec.current_stage || 0,
      };
      localStorage.setItem(localKey(userId), JSON.stringify(result));
      return result;
    } catch {
      return null;
    }
  }

  static async saveRoadmapProgress(progress: RoadmapProgress): Promise<boolean> {
    localStorage.setItem(localKey(progress.userId), JSON.stringify(progress));
    if (isOffline(progress.userId)) return true;

    try {
      await pb.upsert(
        'roadmap_progress',
        `user_id="${progress.userId}"`,
        {
          user_id: progress.userId,
          roadmap_id: progress.roadmapId,
          stages: progress.stages,
          current_stage: progress.currentStage,
          updated_at: new Date().toISOString(),
        }
      );
      return true;
    } catch {
      return true;
    }
  }

  // --- Memories ---

  static async getMemories(userId: string): Promise<any[]> {
    const cached = JSON.parse(localStorage.getItem(memoriesKey(userId)) || '[]');
    if (isOffline(userId)) return cached;

    try {
      const res = await pb.list('user_memories', {
        filter: `user_id="${userId}"`,
        sort: '-relevance_score',
        perPage: 50,
      });
      const items = res.items.map(r => ({
        id: r.id,
        type: r.memory_type,
        content: r.content,
        score: r.relevance_score,
        createdAt: r.created_at,
      }));
      localStorage.setItem(memoriesKey(userId), JSON.stringify(items));
      return items;
    } catch {
      return cached;
    }
  }

  static async addMemory(userId: string, memory: { type: string; content: string; score?: number }): Promise<boolean> {
    const key = memoriesKey(userId);
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.unshift({ ...memory, id: `mem_${Date.now()}`, createdAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(list.slice(0, 100)));

    if (isOffline(userId)) return true;

    try {
      await pb.create('user_memories', {
        user_id: userId,
        memory_type: memory.type,
        content: memory.content,
        relevance_score: memory.score || 1,
        created_at: new Date().toISOString(),
      });
      return true;
    } catch {
      return true;
    }
  }

  // ---- Backward-compatible aliases ----
  /** Achievements stored in localStorage */
  static async getAchievements(userId: string): Promise<any[]> {
    return JSON.parse(localStorage.getItem(`guitarmind_achievements_${userId}`) || '[]');
  }
  static async unlockAchievement(userId: string, achievement: any): Promise<boolean> {
    const list = JSON.parse(localStorage.getItem(`guitarmind_achievements_${userId}`) || '[]');
    if (!list.some((a: any) => a.id === achievement.id)) {
      list.push({ ...achievement, unlockedAt: new Date().toISOString() });
      localStorage.setItem(`guitarmind_achievements_${userId}`, JSON.stringify(list));
    }
    return true;
  }
  static async getRoadmap(userId: string) { return this.getRoadmapProgress(userId); }
  static async saveRoadmap(userIdOrProgress: string | RoadmapProgress, roadmapObj?: any, stages?: any[]): Promise<boolean> {
    if (typeof userIdOrProgress === 'string') {
      const userId = userIdOrProgress;
      const progress: RoadmapProgress = {
        userId,
        roadmapId: roadmapObj?.id || 'default',
        stages: stages || roadmapObj?.stages || [],
        currentStage: roadmapObj?.currentStageIndex || 0,
      };
      return this.saveRoadmapProgress(progress);
    }
    return this.saveRoadmapProgress(userIdOrProgress);
  }
  static async logStreakActivity(_userId: string, _data: any) { return true; }
}
