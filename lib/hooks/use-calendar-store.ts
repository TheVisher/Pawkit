"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CalendarContentFilter } from "@/components/control-panel/calendar-controls";

export type CalendarViewMode = "day" | "week" | "month";
export type HolidayFilter = "all" | "major";
export type HolidayCountry = "us" | "ca"; // Extensible for EU, China, etc.

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
  showHolidays: boolean; // Legacy - kept for backwards compatibility
  holidayFilter: HolidayFilter;
  enabledCountries: HolidayCountry[]; // Which country holidays to show

  // Actions
  setCurrentMonth: (date: Date) => void;
  setViewMode: (mode: CalendarViewMode) => void;
  setSelectedDay: (date: Date | null) => void;
  toggleContentFilter: (filter: CalendarContentFilter) => void;
  clearContentFilters: () => void;
  setShowHolidays: (show: boolean) => void;
  setHolidayFilter: (filter: HolidayFilter) => void;
  toggleCountry: (country: HolidayCountry) => void;
};

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      currentMonth: new Date(),
      viewMode: "month",
      selectedDay: null,
      contentFilters: [],
      showHolidays: true,  // Legacy - kept for backwards compatibility
      holidayFilter: "major",  // Default to major holidays only
      enabledCountries: ["us"] as HolidayCountry[],  // Default to US holidays

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
            ? state.enabledCountries.length > 1  // Will have at least one after toggle
            : true,  // Adding a country means holidays are shown
        })),
    }),
    {
      name: "pawkit-calendar-settings",
      // Only persist settings that should survive refresh, not navigation state
      partialize: (state) => ({
        showHolidays: state.showHolidays,
        holidayFilter: state.holidayFilter,
        viewMode: state.viewMode,
        enabledCountries: state.enabledCountries,
      }),
    }
  )
);
