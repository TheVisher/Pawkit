'use client';

/**
 * Recent Cards Widget
 * Shows recently added cards in a responsive vertical scroll grid
 * Uses CSS auto-fill for immediate responsive columns without JS measurement
 */

import { useMemo, useState, useEffect, type MouseEvent } from 'react';
import { Layers } from 'lucide-react';

import { Card as UICard, CardContent } from '@/components/ui/card';
import { useCards } from '@/lib/contexts/convex-data-context';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { cn } from '@/lib/utils';
import type { Card } from '@/lib/types/convex';
import { formatDistanceToNow } from 'date-fns';

// Card sizing constants - CSS handles the responsive columns
const MIN_CARD_WIDTH = 280; // Minimum card width before wrapping to fewer columns
const MAX_CARD_WIDTH = 400; // Maximum card width to prevent overly large cards

interface RecentCardItemProps {
  card: Card;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

function RecentCardItem({ card, onClick }: RecentCardItemProps) {
  const isUrl = card.type === 'url';
  const [timeAgo, setTimeAgo] = useState<string>('');

  // Calculate time on client only to avoid hydration mismatch
  useEffect(() => {
    setTimeAgo(formatDistanceToNow(new Date(card.createdAt), { addSuffix: true }));
  }, [card.createdAt]);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl transition-all',
        'bg-bg-surface-3/50 hover:bg-bg-surface-3',
        'border border-transparent hover:border-[var(--color-accent)]/30',
        'overflow-hidden group'
      )}
    >
      {/* Thumbnail - larger for better visibility */}
      {card.image ? (
        <div className="aspect-video w-full overflow-hidden bg-bg-surface-3">
          <img
            src={card.image}
            alt=""
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        </div>
      ) : (
        /* Placeholder for cards without images */
        <div className="aspect-video w-full bg-bg-surface-3 flex items-center justify-center">
          {card.favicon ? (
            <img
              src={card.favicon}
              alt=""
              className="w-12 h-12 rounded"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <Layers className="w-8 h-8 text-text-muted/30" />
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <p className="text-sm text-text-primary font-medium line-clamp-2 leading-snug">
          {card.title || 'Untitled'}
        </p>
        <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
          {isUrl && card.domain && (
            <>
              <span className="truncate max-w-[120px]">{card.domain}</span>
              <span>•</span>
            </>
          )}
          <span className="shrink-0">{timeAgo}</span>
        </div>
      </div>
    </button>
  );
}

export function RecentCardsWidget() {
  const workspace = useCurrentWorkspace();
  const cards = useCards();
  const openCardDetailWithRect = useModalStore((s) => s.openCardDetailWithRect);

  const recentCards = useMemo(() => {
    return cards
      .filter((c) => {
        if (c.deleted) return false;
        if (c.isDailyNote) return false; // Exclude daily notes
        return true;
      })
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 30); // Show up to 30 recent cards
  }, [cards]);

  return (
    <UICard className="border-border-subtle bg-bg-surface-2 py-0 h-full">
      <CardContent className="p-3 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Layers className="h-4 w-4 text-purple-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-text-primary text-sm">Recently Added</h3>
            <p className="text-xs text-text-muted">Your latest saves</p>
          </div>
        </div>

        {recentCards.length > 0 ? (
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-bg-surface-3 scrollbar-track-transparent pr-1">
            {/* CSS auto-fill handles responsive columns without JS measurement */}
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${MIN_CARD_WIDTH}px, ${MAX_CARD_WIDTH}px))`,
              }}
            >
              {recentCards.map((card) => (
                <RecentCardItem
                  key={card._id}
                  card={card}
                  onClick={(event) => {
                    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                    openCardDetailWithRect(card._id, rect);
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center flex-1">
            <Layers className="h-8 w-8 text-text-muted/50 mb-2" />
            <p className="text-sm text-text-muted">No cards yet</p>
            <p className="text-xs text-text-muted/70 mt-1">
              Add your first bookmark or note to get started
            </p>
          </div>
        )}
      </CardContent>
    </UICard>
  );
}
