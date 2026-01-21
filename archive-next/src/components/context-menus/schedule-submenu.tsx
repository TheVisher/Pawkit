'use client';

/**
 * Schedule Submenu
 * Context menu submenu for scheduling a card to a date
 *
 * Creates date references (@ mentions) when scheduling, which:
 * 1. Appear in the card's References section in sidebar
 * 2. Add the date to card.scheduledDates[] for calendar display
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
import { useCards, useReferences } from '@/lib/hooks/use-live-data';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { updateScheduleTags } from '@/lib/utils/system-tags';

interface ScheduleSubmenuProps {
  cardId: string;
  currentSchedule?: Date;
}

export function ScheduleSubmenu({ cardId, currentSchedule }: ScheduleSubmenuProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const updateCard = useDataStore((s) => s.updateCard);
  const createReference = useDataStore((s) => s.createReference);
  const deleteReference = useDataStore((s) => s.deleteReference);
  const workspace = useCurrentWorkspace();
  const cards = useCards(workspace?.id);
  const references = useReferences(cardId);
  const toast = useToastStore((s) => s.toast);

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const monday = nextMonday(today);
  const nextMonth = startOfMonth(addMonths(today, 1));

  // Get current card's tags and scheduledDates
  const currentCard = cards.find(c => c.id === cardId);
  const currentTags = currentCard?.tags || [];
  const currentScheduledDates = currentCard?.scheduledDates || [];

  // Get existing date references for this card
  const dateReferences = references.filter(r => r.targetType === 'date');

  const handleSchedule = async (date: Date | undefined) => {
    if (!workspace?.id) return;

    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd');

      // Check if this date is already scheduled
      if (currentScheduledDates.includes(dateStr)) {
        toast({
          type: 'info',
          message: `Already scheduled for ${format(date, 'MMM d')}`,
        });
        return;
      }

      // Create a reference for the date
      await createReference({
        workspaceId: workspace.id,
        sourceId: cardId,
        targetId: dateStr,
        targetType: 'date',
        linkText: format(date, 'MMMM d, yyyy'),
      });

      // Update scheduledDates array and tags
      const newScheduledDates = [...currentScheduledDates, dateStr];
      const newTags = updateScheduleTags(currentTags, date);
      await updateCard(cardId, { scheduledDates: newScheduledDates, tags: newTags });

      toast({
        type: 'success',
        message: `Scheduled for ${format(date, 'MMM d')}`,
      });
    } else {
      // Clear all scheduled dates
      // Delete all date references
      for (const ref of dateReferences) {
        await deleteReference(ref.id);
      }

      // Clear scheduledDates and update tags
      const newTags = updateScheduleTags(currentTags, undefined);
      await updateCard(cardId, { scheduledDates: [], tags: newTags });

      toast({
        type: 'success',
        message: 'Schedule cleared',
      });
    }
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
        {currentScheduledDates.length > 0 && (
          <span className="ml-auto text-xs text-text-muted">
            {currentScheduledDates.length === 1
              ? format(new Date(currentScheduledDates[0]), 'MMM d')
              : `${currentScheduledDates.length} dates`}
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

            {currentScheduledDates.length > 0 && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={handleClearSchedule}>
                  <X className="size-4" />
                  Clear {currentScheduledDates.length > 1 ? 'all schedules' : 'schedule'}
                </ContextMenuItem>
              </>
            )}
          </>
        ) : (
          <div className="p-2">
            <Calendar
              mode="single"
              selected={currentScheduledDates.length > 0 ? new Date(currentScheduledDates[0]) : undefined}
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
