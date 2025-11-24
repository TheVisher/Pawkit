"use client";

import { useState, useMemo, useEffect } from "react";
import { addDays, startOfWeek, startOfMonth, endOfMonth, isSameMonth, format, isSameDay, isToday } from "date-fns";
import { CardModel } from "@/lib/types";
import { isDailyNote, extractDateFromTitle, getDateString } from "@/lib/utils/daily-notes";
import { ChevronLeft, ChevronRight, Plus, FileText } from "lucide-react";

type CustomCalendarProps = {
  cards: CardModel[];
  currentMonth?: Date;
  onDayClick?: (date: Date) => void;
  onCardClick?: (card: CardModel) => void;
  onCreateDailyNote?: (date: Date) => void;
};

export function CustomCalendar({
  cards,
  currentMonth = new Date(),
  onDayClick,
  onCardClick,
  onCreateDailyNote
}: CustomCalendarProps) {
  const [isClient, setIsClient] = useState(false);

  // Mark as client-side after mount to prevent hydration issues
  // This ensures the calendar uses the OS date/time consistently
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get all days to display (including days from prev/next month to fill the grid)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);

    // Create exactly 42 days (6 weeks)
    const days = [];
    for (let i = 0; i < 42; i++) {
      days.push(addDays(startDate, i));
    }

    return days;
  }, [currentMonth]);

  // Group cards by date
  const cardsByDate = useMemo(() => {
    const map = new Map<string, CardModel[]>();

    // Scheduled cards
    cards
      .filter((card) => card.scheduledDate && !card.collections?.includes('the-den'))
      .forEach((card) => {
        const dateStr = card.scheduledDate!.split('T')[0];
        if (!map.has(dateStr)) {
          map.set(dateStr, []);
        }
        map.get(dateStr)!.push(card);
      });

    return map;
  }, [cards]);

  // Get daily notes by date
  const dailyNotesByDate = useMemo(() => {
    const map = new Map<string, CardModel>();

    cards
      .filter((card) => isDailyNote(card) && !card.collections?.includes('the-den'))
      .forEach((card) => {
        const date = extractDateFromTitle(card.title!);
        if (date) {
          const dateStr = getDateString(date);
          map.set(dateStr, card);
        }
      });

    return map;
  }, [cards]);

  return (
    <div className="space-y-6">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-3">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-3">
        {calendarDays.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayCards = cardsByDate.get(dateStr) || [];
          const dailyNote = dailyNotesByDate.get(dateStr);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          // Only check if it's today on the client to prevent hydration mismatch
          const isCurrentDay = isClient ? isSameDay(day, new Date()) : false;

          return (
            <div
              key={index}
              className={`card-hover relative min-h-[180px] rounded-2xl border transition-all cursor-pointer ${
                isCurrentDay
                  ? 'border-accent bg-accent/5'
                  : isCurrentMonth
                  ? 'border-subtle bg-surface'
                  : 'border-subtle/40 bg-surface-muted/50'
              }`}
              onClick={() => onDayClick?.(day)}
            >
              {/* Date number */}
              <div className="p-3">
                <span
                  className={`text-sm font-semibold ${
                    isCurrentDay
                      ? 'text-accent'
                      : isCurrentMonth
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Scheduled cards */}
              <div className="px-2 space-y-1 mb-12">
                {dayCards.slice(0, 2).map((card) => (
                  <button
                    key={card.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCardClick?.(card);
                    }}
                    className="w-full text-left px-2 py-1 rounded-lg bg-surface-soft hover:bg-surface transition-colors flex items-center gap-2"
                  >
                    {card.image && (
                      <img
                        src={card.image}
                        alt=""
                        className="w-4 h-4 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <span className="text-xs text-foreground truncate">
                      {card.title || card.domain || card.url}
                    </span>
                  </button>
                ))}
                {dayCards.length > 2 && (
                  <div className="text-xs text-muted-foreground px-2">
                    +{dayCards.length - 2} more
                  </div>
                )}
              </div>

              {/* Daily Note pill - anchored to bottom */}
              {dailyNote && (
                <div className="absolute bottom-2 left-2 right-2 flex justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCardClick?.(dailyNote);
                    }}
                    className="px-3 py-1.5 rounded-full bg-purple-500/20 backdrop-blur-md border border-purple-400/30 text-xs text-purple-200 hover:bg-purple-500/30 transition-colors flex items-center gap-1.5"
                  >
                    <FileText size={12} />
                    <span className="font-medium">Daily Note</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
