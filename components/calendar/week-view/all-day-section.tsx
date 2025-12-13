"use client";

import { useMemo } from "react";
import { format, isToday } from "date-fns";
import { CalendarEvent } from "@/lib/types/calendar";
import { TIME_LABEL_WIDTH } from "@/lib/utils/time-grid";
import { ResolvedHoliday } from "@/lib/data/us-holidays";
import { Flag, CheckSquare, Globe } from "lucide-react";
import { getFaviconUrl } from "@/lib/utils/card-display";

interface AllDaySectionProps {
  weekDays: Date[];
  eventsByDate: Map<string, CalendarEvent[]>;
  holidaysByDate: Map<string, ResolvedHoliday>;
  onEventClick?: (event: CalendarEvent) => void;
  onDayClick?: (date: Date) => void;
}

const EVENT_HEIGHT = 22; // Height of each all-day event
const MAX_VISIBLE_EVENTS = 3; // Show "more" if more than this

/**
 * All-day events section at the top of the week view
 * Shows all-day events and holidays in a horizontal row
 */
export function AllDaySection({
  weekDays,
  eventsByDate,
  holidaysByDate,
  onEventClick,
  onDayClick,
}: AllDaySectionProps) {
  // Get all-day events for each day
  const allDayByDay = useMemo(() => {
    return weekDays.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayEvents = eventsByDate.get(dateStr) || [];
      return dayEvents.filter((e) => e.isAllDay);
    });
  }, [weekDays, eventsByDate]);

  // Get holidays for each day
  const holidayByDay = useMemo(() => {
    return weekDays.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      return holidaysByDate.get(dateStr);
    });
  }, [weekDays, holidaysByDate]);

  // Calculate max events in any day (for section height)
  const maxEvents = Math.max(
    ...allDayByDay.map((arr) => arr.length + (holidayByDay[allDayByDay.indexOf(arr)] ? 1 : 0)),
    0
  );
  const visibleRows = Math.min(maxEvents, MAX_VISIBLE_EVENTS);
  const sectionHeight = Math.max(40, visibleRows * (EVENT_HEIGHT + 4) + 16);

  // Only show section if there are all-day events or holidays
  const hasContent = maxEvents > 0;
  if (!hasContent) return null;

  return (
    <div
      className="flex-shrink-0"
      style={{
        minHeight: sectionHeight,
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-surface-2)",
      }}
    >
      <div className="flex h-full">
        {/* Time label area (empty for alignment) */}
        <div
          className="flex-shrink-0 flex items-center justify-end pr-3"
          style={{ width: TIME_LABEL_WIDTH }}
        >
          <span
            className="text-[10px] font-medium uppercase"
            style={{ color: "var(--text-muted)" }}
          >
            All Day
          </span>
        </div>

        {/* Day columns */}
        <div
          className="flex-1 grid grid-cols-7"
          style={{ borderLeft: "1px solid var(--border-subtle)" }}
        >
          {weekDays.map((day, dayIndex) => {
            const allDayEvents = allDayByDay[dayIndex];
            const holiday = holidayByDay[dayIndex];
            const isCurrentDay = isToday(day);

            // Combine events and holidays
            const totalItems = allDayEvents.length + (holiday ? 1 : 0);
            const hasMore = totalItems > MAX_VISIBLE_EVENTS;
            const visibleEvents = allDayEvents.slice(0, MAX_VISIBLE_EVENTS - (holiday ? 1 : 0));

            return (
              <div
                key={dayIndex}
                className={`px-1 py-2 space-y-1 cursor-pointer transition-colors ${
                  isCurrentDay ? "bg-accent/5" : "hover:bg-white/5"
                }`}
                style={{
                  borderLeft: dayIndex > 0 ? "1px solid var(--border-subtle)" : "none",
                }}
                onClick={() => onDayClick?.(day)}
              >
                {/* Holiday first */}
                {holiday && (
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] truncate"
                    style={{
                      background: "rgba(245, 158, 11, 0.2)", // amber
                      color: "rgb(245, 158, 11)",
                    }}
                  >
                    <Flag size={10} className="flex-shrink-0" />
                    <span className="truncate">{holiday.name}</span>
                  </div>
                )}

                {/* All-day events */}
                {visibleEvents.map((event) => {
                  const isTodo = event.source?.type === "todo";
                  const isCard = event.source?.type === "card" && event.url;

                  return (
                    <button
                      key={event.id}
                      className="w-full text-left px-2 py-0.5 rounded text-[10px] font-medium truncate transition-opacity hover:opacity-80 flex items-center gap-1"
                      style={{
                        background: event.color || "var(--ds-accent)",
                        color: "white",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                    >
                      {isTodo && <CheckSquare size={10} className="flex-shrink-0" />}
                      {isCard && event.url && (
                        <img
                          src={getFaviconUrl(event.url, 16)}
                          alt=""
                          className="w-3 h-3 flex-shrink-0 rounded-sm"
                          onError={(e) => {
                            // Hide broken favicon, show fallback icon
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                      <span className="truncate">{event.title}</span>
                    </button>
                  );
                })}

                {/* "More" indicator */}
                {hasMore && (
                  <div
                    className="px-2 text-[10px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    +{totalItems - visibleEvents.length - (holiday ? 1 : 0)} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
