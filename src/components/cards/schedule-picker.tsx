'use client';

/**
 * Schedule Picker
 * Compact date picker for scheduling cards to specific dates
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface SchedulePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  className?: string;
}

export function SchedulePicker({ value, onChange, className }: SchedulePickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (date: Date | undefined) => {
    onChange(date);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal h-9 px-3',
              'bg-[var(--glass-bg)] border-[var(--glass-border)]',
              'hover:bg-[var(--glass-bg-hover)] hover:border-[var(--glass-border-hover)]',
              !value && 'text-text-muted'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, 'PPP') : 'Schedule for...'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-text-muted hover:text-text-primary"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
