'use client';

/**
 * Note Content Component
 * Editor-focused layout for note cards (md-note, text-note, quick-note)
 * The note content IS the primary content - editor takes center stage
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useDataStore } from '@/lib/stores/data-store';
import { useCardCalendarSync } from '@/lib/hooks/use-card-calendar-sync';
import { Editor } from '@/components/editor';
import { getContentStats } from '../types';
import type { LocalCard } from '@/lib/db';

interface NoteContentProps {
  card: LocalCard;
  className?: string;
}

export function NoteContent({ card, className }: NoteContentProps) {
  const updateCard = useDataStore((s) => s.updateCard);

  // Local state for content
  const [content, setContent] = useState(card.content || '');

  // Sync dates to calendar when card content changes
  useCardCalendarSync(card);

  // Sync local state when card changes (including external updates like Quick Convert)
  useEffect(() => {
    setContent(card.content || '');
  }, [card.id, card.content]);

  // Save content when editor changes
  const handleContentChange = useCallback((html: string) => {
    setContent(html);
    updateCard(card.id, { content: html });
  }, [card.id, updateCard]);

  // Calculate stats
  const stats = getContentStats(content);

  return (
    <div className={cn('flex-1 flex flex-col overflow-hidden', className)}>
      {/* Stats bar */}
      <div className="flex justify-center py-2 text-xs text-text-muted">
        {stats.words.toLocaleString()} words · {stats.chars.toLocaleString()} chars
        {stats.links > 0 && ` · ${stats.links} links`}
      </div>

      {/* Editor - takes remaining space */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <Editor
          content={content}
          onChange={handleContentChange}
          placeholder="Type '/' for commands or just start writing..."
          className="note-editor-large"
        />
      </div>

      <style jsx global>{`
        .note-editor-large .tiptap {
          font-size: 1.125rem;
          line-height: 1.7;
          min-height: 300px;
        }
        .note-editor-large .tiptap:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}
