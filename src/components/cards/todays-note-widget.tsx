'use client';

/**
 * Today's Note Widget
 * Quick access to today's daily note from the home dashboard
 */

import { useState, useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { Calendar, Plus, ChevronLeft, ChevronRight, Edit3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/lib/stores/data-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { cn } from '@/lib/utils';

export function TodaysNoteWidget() {
  const [date, setDate] = useState(new Date());
  const workspace = useCurrentWorkspace();
  const cards = useDataStore((s) => s.cards);
  const isLoading = useDataStore((s) => s.isLoading);
  const createCard = useDataStore((s) => s.createCard);
  const openCardDetail = useModalStore((s) => s.openCardDetail);

  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const formattedDate = format(date, 'EEEE, MMMM d');

  // Find the daily note for the selected date from the store
  const note = useMemo(() => {
    if (!workspace) return null;
    return cards.find(
      (c) =>
        c.workspaceId === workspace.id &&
        c.isDailyNote &&
        c.scheduledDate &&
        isSameDay(new Date(c.scheduledDate), date) &&
        !c._deleted
    ) || null;
  }, [cards, workspace, date]);

  const handleCreateNote = async () => {
    if (!workspace) return;

    // Check if a note already exists (prevent duplicates from race conditions)
    if (note) {
      openCardDetail(note.id);
      return;
    }

    const newNote = await createCard({
      workspaceId: workspace.id,
      type: 'md-note',
      url: '',
      title: format(date, 'MMMM d, yyyy'),
      content: '',
      isDailyNote: true,
      scheduledDate: date,
      tags: ['daily-note'],
      collections: [],
      pinned: false,
      status: 'READY',
      isFileCard: false,
    });

    if (newNote) {
      openCardDetail(newNote.id);
    }
  };

  const handleOpenNote = () => {
    if (note) {
      openCardDetail(note.id);
    }
  };

  const handlePrevDay = () => {
    setDate((d) => new Date(d.getTime() - 24 * 60 * 60 * 1000));
  };

  const handleNextDay = () => {
    setDate((d) => new Date(d.getTime() + 24 * 60 * 60 * 1000));
  };

  const handleToday = () => {
    setDate(new Date());
  };

  // Get preview text from note content
  const getPreview = (html: string) => {
    if (!html) return 'Empty note';
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 120 ? text.slice(0, 120) + '...' : text || 'Empty note';
  };

  return (
    <Card className="border-border-subtle bg-bg-surface-2">
      <CardContent className="p-4">
        {/* Header with date navigation */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[var(--color-accent)]/20">
              <Calendar className="h-5 w-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <h3 className="font-medium text-text-primary">
                {isToday ? "Today's Note" : 'Daily Note'}
              </h3>
              <p className="text-xs text-text-muted">{formattedDate}</p>
            </div>
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handlePrevDay}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {!isToday && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleToday}
              >
                Today
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleNextDay}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="h-20 flex items-center justify-center">
            <div className="animate-pulse text-text-muted text-sm">Loading...</div>
          </div>
        ) : note ? (
          <button
            onClick={handleOpenNote}
            className={cn(
              'w-full text-left p-3 rounded-lg transition-colors',
              'bg-bg-surface-3/50 hover:bg-bg-surface-3',
              'border border-transparent hover:border-[var(--color-accent)]/30'
            )}
          >
            <p className="text-sm text-text-secondary line-clamp-3">
              {getPreview(note.content || '')}
            </p>
            <div className="flex items-center gap-1 mt-2 text-xs text-text-muted">
              <Edit3 className="h-3 w-3" />
              <span>Click to edit</span>
            </div>
          </button>
        ) : (
          <button
            onClick={handleCreateNote}
            className={cn(
              'w-full p-4 rounded-lg transition-colors',
              'border-2 border-dashed border-border-subtle',
              'hover:border-[var(--color-accent)]/50 hover:bg-bg-surface-3/30',
              'flex flex-col items-center justify-center gap-2'
            )}
          >
            <Plus className="h-6 w-6 text-text-muted" />
            <span className="text-sm text-text-muted">
              {isToday ? 'Start writing today' : `Create note for ${format(date, 'MMM d')}`}
            </span>
          </button>
        )}
      </CardContent>
    </Card>
  );
}
