/**
 * @module Calendar Types
 * Calendar event scheduling and synchronization with external providers
 */

import type { CalendarProvider } from './user';

/** Status of scheduled event */
export type EventStatus = 'scheduled' | 'completed' | 'missed' | 'rescheduled' | 'cancelled';

/** Purpose of scheduled calendar event */
export type CalendarEventType = 'practice_session' | 'interactive_lesson' | 'jam_mode' | 'custom';

/**
 * An event scheduled in the system calendar
 * Stored in Firestore at `users/{userId}/calendar_events/{eventId}`
 */
export interface CalendarEvent {
  /** Unique system event ID */
  id: string;
  /** Title of the event (e.g. "Guitar Practice: Major Scales") */
  title: string;
  /** Description/notes of the planned activities */
  description?: string;
  /** Start timestamp (ISO string) */
  scheduledStart: string;
  /** End timestamp (ISO string) */
  scheduledEnd: string;
  /** Purpose of the event */
  type: CalendarEventType;
  /** Current status */
  status: EventStatus;
  /** Sync status with external provider */
  syncState?: {
    /** Calendar provider */
    provider: CalendarProvider;
    /** ID of the calendar in the provider system */
    externalCalendarId: string;
    /** Event ID in the provider system */
    externalEventId: string;
    /** Last sync timestamp (ISO string) */
    lastSyncedAt: string;
  };
  /** Linked roadmap task ID (if scheduling a specific task) */
  roadmapTaskId?: string;
  /** Linked lesson ID (if scheduling a lesson) */
  lessonId?: string;
  /** Whether the notification system has sent a practice reminder */
  reminderSent: boolean;
  /** Timestamp when event was scheduled (ISO string) */
  createdAt: string;
}
