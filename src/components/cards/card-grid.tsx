'use client';

import { CardItem, type CardDisplaySettings } from './card-item';
import { MasonryGrid } from './masonry-grid';
import { CardListView } from './card-list-view';
import type { LocalCard } from '@/lib/db';
import { useModalStore } from '@/lib/stores/modal-store';

type CardSize = 'small' | 'medium' | 'large' | 'xl';

// Card size to width mapping for grid
const CARD_SIZE_WIDTHS: Record<CardSize, number> = {
  small: 180,
  medium: 280,
  large: 400,
  xl: 520,
};

interface CardGridProps {
  cards: LocalCard[];
  layout: string;
  onReorder?: (reorderedIds: string[]) => void;
  cardSize?: CardSize;
  cardSpacing?: number;
  displaySettings?: Partial<CardDisplaySettings>;
}

export function CardGrid({
  cards,
  layout,
  onReorder,
  cardSize = 'medium',
  cardSpacing = 16,
  displaySettings,
}: CardGridProps) {
  const openCardDetail = useModalStore((s) => s.openCardDetail);

  // Masonry layout with drag-and-drop
  if (layout === 'masonry') {
    return (
      <MasonryGrid
        cards={cards}
        onReorder={onReorder}
        cardSize={cardSize}
        cardSpacing={cardSpacing}
        displaySettings={displaySettings}
      />
    );
  }

  // List view - dedicated component
  if (layout === 'list') {
    return <CardListView cards={cards} />;
  }

  // Grid view - Uniform card sizes with fixed aspect ratio
  const minWidth = CARD_SIZE_WIDTHS[cardSize];

  return (
    <div
      className="grid"
      style={{
        gap: cardSpacing,
        gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
      }}
    >
      {cards.map((card) => (
        <div key={card.id} className="aspect-[4/3] overflow-hidden">
          <CardItem
            card={card}
            variant="grid"
            onClick={() => openCardDetail(card.id)}
            displaySettings={displaySettings}
            uniformHeight
          />
        </div>
      ))}
    </div>
  );
}
