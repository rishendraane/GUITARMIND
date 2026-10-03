import { UsersRepo } from '../repositories/users.repo';
import { ChordsRepo } from '../repositories/chords.repo';
import { PracticeRepo } from '../repositories/practice.repo';
import { ConversationsRepo } from '../repositories/conversations.repo';
import { ProgressRepo } from '../repositories/progress.repo';
import { SongsRepo } from '../repositories/songs.repo';
import { VisionRepo } from '../repositories/vision.repo';

export interface UserContext {
  user: {
    name: string;
    level: number;
    xp: number;
    streak: number;
  };
  profile: {
    skillLevel: string;
    guitarType: string;
    learningStyle: string;
    goals: string[];
    genres: string[];
    preferredCoach: string;
  };
  chords: {
    known: string[];
    weak: { chord: string; score: number }[];
    strong: { chord: string; score: number }[];
  };
  recentSessions: {
    date: string;
    duration: number;
    score: number;
    type: string;
  }[];
  recentMessages: {
    sender: string;
    content: string;
    timestamp: string;
  }[];
  memories: Record<string, any>;
  achievements: string[];
  activeMissions: string[];
  roadmap?: {
    currentStageIndex: number;
    totalStages: number;
    stages: { index: number; title: string; status: string }[];
  } | null;
  songs?: {
    songId: string;
    status: string;
    progressPercent: number;
  }[];
  vision?: {
    type: string;
    postureData?: any;
    scanData?: any;
    date: string;
  }[];
}

export class ContextEngine {
  private static cache: Record<string, { context: UserContext; timestamp: number }> = {};
  private static CACHE_TTL = 60000; // 60 seconds

  static async buildContext(userId: string, bypassCache = false): Promise<UserContext | null> {
    const now = Date.now();
    if (!bypassCache && this.cache[userId] && (now - this.cache[userId].timestamp < this.CACHE_TTL)) {
      return this.cache[userId].context;
    }

    try {
      // 1. Fetch user profile and stats
      const userObj = await UsersRepo.getUser(userId);
      if (!userObj) return null;

      // 2. Chord mastery
      const chordMastery = await ChordsRepo.getChordMastery(userId);
      const knownChords = chordMastery.map(c => c.chordName);
      const weakChords = chordMastery
        .filter(c => c.masteryScore < 50)
        .map(c => ({ chord: c.chordName, score: c.masteryScore }));
      const strongChords = chordMastery
        .filter(c => c.masteryScore >= 80)
        .map(c => ({ chord: c.chordName, score: c.masteryScore }));

      // 3. Recent practice sessions (last 5)
      const sessions = await PracticeRepo.getSessions(userId, 10);
      const recentSessions = sessions.slice(0, 5).map(s => ({
        date: s.startedAt,
        duration: s.duration,   // already in seconds
        score: s.score || 0,
        type: s.type || 'free_practice',
      }));

      // 4. User memories from ProgressRepo
      const memoryItems = await ProgressRepo.getMemories(userId);
      const memories: Record<string, any> = {};
      memoryItems.forEach((item: any) => {
        memories[item.type || item.id] = item.content;
      });

      // 5. Recent conversation messages
      const activeConversations = await ConversationsRepo.getUserConversations(userId);
      const activeConv = activeConversations[0];
      let recentMessages: any[] = [];
      if (activeConv) {
        const msgs = await ConversationsRepo.getMessages(activeConv.id);
        recentMessages = msgs.slice(-10).map(m => ({
          sender: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }));
      }

      // 6. Achievements
      const achs = await ProgressRepo.getAchievements(userId);
      const achievements = achs.map((a: any) => a.achievementId || a.id || a.title || 'unknown');

      // 7. Active daily missions (stored in localStorage)
      const missionsKey = `guitarmind_missions_${userId}_${new Date().toISOString().slice(0, 10)}`;
      const activeMissions: string[] = JSON.parse(localStorage.getItem(missionsKey) || '[]');

      // 8. Roadmap
      const roadmapProgress = await ProgressRepo.getRoadmapProgress(userId);
      let roadmap = null;
      if (roadmapProgress) {
        roadmap = {
          currentStageIndex: roadmapProgress.currentStage,
          totalStages: roadmapProgress.stages.length,
          stages: roadmapProgress.stages.map(s => ({
            index: s.index,
            title: s.title,
            status: s.status,
          })),
        };
      }

      // 9. Song progress
      const songProgList = await SongsRepo.getSongs(userId);
      const songs = songProgList.map(s => ({
        songId: s.id || s.title,
        status: s.status,
        progressPercent: s.progressPercent,
      }));

      // 10. Vision scans (recent posture analyses)
      const visionRows = await VisionRepo.getRecentAnalyses(userId, 3);
      const vision = visionRows.map((r: any) => ({
        type: r.type || r.analysis_type || 'posture',
        postureData: r.data || r.posture_data,
        scanData: r.fret_data,
        date: r.savedAt || r.analyzed_at || r.created,
      }));

      const context: UserContext = {
        user: {
          name: userObj.displayName,
          level: userObj.stats.currentLevel,
          xp: userObj.stats.totalXP,
          streak: userObj.stats.currentStreak,
        },
        profile: {
          skillLevel: userObj.musicalBackground.skillLevel,
          guitarType: userObj.musicalBackground.guitarTypes[0] || 'acoustic',
          learningStyle: userObj.settings.learningStyle,
          goals: userObj.goals.shortTermGoals || [],
          genres: userObj.musicalBackground.favoriteGenres,
          preferredCoach: userObj.coachPersonality,
        },
        chords: { known: knownChords, weak: weakChords, strong: strongChords },
        recentSessions,
        recentMessages,
        memories,
        achievements,
        activeMissions,
        roadmap,
        songs,
        vision,
      };

      this.cache[userId] = { context, timestamp: now };
      return context;
    } catch (err) {
      console.error('[ContextEngine] buildContext error:', err);
      return null;
    }
  }

  static clearCache(userId: string) {
    delete this.cache[userId];
  }
}
