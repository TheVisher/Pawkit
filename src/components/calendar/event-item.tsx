'use client';

import { Calendar, FileText, Link, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface EventItemProps {
  item: CalendarItem;
  compact?: boolean;
  onClick?: () => void;
}

// Default colors for different types
const TYPE_COLORS: Record<string, string> = {
  event: 'hsl(var(--accent-primary))',
  card: 'hsl(220, 70%, 55%)',
  todo: 'hsl(150, 60%, 45%)',
};

// Icons for different types
const TYPE_ICONS = {
  event: Calendar,
  card: Link,
  todo: CheckSquare,
};

export function EventItem({ item, compact = false, onClick }: EventItemProps) {
  const backgroundColor = item.color || TYPE_COLORS[item.type] || TYPE_COLORS.event;
  const Icon = TYPE_ICONS[item.type] || Calendar;

  if (compact) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className={cn(
          'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] truncate',
          'cursor-pointer transition-opacity hover:opacity-80'
        )}
        style={{
          backgroundColor: `${backgroundColor}20`,
          borderLeft: `2px solid ${backgroundColor}`,
        }}
        title={item.title}
      >
        <Icon
          className="w-2.5 h-2.5 flex-shrink-0"
          style={{ color: backgroundColor }}
        />
        <span className="truncate text-text-primary">{item.title}</span>
      </div>
    );
  }

  // Full event item (for week/day views)
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        'flex items-start gap-2 p-2 rounded-lg cursor-pointer',
        'transition-all hover:scale-[1.02] hover:shadow-md'
      )}
      style={{
        backgroundColor: `${backgroundColor}15`,
        borderLeft: `3px solid ${backgroundColor}`,
      }}
    >
      <Icon
        className="w-4 h-4 flex-shrink-0 mt-0.5"
        style={{ color: backgroundColor }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-text-primary truncate">
          {item.title}
        </div>
        {item.startTime && (
          <div className="text-xs text-text-muted mt-0.5">
            {item.startTime}
          </div>
        )}
      </div>
    </div>
  );
}
