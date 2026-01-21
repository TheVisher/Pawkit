/**
 * Calendar Store
 * Manages calendar view state (date navigation, view modes)
 */

import { create } from 'zustand';
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfDay } from 'date-fns';

type ViewMode = 'month' | 'week' | 'day' | 'agenda';

interface CalendarState {
    // State
    currentDate: Date;
    viewMode: ViewMode;

    // Actions
    setDate: (date: Date) => void;
    setViewMode: (mode: ViewMode) => void;
    next: () => void;
    prev: () => void;
    today: () => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
    // Initial state
    currentDate: startOfDay(new Date()),
    viewMode: 'month',

    // Actions
    setDate: (date) => set({ currentDate: startOfDay(date) }),

    setViewMode: (mode) => set({ viewMode: mode }),

    next: () => {
        const { currentDate, viewMode } = get();
        let nextDate = currentDate;

        switch (viewMode) {
            case 'month':
                nextDate = addMonths(currentDate, 1);
                break;
            case 'week':
                nextDate = addWeeks(currentDate, 1);
                break;
            case 'day':
                nextDate = addDays(currentDate, 1);
                break;
        }

        set({ currentDate: nextDate });
    },

    prev: () => {
        const { currentDate, viewMode } = get();
        let prevDate = currentDate;

        switch (viewMode) {
            case 'month':
                prevDate = subMonths(currentDate, 1);
                break;
            case 'week':
                prevDate = subWeeks(currentDate, 1);
                break;
            case 'day':
                prevDate = subDays(currentDate, 1);
                break;
        }

        set({ currentDate: prevDate });
    },

    today: () => set({ currentDate: startOfDay(new Date()) }),
}));
