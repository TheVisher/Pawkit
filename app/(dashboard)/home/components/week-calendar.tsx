"use client";

import Link from "next/link";
import { Calendar, FileText } from "lucide-react";
import { WeekDay } from "../hooks/use-home-data";
import { usePanelStore } from "@/lib/hooks/use-panel-store";

interface WeekCalendarProps {
  weekDays: WeekDay[];
  onDayClick: (day: WeekDay) => void;
}

export function WeekCalendar({ weekDays, onDayClick }: WeekCalendarProps) {
  const openCardDetails = usePanelStore((state) => state.openCardDetails);

  return (
    <div
      className="h-full rounded-xl p-4 flex flex-col min-h-0 overflow-hidden"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Calendar className="w-3 h-3 text-blue-400" />
          </div>
          <h2 className="font-semibold text-sm text-foreground">This Week</h2>
        </div>
        <Link
          href="/calendar"
          className="text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          Full calendar
        </Link>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-between">
        {weekDays.map((day) => (
          <button
            key={day.dateStr}
            onClick={() => onDayClick(day)}
            className={`w-full flex items-center gap-2 py-2 px-2 rounded-lg transition-all ${
              day.isToday
                ? 'bg-accent/10 border border-accent/30'
                : 'hover:bg-surface-soft'
            }`}
          >
            {/* Day info */}
            <div className="w-10 text-center flex-shrink-0">
              <p className={`text-[10px] ${day.isToday ? 'text-accent' : 'text-muted-foreground'}`}>
                {day.dayName}
              </p>
              <p className={`text-sm font-semibold ${day.isToday ? 'text-accent' : 'text-foreground'}`}>
                {day.dayNumber}
              </p>
            </div>

            {/* Day content */}
            <div className="flex-1 min-w-0">
              {day.items.length > 0 || day.events.length > 0 || day.dailyNote ? (
                <div className="flex items-center gap-2">
                  {/* Daily note indicator */}
                  {day.dailyNote && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openCardDetails(day.dailyNote!.id);
                      }}
                      className="flex-shrink-0"
                    >
                      <FileText className="w-4 h-4 text-accent" />
                    </button>
                  )}

                  {/* First item preview */}
                  {day.items.length > 0 && (
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {day.items[0].image && (
                        <img
                          src={day.items[0].image}
                          alt=""
                          className="w-6 h-6 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <span className="text-xs text-foreground truncate">
                        {day.items[0].title || day.items[0].domain || day.items[0].url}
                      </span>
                    </div>
                  )}

                  {/* First event preview */}
                  {day.events.length > 0 && day.items.length === 0 && (
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: day.events[0].color || 'var(--ds-accent)' }}
                      />
                      <span className="text-xs text-foreground truncate">
                        {day.events[0].title}
                      </span>
                    </div>
                  )}

                  {/* Additional items count */}
                  {(day.items.length + day.events.length) > 1 && (
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      +{day.items.length + day.events.length - 1}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground/50">-</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
