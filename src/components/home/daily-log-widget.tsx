'use client';

/**
 * Daily Log Widget - Centerpiece of the Home View
 * Enhanced daily note with timestamp-based entries
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { db } from '@/lib/db';
import { Calendar, Plus, ChevronLeft, ChevronRight, Edit3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/lib/stores/data-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useCards } from '@/lib/hooks/use-live-data';
import { useModalStore } from '@/lib/stores/modal-store';
import { triggerSync } from '@/lib/services/sync-queue';
import { cn } from '@/lib/utils';

export function DailyLogWidget() {
  const [date, setDate] = useState(new Date());
  const [quickEntry, setQuickEntry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Track whether user is intentionally viewing "today" vs navigated to a specific date
  // When true, date will auto-advance at midnight; when false, it stays on selected date
  const [isViewingToday, setIsViewingToday] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const workspace = useCurrentWorkspace();
  const cards = useCards(workspace?.id);
  const isLoading = useDataStore((s) => s.isLoading);
  const createCard = useDataStore((s) => s.createCard);
  const updateCard = useDataStore((s) => s.updateCard);
  const openCardDetail = useModalStore((s) => s.openCardDetail);

  // Auto-update date at midnight if we're viewing "today"
  // This handles the case where the user keeps the app open past midnight
  useEffect(() => {
    // Only auto-advance if user is intentionally viewing "today"
    // If they navigated to a specific past date, don't pull them back
    if (!isViewingToday) return;

    const checkDateChange = () => {
      const now = new Date();
      const nowStr = format(now, 'yyyy-MM-dd');

      setDate((currentDate) => {
        const currentStr = format(currentDate, 'yyyy-MM-dd');
        // If the stored date is in the past compared to today, update to today
        // This handles midnight rollover - if we were on "today" (Jan 2) and
        // midnight passed, now is Jan 3 so we should advance
        if (currentStr < nowStr) {
          console.log('[DailyLog] Midnight rollover detected, advancing date from', currentStr, 'to', nowStr);
          return now;
        }
        return currentDate;
      });
    };

    // Check every minute for midnight rollover
    const interval = setInterval(checkDateChange, 60000);

    // Also check when the tab becomes visible (user returns to app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkDateChange();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check immediately on mount (handles app restart after midnight)
    checkDateChange();

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isViewingToday]);

  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const formattedDate = format(date, 'EEEE, MMMM d');

  // Find the daily note for the selected date from the store
  // Must get the MOST RECENTLY UPDATED note to match what handleQuickEntry writes to
  const note = useMemo(() => {
    if (!workspace) return null;
    const dailyNotes = cards.filter(
      (c) =>
        c.workspaceId === workspace.id &&
        c.isDailyNote &&
        c.scheduledDate &&
        isSameDay(new Date(c.scheduledDate), date) &&
        !c._deleted
    );
    if (dailyNotes.length === 0) return null;
    // Sort by updatedAt descending and return the most recent
    return dailyNotes.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
  }, [cards, workspace, date]);

  const handleCreateNote = async () => {
    if (!workspace || isSubmitting) return;

    // Always do a direct DB query to check for existing notes
    // This prevents creating duplicates when reactive state is stale
    const existingNotes = await db.cards
      .where('workspaceId')
      .equals(workspace.id)
      .filter(
        (c) =>
          c.isDailyNote === true &&
          c.scheduledDate != null &&
          isSameDay(new Date(c.scheduledDate), date) &&
          c._deleted !== true
      )
      .toArray();

    if (existingNotes.length > 0) {
      const sortedNotes = existingNotes.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      openCardDetail(sortedNotes[0].id);
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

    setIsSubmitting(true);
    try {
      const newNote = await createCard({
        workspaceId: workspace.id,
        type: 'md-note',
        url: '',
        title: format(date, 'MMMM d, yyyy'),
        content: '',
        isDailyNote: true,
        scheduledDate: startOfDay(date), // Normalize to midnight to avoid timezone drift
        tags: ['daily-note'],
        collections: [],
        pinned: false,
        status: 'READY',
        isFileCard: false,
      });

      if (newNote) {
        openCardDetail(newNote.id);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickEntry = async () => {
    if (!quickEntry.trim() || !workspace || isSubmitting) return;

    // Set submitting immediately to prevent race conditions
    setIsSubmitting(true);
    const entryText = quickEntry.trim();
    setQuickEntry(''); // Clear immediately for better UX

    try {
      const timestamp = format(new Date(), 'h:mm a');
      const entryHtml = `<p><strong>${timestamp}</strong> - ${entryText}</p>`;

      // STRATEGY: Trust Zustand state first (survives sync overwrites), then fall back to DB
      // This handles the case where sync wipes IndexedDB but Zustand still has the note

      // 1. If we have a note in Zustand state, try to use it
      if (note) {
        console.log('[DailyLog] Found note in Zustand state:', note.id);

        // Try to get fresh content from DB (in case it was updated elsewhere)
        const freshNote = await db.cards.get(note.id);

        if (freshNote && !freshNote._deleted) {
          // Note exists in DB - prepend new entry at top
          console.log('[DailyLog] Note exists in DB, prepending');
          const newContent = freshNote.content
            ? `${entryHtml}${freshNote.content}`
            : entryHtml;
          await updateCard(note.id, { content: newContent });
          return;
        } else {
          // Note was deleted from DB (likely by sync) but we still have it in Zustand
          // Re-create it with new entry + existing content (newest at top)
          console.log('[DailyLog] Note missing from DB (sync issue), re-creating with existing content');
          const newContent = note.content
            ? `${entryHtml}${note.content}`
            : entryHtml;
          await createCard({
            workspaceId: workspace.id,
            type: 'md-note',
            url: '',
            title: format(date, 'MMMM d, yyyy'),
            content: newContent,
            isDailyNote: true,
            scheduledDate: startOfDay(date), // Normalize to midnight to avoid timezone drift
            tags: ['daily-note'],
            collections: [],
            pinned: false,
            status: 'READY',
            isFileCard: false,
          });
          return;
        }
      }

      // 2. No note in Zustand - query DB directly (fresh page load scenario)
      console.log('[DailyLog] No note in Zustand, querying DB');
      const existingNotes = await db.cards
        .where('workspaceId')
        .equals(workspace.id)
        .filter(
          (c) =>
            c.isDailyNote === true &&
            c.scheduledDate != null &&
            isSameDay(new Date(c.scheduledDate), date) &&
            c._deleted !== true
        )
        .toArray();

      console.log('[DailyLog] Found in DB:', existingNotes.length);

      if (existingNotes.length > 0) {
        // Found existing active daily note - prepend new entry at top
        const sortedNotes = existingNotes.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        const existingNote = sortedNotes[0];
        const newContent = existingNote.content
          ? `${entryHtml}${existingNote.content}`
          : entryHtml;
        await updateCard(existingNote.id, { content: newContent });
        return;
      }

      // Check for trashed daily notes - restore instead of creating new
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
          ? `${entryHtml}${trashedNote.content}`
          : entryHtml;
        await updateCard(trashedNote.id, {
          _deleted: false,
          content: newContent,
        });
        return;
      }

      // No existing note found - create new
      await createCard({
        workspaceId: workspace.id,
        type: 'md-note',
        url: '',
        title: format(date, 'MMMM d, yyyy'),
        content: entryHtml,
        isDailyNote: true,
        scheduledDate: startOfDay(date), // Normalize to midnight to avoid timezone drift
        tags: ['daily-note'],
        collections: [],
        pinned: false,
        status: 'READY',
        isFileCard: false,
      });
    } finally {
      setIsSubmitting(false);
      // Trigger sync immediately after entry is complete
      // (Daily log entries are discrete actions, unlike typing in notes)
      triggerSync();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuickEntry();
    } else if (e.key === 'Escape') {
      setQuickEntry('');
      inputRef.current?.blur();
    }
  };

  const handlePrevDay = () => {
    setIsViewingToday(false); // User explicitly navigating to past
    setDate((d) => new Date(d.getTime() - 24 * 60 * 60 * 1000));
  };

  const handleNextDay = () => {
    // Check if navigating forward would land on today
    const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    const nextDayStr = format(nextDay, 'yyyy-MM-dd');
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (nextDayStr === todayStr) {
      setIsViewingToday(true); // Back to viewing today
    }
    setDate(nextDay);
  };

  const handleToday = () => {
    setIsViewingToday(true); // User wants to view today
    setDate(new Date());
  };

  // Parse entries from note content for preview
  const entries = useMemo(() => {
    if (!note?.content) return [];
    const regex = /<p><strong>(\d{1,2}:\d{2}(?:\s*[AP]M)?)<\/strong>\s*-\s*(.+?)<\/p>/g;
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
    <Card className="border-border-subtle bg-bg-surface-2 h-full py-0">
      <CardContent className="p-3 h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[var(--color-accent)]/20">
              <Calendar className="h-4 w-4 text-[var(--color-accent)]" />
            </div>
            <div>
              <h3 className="font-medium text-text-primary text-sm">
                {isToday ? "Today's Log" : 'Daily Log'}
              </h3>
              <p className="text-xs text-text-muted">{formattedDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleToday}
              disabled={isToday}
            >
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse text-text-muted text-sm">Loading...</div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-3">
            {/* Quick entry - always visible for today */}
            {isToday && (
              <div className="flex gap-2">
                {/* Textarea - takes available width */}
                <textarea
                  ref={inputRef}
                  rows={3}
                  value={quickEntry}
                  onChange={(e) => setQuickEntry(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What's on your mind?"
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-sm resize-none',
                    'bg-bg-surface-3 border border-border-subtle',
                    'focus:outline-none focus:border-[var(--color-accent)]/50',
                    'placeholder:text-text-muted'
                  )}
                />
                {/* Add button - full height of textarea */}
                <Button
                  className="h-auto px-4 shrink-0"
                  onClick={handleQuickEntry}
                  disabled={!quickEntry.trim() || isSubmitting}
                >
                  {isSubmitting ? '...' : 'Add'}
                </Button>
              </div>
            )}

            {note ? (
              <button
                onClick={() => openCardDetail(note.id)}
                className={cn(
                  'flex-1 w-full text-left p-3 rounded-lg transition-colors',
                  'bg-bg-surface-3/50 hover:bg-bg-surface-3',
                  'border border-transparent hover:border-[var(--color-accent)]/30',
                  'flex flex-col'
                )}
              >
                {hasTimestampedEntries ? (
                  <div className="flex-1 flex flex-col">
                    {/* Show newest entries first (content is already stored newest-first), show up to 8 */}
                    <div className="flex-1 space-y-1.5 overflow-hidden">
                      {entries.slice(0, 8).map((entry, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-text-muted font-mono text-xs shrink-0 pt-0.5">
                            {entry.time}
                          </span>
                          <span className="text-text-secondary line-clamp-1">{entry.text}</span>
                        </div>
                      ))}
                    </div>
                    {entries.length > 8 && (
                      <p className="text-xs text-text-muted mt-1">+{entries.length - 8} more entries</p>
                    )}
                  </div>
                ) : previewText ? (
                  <p className="text-sm text-text-secondary line-clamp-3">
                    {previewText.length > 150 ? previewText.slice(0, 150) + '...' : previewText}
                  </p>
                ) : (
                  <p className="text-sm text-text-muted italic">Empty note</p>
                )}
                <div className="flex items-center gap-1 text-xs text-text-muted pt-2 border-t border-border-subtle/50 mt-auto">
                  <Edit3 className="h-3 w-3" />
                  <span>Click to open full editor</span>
                </div>
              </button>
            ) : !isToday ? (
              <button
                onClick={handleCreateNote}
                className={cn(
                  'flex-1 w-full p-4 rounded-lg transition-colors',
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
