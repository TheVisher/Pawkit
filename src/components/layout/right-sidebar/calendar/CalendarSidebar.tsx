"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  MiniCalendar,
  TaskInbox,
  CalendarSources,
  UpcomingEvents,
  MonthSettings,
  TimeGridSettings,
  AgendaGrouping,
} from "./CalendarSections";

// This type should ideally be shared with the main Calendar component
export type CalendarViewType = "month" | "week" | "day" | "agenda";

export function CalendarSidebar() {
  // TODO: synchronise this state with the main Calendar component
  // For now, we'll default to 'month' as per the typical initial view
  const [currentView, setCurrentView] = useState<CalendarViewType>("month");

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

      {/* Temporary Debug Control to switch views for previewing */}
      <div className="p-4 mt-8 border-t border-border-subtle opacity-50 hover:opacity-100 transition-opacity">
        <p className="text-[10px] uppercase tracking-wider text-text-muted mb-2">Debug: Sidebar Mode</p>
        <div className="flex gap-1">
            {(['month', 'week', 'day', 'agenda'] as const).map(view => (
                <button
                    key={view}
                    onClick={() => setCurrentView(view)}
                    className={cn(
                        "text-[10px] px-2 py-1 rounded border",
                        currentView === view
                            ? "bg-[var(--color-accent)] text-white border-transparent"
                            : "bg-transparent text-text-muted border-border-subtle"
                    )}
                >
                    {view}
                </button>
            ))}
        </div>
      </div>
    </div>
  );
}
