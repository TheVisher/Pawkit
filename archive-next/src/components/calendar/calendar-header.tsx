'use client';

import { useRef } from 'react';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
  ListTodo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { useOmnibarCollision } from '@/lib/hooks/use-omnibar-collision';
import { cn } from '@/lib/utils';

const VIEW_OPTIONS = [
  { value: 'month', label: 'Month', icon: CalendarIcon },
  { value: 'week', label: 'Week', icon: LayoutGrid },
  { value: 'day', label: 'Day', icon: List },
  { value: 'agenda', label: 'Agenda', icon: ListTodo },
] as const;

export function CalendarHeader() {
  const { currentDate, viewMode, next, prev, today, setViewMode } =
    useCalendarStore();

  // Collision detection for omnibar
  const headerRef = useRef<HTMLDivElement>(null);
  const needsOffset = useOmnibarCollision(headerRef);

  const subtitle = format(currentDate, 'MMMM yyyy');

  const actions = (
    <div className="flex items-center gap-3">
      {/* Navigation controls */}
      <div className="flex items-center gap-1 bg-bg-surface-2 rounded-lg p-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={prev}
          className="h-7 w-7 hover:bg-bg-surface-3"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={today}
          className="h-7 px-3 text-xs font-medium hover:bg-bg-surface-3"
        >
          Today
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={next}
          className="h-7 w-7 hover:bg-bg-surface-3"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* View mode dropdown */}
      <Select value={viewMode} onValueChange={setViewMode}>
        <SelectTrigger className="w-[140px] h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VIEW_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-xs"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  {option.label}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className={cn('transition-[padding] duration-200', needsOffset && 'md:pt-20')}>
      {/* Custom header layout: title measured for collision, actions stay right */}
      <div className="pt-5 pb-4 px-4 md:px-6 min-h-[76px]">
        <div className="flex items-start justify-between gap-4">
          {/* Title area - measured for collision */}
          <div ref={headerRef} className="w-fit space-y-0.5">
            <div className="text-xs text-text-muted">{subtitle}</div>
            <h1 className="text-2xl font-semibold text-text-primary">Calendar</h1>
          </div>
          {/* Actions - always on the right */}
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}
