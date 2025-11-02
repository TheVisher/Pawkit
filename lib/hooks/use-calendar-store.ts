"use client";

import { create } from "zustand";
import type { CalendarContentFilter } from "@/components/control-panel/calendar-controls";

type CalendarState = {
  // Current month being viewed
  currentMonth: Date;

  // Selected day for detail view
  selectedDay: Date | null;

  // Content filters (for future AI detection)
  contentFilters: CalendarContentFilter[];

  // Actions
  setCurrentMonth: (date: Date) => void;
  setSelectedDay: (date: Date | null) => void;
  toggleContentFilter: (filter: CalendarContentFilter) => void;
  clearContentFilters: () => void;
};

export const useCalendarStore = create<CalendarState>((set) => ({
  currentMonth: new Date(),
  selectedDay: null,
  contentFilters: [],

  setCurrentMonth: (date: Date) => set({ currentMonth: date }),
  setSelectedDay: (date: Date | null) => set({ selectedDay: date }),

  toggleContentFilter: (filter: CalendarContentFilter) =>
    set((state) => ({
      contentFilters: state.contentFilters.includes(filter)
        ? state.contentFilters.filter((f) => f !== filter)
        : [...state.contentFilters, filter],
    })),

  clearContentFilters: () => set({ contentFilters: [] }),
}));
