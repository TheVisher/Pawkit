'use client';

import { CardItem } from './card-item';
import type { LocalCard } from '@/lib/db';
import { cn } from '@/lib/utils';

interface CardGridProps {
  cards: LocalCard[];
  layout: string;
}

export function CardGrid({ cards, layout }: CardGridProps) {
  const isListView = layout === 'list';

  return (
    <div
      className={cn(
        isListView
          ? 'flex flex-col gap-2'
          : 'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
      )}
    >
      {cards.map((card) => (
        <CardItem
          key={card.id}
          card={card}
          variant={isListView ? 'list' : 'grid'}
          onClick={() => {
            // Log card ID for now - detail modal comes in next task
            console.log('Card clicked:', card.id, card.title || 'Untitled');
          }}
        />
      ))}
    </div>
  );
}
