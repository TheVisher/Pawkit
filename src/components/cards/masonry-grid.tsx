'use client';

import { useMemo, memo, useRef } from 'react';
import { CardItem, type CardDisplaySettings } from './card-item';
import type { SystemTag } from '@/lib/utils/system-tags';
import { QuickNoteCard } from './quick-note-card';
import { CardContextMenu } from '@/components/context-menus';
import type { LocalCard } from '@/lib/db';
import { useModalStore } from '@/lib/stores/modal-store';
import { MuuriGridComponent, MuuriItemWrapper, type MuuriGridRef } from './muuri-grid';

// Card size configurations - min column widths
type CardSize = 'small' | 'medium' | 'large' | 'xl';
const CARD_SIZE_WIDTHS: Record<CardSize, number> = {
  small: 180, // Compact - more columns
  medium: 280, // Default
  large: 400, // Spacious - fewer columns
  xl: 520, // Extra large - minimal columns
};

interface MasonryGridProps {
  cards: LocalCard[];
  cardSize?: CardSize;
  cardSpacing?: number;
  displaySettings?: Partial<CardDisplaySettings>;
  currentCollection?: string;
  /** Called when a user tag in the footer is clicked (for filtering) */
  onTagClick?: (tag: string) => void;
  /** Called when a system tag in the footer is clicked (for filtering) */
  onSystemTagClick?: (tag: SystemTag) => void;
  /** Enable drag-and-drop reordering */
  dragEnabled?: boolean;
  /** Callback when cards are reordered */
  onReorder?: (newOrder: string[]) => void;
}

interface MasonryCardProps {
  card: LocalCard;
  onClick: () => void;
  displaySettings?: Partial<CardDisplaySettings>;
  currentCollection?: string;
  onTagClick?: (tag: string) => void;
  onSystemTagClick?: (tag: SystemTag) => void;
  /** Prioritize this card's image for LCP */
  priority?: boolean;
}

/**
 * Shallow comparison for string arrays
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

/**
 * Shallow comparison for display settings object
 */
function displaySettingsEqual(
  a?: Partial<CardDisplaySettings>,
  b?: Partial<CardDisplaySettings>
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.cardPadding === b.cardPadding &&
    a.showMetadataFooter === b.showMetadataFooter &&
    a.showTitles === b.showTitles &&
    a.showTags === b.showTags
  );
}

/**
 * Individual card component for masonry grid
 * Memoized to prevent re-renders when other cards in the list change
 */
const MasonryCard = memo(
  function MasonryCard({
    card,
    onClick,
    displaySettings,
    currentCollection,
    onTagClick,
    onSystemTagClick,
    priority = false,
  }: MasonryCardProps) {
    return (
      <CardContextMenu card={card} currentCollection={currentCollection}>
        <div className="w-full">
          {card.type === 'quick-note' ? (
            <QuickNoteCard card={card} onClick={onClick} />
          ) : (
            <CardItem
              card={card}
              variant="grid"
              onClick={onClick}
              displaySettings={displaySettings}
              onTagClick={onTagClick}
              onSystemTagClick={onSystemTagClick}
              priority={priority}
            />
          )}
        </div>
      </CardContextMenu>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if the card content actually changed
    return (
      prevProps.card.id === nextProps.card.id &&
      prevProps.card.title === nextProps.card.title &&
      prevProps.card.image === nextProps.card.image &&
      prevProps.card.favicon === nextProps.card.favicon &&
      prevProps.card.domain === nextProps.card.domain &&
      prevProps.card.url === nextProps.card.url &&
      prevProps.card.content === nextProps.card.content &&
      prevProps.card.type === nextProps.card.type &&
      prevProps.card.pinned === nextProps.card.pinned &&
      prevProps.card._synced === nextProps.card._synced &&
      prevProps.card.status === nextProps.card.status &&
      prevProps.card.convertedToTodo === nextProps.card.convertedToTodo &&
      prevProps.card.dismissedTodoSuggestion === nextProps.card.dismissedTodoSuggestion &&
      prevProps.card.scheduledDate === nextProps.card.scheduledDate &&
      prevProps.card.linkStatus === nextProps.card.linkStatus &&
      prevProps.card.isRead === nextProps.card.isRead &&
      prevProps.card.readProgress === nextProps.card.readProgress &&
      prevProps.card.readingTime === nextProps.card.readingTime &&
      prevProps.currentCollection === nextProps.currentCollection &&
      prevProps.priority === nextProps.priority &&
      arraysShallowEqual(prevProps.card.tags, nextProps.card.tags) &&
      displaySettingsEqual(prevProps.displaySettings, nextProps.displaySettings)
    );
  }
);

/**
 * Masonry grid layout powered by Muuri.js
 *
 * Muuri provides:
 * - Fast, smooth masonry layout
 * - Built-in drag-and-drop
 * - Efficient DOM updates
 * - Responsive column calculation
 */
export function MasonryGrid({
  cards,
  cardSize = 'medium',
  cardSpacing = 16,
  displaySettings,
  currentCollection,
  onTagClick,
  onSystemTagClick,
  dragEnabled = false,
  onReorder,
}: MasonryGridProps) {
  const openCardDetail = useModalStore((s) => s.openCardDetail);
  const gridRef = useRef<MuuriGridRef>(null);

  // Get minimum card width based on size setting
  const minCardWidth = CARD_SIZE_WIDTHS[cardSize];

  // Generate a string key from card IDs to detect when cards change
  const cardIdsKey = useMemo(() => cards.map((c) => c.id).join(','), [cards]);

  // Empty state
  if (cards.length === 0) {
    return null;
  }

  return (
    <MuuriGridComponent
      ref={gridRef}
      itemCount={cards.length}
      cardIds={cardIdsKey}
      minItemWidth={minCardWidth}
      itemSpacing={cardSpacing}
      fillGaps={true}
      dragEnabled={dragEnabled}
      onOrderChange={onReorder}
      layoutDuration={300}
      layoutEasing="ease-out"
    >
      {(calculatedWidth) =>
        cards.map((card, index) => (
          <MuuriItemWrapper
            key={card.id}
            cardId={card.id}
            width={calculatedWidth}
            spacing={cardSpacing}
          >
            <MasonryCard
              card={card}
              onClick={() => openCardDetail(card.id)}
              displaySettings={displaySettings}
              currentCollection={currentCollection}
              onTagClick={onTagClick}
              onSystemTagClick={onSystemTagClick}
              priority={index < 6}
            />
          </MuuriItemWrapper>
        ))
      }
    </MuuriGridComponent>
  );
}
