"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfISOWeek,
  endOfISOWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  getISOWeek,
} from "date-fns";
import { useCalendarStore } from "@/lib/hooks/use-calendar-store";

interface MiniCalendarProps {
  onDateSelect?: (date: Date) => void;
  onWeekSelect?: (weekStart: Date) => void;
}

export function MiniCalendar({ onDateSelect, onWeekSelect }: MiniCalendarProps) {
  const [displayMonth, setDisplayMonth] = useState(new Date());

  const currentMonth = useCalendarStore((state) => state.currentMonth);
  const viewMode = useCalendarStore((state) => state.viewMode);
  const setCurrentMonth = useCalendarStore((state) => state.setCurrentMonth);
  const setViewMode = useCalendarStore((state) => state.setViewMode);

  // Sync display month when main calendar changes (so mini calendar follows)
  useEffect(() => {
    // Only sync if viewing a different month
    if (!isSameMonth(displayMonth, currentMonth)) {
      setDisplayMonth(currentMonth);
    }
  }, [currentMonth]);

  // Generate calendar grid with weeks
  const calendarWeeks = useMemo(() => {
    const monthStart = startOfMonth(displayMonth);
    const monthEnd = endOfMonth(displayMonth);

    // Start from the Monday of the week containing the 1st
    const calendarStart = startOfISOWeek(monthStart);
    // End at the Sunday of the week containing the last day
    const calendarEnd = endOfISOWeek(monthEnd);

    const weeks: { weekNumber: number; weekStart: Date; days: Date[] }[] = [];
    let currentDay = calendarStart;

    while (currentDay <= calendarEnd) {
      const weekStart = currentDay;
      const weekNumber = getISOWeek(currentDay);
      const days: Date[] = [];

      for (let i = 0; i < 7; i++) {
        days.push(currentDay);
        currentDay = addDays(currentDay, 1);
      }

      weeks.push({ weekNumber, weekStart, days });
    }

    return weeks;
  }, [displayMonth]);

  // Check if a week is the currently viewed week (based on currentMonth from store)
  const isViewedWeek = (weekStart: Date) => {
    const weekEnd = addDays(weekStart, 6);
    return currentMonth >= weekStart && currentMonth <= weekEnd;
  };

  // Check if a day is the currently viewed day (in day view or week view)
  const isSelectedDay = (day: Date) => {
    return isSameDay(day, currentMonth);
  };

  const handlePrevMonth = () => setDisplayMonth(subMonths(displayMonth, 1));
  const handleNextMonth = () => setDisplayMonth(addMonths(displayMonth, 1));

  const handleDateClick = (date: Date) => {
    setCurrentMonth(date);
    setViewMode("day");
    onDateSelect?.(date);
  };

  const handleWeekClick = (weekStart: Date) => {
    setCurrentMonth(weekStart);
    setViewMode("week");
    onWeekSelect?.(weekStart);
  };

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: 'var(--bg-surface-1)',
        boxShadow: 'var(--inset-shadow)',
        border: 'var(--inset-border)',
        borderBottomColor: 'var(--inset-border-bottom)',
        borderRightColor: 'var(--inset-border-right)',
      }}
    >
      {/* Month/Year Header with navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={handlePrevMonth}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronLeft size={14} />
        </button>
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          {format(displayMonth, "MMMM yyyy")}
        </span>
        <button
          onClick={handleNextMonth}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day headers (Mon-Sun) */}
      <div className="grid grid-cols-8 gap-0 mb-1">
        {/* Empty cell for week number column */}
        <div className="w-6" />
        {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
          <div
            key={i}
            className="text-[10px] font-medium text-center py-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-0">
        {calendarWeeks.map((week) => {
          const isWeekViewed = isViewedWeek(week.weekStart);

          return (
            <div
              key={week.weekNumber}
              className="grid grid-cols-8 gap-0 rounded transition-colors"
              style={{
                background: isWeekViewed ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
              }}
            >
              {/* Week number */}
              <button
                onClick={() => handleWeekClick(week.weekStart)}
                className="w-6 text-[10px] font-medium text-center py-1 rounded-l hover:bg-white/10 transition-colors"
                style={{
                  color: isWeekViewed ? 'var(--ds-accent)' : 'var(--text-muted)',
                }}
                title={`Jump to week ${week.weekNumber}`}
              >
                {week.weekNumber}
              </button>

              {/* Days */}
              {week.days.map((day) => {
                const isInDisplayMonth = isSameMonth(day, displayMonth);
                const isTodayDate = isToday(day);
                const isSelected = isSelectedDay(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDateClick(day)}
                    className="relative w-full aspect-square flex items-center justify-center text-[11px] transition-colors hover:bg-white/10"
                    style={{
                      color: isTodayDate
                        ? 'white'
                        : isSelected
                          ? 'var(--ds-accent)'
                          : isInDisplayMonth
                            ? 'var(--text-primary)'
                            : 'var(--text-muted)',
                      opacity: isInDisplayMonth ? 1 : 0.4,
                    }}
                  >
                    {/* Today purple filled circle */}
                    {isTodayDate && (
                      <span
                        className="absolute inset-0.5 rounded-full"
                        style={{
                          background: 'var(--ds-accent)',
                          boxShadow: '0 0 8px var(--ds-accent)',
                        }}
                      />
                    )}
                    {/* Selected day outline (when not today) */}
                    {isSelected && !isTodayDate && (
                      <span
                        className="absolute inset-0.5 rounded-full"
                        style={{
                          border: '1.5px solid var(--ds-accent)',
                          boxShadow: '0 0 6px var(--ds-accent)',
                        }}
                      />
                    )}
                    <span className="relative z-10">{format(day, "d")}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
