"use client";

import { useMemo, useEffect, useState } from "react";
import { addDays, startOfWeek, format, isSameDay, isToday } from "date-fns";
import { CardModel } from "@/lib/types";
import { isDailyNote, extractDateFromTitle, getDateString } from "@/lib/utils/daily-notes";
import { FileText, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useCalendarStore } from "@/lib/hooks/use-calendar-store";

type WeekViewProps = {
  cards: CardModel[];
  currentMonth: Date;
  onDayClick?: (date: Date) => void;
  onCardClick?: (card: CardModel) => void;
  onCreateDailyNote?: (date: Date) => void;
};

export function WeekView({ cards, currentMonth, onDayClick, onCardClick, onCreateDailyNote }: WeekViewProps) {
  const [isClient, setIsClient] = useState(false);
  const setCurrentMonth = useCalendarStore((state) => state.setCurrentMonth);

  // Mark as client-side after mount to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get all days in the current week (starting from Sunday)
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentMonth);
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
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

  const goToPreviousWeek = () => {
    const weekStart = startOfWeek(currentMonth);
    setCurrentMonth(addDays(weekStart, -7));
  };

  const goToNextWeek = () => {
    const weekStart = startOfWeek(currentMonth);
    setCurrentMonth(addDays(weekStart, 7));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold text-foreground">
            Week of {format(weekDays[0], 'MMM d, yyyy')}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-lg bg-surface-soft text-sm text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousWeek}
            className="p-2 rounded-lg bg-surface-soft text-foreground hover:bg-surface transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goToNextWeek}
            className="p-2 rounded-lg bg-surface-soft text-foreground hover:bg-surface transition-colors"
            aria-label="Next week"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Week days in horizontal columns */}
      <div className="grid grid-cols-7 gap-3">
        {weekDays.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayCards = cardsByDate.get(dateStr) || [];
          const dailyNote = dailyNotesByDate.get(dateStr);
          const isCurrentDay = isClient ? isToday(day) : false;

          return (
            <div
              key={index}
              className={`card-hover rounded-2xl border transition-all cursor-pointer flex flex-col ${
                isCurrentDay
                  ? 'border-accent bg-accent/5'
                  : 'border-subtle bg-surface'
              }`}
              onClick={() => onDayClick?.(day)}
            >
              {/* Day header */}
              <div className="p-3 border-b border-white/5">
                <div className={`text-sm font-semibold text-center ${
                  isCurrentDay ? 'text-accent' : 'text-foreground'
                }`}>
                  {format(day, 'EEE')}
                </div>
                <div className="text-xs text-muted-foreground text-center mt-0.5">
                  {format(day, 'MMM d')}
                </div>
              </div>

              {/* Events container - scrollable */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[500px]">
                {/* Daily note */}
                {dailyNote && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCardClick?.(dailyNote);
                    }}
                    className="w-full px-2 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-colors flex items-center gap-2 text-left"
                  >
                    <FileText size={12} className="text-purple-300 flex-shrink-0" />
                    <span className="text-xs font-medium text-purple-200 truncate">
                      Note
                    </span>
                  </button>
                )}

                {/* Scheduled cards */}
                {dayCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCardClick?.(card);
                    }}
                    className="w-full text-left px-2 py-2 rounded-lg bg-surface-soft hover:bg-surface transition-colors border border-subtle"
                  >
                    {card.image && (
                      <img
                        src={card.image}
                        alt=""
                        className="w-full h-16 rounded object-cover mb-2"
                      />
                    )}
                    <div className="text-xs font-medium text-foreground truncate">
                      {card.title || card.domain || card.url}
                    </div>
                  </button>
                ))}

                {/* Empty state */}
                {!dailyNote && dayCards.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No events
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
