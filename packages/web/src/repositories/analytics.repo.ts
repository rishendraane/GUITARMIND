import pb from '../lib/pocketbase';

const localKey = (userId: string) => `guitarmind_analytics_${userId}`;
const isOffline = (userId: string) => userId === 'offline_user_id' || !navigator.onLine;

export interface AnalyticsEvent {
  userId: string;
  eventType: string;
  metadata?: Record<string, any>;
  occurredAt?: string;
}

export class AnalyticsRepo {
  static async logEvent(event: AnalyticsEvent): Promise<boolean> {
    const key = localKey(event.userId);
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.unshift({ ...event, occurredAt: event.occurredAt || new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(list.slice(0, 500)));

    if (isOffline(event.userId)) return true;

    // Fire-and-forget — don't await so we never slow down the UI
    pb.create('analytics_events', {
      user_id: event.userId,
      event_type: event.eventType,
      metadata: event.metadata || {},
      occurred_at: event.occurredAt || new Date().toISOString(),
    }).catch(() => { /* analytics loss is acceptable */ });

    return true;
  }

  static async getEvents(userId: string, limit = 100): Promise<AnalyticsEvent[]> {
    const cached = JSON.parse(localStorage.getItem(localKey(userId)) || '[]');
    if (isOffline(userId)) return cached.slice(0, limit);

    try {
      const res = await pb.list('analytics_events', {
        filter: `user_id="${userId}"`,
        sort: '-occurred_at',
        perPage: limit,
      });
      return res.items.map(r => ({
        userId: r.user_id,
        eventType: r.event_type,
        metadata: r.metadata,
        occurredAt: r.occurred_at,
      }));
    } catch {
      return cached.slice(0, limit);
    }
  }
}
