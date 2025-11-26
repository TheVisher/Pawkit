"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CalendarContentFilter } from "@/components/control-panel/calendar-controls";

export type CalendarViewMode = "month" | "week";
export type HolidayFilter = "all" | "major";

type CalendarState = {
  // Current month being viewed
  currentMonth: Date;

  // View mode (month or week)
  viewMode: CalendarViewMode;

  // Selected day for detail view
  selectedDay: Date | null;

  // Content filters (for future AI detection)
  contentFilters: CalendarContentFilter[];

  // Holiday settings
  showHolidays: boolean;
  holidayFilter: HolidayFilter;

  // Actions
  setCurrentMonth: (date: Date) => void;
  setViewMode: (mode: CalendarViewMode) => void;
  setSelectedDay: (date: Date | null) => void;
  toggleContentFilter: (filter: CalendarContentFilter) => void;
  clearContentFilters: () => void;
  setShowHolidays: (show: boolean) => void;
  setHolidayFilter: (filter: HolidayFilter) => void;
};

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      currentMonth: new Date(),
      viewMode: "month",
      selectedDay: null,
      contentFilters: [],
      showHolidays: true,  // Default to showing holidays
      holidayFilter: "major",  // Default to major holidays only

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
    }),
    {
      name: "pawkit-calendar-settings",
      // Only persist settings that should survive refresh, not navigation state
      partialize: (state) => ({
        showHolidays: state.showHolidays,
        holidayFilter: state.holidayFilter,
        viewMode: state.viewMode,
      }),
    }
  )
);
