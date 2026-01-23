"use client";

import { useCalendarStore } from "@/lib/stores/calendar-store";
import {
  MiniCalendar,
  TaskInbox,
  CalendarSources,
  UpcomingEvents,
  MonthSettings,
  TimeGridSettings,
  AgendaGrouping,
} from "./CalendarSections";

export function CalendarSidebar() {
  const { viewMode: currentView } = useCalendarStore();

  return (
    <div className="space-y-0">
      {/* 1. Shared Components (Always visible) */}
      <MiniCalendar />

      {/* 2. Task Inbox (Always visible) */}
      <TaskInbox />

      {/* 3. View Specific Components */}
      {currentView === "month" && (
        <>
          <UpcomingEvents />
          <CalendarSources />
          <MonthSettings />
        </>
      )}

      {(currentView === "week" || currentView === "day") && (
        <>
           {/* Note: UpcomingEvents hidden in week/day view as per plan */}
           <CalendarSources />
           <TimeGridSettings />
        </>
      )}

      {currentView === "agenda" && (
        <>
            <CalendarSources />
            <AgendaGrouping />
        </>
      )}
    </div>
  );
}
