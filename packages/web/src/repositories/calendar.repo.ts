import pb from '../lib/pocketbase';
import type { CalendarEvent, CalendarEventType, EventStatus } from '@guitarmind/core';

export type { CalendarEvent, CalendarEventType, EventStatus };

const localKey = (userId: string) => `guitarmind_calendar_${userId}`;
const isOffline = (userId: string) => userId === 'offline_user_id' || !navigator.onLine;

// Keep CalendarEntry as an alias to avoid breaking any remaining callers
export interface CalendarEntry extends CalendarEvent {
  userId: string;
  date: string;
  scheduledDuration: number;
  actualDuration?: number;
  focusAreas: string[];
  completed: boolean;
  notes?: string;
}

function toEntry(r: any): CalendarEntry {
  return {
    id: r.id || `cal_${Date.now()}`,
    userId: r.user_id,
    date: r.date,
    title: r.title || `Practice on ${r.date}`,
    description: r.notes || '',
    scheduledStart: r.scheduled_start || `${r.date}T08:00:00.000Z`,
    scheduledEnd: r.scheduled_end || `${r.date}T09:00:00.000Z`,
    type: (r.type as CalendarEventType) || 'practice_session',
    status: (r.status as EventStatus) || (r.completed ? 'completed' : 'scheduled'),
    reminderSent: false,
    createdAt: r.created_at || r.created || new Date().toISOString(),
    scheduledDuration: r.scheduled_duration || 60,
    actualDuration: r.actual_duration,
    focusAreas: r.focus_areas || [],
    completed: r.completed || false,
    notes: r.notes || '',
  };
}

export class CalendarRepo {
  static generateUUID(): string {
    return `cal_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  static async getEntries(userId: string): Promise<CalendarEntry[]> {
    const cached: CalendarEntry[] = JSON.parse(localStorage.getItem(localKey(userId)) || '[]');
    if (isOffline(userId)) return cached;

    try {
      const res = await pb.list('practice_calendar', {
        filter: `user_id="${userId}"`,
        sort: '-date',
        perPage: 200,
      });
      const remote = res.items.map(r => toEntry({ ...r, user_id: r.user_id || userId }));
      localStorage.setItem(localKey(userId), JSON.stringify(remote));
      return remote;
    } catch {
      return cached;
    }
  }

  static async upsertEntry(entry: Partial<CalendarEntry> & { userId: string }): Promise<boolean> {
    const key = localKey(entry.userId);
    const list: CalendarEntry[] = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = list.findIndex(e => e.date === entry.date || e.id === entry.id);
    const merged = { ...toEntry({ user_id: entry.userId, date: entry.date || '', ...entry }), ...entry };
    if (idx >= 0) list[idx] = merged;
    else list.push(merged);
    localStorage.setItem(key, JSON.stringify(list));

    if (isOffline(entry.userId)) return true;

    const body: any = {
      user_id: entry.userId,
      date: entry.date || entry.scheduledStart?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      title: entry.title || 'Practice',
      notes: entry.description || entry.notes || '',
      scheduled_duration: entry.scheduledDuration || 60,
      actual_duration: entry.actualDuration || 0,
      focus_areas: entry.focusAreas || [],
      completed: entry.completed || entry.status === 'completed',
      status: entry.status || 'scheduled',
      type: entry.type || 'practice_session',
      scheduled_start: entry.scheduledStart,
      scheduled_end: entry.scheduledEnd,
    };

    try {
      await pb.upsert(
        'practice_calendar',
        `user_id="${entry.userId}" && date="${body.date}"`,
        body
      );
      return true;
    } catch {
      return true;
    }
  }

  static async deleteEntry(userId: string, idOrDate: string): Promise<boolean> {
    const key = localKey(userId);
    const list: CalendarEntry[] = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify(list.filter(e => e.date !== idOrDate && e.id !== idOrDate)));

    if (isOffline(userId)) return true;

    try {
      const rec = await pb.getFirst('practice_calendar', `user_id="${userId}" && (date="${idOrDate}")`);
      if (rec) await pb.delete('practice_calendar', rec.id);
      return true;
    } catch {
      return true;
    }
  }

  static async getEntry(userId: string, idOrDate: string): Promise<CalendarEntry | null> {
    const list = await this.getEntries(userId);
    return list.find(e => e.date === idOrDate || e.id === idOrDate) ?? null;
  }

  // ---- Backward-compatible aliases (CalendarEvent API) ----
  static async listEvents(userId: string): Promise<CalendarEntry[]> { return this.getEntries(userId); }

  /** createEvent(userId, entry) */
  static async createEvent(userId: string, entry: Partial<CalendarEntry>): Promise<boolean> {
    return this.upsertEntry({ userId, ...entry } as any);
  }

  /** updateEvent(id, partial) or updateEvent(userId, entry) */
  static async updateEvent(userIdOrId: string, entryOrPartial: Partial<CalendarEntry>): Promise<boolean> {
    // If second arg has a date, treat first arg as userId
    if (entryOrPartial.date || entryOrPartial.scheduledStart) {
      return this.upsertEntry({ userId: userIdOrId, ...entryOrPartial } as any);
    }
    // Otherwise treat first arg as eventId, get userId from store
    const userId = (await import('../store')).appStore.getState().currentUser?.uid || 'offline_user_id';
    const existing = await this.getEntry(userId, userIdOrId);
    if (existing) {
      return this.upsertEntry({ ...existing, ...entryOrPartial });
    }
    return false;
  }

  /** deleteEvent(id) or deleteEvent(userId, id) */
  static async deleteEvent(userIdOrId: string, idOpt?: string): Promise<boolean> {
    if (idOpt) return this.deleteEntry(userIdOrId, idOpt);
    const userId = (await import('../store')).appStore.getState().currentUser?.uid || 'offline_user_id';
    return this.deleteEntry(userId, userIdOrId);
  }

  /** getEvent(id) or getEvent(userId, id) */
  static async getEvent(userIdOrId: string, idOpt?: string): Promise<CalendarEntry | null> {
    if (idOpt) return this.getEntry(userIdOrId, idOpt);
    const userId = (await import('../store')).appStore.getState().currentUser?.uid || 'offline_user_id';
    return this.getEntry(userId, userIdOrId);
  }
}
