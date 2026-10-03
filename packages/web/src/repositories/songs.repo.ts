import pb from '../lib/pocketbase';
import { appStore } from '../store';

const getCurrentUserId = () => appStore.getState().currentUser?.uid || 'offline_user_id';

export interface SongRecord {
  id?: string;
  userId: string;
  title: string;
  artist: string;
  genre?: string;
  difficulty?: string;
  tabs?: string | null;
  chords?: string[];
  status: 'wishlist' | 'learning' | 'mastered';
  progressPercent: number;
  youtubeUrl?: string;
  createdAt: string;
  // Extended fields from Song type (pages need these)
  key?: string;
  tempo?: number;
  tuning?: string;
  timeSignature?: string;
  sections?: any[];
  prompt?: string;
  lyrics?: string;
  capo?: number;
  strummingPattern?: string;
  [key: string]: any; // allow extra fields without type errors
}

const localKey = (userId: string) => `guitarmind_songs_${userId}`;
const isOffline = (userId: string) => userId === 'offline_user_id' || !navigator.onLine;

export class SongsRepo {
  static async getSongs(userId: string): Promise<SongRecord[]> {
    const cached: SongRecord[] = JSON.parse(localStorage.getItem(localKey(userId)) || '[]');
    if (isOffline(userId)) return cached;

    try {
      const res = await pb.list('songs', {
        filter: `user_id="${userId}"`,
        sort: '-created_at',
        perPage: 200,
      });
      const remote: SongRecord[] = res.items.map(r => ({
        id: r.id,
        userId: r.user_id,
        title: r.title,
        artist: r.artist,
        genre: r.genre,
        difficulty: r.difficulty,
        tabs: r.tabs,
        chords: r.chords || [],
        status: r.status as any,
        progressPercent: r.progress_percent,
        youtubeUrl: r.youtube_url,
        createdAt: r.created_at || r.created,
      }));
      localStorage.setItem(localKey(userId), JSON.stringify(remote));
      return remote;
    } catch {
      return cached;
    }
  }

  static async addSong(song: SongRecord): Promise<SongRecord> {
    const key = localKey(song.userId);
    const list: SongRecord[] = JSON.parse(localStorage.getItem(key) || '[]');
    const entry = { ...song, id: song.id || `song_${Date.now()}` };
    list.unshift(entry);
    localStorage.setItem(key, JSON.stringify(list));

    if (isOffline(song.userId)) return entry;

    try {
      const rec = await pb.create('songs', {
        user_id: song.userId,
        title: song.title,
        artist: song.artist,
        genre: song.genre || '',
        difficulty: song.difficulty || 'beginner',
        tabs: song.tabs || '',
        chords: song.chords || [],
        status: song.status,
        progress_percent: song.progressPercent,
        youtube_url: song.youtubeUrl || '',
        created_at: song.createdAt,
      });
      const saved = { ...entry, id: rec.id };
      const idx = list.findIndex(s => s.id === entry.id);
      if (idx >= 0) list[idx] = saved;
      localStorage.setItem(key, JSON.stringify(list));
      return saved;
    } catch {
      return entry;
    }
  }

  static async updateSong(userId: string, songId: string, updates: Partial<SongRecord>): Promise<boolean> {
    const key = localKey(userId);
    const list: SongRecord[] = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = list.findIndex(s => s.id === songId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      localStorage.setItem(key, JSON.stringify(list));
    }

    if (isOffline(userId)) return true;

    try {
      await pb.update('songs', songId, {
        status: updates.status,
        progress_percent: updates.progressPercent,
        tabs: updates.tabs,
        chords: updates.chords,
      });
      return true;
    } catch {
      return true;
    }
  }

  static async deleteSong(userId: string, songId: string): Promise<boolean> {
    const key = localKey(userId);
    const list: SongRecord[] = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify(list.filter(s => s.id !== songId)));

    if (isOffline(userId)) return true;

    try {
      await pb.delete('songs', songId);
      return true;
    } catch {
      return true;
    }
  }

  // ---- Backward-compatible aliases (pages call these) ----
  /** listSongs() — no userId = auto from store */
  static async listSongs(userId?: string): Promise<SongRecord[]> {
    return this.getSongs(userId || getCurrentUserId());
  }
  static async saveSong(song: any): Promise<SongRecord> {
    const uid = song.userId || getCurrentUserId();
    const record: SongRecord = {
      ...song,
      userId: uid,
      status: song.status || 'wishlist',
      progressPercent: song.progressPercent || 0,
      createdAt: song.createdAt || new Date().toISOString(),
      title: song.title || 'Untitled',
      artist: song.artist || 'Unknown',
      capo: song.capo ?? undefined,
    };
    return this.addSong(record);
  }
  /** getSong(songId) or getSong(userId, songId) */
  static async getSong(songIdOrUserId: string, songIdOpt?: string): Promise<SongRecord | null> {
    if (songIdOpt) {
      // two-arg form: getSong(userId, songId)
      const list = await this.getSongs(songIdOrUserId);
      return list.find(s => s.id === songIdOpt) ?? null;
    }
    // one-arg form: getSong(songId) — search current user's songs
    const list = await this.getSongs(getCurrentUserId());
    return list.find(s => s.id === songIdOrUserId) ?? null;
  }
  static async getUserSongProgress(userId?: string, songId?: string): Promise<SongRecord | SongRecord[] | null> {
    const uid = userId || getCurrentUserId();
    const list = await this.getSongs(uid);
    if (songId) {
      return list.find(s => s.id === songId) ?? null;
    }
    return list;
  }
  static async updateUserSongProgress(songIdOrUserId: string | any, songIdOpt?: string, updates?: Partial<SongRecord>): Promise<boolean> {
    // 1-arg object form: updateUserSongProgress({ userId, songId, status, ... })
    if (typeof songIdOrUserId === 'object') {
      const data = songIdOrUserId;
      const uid = data.userId || getCurrentUserId();
      const sid = data.songId;
      if (!sid) return false;
      return this.updateSong(uid, sid, data);
    }
    // 3-arg form: updateUserSongProgress(userId, songId, updates)
    if (songIdOpt && updates) {
      return this.updateSong(songIdOrUserId, songIdOpt, updates);
    }
    return true;
  }
  static async saveGeneratedSong(song: any) {
    return this.saveSong(song);
  }
  static async logYouTubeImport(userIdOrData: string | any, data?: any) {
    let userId: string;
    let importData: any;
    if (typeof userIdOrData === 'string') {
      userId = userIdOrData;
      importData = data;
    } else {
      userId = userIdOrData.userId || getCurrentUserId();
      importData = { url: userIdOrData.youtubeUrl, title: userIdOrData.title, ...userIdOrData };
    }
    return this.addSong({
      userId,
      title: importData.title || 'YouTube Import',
      artist: importData.artist || 'Unknown',
      status: 'wishlist',
      progressPercent: 0,
      youtubeUrl: importData.url || importData.youtubeUrl || '',
      tabs: importData.tabs || '',
      createdAt: new Date().toISOString(),
      ...importData,
    });
  }
  static async getYouTubeImports(userId?: string) {
    const all = await this.getSongs(userId || getCurrentUserId());
    return all.filter(s => !!s.youtubeUrl);
  }
  static async listUserSongProgress(userId?: string) { return this.getSongs(userId || getCurrentUserId()); }
}
