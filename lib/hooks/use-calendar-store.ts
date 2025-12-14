"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CalendarContentFilter } from "@/components/control-panel/calendar-controls";

export type CalendarViewMode = "day" | "week" | "month" | "agenda";
export type HolidayFilter = "all" | "major";
export type HolidayCountry = "us" | "ca"; // Extensible for EU, China, etc.

// Calendar source types for external calendar integrations
export type CalendarSourceType = "local" | "google" | "caldav" | "ical";

export type CalendarSource = {
  id: string;
  name: string;
  type: CalendarSourceType;
  color: string;
  isConnected: boolean;
  accountEmail?: string; // For OAuth sources
  syncUrl?: string; // For CalDAV/iCal
  lastSynced?: string;
};

// Notification reminder time options (minutes before event)
export type ReminderMinutes = 0 | 5 | 10 | 15 | 30 | 60 | 120 | 1440;

// Week start day (0 = Sunday, 1 = Monday)
export type WeekStartDay = 0 | 1;

type CalendarState = {
  // Current month being viewed
  currentMonth: Date;

  // View mode (month or week)
  viewMode: CalendarViewMode;

  // Selected day for detail view
  selectedDay: Date | null;

  // Content filters (for future AI detection)
  contentFilters: CalendarContentFilter[];

  // Visibility filters - what to show on calendar
  showUrlCards: boolean;
  showTodos: boolean;
  showManualEvents: boolean;
  showDailyNotes: boolean;

  // Calendar sources
  calendarSources: CalendarSource[];
  enabledCalendarSources: string[]; // IDs of enabled sources

  // Holiday settings
  showHolidays: boolean; // Legacy - kept for backwards compatibility
  holidayFilter: HolidayFilter;
  enabledCountries: HolidayCountry[]; // Which country holidays to show

  // Notification settings
  notificationsEnabled: boolean; // Master toggle for notifications
  eventReminderMinutes: ReminderMinutes; // Minutes before event to notify
  todoNotificationsEnabled: boolean; // Notify for todo due dates
  todoReminderTime: string; // Time of day to notify for todos (HH:mm)

  // Week start preference
  weekStartsOn: WeekStartDay; // 0 = Sunday, 1 = Monday

  // Actions
  setCurrentMonth: (date: Date) => void;
  setViewMode: (mode: CalendarViewMode) => void;
  setSelectedDay: (date: Date | null) => void;
  toggleContentFilter: (filter: CalendarContentFilter) => void;
  clearContentFilters: () => void;
  setShowHolidays: (show: boolean) => void;
  setHolidayFilter: (filter: HolidayFilter) => void;
  toggleCountry: (country: HolidayCountry) => void;

  // Visibility filter actions
  toggleShowUrlCards: () => void;
  toggleShowTodos: () => void;
  toggleShowManualEvents: () => void;
  toggleShowDailyNotes: () => void;

  // Calendar source actions
  addCalendarSource: (source: CalendarSource) => void;
  removeCalendarSource: (id: string) => void;
  updateCalendarSource: (id: string, updates: Partial<CalendarSource>) => void;
  toggleCalendarSource: (sourceId: string) => void;

  // Notification actions
  setNotificationsEnabled: (enabled: boolean) => void;
  setEventReminderMinutes: (minutes: ReminderMinutes) => void;
  setTodoNotificationsEnabled: (enabled: boolean) => void;
  setTodoReminderTime: (time: string) => void;

  // Week start action
  setWeekStartsOn: (day: WeekStartDay) => void;
};

// Default local calendar source
const DEFAULT_CALENDAR_SOURCE: CalendarSource = {
  id: "local",
  name: "My Calendar",
  type: "local",
  color: "#8b5cf6", // Purple
  isConnected: true,
};

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      currentMonth: new Date(),
      viewMode: "month",
      selectedDay: null,
      contentFilters: [],

      // Visibility filters - all enabled by default
      showUrlCards: true,
      showTodos: true,
      showManualEvents: true,
      showDailyNotes: true,

      // Calendar sources
      calendarSources: [DEFAULT_CALENDAR_SOURCE],
      enabledCalendarSources: ["local"],

      showHolidays: true, // Legacy - kept for backwards compatibility
      holidayFilter: "major", // Default to major holidays only
      enabledCountries: ["us"] as HolidayCountry[], // Default to US holidays

      // Notification settings - disabled by default until user enables
      notificationsEnabled: false,
      eventReminderMinutes: 15, // 15 minutes before by default
      todoNotificationsEnabled: true, // Notify for todos when notifications enabled
      todoReminderTime: "09:00", // 9 AM reminder for todo due dates

      // Week start - default to Sunday (US standard)
      weekStartsOn: 0,

      setCurrentMonth: (date: Date) => set({ currentMonth: date }),
      setViewMode: (mode: CalendarViewMode) => set({ viewMode: mode }),
      setSelectedDay: (date: Date | null) => set({ selectedDay: date }),

      toggleContentFilter: (filter: CalendarContentFilter) =>
        set((state) => ({
          contentFilters: state.contentFilters.includes(filter)
            ? state.contentFilters.filter((f) => f !== filter)
            : [...state.contentFilters, filter],
        })),

      clearContentFilters: () => set({ contentFilters: [] }),
      setShowHolidays: (show: boolean) => set({ showHolidays: show }),
      setHolidayFilter: (filter: HolidayFilter) => set({ holidayFilter: filter }),
      toggleCountry: (country: HolidayCountry) =>
        set((state) => ({
          enabledCountries: state.enabledCountries.includes(country)
            ? state.enabledCountries.filter((c) => c !== country)
            : [...state.enabledCountries, country],
          // Also update showHolidays based on whether any countries are enabled
          showHolidays: state.enabledCountries.includes(country)
            ? state.enabledCountries.length > 1 // Will have at least one after toggle
            : true, // Adding a country means holidays are shown
        })),

      // Visibility filter actions
      toggleShowUrlCards: () =>
        set((state) => ({ showUrlCards: !state.showUrlCards })),
      toggleShowTodos: () =>
        set((state) => ({ showTodos: !state.showTodos })),
      toggleShowManualEvents: () =>
        set((state) => ({ showManualEvents: !state.showManualEvents })),
      toggleShowDailyNotes: () =>
        set((state) => ({ showDailyNotes: !state.showDailyNotes })),

      // Calendar source actions
      addCalendarSource: (source: CalendarSource) =>
        set((state) => ({
          calendarSources: [...state.calendarSources, source],
          enabledCalendarSources: [...state.enabledCalendarSources, source.id],
        })),
      removeCalendarSource: (id: string) =>
        set((state) => ({
          calendarSources: state.calendarSources.filter((s) => s.id !== id),
          enabledCalendarSources: state.enabledCalendarSources.filter(
            (sId) => sId !== id
          ),
        })),
      updateCalendarSource: (id: string, updates: Partial<CalendarSource>) =>
        set((state) => ({
          calendarSources: state.calendarSources.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),
      toggleCalendarSource: (sourceId: string) =>
        set((state) => ({
          enabledCalendarSources: state.enabledCalendarSources.includes(sourceId)
            ? state.enabledCalendarSources.filter((id) => id !== sourceId)
            : [...state.enabledCalendarSources, sourceId],
        })),

      // Notification actions
      setNotificationsEnabled: (enabled: boolean) =>
        set({ notificationsEnabled: enabled }),
      setEventReminderMinutes: (minutes: ReminderMinutes) =>
        set({ eventReminderMinutes: minutes }),
      setTodoNotificationsEnabled: (enabled: boolean) =>
        set({ todoNotificationsEnabled: enabled }),
      setTodoReminderTime: (time: string) =>
        set({ todoReminderTime: time }),

      // Week start action
      setWeekStartsOn: (day: WeekStartDay) =>
        set({ weekStartsOn: day }),
    }),
    {
      name: "pawkit-calendar-settings",
      // Only persist settings that should survive refresh, not navigation state
      partialize: (state) => ({
        showHolidays: state.showHolidays,
        holidayFilter: state.holidayFilter,
        viewMode: state.viewMode,
        enabledCountries: state.enabledCountries,
        // Persist new filter settings
        showUrlCards: state.showUrlCards,
        showTodos: state.showTodos,
        showManualEvents: state.showManualEvents,
        showDailyNotes: state.showDailyNotes,
        // Persist calendar sources
        calendarSources: state.calendarSources,
        enabledCalendarSources: state.enabledCalendarSources,
        // Persist notification settings
        notificationsEnabled: state.notificationsEnabled,
        eventReminderMinutes: state.eventReminderMinutes,
        todoNotificationsEnabled: state.todoNotificationsEnabled,
        todoReminderTime: state.todoReminderTime,
        // Persist week start preference
        weekStartsOn: state.weekStartsOn,
      }),
    }
  )
);
