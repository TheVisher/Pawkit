"use client";

import { create } from 'zustand';
import { localDb } from '@/lib/services/local-storage';
import { useSettingsStore } from '@/lib/hooks/settings-store';
import { markDeviceActive, getSessionId } from '@/lib/utils/device-session';
import { useToastStore } from '@/lib/stores/toast-store';
import {
  CalendarEvent,
  CalendarEventUpdate,
  RecurrenceInstance,
  EVENT_COLORS,
} from '@/lib/types/calendar';
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfDay,
  endOfDay,
  isBefore,
  isAfter,
  format,
  getDay,
  getDate,
  differenceInDays,
} from 'date-fns';

/**
 * Write guard: Ensures only the active tab/session can modify data
 */
function ensureActiveDevice(): boolean {
  const currentSessionId = getSessionId();
  const activeSessionId = localStorage.getItem('pawkit_active_device');

  if (activeSessionId && activeSessionId !== currentSessionId) {
    useToastStore.getState().warning('Another tab is active. Please refresh and click "Use This Tab" to continue.', 5000);
    return false;
  }

  return true;
}

type EventStore = {
  // Data
  events: CalendarEvent[];

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  isSyncing: boolean;

  // Actions
  initialize: () => Promise<void>;
  sync: () => Promise<void>;
  addEvent: (eventData: Partial<CalendarEvent>) => Promise<CalendarEvent | null>;
  updateEvent: (id: string, updates: CalendarEventUpdate) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  excludeDateFromRecurrence: (id: string, dateToExclude: string) => Promise<void>;
  createExceptionInstance: (parentEvent: CalendarEvent, instanceDate: string) => Promise<CalendarEvent | null>;
  refresh: () => Promise<void>;
  pushPendingEvents: () => Promise<void>;

  // Query helpers
  getEventsByDateRange: (startDate: string, endDate: string) => CalendarEvent[];
  getUpcomingEvents: (limit?: number) => CalendarEvent[];
  generateRecurrenceInstances: (event: CalendarEvent, rangeStart: string, rangeEnd: string) => RecurrenceInstance[];
};

/**
 * Generate recurrence instances for a recurring event within a date range
 */
function generateRecurrenceInstancesInternal(
  event: CalendarEvent,
  rangeStart: string,
  rangeEnd: string
): RecurrenceInstance[] {
  // Handle multi-day events (events with endDate)
  if (event.endDate && event.endDate !== event.date && !event.recurrence) {
    const instances: RecurrenceInstance[] = [];
    const eventStart = new Date(event.date + 'T00:00:00');
    const eventEnd = new Date(event.endDate + 'T00:00:00');
    const rangeStartObj = new Date(rangeStart + 'T00:00:00');
    const rangeEndObj = new Date(rangeEnd + 'T00:00:00');

    // Generate an instance for each day the event spans within the visible range
    let currentDate = new Date(Math.max(eventStart.getTime(), rangeStartObj.getTime()));
    const endDate = new Date(Math.min(eventEnd.getTime(), rangeEndObj.getTime()));

    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      instances.push({
        event,
        instanceDate: dateStr,
        isOriginal: dateStr === event.date,
      });
      currentDate = addDays(currentDate, 1);
    }

    return instances;
  }

  if (!event.recurrence) {
    // Non-recurring event - just check if it falls within range
    if (event.date >= rangeStart && event.date <= rangeEnd) {
      return [{
        event,
        instanceDate: event.date,
        isOriginal: true,
      }];
    }
    return [];
  }

  const instances: RecurrenceInstance[] = [];
  const { frequency, interval = 1, daysOfWeek, dayOfMonth, weekOfMonth, endDate, endCount } = event.recurrence;
  const excludedDates = new Set(event.excludedDates || []);

  const startDateObj = new Date(event.date + 'T00:00:00');
  const rangeStartObj = startOfDay(new Date(rangeStart + 'T00:00:00'));
  const rangeEndObj = endOfDay(new Date(rangeEnd + 'T00:00:00'));
  const recurrenceEndObj = endDate ? new Date(endDate + 'T23:59:59') : null;

  let currentDate = startDateObj;
  let instanceCount = 0;
  const maxIterations = 1000; // Safety limit
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    // Check if we've exceeded the recurrence end conditions
    if (recurrenceEndObj && isAfter(currentDate, recurrenceEndObj)) break;
    if (endCount && instanceCount >= endCount) break;
    if (isAfter(currentDate, rangeEndObj)) break;

    // Check if this instance falls within our range
    const dateStr = format(currentDate, 'yyyy-MM-dd');

    if (!isBefore(currentDate, rangeStartObj) && !isAfter(currentDate, rangeEndObj)) {
      // Skip excluded dates
      if (excludedDates.has(dateStr)) {
        // Still increment and continue, just don't add to instances
      }
      // For weekly recurrence with specific days
      else if (frequency === 'weekly' && daysOfWeek && daysOfWeek.length > 0) {
        const dayOfWeek = getDay(currentDate);
        if (daysOfWeek.includes(dayOfWeek)) {
          instances.push({
            event,
            instanceDate: dateStr,
            isOriginal: dateStr === event.date,
          });
          instanceCount++;
        }
      } else {
        instances.push({
          event,
          instanceDate: dateStr,
          isOriginal: dateStr === event.date,
        });
        instanceCount++;
      }
    } else if (!isBefore(currentDate, rangeStartObj)) {
      // We've passed the range end
      break;
    }

    // Calculate next occurrence based on frequency
    switch (frequency) {
      case 'daily':
        currentDate = addDays(currentDate, interval);
        break;
      case 'weekly':
        if (daysOfWeek && daysOfWeek.length > 0) {
          // Move to next day, checking each day
          currentDate = addDays(currentDate, 1);
        } else {
          currentDate = addWeeks(currentDate, interval);
        }
        break;
      case 'biweekly':
        currentDate = addWeeks(currentDate, 2 * interval);
        break;
      case 'monthly':
        if (weekOfMonth !== undefined) {
          // "3rd Friday" pattern - more complex, skip for now
          currentDate = addMonths(currentDate, interval);
        } else if (dayOfMonth !== undefined) {
          // Specific day of month
          currentDate = addMonths(currentDate, interval);
          // Adjust to the correct day of month
          const newDate = new Date(currentDate);
          newDate.setDate(Math.min(dayOfMonth, new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate()));
          currentDate = newDate;
        } else {
          currentDate = addMonths(currentDate, interval);
        }
        break;
      case 'yearly':
        currentDate = addYears(currentDate, interval);
        break;
    }
  }

  return instances;
}

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  isLoading: false,
  isInitialized: false,
  isSyncing: false,

  /**
   * Initialize: Load events from IndexedDB
   */
  initialize: async () => {
    if (get().isInitialized) {
      return;
    }

    set({ isLoading: true });

    try {
      const allEvents = await localDb.getAllEvents();
      const filteredEvents = allEvents.filter(e => e.deleted !== true);

      set({
        events: filteredEvents,
        isInitialized: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('[EventStore] Failed to initialize:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Sync: Bidirectional sync with server
   */
  sync: async () => {
    const serverSync = useSettingsStore.getState().serverSync;
    if (!serverSync) {
      console.log('[EventStore] Server sync disabled, skipping');
      return;
    }

    if (get().isSyncing) {
      console.log('[EventStore] Already syncing, skipping');
      return;
    }

    set({ isSyncing: true });

    try {
      // STEP 1: Push pending local changes to server
      await get().pushPendingEvents();

      // STEP 2: Pull events from server
      const response = await fetch('/api/events?includeDeleted=true');
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }

      const { items: serverEvents } = await response.json();

      // STEP 3: Merge server events with local events
      for (const serverEvent of serverEvents) {
        const localEvent = await localDb.getEvent(serverEvent.id);

        if (!localEvent) {
          // New event from server - save locally
          await localDb.saveEvent(serverEvent, { fromServer: true });
        } else {
          // Event exists locally - resolve conflict (newest wins)
          const localTime = new Date(localEvent.updatedAt).getTime();
          const serverTime = new Date(serverEvent.updatedAt).getTime();

          if (serverTime > localTime) {
            // Server is newer - update local
            await localDb.saveEvent(serverEvent, { fromServer: true });
          }
          // If local is newer, it will be pushed in next sync
        }
      }

      // STEP 4: Reload from local storage (now has merged data)
      const allEvents = await localDb.getAllEvents();
      const filteredEvents = allEvents.filter(e => e.deleted !== true);

      set({ events: filteredEvents });
      console.log('[EventStore] Sync complete:', filteredEvents.length, 'events');
    } catch (error) {
      console.error('[EventStore] Sync failed:', error);
    } finally {
      set({ isSyncing: false });
    }
  },

  /**
   * Push pending local events to server
   */
  pushPendingEvents: async () => {
    const modifiedEvents = await localDb.getModifiedEvents();
    if (modifiedEvents.length === 0) {
      return;
    }

    console.log('[EventStore] Pushing', modifiedEvents.length, 'pending events');

    for (const event of modifiedEvents) {
      try {
        const isTemp = event.id.startsWith('temp_');

        if (isTemp) {
          // Create new event on server
          const response = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
          });

          if (response.ok) {
            const serverEvent = await response.json();

            // Replace temp event with server event
            await localDb.permanentlyDeleteEvent(event.id);
            await localDb.saveEvent(serverEvent, { fromServer: true });

            // Update state
            set((state) => ({
              events: state.events.map(e => e.id === event.id ? serverEvent : e),
            }));
          }
        } else {
          // Update existing event on server
          const response = await fetch(`/api/events/${event.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
          });

          if (response.ok) {
            const serverEvent = await response.json();
            await localDb.markEventSynced(event.id, serverEvent.updatedAt);
          }
        }
      } catch (error) {
        console.error('[EventStore] Failed to push event:', event.id, error);
        // Continue with other events
      }
    }
  },

  /**
   * Refresh: Reload events from IndexedDB
   */
  refresh: async () => {
    set({ isLoading: true });

    try {
      const allEvents = await localDb.getAllEvents();
      const filteredEvents = allEvents.filter(e => e.deleted !== true);

      set({ events: filteredEvents, isLoading: false });
    } catch (error) {
      console.error('[EventStore] Failed to refresh:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Add event: Save to local first, then sync to server
   */
  addEvent: async (eventData: Partial<CalendarEvent>) => {
    if (!ensureActiveDevice()) {
      return null;
    }

    markDeviceActive();

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const newEvent: CalendarEvent = {
      id: tempId,
      userId: '',
      title: eventData.title || 'Untitled Event',
      date: eventData.date || format(new Date(), 'yyyy-MM-dd'),
      endDate: eventData.endDate ?? null,
      startTime: eventData.startTime ?? null,
      endTime: eventData.endTime ?? null,
      isAllDay: eventData.isAllDay ?? true,
      description: eventData.description ?? null,
      location: eventData.location ?? null,
      url: eventData.url ?? null,
      color: eventData.color ?? EVENT_COLORS.purple,
      recurrence: eventData.recurrence ?? null,
      recurrenceParentId: eventData.recurrenceParentId ?? null,
      excludedDates: eventData.excludedDates ?? [],
      isException: eventData.isException ?? false,
      source: eventData.source ?? { type: 'manual' },
      createdAt: now,
      updatedAt: now,
      deleted: false,
    };

    try {
      // STEP 1: Save to local storage FIRST (source of truth)
      await localDb.saveEvent(newEvent, { localOnly: true });

      // STEP 2: Update Zustand for instant UI
      set((state) => ({
        events: [newEvent, ...state.events],
      }));

      // STEP 3: Sync to server in background (if enabled)
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync) {
        // Try immediate sync
        try {
          const response = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData),
          });

          if (response.ok) {
            const serverEvent = await response.json();

            // Replace temp event with server event
            await localDb.permanentlyDeleteEvent(tempId);
            await localDb.saveEvent(serverEvent, { fromServer: true });

            // Update state with server event
            set((state) => ({
              events: state.events.map(e => e.id === tempId ? serverEvent : e),
            }));

            return serverEvent;
          }
        } catch (syncError) {
          console.log('[EventStore] Immediate sync failed, will retry later:', syncError);
          // Event is saved locally, will be synced later
        }
      }

      return newEvent;
    } catch (error) {
      console.error('[EventStore] Failed to add event:', error);
      throw error;
    }
  },

  /**
   * Update event: Save to local first, then sync to server
   */
  updateEvent: async (id: string, updates: CalendarEventUpdate) => {
    if (!ensureActiveDevice()) {
      return;
    }

    markDeviceActive();

    const oldEvent = get().events.find(e => e.id === id);
    if (!oldEvent) return;

    const updatedEvent: CalendarEvent = {
      ...oldEvent,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    try {
      // STEP 1: Save to local storage FIRST
      await localDb.saveEvent(updatedEvent, { localOnly: true });

      // STEP 2: Update Zustand for instant UI
      set((state) => ({
        events: state.events.map(e => e.id === id ? updatedEvent : e),
      }));

      // STEP 3: Sync to server in background (if enabled)
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync && !id.startsWith('temp_')) {
        try {
          const response = await fetch(`/api/events/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });

          if (response.ok) {
            const serverEvent = await response.json();
            await localDb.markEventSynced(id, serverEvent.updatedAt);
          }
        } catch (syncError) {
          console.log('[EventStore] Update sync failed, will retry later:', syncError);
        }
      }
    } catch (error) {
      console.error('[EventStore] Failed to update event:', error);
      throw error;
    }
  },

  /**
   * Delete event: Soft delete locally first, then sync
   */
  deleteEvent: async (id: string) => {
    if (!ensureActiveDevice()) {
      return;
    }

    markDeviceActive();

    try {
      // STEP 1: Soft delete in local storage
      await localDb.deleteEvent(id);

      // STEP 2: Update Zustand for instant UI
      set((state) => ({
        events: state.events.filter(e => e.id !== id),
      }));

      // STEP 3: Sync to server in background (if enabled)
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync && !id.startsWith('temp_')) {
        try {
          await fetch(`/api/events/${id}`, {
            method: 'DELETE',
          });
        } catch (syncError) {
          console.log('[EventStore] Delete sync failed, will retry later:', syncError);
        }
      } else if (id.startsWith('temp_')) {
        // Temp event that never synced - just remove from local storage permanently
        await localDb.permanentlyDeleteEvent(id);
      }
    } catch (error) {
      console.error('[EventStore] Failed to delete event:', error);
      throw error;
    }
  },

  /**
   * Exclude a specific date from a recurring event (delete single instance)
   */
  excludeDateFromRecurrence: async (id: string, dateToExclude: string) => {
    if (!ensureActiveDevice()) {
      return;
    }

    markDeviceActive();

    const event = get().events.find(e => e.id === id);
    if (!event || !event.recurrence) return;

    const updatedExcludedDates = [...(event.excludedDates || []), dateToExclude];

    const updatedEvent: CalendarEvent = {
      ...event,
      excludedDates: updatedExcludedDates,
      updatedAt: new Date().toISOString(),
    };

    try {
      // STEP 1: Save to local storage FIRST
      await localDb.saveEvent(updatedEvent, { localOnly: true });

      // STEP 2: Update Zustand for instant UI
      set((state) => ({
        events: state.events.map(e => e.id === id ? updatedEvent : e),
      }));

      // STEP 3: Sync to server in background (if enabled)
      const serverSync = useSettingsStore.getState().serverSync;
      if (serverSync && !id.startsWith('temp_')) {
        try {
          await fetch(`/api/events/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ excludedDates: updatedExcludedDates }),
          });
        } catch (syncError) {
          console.log('[EventStore] excludeDate sync failed, will retry later:', syncError);
        }
      }
    } catch (error) {
      console.error('[EventStore] Failed to exclude date from recurrence:', error);
      throw error;
    }
  },

  /**
   * Create an exception instance for a recurring event (edit single instance)
   * This creates a new non-recurring event for a specific date and excludes that date from the parent
   */
  createExceptionInstance: async (parentEvent: CalendarEvent, instanceDate: string) => {
    if (!ensureActiveDevice()) {
      return null;
    }

    markDeviceActive();

    if (!parentEvent.recurrence) return null;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    // Create exception event (copy of parent but without recurrence)
    const exceptionEvent: CalendarEvent = {
      id: tempId,
      userId: parentEvent.userId,
      title: parentEvent.title,
      date: instanceDate,
      startTime: parentEvent.startTime,
      endTime: parentEvent.endTime,
      isAllDay: parentEvent.isAllDay,
      description: parentEvent.description,
      location: parentEvent.location,
      url: parentEvent.url,
      color: parentEvent.color,
      recurrence: null, // Exception is not recurring
      recurrenceParentId: parentEvent.id, // Link to parent
      isException: true,
      source: parentEvent.source,
      createdAt: now,
      updatedAt: now,
      deleted: false,
    };

    // Update parent to exclude this date
    const updatedExcludedDates = [...(parentEvent.excludedDates || []), instanceDate];
    const updatedParent: CalendarEvent = {
      ...parentEvent,
      excludedDates: updatedExcludedDates,
      updatedAt: now,
    };

    try {
      // STEP 1: Save both to local storage
      await localDb.saveEvent(exceptionEvent, { localOnly: true });
      await localDb.saveEvent(updatedParent, { localOnly: true });

      // STEP 2: Update Zustand for instant UI
      set((state) => ({
        events: [
          exceptionEvent,
          ...state.events.map(e => e.id === parentEvent.id ? updatedParent : e),
        ],
      }));

      return exceptionEvent;
    } catch (error) {
      console.error('[EventStore] Failed to create exception instance:', error);
      throw error;
    }
  },

  /**
   * Get events by date range (from current state)
   */
  getEventsByDateRange: (startDate: string, endDate: string) => {
    const { events } = get();
    return events.filter(event =>
      event.date >= startDate && event.date <= endDate
    );
  },

  /**
   * Get upcoming events sorted by date
   */
  getUpcomingEvents: (limit = 5) => {
    const { events } = get();
    const today = format(new Date(), 'yyyy-MM-dd');

    return events
      .filter(event => event.date >= today)
      .sort((a, b) => {
        // Sort by date first
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        // Then by start time (all-day events first)
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        if (a.startTime && b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        }
        return 0;
      })
      .slice(0, limit);
  },

  /**
   * Generate recurrence instances for display
   */
  generateRecurrenceInstances: (event: CalendarEvent, rangeStart: string, rangeEnd: string) => {
    return generateRecurrenceInstancesInternal(event, rangeStart, rangeEnd);
  },
}));
