'use client';

/**
 * Schedule Submenu
 * Context menu submenu for scheduling a card to a date
 */

import { useState } from 'react';
import { format, addDays, nextMonday, startOfMonth, addMonths } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import {
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { Calendar } from '@/components/ui/calendar';
import { useDataStore } from '@/lib/stores/data-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { useCards } from '@/lib/hooks/use-live-data';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { updateScheduleTags } from '@/lib/utils/system-tags';

interface ScheduleSubmenuProps {
  cardId: string;
  currentSchedule?: Date;
}

export function ScheduleSubmenu({ cardId, currentSchedule }: ScheduleSubmenuProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const updateCard = useDataStore((s) => s.updateCard);
  const workspace = useCurrentWorkspace();
  const cards = useCards(workspace?.id);
  const toast = useToastStore((s) => s.toast);

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const monday = nextMonday(today);
  const nextMonth = startOfMonth(addMonths(today, 1));

  // Get current card's tags
  const currentCard = cards.find(c => c.id === cardId);
  const currentTags = currentCard?.tags || [];

  const handleSchedule = async (date: Date | undefined) => {
    // Update schedule tags based on the new date
    const newTags = updateScheduleTags(currentTags, date);
    await updateCard(cardId, { scheduledDate: date, tags: newTags });
    toast({
      type: 'success',
      message: date ? `Scheduled for ${format(date, 'MMM d')}` : 'Schedule removed',
    });
  };

  const handleQuickSchedule = async (date: Date) => {
    await handleSchedule(date);
  };

  const handleClearSchedule = async () => {
    await handleSchedule(undefined);
  };

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <CalendarIcon className="size-4" />
        Schedule
        {currentSchedule && (
          <span className="ml-auto text-xs text-text-muted">
            {format(new Date(currentSchedule), 'MMM d')}
          </span>
        )}
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="min-w-[200px]">
        {!showCalendar ? (
          <>
            <ContextMenuItem onClick={() => handleQuickSchedule(today)}>
              Today
              <span className="ml-auto text-xs text-text-muted">
                {format(today, 'EEE')}
              </span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleQuickSchedule(tomorrow)}>
              Tomorrow
              <span className="ml-auto text-xs text-text-muted">
                {format(tomorrow, 'EEE')}
              </span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleQuickSchedule(monday)}>
              Next Monday
              <span className="ml-auto text-xs text-text-muted">
                {format(monday, 'MMM d')}
              </span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleQuickSchedule(nextMonth)}>
              Next Month
              <span className="ml-auto text-xs text-text-muted">
                {format(nextMonth, 'MMM d')}
              </span>
            </ContextMenuItem>

            <ContextMenuSeparator />

            <ContextMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setShowCalendar(true);
              }}
            >
              <CalendarIcon className="size-4" />
              Pick a date...
            </ContextMenuItem>

            {currentSchedule && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={handleClearSchedule}>
                  <X className="size-4" />
                  Clear schedule
                </ContextMenuItem>
              </>
            )}
          </>
        ) : (
          <div className="p-2">
            <Calendar
              mode="single"
              selected={currentSchedule ? new Date(currentSchedule) : undefined}
              onSelect={(date) => {
                handleSchedule(date);
                setShowCalendar(false);
              }}
              initialFocus
            />
          </div>
        )}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}
