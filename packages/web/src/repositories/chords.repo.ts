import pb from '../lib/pocketbase';

export interface ChordMasteryRecord {
  id?: string;
  userId: string;
  chordName: string;
  masteryScore: number;
  timesPracticed: number;
  lastPracticed: string;
}

const localKey = (userId: string) => `guitarmind_chord_mastery_${userId}`;
const isOffline = (userId: string) => userId === 'offline_user_id' || !navigator.onLine;

export class ChordsRepo {
  static async getChordMastery(userId: string): Promise<ChordMasteryRecord[]> {
    const cached: ChordMasteryRecord[] = JSON.parse(localStorage.getItem(localKey(userId)) || '[]');
    if (isOffline(userId)) return cached;

    try {
      const res = await pb.list('chord_mastery', {
        filter: `user_id="${userId}"`,
        sort: '-mastery_score',
        perPage: 200,
      });
      const remote: ChordMasteryRecord[] = res.items.map(r => ({
        id: r.id,
        userId: r.user_id,
        chordName: r.chord_name,
        masteryScore: r.mastery_score,
        timesPracticed: r.times_practiced,
        lastPracticed: r.last_practiced,
      }));
      localStorage.setItem(localKey(userId), JSON.stringify(remote));
      return remote;
    } catch {
      return cached;
    }
  }

  static async upsertChordMastery(record: ChordMasteryRecord): Promise<boolean> {
    const key = localKey(record.userId);
    const list: ChordMasteryRecord[] = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = list.findIndex(c => c.chordName === record.chordName);
    if (idx >= 0) list[idx] = record;
    else list.push(record);
    localStorage.setItem(key, JSON.stringify(list));

    if (isOffline(record.userId)) return true;

    try {
      await pb.upsert(
        'chord_mastery',
        `user_id="${record.userId}" && chord_name="${record.chordName}"`,
        {
          user_id: record.userId,
          chord_name: record.chordName,
          mastery_score: record.masteryScore,
          times_practiced: record.timesPracticed,
          last_practiced: record.lastPracticed || new Date().toISOString(),
        }
      );
      return true;
    } catch {
      return true;
    }
  }

  static async batchUpsert(records: ChordMasteryRecord[]): Promise<boolean> {
    for (const r of records) await this.upsertChordMastery(r);
    return true;
  }

  static async deleteChordMastery(userId: string, chordName: string): Promise<boolean> {
    const key = localKey(userId);
    const list: ChordMasteryRecord[] = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify(list.filter(c => c.chordName !== chordName)));

    if (isOffline(userId)) return true;
    try {
      const rec = await pb.getFirst('chord_mastery', `user_id="${userId}" && chord_name="${chordName}"`);
      if (rec) await pb.delete('chord_mastery', rec.id);
      return true;
    } catch {
      return true;
    }
  }
}
