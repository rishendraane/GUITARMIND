import pb from '../lib/pocketbase';

const localKey = (userId: string) => `guitarmind_practice_sessions_${userId}`;
const isOffline = (userId: string) => userId === 'offline_user_id' || !navigator.onLine;

export interface PracticeSessionRecord {
  id?: string;
  userId: string;
  type: string;
  duration: number;
  score: number;
  bpm?: number;
  notesHit?: number;
  notesMissed?: number;
  songId?: string;
  chordProgression?: string[];
  startedAt: string;
  endedAt?: string;
}

export class PracticeRepo {
  static async createSession(session: PracticeSessionRecord): Promise<boolean> {
    const key = localKey(session.userId);
    const list: PracticeSessionRecord[] = JSON.parse(localStorage.getItem(key) || '[]');
    list.unshift(session);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 100))); // keep last 100

    if (isOffline(session.userId)) return true;

    try {
      await pb.create('practice_sessions', {
        user_id: session.userId,
        type: session.type,
        duration: session.duration,
        score: session.score,
        bpm: session.bpm || 0,
        notes_hit: session.notesHit || 0,
        notes_missed: session.notesMissed || 0,
        song_id: session.songId || '',
        chord_progression: session.chordProgression || [],
        started_at: session.startedAt,
        ended_at: session.endedAt || new Date().toISOString(),
      });
      return true;
    } catch {
      return true;
    }
  }

  static async getSessions(userId: string, limit = 20): Promise<PracticeSessionRecord[]> {
    const cached: PracticeSessionRecord[] = JSON.parse(localStorage.getItem(localKey(userId)) || '[]');
    if (isOffline(userId)) return cached.slice(0, limit);

    try {
      const res = await pb.list('practice_sessions', {
        filter: `user_id="${userId}"`,
        sort: '-started_at',
        perPage: limit,
      });
      const remote: PracticeSessionRecord[] = res.items.map(r => ({
        id: r.id,
        userId: r.user_id,
        type: r.type,
        duration: r.duration,
        score: r.score,
        bpm: r.bpm,
        notesHit: r.notes_hit,
        notesMissed: r.notes_missed,
        songId: r.song_id,
        chordProgression: r.chord_progression,
        startedAt: r.started_at,
        endedAt: r.ended_at,
      }));
      localStorage.setItem(localKey(userId), JSON.stringify(remote));
      return remote;
    } catch {
      return cached.slice(0, limit);
    }
  }

  static async getTotalStats(userId: string): Promise<{ totalMinutes: number; totalSessions: number; avgScore: number }> {
    const sessions = await this.getSessions(userId, 200);
    const totalMinutes = Math.round(sessions.reduce((s, r) => s + (r.duration / 60), 0));
    const avgScore = sessions.length
      ? Math.round(sessions.reduce((s, r) => s + r.score, 0) / sessions.length)
      : 0;
    return { totalMinutes, totalSessions: sessions.length, avgScore };
  }

  // ---- Backward-compatible aliases ----
  static async listSessions(userId: string, limit?: number) { return this.getSessions(userId, limit); }
  static async logStreakActivity(_userId: string, _data: any) { return true; }
}
