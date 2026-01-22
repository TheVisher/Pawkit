'use client';

/**
 * Note Content Component
 * Editor-focused layout for note cards (md-note, text-note)
 * The note content IS the primary content - editor takes center stage
 *
 * Updated to use Plate editor with JSON content storage.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useMutations, useCalendarEvents } from '@/lib/contexts/convex-data-context';
import { useSupertagCalendarSync } from '@/lib/hooks/use-supertag-calendar-sync';
import { PawkitPlateEditor } from '@/components/editor';
import { ContactPhotoHeader } from '../contact-photo-header';
import { isSupertag, getCalendarFieldsFromTags } from '@/lib/tags/supertags';
import {
  serializePlateContent,
  getPlateContentStats,
  isPlateJson,
  parseJsonContent,
} from '@/lib/plate/html-to-plate';
import type { Card, Id } from '@/lib/types/convex';

// Simple type for Plate content
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlateContent = any[];

interface NoteContentProps {
  card: Card;
  title: string;
  setTitle?: (title: string) => void;
  onTitleBlur?: () => void;
  className?: string;
}

export function NoteContent({ card, title, setTitle, onTitleBlur, className }: NoteContentProps) {
  const { updateCard } = useMutations();
  const calendarEvents = useCalendarEvents();
  const { syncCardToCalendar } = useSupertagCalendarSync();
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse content - could be HTML (legacy) or JSON string (new format)
  const initialContent = useMemo(() => {
    const raw = card.content || '';
    // Try to parse as JSON first
    if (isPlateJson(raw)) {
      return parseJsonContent(raw) || raw;
    }
    // Return raw for HTML conversion by editor
    return raw;
  }, [card.content]);

  // Local state for Plate content
  const [plateContent, setPlateContent] = useState<PlateContent | string>(initialContent);

  // Check if this card has supertag calendar fields
  const hasCalendarFields = useMemo(() => {
    const fields = getCalendarFieldsFromTags(card.tags || []);
    return fields.length > 0;
  }, [card.tags]);

  // Calendar sync for supertag date fields (birthday, renewal, expiry, etc.)
  useEffect(() => {
    if (!hasCalendarFields) return;

    // Debounce sync to avoid hammering on every keystroke
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncCardToCalendar(
        card,
        card.workspaceId as Id<'workspaces'>,
        calendarEvents
      ).catch((err) => {
        console.error('[NoteContent] Calendar sync failed:', err);
      });
    }, 2000); // 2 second debounce

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [card, hasCalendarFields, calendarEvents, syncCardToCalendar]);

  // Sync local state when card changes (including external updates like Quick Convert)
  useEffect(() => {
    const raw = card.content || '';
    if (isPlateJson(raw)) {
      const parsed = parseJsonContent(raw);
      if (parsed) setPlateContent(parsed);
    } else {
      setPlateContent(raw);
    }
  }, [card._id, card.content]);

  // Save content when editor changes - serialize to JSON string
  const handleContentChange = useCallback((value: PlateContent) => {
    setPlateContent(value);
    const jsonString = serializePlateContent(value);
    updateCard(card._id, { content: jsonString });
  }, [card._id, updateCard]);

  // Calculate stats from Plate content
  const stats = useMemo(() => {
    if (Array.isArray(plateContent)) {
      return getPlateContentStats(plateContent);
    }
    // Fallback for HTML content
    return { words: 0, chars: 0, links: 0 };
  }, [plateContent]);

  // Check if this is a contact card (has #contact supertag)
  const isContactCard = useMemo(() => {
    return card.tags?.some(tag => isSupertag(tag) && tag.toLowerCase().replace(/^#/, '') === 'contact');
  }, [card.tags]);

  return (
    <div className={cn('flex-1 flex flex-col overflow-hidden', className)}>
      {/* Contact photo header - only for contact cards */}
      {isContactCard && setTitle && onTitleBlur && (
        <ContactPhotoHeader
          card={card}
          title={title}
          setTitle={setTitle}
          onTitleBlur={onTitleBlur}
        />
      )}

      {/* Stats bar */}
      <div className="flex justify-center py-2 text-xs text-text-muted">
        {stats.words.toLocaleString()} words · {stats.chars.toLocaleString()} chars
        {stats.links > 0 && ` · ${stats.links} links`}
      </div>

      {/* Plate Editor - takes remaining space */}
      <div className="flex-1 overflow-y-auto pb-8">
        <PawkitPlateEditor
          content={plateContent}
          onChange={handleContentChange}
          placeholder="Type '/' for commands or just start writing..."
          workspaceId={card.workspaceId}
          cardId={card._id}
          variant="default"
        />
      </div>
    </div>
  );
}
