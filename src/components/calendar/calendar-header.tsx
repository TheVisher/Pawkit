'use client';

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
import { PageHeader } from '@/components/layout/page-header';
import { useCalendarStore } from '@/lib/stores/calendar-store';

const VIEW_OPTIONS = [
  { value: 'month', label: 'Month', icon: CalendarIcon },
  { value: 'week', label: 'Week', icon: LayoutGrid },
  { value: 'day', label: 'Day', icon: List },
  { value: 'agenda', label: 'Agenda', icon: ListTodo },
] as const;

export function CalendarHeader() {
  const { currentDate, viewMode, next, prev, today, setViewMode } =
    useCalendarStore();

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

  return <PageHeader title="Calendar" subtitle={subtitle} actions={actions} />;
}
