"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { EventItem } from "./event-item";
import type { Id } from "@/lib/types/convex";

interface CalendarItem {
  id: string;
  eventId?: Id<'calendarEvents'>;
  title: string;
  date: string;
  color?: string;
  type: "event" | "card" | "todo";
  isAllDay?: boolean;
  startTime?: string;
  source?: {
    type: string;
    cardId?: string;
  };
}

interface DayCellProps {
  date: Date;
  items: CalendarItem[];
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  onClick: () => void;
  onItemClick?: (cardId: string) => void;
}

const MAX_VISIBLE_ITEMS = 3;

export function DayCell({
  date,
  items,
  isCurrentMonth,
  isSelected,
  isToday,
  onClick,
  onItemClick,
}: DayCellProps) {
  const dayNumber = format(date, "d");
  const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
  const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-2 cursor-pointer transition-all flex flex-col rounded-lg",
        "bg-bg-surface-1 hover:bg-bg-surface-2",
        "border border-border-subtle/50",
        "shadow-sm hover:shadow-md",
        !isCurrentMonth && "bg-bg-surface-1/50 text-text-muted",
      )}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "inline-flex items-center justify-center w-7 h-7 text-xs font-medium rounded-md transition-all border border-transparent",
            // Selected (User Clicked)
            isSelected &&
              !isToday &&
              "bg-white/10 border-brand text-text-primary",
            // Today (Current Date)
            isToday && "bg-brand/10 text-brand border-brand/20",
            // Selected AND Today (Focus Ring) - REMOVED to match subtle look request
            // isSelected && isToday && 'ring-2 ring-[var(--color-accent)] ring-offset-1 ring-offset-bg-surface-1',
            // Normal
          )}
        >
          {dayNumber}
        </span>
      </div>

      {/* Events list */}
      <div className="space-y-1 flex-1">
        {visibleItems.map((item) => (
          <EventItem
            key={item.id}
            item={item}
            compact
            onClick={item.source?.cardId && onItemClick ? () => onItemClick(item.source!.cardId!) : undefined}
          />
        ))}

        {/* "More" indicator */}
        {hiddenCount > 0 && (
          <div className="text-xs text-text-muted pl-1 pt-0.5">
            +{hiddenCount} more
          </div>
        )}
      </div>
    </div>
  );
}
