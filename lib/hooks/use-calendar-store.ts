"use client";

import { create } from "zustand";
import type { CalendarContentFilter } from "@/components/control-panel/calendar-controls";

export type CalendarViewMode = "month" | "week";

type CalendarState = {
  // Current month being viewed
  currentMonth: Date;

  // View mode (month or week)
  viewMode: CalendarViewMode;

  // Selected day for detail view
  selectedDay: Date | null;

  // Content filters (for future AI detection)
  contentFilters: CalendarContentFilter[];

  // Actions
  setCurrentMonth: (date: Date) => void;
  setViewMode: (mode: CalendarViewMode) => void;
  setSelectedDay: (date: Date | null) => void;
  toggleContentFilter: (filter: CalendarContentFilter) => void;
  clearContentFilters: () => void;
};

export const useCalendarStore = create<CalendarState>((set) => ({
  currentMonth: new Date(),
  viewMode: "month",
  selectedDay: null,
  contentFilters: [],

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
}));
