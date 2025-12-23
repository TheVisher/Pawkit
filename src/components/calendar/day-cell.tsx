'use client';

import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { EventItem } from './event-item';

interface CalendarItem {
  id: string;
  title: string;
  date: string;
  color?: string;
  type: 'event' | 'card' | 'todo';
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
}

const MAX_VISIBLE_ITEMS = 3;

export function DayCell({
  date,
  items,
  isCurrentMonth,
  isSelected,
  isToday,
  onClick,
}: DayCellProps) {
  const dayNumber = format(date, 'd');
  const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
  const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-2 cursor-pointer transition-all flex flex-col rounded-lg',
        'bg-bg-surface-1 hover:bg-bg-surface-2',
        'border border-border-subtle/50',
        'shadow-sm hover:shadow-md',
        !isCurrentMonth && 'bg-bg-surface-1/50 text-text-muted'
      )}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            'inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full',
            isSelected && !isToday && 'ring-2 ring-accent-primary',
            !isToday && !isSelected && isCurrentMonth && 'text-text-primary',
            !isToday && !isSelected && !isCurrentMonth && 'text-text-muted'
          )}
          style={isToday ? {
            backgroundColor: 'var(--color-accent)',
            color: 'white',
          } : undefined}
        >
          {dayNumber}
        </span>
      </div>

      {/* Events list */}
      <div className="space-y-1 flex-1">
        {visibleItems.map((item) => (
          <EventItem key={item.id} item={item} compact />
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
