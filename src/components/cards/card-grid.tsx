'use client';

import { CardItem } from './card-item';
import { MasonryGrid } from './masonry-grid';
import type { LocalCard } from '@/lib/db';
import { useModalStore } from '@/lib/stores/modal-store';

interface CardGridProps {
  cards: LocalCard[];
  layout: string;
  onReorder?: (reorderedIds: string[]) => void;
}

export function CardGrid({ cards, layout, onReorder }: CardGridProps) {
  const openCardDetail = useModalStore((s) => s.openCardDetail);

  // Masonry layout with drag-and-drop
  if (layout === 'masonry') {
    return <MasonryGrid cards={cards} onReorder={onReorder} />;
  }

  // List view
  if (layout === 'list') {
    return (
      <div className="flex flex-col gap-2">
        {cards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            variant="list"
            onClick={() => openCardDetail(card.id)}
          />
        ))}
      </div>
    );
  }

  // Default grid view
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {cards.map((card) => (
        <CardItem
          key={card.id}
          card={card}
          variant="grid"
          onClick={() => openCardDetail(card.id)}
        />
      ))}
    </div>
  );
}
