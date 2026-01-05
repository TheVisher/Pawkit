'use client';

import { memo } from 'react';
import type { LocalCard } from '@/lib/db';
import { QuickNoteCard } from '../quick-note-card';
import { GridCard } from './grid-card';
import { ListCard } from './list-card';
import { type CardDisplaySettings, DEFAULT_CARD_DISPLAY } from './types';
import type { SystemTag } from '@/lib/utils/system-tags';

/**
 * Shallow comparison for string arrays - O(n) instead of O(n) JSON.stringify + compare
 * Avoids micro-stutters from serialization overhead on every memo check
 */
function arraysShallowEqual(a?: string[], b?: string[]): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

interface CardItemProps {
  card: LocalCard;
  variant?: 'grid' | 'list';
  onClick?: () => void;
  displaySettings?: Partial<CardDisplaySettings>;
  uniformHeight?: boolean;
  /** Called when a user tag in the footer is clicked (for filtering) */
  onTagClick?: (tag: string) => void;
  /** Called when a system tag in the footer is clicked (for filtering) */
  onSystemTagClick?: (tag: SystemTag) => void;
}

/**
 * Card item component - memoized to prevent re-renders when other cards change
 * V1-style design: blurred padding around thumbnail, glass pill overlay, metadata footer
 */
export const CardItem = memo(function CardItem({
  card,
  variant = 'grid',
  onClick,
  displaySettings = {},
  uniformHeight = false,
  onTagClick,
  onSystemTagClick,
}: CardItemProps) {
  // Use specialized QuickNoteCard for quick-note types in grid mode
  if (variant === 'grid' && card.type === 'quick-note') {
    return <QuickNoteCard card={card} onClick={onClick} uniformHeight={uniformHeight} />;
  }

  // Grid view
  if (variant === 'grid') {
    return (
      <GridCard
        card={card}
        onClick={onClick}
        displaySettings={displaySettings}
        uniformHeight={uniformHeight}
        onTagClick={onTagClick}
        onSystemTagClick={onSystemTagClick}
      />
    );
  }

  // List view
  return (
    <ListCard
      card={card}
      onClick={onClick}
      displaySettings={displaySettings}
      onTagClick={onTagClick}
      onSystemTagClick={onSystemTagClick}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders when card content hasn't changed
  const prevSettings = { ...DEFAULT_CARD_DISPLAY, ...prevProps.displaySettings };
  const nextSettings = { ...DEFAULT_CARD_DISPLAY, ...nextProps.displaySettings };

  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.card.title === nextProps.card.title &&
    prevProps.card.image === nextProps.card.image &&
    prevProps.card.favicon === nextProps.card.favicon &&
    prevProps.card.domain === nextProps.card.domain &&
    prevProps.card.url === nextProps.card.url &&
    prevProps.card.content === nextProps.card.content &&
    prevProps.card.pinned === nextProps.card.pinned &&
    prevProps.card._synced === nextProps.card._synced &&
    prevProps.card.status === nextProps.card.status &&
    prevProps.card.type === nextProps.card.type &&
    prevProps.variant === nextProps.variant &&
    arraysShallowEqual(prevProps.card.tags, nextProps.card.tags) &&
    // Compare display settings
    prevSettings.cardPadding === nextSettings.cardPadding &&
    prevSettings.showMetadataFooter === nextSettings.showMetadataFooter &&
    prevSettings.showTitles === nextSettings.showTitles &&
    prevSettings.showTags === nextSettings.showTags &&
    prevProps.uniformHeight === nextProps.uniformHeight
  );
});

// Re-export types and constants for backward compatibility
export type { CardDisplaySettings } from './types';
export type { CardItemProps };
export { DEFAULT_CARD_DISPLAY } from './types';
