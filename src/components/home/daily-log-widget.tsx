'use client';

/**
 * Daily Log Widget - Centerpiece of the Home View
 * Enhanced daily note with timestamp-based entries
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { format, isSameDay } from 'date-fns';
import { db } from '@/lib/db';
import { Calendar, Plus, ChevronLeft, ChevronRight, Edit3, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/lib/stores/data-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { cn } from '@/lib/utils';

export function DailyLogWidget() {
  const [date, setDate] = useState(new Date());
  const [quickEntry, setQuickEntry] = useState('');
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const workspace = useCurrentWorkspace();
  const cards = useDataStore((s) => s.cards);
  const isLoading = useDataStore((s) => s.isLoading);
  const createCard = useDataStore((s) => s.createCard);
  const updateCard = useDataStore((s) => s.updateCard);
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

  // Focus input when adding entry
  useEffect(() => {
    if (isAddingEntry && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingEntry]);

  const handleCreateNote = async () => {
    if (!workspace) return;

    if (note) {
      openCardDetail(note.id);
      return;
    }

    // Check for trashed daily note - restore instead of creating new
    const trashedCards = await db.cards
      .where('workspaceId')
      .equals(workspace.id)
      .filter(
        (c) =>
          c.isDailyNote === true &&
          c.scheduledDate != null &&
          isSameDay(new Date(c.scheduledDate), date) &&
          c._deleted === true
      )
      .toArray();

    if (trashedCards.length > 0) {
      const sortedTrashed = trashedCards.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      const trashedNote = sortedTrashed[0];
      await updateCard(trashedNote.id, { _deleted: false });
      openCardDetail(trashedNote.id);
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

  const handleQuickEntry = async () => {
    if (!quickEntry.trim() || !workspace) return;

    const timestamp = format(new Date(), 'HH:mm');
    const entryHtml = `<p><strong>${timestamp}</strong> - ${quickEntry.trim()}</p>`;

    if (note) {
      const newContent = note.content ? `${note.content}${entryHtml}` : entryHtml;
      await updateCard(note.id, { content: newContent });
    } else {
      const trashedCards = await db.cards
        .where('workspaceId')
        .equals(workspace.id)
        .filter(
          (c) =>
            c.isDailyNote === true &&
            c.scheduledDate != null &&
            isSameDay(new Date(c.scheduledDate), date) &&
            c._deleted === true
        )
        .toArray();

      if (trashedCards.length > 0) {
        const sortedTrashed = trashedCards.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        const trashedNote = sortedTrashed[0];
        const newContent = trashedNote.content
          ? `${trashedNote.content}${entryHtml}`
          : entryHtml;
        await updateCard(trashedNote.id, {
          _deleted: false,
          content: newContent,
        });
      } else {
        await createCard({
          workspaceId: workspace.id,
          type: 'md-note',
          url: '',
          title: format(date, 'MMMM d, yyyy'),
          content: entryHtml,
          isDailyNote: true,
          scheduledDate: date,
          tags: ['daily-note'],
          collections: [],
          pinned: false,
          status: 'READY',
          isFileCard: false,
        });
      }
    }

    setQuickEntry('');
    setIsAddingEntry(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuickEntry();
    } else if (e.key === 'Escape') {
      setQuickEntry('');
      setIsAddingEntry(false);
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

  // Parse entries from note content for preview
  const entries = useMemo(() => {
    if (!note?.content) return [];
    const regex = /<p><strong>(\d{2}:\d{2})<\/strong>\s*-\s*(.+?)<\/p>/g;
    const found: { time: string; text: string }[] = [];
    let match;
    while ((match = regex.exec(note.content)) !== null) {
      found.push({ time: match[1], text: match[2].replace(/<[^>]*>/g, '') });
    }
    return found;
  }, [note?.content]);

  const getPreview = (html: string) => {
    if (!html) return null;
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text || null;
  };

  const previewText = note?.content ? getPreview(note.content) : null;
  const hasTimestampedEntries = entries.length > 0;

  return (
    <Card className="border-border-subtle bg-bg-surface-2">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--color-accent)]/20">
              <Calendar className="h-5 w-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary text-lg">
                {isToday ? "Today's Log" : 'Daily Log'}
              </h3>
              <p className="text-sm text-text-muted">{formattedDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {!isToday && (
              <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={handleToday}>
                Today
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="h-24 flex items-center justify-center">
            <div className="animate-pulse text-text-muted text-sm">Loading...</div>
          </div>
        ) : (
          <div className="space-y-3">
            {isToday && (
              <div className="flex items-center gap-2">
                {isAddingEntry ? (
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{format(new Date(), 'HH:mm')}</span>
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      value={quickEntry}
                      onChange={(e) => setQuickEntry(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={() => {
                        if (!quickEntry.trim()) setIsAddingEntry(false);
                      }}
                      placeholder="What's on your mind?"
                      className={cn(
                        'flex-1 px-3 py-2 rounded-lg text-sm',
                        'bg-bg-surface-3 border border-border-subtle',
                        'focus:outline-none focus:border-[var(--color-accent)]/50',
                        'placeholder:text-text-muted'
                      )}
                    />
                    <Button size="sm" onClick={handleQuickEntry} disabled={!quickEntry.trim()}>
                      Add
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-text-muted hover:text-text-primary"
                    onClick={() => setIsAddingEntry(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Quick entry...
                  </Button>
                )}
              </div>
            )}

            {note ? (
              <button
                onClick={() => openCardDetail(note.id)}
                className={cn(
                  'w-full text-left p-4 rounded-xl transition-colors',
                  'bg-bg-surface-3/50 hover:bg-bg-surface-3',
                  'border border-transparent hover:border-[var(--color-accent)]/30'
                )}
              >
                {hasTimestampedEntries ? (
                  <div className="space-y-2">
                    {entries.slice(-3).map((entry, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-text-muted font-mono text-xs shrink-0 pt-0.5">
                          {entry.time}
                        </span>
                        <span className="text-text-secondary line-clamp-1">{entry.text}</span>
                      </div>
                    ))}
                    {entries.length > 3 && (
                      <p className="text-xs text-text-muted">+{entries.length - 3} more entries</p>
                    )}
                  </div>
                ) : previewText ? (
                  <p className="text-sm text-text-secondary line-clamp-3">
                    {previewText.length > 150 ? previewText.slice(0, 150) + '...' : previewText}
                  </p>
                ) : (
                  <p className="text-sm text-text-muted italic">Empty note</p>
                )}
                <div className="flex items-center gap-1 mt-3 text-xs text-text-muted">
                  <Edit3 className="h-3 w-3" />
                  <span>Click to open full editor</span>
                </div>
              </button>
            ) : !isToday ? (
              <button
                onClick={handleCreateNote}
                className={cn(
                  'w-full p-6 rounded-xl transition-colors',
                  'border-2 border-dashed border-border-subtle',
                  'hover:border-[var(--color-accent)]/50 hover:bg-bg-surface-3/30',
                  'flex flex-col items-center justify-center gap-2'
                )}
              >
                <Plus className="h-6 w-6 text-text-muted" />
                <span className="text-sm text-text-muted">
                  Create note for {format(date, 'MMM d')}
                </span>
              </button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
