'use client';

import { useMemo } from 'react';
import { format, isToday, isSameDay, startOfDay } from 'date-fns';
import { db } from '@/lib/db';
import { FileText, Plus } from 'lucide-react';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { useDataStore } from '@/lib/stores/data-store';
import { useCards, useCalendarEvents } from '@/lib/hooks/use-live-data';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { Button } from '@/components/ui/button';
import { EventItem } from './event-item';
import type { LocalCalendarEvent, LocalCard } from '@/lib/db/types';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60; // px

interface CalendarItem {
  id: string;
  title: string;
  date: string;
  color?: string;
  type: 'event' | 'card' | 'todo';
  isAllDay?: boolean;
  startTime?: string;
  endTime?: string;
  source?: {
    type: string;
    cardId?: string;
  };
}

export function DayView() {
  const { currentDate } = useCalendarStore();
  const workspace = useCurrentWorkspace();
  const events = useCalendarEvents(workspace?.id);
  const cards = useCards(workspace?.id);
  const createCard = useDataStore((state) => state.createCard);
  const openCardDetail = useModalStore((s) => s.openCardDetail);

  const dateKey = format(currentDate, 'yyyy-MM-dd');
  const isTodayDate = isToday(currentDate);

  // Find the daily note for current date from the store
  const dailyNote = useMemo(() => {
    if (!workspace) return null;
    return cards.find(
      (c) =>
        c.workspaceId === workspace.id &&
        c.isDailyNote &&
        c.scheduledDate &&
        isSameDay(new Date(c.scheduledDate), currentDate) &&
        !c._deleted
    ) || null;
  }, [cards, workspace, currentDate]);

  const updateCard = useDataStore((state) => state.updateCard);

  const handleCreateDailyNote = async () => {
    if (!workspace) return;

    // Check if a note already exists (prevent duplicates from race conditions)
    if (dailyNote) {
      openCardDetail(dailyNote.id);
      return;
    }

    // Check for trashed daily note for this date - restore instead of creating new
    const trashedCards = await db.cards
      .where('workspaceId')
      .equals(workspace.id)
      .filter(
        (c) =>
          c.isDailyNote === true &&
          c.scheduledDate != null &&
          isSameDay(new Date(c.scheduledDate), currentDate) &&
          c._deleted === true
      )
      .toArray();

    if (trashedCards.length > 0) {
      // Restore only the most recent trashed daily note (preserve all existing content)
      const sortedTrashed = trashedCards.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      const trashedNote = sortedTrashed[0];
      await updateCard(trashedNote.id, {
        _deleted: false,
      });
      openCardDetail(trashedNote.id);
      return;
    }

    const newNote = await createCard({
      workspaceId: workspace.id,
      type: 'md-note',
      url: '',
      title: format(currentDate, 'MMMM d, yyyy'),
      content: '',
      isDailyNote: true,
      scheduledDate: startOfDay(currentDate), // Normalize to midnight to avoid timezone drift
      tags: ['daily-note'],
      pinned: false,
      status: 'READY',
      isFileCard: false,
    });

    if (newNote) {
      openCardDetail(newNote.id);
    }
  };

  const handleOpenDailyNote = () => {
    if (dailyNote) {
      openCardDetail(dailyNote.id);
    }
  };

  const getNotePreview = (html: string) => {
    if (!html) return 'Empty note';
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 80 ? text.slice(0, 80) + '...' : text || 'Empty note';
  };

  // Get items for current day
  const dayItems = useMemo(() => {
    const items: CalendarItem[] = [];

    // Add calendar events
    events
      .filter((event: LocalCalendarEvent) => event.date === dateKey)
      .forEach((event: LocalCalendarEvent) => {
        items.push({
          id: event.id,
          title: event.title,
          date: event.date,
          color: event.color,
          type: 'event',
          isAllDay: event.isAllDay,
          startTime: event.startTime,
          endTime: event.endTime,
          source: event.source,
        });
      });

    // Add scheduled cards
    cards
      .filter((card: LocalCard) => card.scheduledDate)
      .filter((card: LocalCard) => format(new Date(card.scheduledDate!), 'yyyy-MM-dd') === dateKey)
      .forEach((card: LocalCard) => {
        items.push({
          id: card.id,
          title: card.title || card.url || 'Untitled',
          date: dateKey,
          type: 'card',
          isAllDay: !card.scheduledStartTime,
          startTime: card.scheduledStartTime,
          endTime: card.scheduledEndTime,
          source: { type: 'card', cardId: card.id },
        });
      });

    return items;
  }, [events, cards, dateKey]);

  return (
    <div className="h-full flex flex-col">
      {/* Day header */}
      <div className="border-b border-border-subtle bg-bg-surface-1">
        <div className="flex items-center justify-between px-4 py-4">
          <div className={isTodayDate ? 'text-accent-primary' : 'text-text-primary'}>
            <div className="text-sm text-text-muted">
              {format(currentDate, 'EEEE')}
            </div>
            <div className="text-3xl font-light mt-1">
              {format(currentDate, 'd')}
            </div>
          </div>

          {/* Daily Note Section */}
          <div className="flex-1 max-w-md ml-6">
            {dailyNote ? (
              <button
                onClick={handleOpenDailyNote}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-bg-surface-2/50 hover:bg-bg-surface-2 transition-colors text-left"
              >
                <FileText className="h-5 w-5 text-[var(--color-accent)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-text-muted mb-0.5">Daily Note</div>
                  <div className="text-sm text-text-secondary truncate">
                    {getNotePreview(dailyNote.content || '')}
                  </div>
                </div>
              </button>
            ) : (
              <Button
                variant="outline"
                onClick={handleCreateDailyNote}
                className="w-full justify-start gap-2 bg-bg-surface-2/30 border-dashed"
              >
                <Plus className="h-4 w-4" />
                <span>Create daily note</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* All-day section for scheduled cards without times */}
      {dayItems.filter(item => item.isAllDay).length > 0 && (
        <div className="border-b border-border-subtle bg-bg-surface-1/50">
          <div className="grid grid-cols-[60px_1fr]">
            <div className="border-r border-border-subtle text-xs text-text-muted text-right pr-2 py-2">
              All day
            </div>
            <div className="p-2">
              <div className="flex flex-wrap gap-1.5">
                {dayItems
                  .filter(item => item.isAllDay)
                  .map((item) => (
                    <EventItem
                      key={item.id}
                      item={item}
                      compact
                      onClick={item.source?.cardId ? () => openCardDetail(item.source!.cardId!) : undefined}
                    />
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="flex-1 overflow-auto scrollbar-hide">
        <div className="grid grid-cols-[60px_1fr]">
          {HOURS.map((hour) => {
            // Filter items for this hour
            const hourItems = dayItems.filter((item) => {
              if (item.isAllDay) return false;
              if (!item.startTime) return false;

              const [itemHour] = item.startTime.split(':').map(Number);
              return itemHour === hour;
            });

            return (
              <div key={hour} className="contents">
                {/* Hour label */}
                <div
                  className="border-r border-b border-border-subtle text-xs text-text-muted text-right pr-2 pt-1"
                  style={{ height: HOUR_HEIGHT }}
                >
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>

                {/* Hour slot */}
                <div
                  className="border-r border-b border-border-subtle bg-bg-surface-1/30 hover:bg-bg-surface-2/50 transition-colors p-2"
                  style={{ height: HOUR_HEIGHT }}
                >
                  <div className="space-y-1">
                    {hourItems.map((item) => (
                      <EventItem
                        key={item.id}
                        item={item}
                        onClick={item.source?.cardId ? () => openCardDetail(item.source!.cardId!) : undefined}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
