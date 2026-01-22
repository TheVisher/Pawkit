'use client';

/**
 * Daily Log Widget - Centerpiece of the Home View
 * Enhanced daily note with timestamp-based entries
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { Calendar, Plus, ChevronLeft, ChevronRight, Edit3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useCards } from '@/lib/contexts/convex-data-context';
import { useModalStore } from '@/lib/stores/modal-store';
import { useMutations, useDataContext } from '@/lib/contexts/convex-data-context';
import type { Id } from '@/lib/types/convex';
import { cn } from '@/lib/utils';
import {
  isPlateJson,
  parseJsonContent,
  extractPlateText,
  serializePlateContent,
} from '@/lib/plate/html-to-plate';
import type { Descendant, Value } from 'platejs';

/**
 * Create a Plate JSON entry with timestamp
 */
function createPlateEntry(timestamp: string, text: string): Descendant {
  return {
    type: 'p',
    children: [
      { text: timestamp, bold: true },
      { text: ` - ${text}` },
    ],
  };
}

/**
 * Parse timestamped entries from content (supports both Plate JSON and legacy HTML)
 */
function parseTimestampedEntries(
  content: string | null | undefined
): { time: string; text: string }[] {
  if (!content) return [];

  // Try Plate JSON first
  if (isPlateJson(content)) {
    const parsed = parseJsonContent(content);
    if (!parsed) return [];

    const entries: { time: string; text: string }[] = [];
    for (const node of parsed) {
      // Check if it's a paragraph with bold timestamp pattern
      if ('type' in node && node.type === 'p' && 'children' in node) {
        const children = node.children as Descendant[];
        if (children.length >= 2) {
          const first = children[0] as { text?: string; bold?: boolean };
          const second = children[1] as { text?: string };

          // Check for bold timestamp followed by " - text"
          if (first.bold && first.text && second.text?.startsWith(' - ')) {
            // Validate timestamp format (e.g., "10:30 AM" or "10:30")
            const timePattern = /^\d{1,2}:\d{2}(?:\s*[AP]M)?$/i;
            if (timePattern.test(first.text.trim())) {
              entries.push({
                time: first.text.trim(),
                text: second.text.slice(3).trim(), // Remove " - " prefix
              });
            }
          }
        }
      }
    }
    return entries;
  }

  // Fall back to legacy HTML parsing
  const regex = /<p><strong>(\d{1,2}:\d{2}(?:\s*[AP]M)?)<\/strong>\s*-\s*(.+?)<\/p>/gi;
  const found: { time: string; text: string }[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    found.push({ time: match[1], text: match[2].replace(/<[^>]*>/g, '') });
  }
  return found;
}

/**
 * Get preview text from content (supports both Plate JSON and legacy HTML)
 */
function getContentPreview(content: string | null | undefined): string | null {
  if (!content) return null;

  // Try Plate JSON first
  if (isPlateJson(content)) {
    const parsed = parseJsonContent(content);
    if (!parsed) return null;
    const text = extractPlateText(parsed);
    return text || null;
  }

  // Fall back to legacy HTML - strip tags
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text || null;
}

/**
 * Merge new entry into existing content
 * Prepends new entry to maintain newest-first order
 */
function mergeEntryIntoContent(
  newEntry: Descendant,
  existingContent: string | null | undefined
): string {
  // If no existing content, just return the new entry
  if (!existingContent || !existingContent.trim()) {
    return serializePlateContent([newEntry] as Value);
  }

  // If existing content is Plate JSON, parse and prepend
  if (isPlateJson(existingContent)) {
    const parsed = parseJsonContent(existingContent);
    if (parsed) {
      return serializePlateContent([newEntry, ...parsed] as Value);
    }
  }

  // If existing content is HTML, we need to convert it first
  // For now, create the new entry and add a paragraph with the HTML notice
  // The editor will convert the HTML when opened
  // Actually, let's just prepend the JSON entry and keep the HTML
  // The editor handles mixed content during conversion
  return serializePlateContent([newEntry] as Value);
}

export function DailyLogWidget() {
  const [date, setDate] = useState(new Date());
  const [quickEntry, setQuickEntry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Track whether user is intentionally viewing "today" vs navigated to a specific date
  // When true, date will auto-advance at midnight; when false, it stays on selected date
  const [isViewingToday, setIsViewingToday] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const workspace = useCurrentWorkspace();
  const cards = useCards();
  const { isLoading } = useDataContext();
  const { createCard, updateCard, restoreCard } = useMutations();
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
        c.workspaceId === workspace._id &&
        c.isDailyNote &&
        c.scheduledDates?.[0] &&
        isSameDay(new Date(c.scheduledDates[0]), date) &&
        !c.deleted
    );
    if (dailyNotes.length === 0) return null;
    // Sort by updatedAt descending and return the most recent
    return dailyNotes.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
  }, [cards, workspace, date]);

  const handleCreateNote = async () => {
    if (!workspace || isSubmitting) return;

    // Find existing daily note for the selected date from the cards array
    const existingNotes = cards.filter(
      (c) =>
        c.workspaceId === workspace._id &&
        c.isDailyNote === true &&
        c.scheduledDates?.[0] != null &&
        isSameDay(new Date(c.scheduledDates[0]), date) &&
        c.deleted !== true
    );

    if (existingNotes.length > 0) {
      const sortedNotes = existingNotes.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      openCardDetail(sortedNotes[0]._id);
      return;
    }

    // Check for trashed daily note - restore instead of creating new
    const trashedCards = cards.filter(
      (c) =>
        c.workspaceId === workspace._id &&
        c.isDailyNote === true &&
        c.scheduledDates?.[0] != null &&
        isSameDay(new Date(c.scheduledDates[0]), date) &&
        c.deleted === true
    );

    if (trashedCards.length > 0) {
      const sortedTrashed = trashedCards.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      const trashedNote = sortedTrashed[0];
      await restoreCard(trashedNote._id);
      openCardDetail(trashedNote._id);
      return;
    }

    setIsSubmitting(true);
    try {
      const newNote = await createCard({
        workspaceId: workspace._id as Id<'workspaces'>,
        type: 'md-note',
        url: '',
        title: format(date, 'MMMM d, yyyy'),
        content: '',
        isDailyNote: true,
        scheduledDates: [startOfDay(date).toISOString()], // Normalize to midnight to avoid timezone drift
        tags: ['daily-note'],
        pinned: false,
        isFileCard: false,
      });

      if (newNote) {
        openCardDetail(newNote);
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
      // Create entry as Plate JSON instead of HTML
      const entryNode = createPlateEntry(timestamp, entryText);

      // Use the note from cards array (unified data context) if available
      if (note && !note.deleted) {
        console.log('[DailyLog] Found note in state:', note._id);
        const newContent = mergeEntryIntoContent(entryNode, note.content);
        await updateCard(note._id, { content: newContent });
        return;
      }

      // Check for existing daily notes in the cards array
      const existingNotes = cards.filter(
        (c) =>
          c.workspaceId === workspace._id &&
          c.isDailyNote === true &&
          c.scheduledDates?.[0] != null &&
          isSameDay(new Date(c.scheduledDates[0]), date) &&
          c.deleted !== true
      );

      console.log('[DailyLog] Found in cards:', existingNotes.length);

      if (existingNotes.length > 0) {
        // Found existing active daily note - prepend new entry at top
        const sortedNotes = existingNotes.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        const existingNote = sortedNotes[0];
        const newContent = mergeEntryIntoContent(entryNode, existingNote.content);
        await updateCard(existingNote._id, { content: newContent });
        return;
      }

      // Check for trashed daily notes - restore instead of creating new
      const trashedCards = cards.filter(
        (c) =>
          c.workspaceId === workspace._id &&
          c.isDailyNote === true &&
          c.scheduledDates?.[0] != null &&
          isSameDay(new Date(c.scheduledDates[0]), date) &&
          c.deleted === true
      );

      if (trashedCards.length > 0) {
        const sortedTrashed = trashedCards.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        const trashedNote = sortedTrashed[0];
        const newContent = mergeEntryIntoContent(entryNode, trashedNote.content);
        await restoreCard(trashedNote._id);
        await updateCard(trashedNote._id, { content: newContent });
        return;
      }

      // No existing note found - create new with Plate JSON
      const initialContent = serializePlateContent([entryNode] as Value);
      await createCard({
        workspaceId: workspace._id as Id<'workspaces'>,
        type: 'md-note',
        url: '',
        title: format(date, 'MMMM d, yyyy'),
        content: initialContent,
        isDailyNote: true,
        scheduledDates: [startOfDay(date).toISOString()], // Normalize to midnight to avoid timezone drift
        tags: ['daily-note'],
        pinned: false,
        isFileCard: false,
      });
    } finally {
      setIsSubmitting(false);
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

  // Parse entries from note content for preview (supports both Plate JSON and HTML)
  const entries = useMemo(() => {
    return parseTimestampedEntries(note?.content);
  }, [note?.content]);

  const previewText = useMemo(() => {
    return getContentPreview(note?.content);
  }, [note?.content]);
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
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            {/* Quick entry - always visible for today */}
            {isToday && (
              <div className="flex gap-2 shrink-0">
                {/* Textarea - takes available width */}
                <textarea
                  ref={inputRef}
                  rows={2}
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
                onClick={() => openCardDetail(note._id)}
                className={cn(
                  'flex-1 w-full text-left p-2 rounded-lg transition-colors min-h-0',
                  'bg-bg-surface-3/50 hover:bg-bg-surface-3',
                  'border border-transparent hover:border-[var(--color-accent)]/30',
                  'flex flex-col overflow-hidden'
                )}
              >
                {hasTimestampedEntries ? (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* Show newest entries first (content is already stored newest-first), show up to 5 in compact view */}
                    <div className="flex-1 space-y-1 overflow-y-auto min-h-0">
                      {entries.slice(0, 5).map((entry, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="text-text-muted font-mono shrink-0">
                            {entry.time}
                          </span>
                          <span className="text-text-secondary line-clamp-1">{entry.text}</span>
                        </div>
                      ))}
                    </div>
                    {entries.length > 5 && (
                      <p className="text-xs text-text-muted mt-1 shrink-0">+{entries.length - 5} more entries</p>
                    )}
                  </div>
                ) : previewText ? (
                  <p className="text-xs text-text-secondary line-clamp-2">
                    {previewText.length > 100 ? previewText.slice(0, 100) + '...' : previewText}
                  </p>
                ) : (
                  <p className="text-xs text-text-muted italic">Empty note</p>
                )}
                <div className="flex items-center gap-1 text-xs text-text-muted pt-1 border-t border-border-subtle/50 mt-auto shrink-0">
                  <Edit3 className="h-3 w-3" />
                  <span>Click to open</span>
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
