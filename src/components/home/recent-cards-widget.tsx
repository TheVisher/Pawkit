'use client';

/**
 * Recent Cards Widget
 * Shows recently added cards in a dynamic grid that adapts to widget size
 */

import { useMemo, useRef, useState, useEffect } from 'react';
import { Layers, ChevronRight, ExternalLink } from 'lucide-react';

// Card sizing constants
const MIN_CARD_HEIGHT = 140; // Minimum height per card row in pixels
const MAX_CARD_HEIGHT = 200; // Maximum height per card row in pixels
const HEADER_HEIGHT = 52; // Height of widget header (icon + title + padding)
const PADDING_OFFSET = 16; // Extra padding/margins
import { Card, CardContent } from '@/components/ui/card';
import { useCards } from '@/lib/hooks/use-live-data';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { cn } from '@/lib/utils';
import type { LocalCard } from '@/lib/db';
import { formatDistanceToNow } from 'date-fns';

interface RecentCardItemProps {
  card: LocalCard;
  onClick: () => void;
}

function RecentCardItem({ card, onClick }: RecentCardItemProps) {
  const isUrl = card.type === 'url';
  const timeAgo = formatDistanceToNow(new Date(card.createdAt), { addSuffix: true });

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
      {/* Thumbnail */}
      {card.image && (
        <div className="aspect-video w-full overflow-hidden bg-bg-surface-3">
          <img
            src={card.image}
            alt=""
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start gap-2">
          {card.favicon && !card.image && (
            <img
              src={card.favicon}
              alt=""
              className="w-4 h-4 rounded shrink-0 mt-0.5"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary font-medium line-clamp-2 leading-snug">
              {card.title || 'Untitled'}
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-text-muted">
              {isUrl && card.domain && (
                <>
                  <span className="truncate">{card.domain}</span>
                  <span>•</span>
                </>
              )}
              <span className="shrink-0">{timeAgo}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

// Compact list item for mobile
function RecentCardListItem({ card, onClick }: RecentCardItemProps) {
  const timeAgo = formatDistanceToNow(new Date(card.createdAt), { addSuffix: true });

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg transition-colors',
        'bg-bg-surface-3/50 hover:bg-bg-surface-3',
        'border border-transparent hover:border-[var(--color-accent)]/30',
        'flex items-center gap-3'
      )}
    >
      {card.favicon ? (
        <img
          src={card.favicon}
          alt=""
          className="w-5 h-5 rounded shrink-0"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : card.image ? (
        <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-bg-surface-3">
          <img src={card.image} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-5 h-5 rounded bg-bg-surface-3 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary font-medium truncate">
          {card.title || 'Untitled'}
        </p>
        <p className="text-xs text-text-muted">{timeAgo}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
    </button>
  );
}

export function RecentCardsWidget() {
  const workspace = useCurrentWorkspace();
  const cards = useCards(workspace?.id);
  const openCardDetail = useModalStore((s) => s.openCardDetail);

  // Track container height for dynamic row calculation
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  // Use ResizeObserver to track widget height changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Calculate number of rows based on available height
  const rowCount = useMemo(() => {
    if (containerHeight === 0) return 2; // Default to 2 rows

    const availableHeight = containerHeight - HEADER_HEIGHT - PADDING_OFFSET;

    // Calculate how many rows can fit with MIN_CARD_HEIGHT
    const maxPossibleRows = Math.floor(availableHeight / MIN_CARD_HEIGHT);

    // Calculate how many rows fit with MAX_CARD_HEIGHT
    const minPossibleRows = Math.max(1, Math.floor(availableHeight / MAX_CARD_HEIGHT));

    // Use a value between min and max that fills the space well
    // Prefer more rows if space allows, capped at reasonable max
    const rows = Math.max(1, Math.min(maxPossibleRows, 6));

    return rows;
  }, [containerHeight]);

  // Calculate actual card height to fill available space evenly
  const cardHeight = useMemo(() => {
    if (containerHeight === 0) return MIN_CARD_HEIGHT;

    const availableHeight = containerHeight - HEADER_HEIGHT - PADDING_OFFSET;
    const gapSpace = (rowCount - 1) * 8; // 8px gap between rows (gap-2)
    const heightPerCard = (availableHeight - gapSpace) / rowCount;

    // Clamp between min and max
    return Math.max(MIN_CARD_HEIGHT, Math.min(MAX_CARD_HEIGHT, heightPerCard));
  }, [containerHeight, rowCount]);

  const recentCards = useMemo(() => {
    return cards
      .filter((c) => {
        if (c._deleted) return false;
        if (c.isDailyNote) return false; // Exclude daily notes
        return true;
      })
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, rowCount * 15); // Show enough cards to fill rows (15 columns worth)
  }, [cards, rowCount]);

  return (
    <Card ref={containerRef} className="border-border-subtle bg-bg-surface-2 py-0 h-full">
      <CardContent className="p-3 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-2 shrink-0">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Layers className="h-4 w-4 text-purple-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-text-primary text-sm">Recently Added</h3>
            <p className="text-xs text-text-muted">Your latest saves</p>
          </div>
        </div>

        {recentCards.length > 0 ? (
          <div className="flex-1 min-h-0 overflow-hidden">
            {/* Horizontal scroll grid layout with dynamic rows */}
            <div
              className="h-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-bg-surface-3 scrollbar-track-transparent"
              style={{ scrollbarWidth: 'thin' }}
            >
              <div
                className="h-full grid gap-2"
                style={{
                  gridTemplateRows: `repeat(${rowCount}, minmax(${MIN_CARD_HEIGHT}px, ${cardHeight}px))`,
                  gridAutoFlow: 'column',
                  gridAutoColumns: '140px',
                }}
              >
                {recentCards.map((card) => (
                  <RecentCardItem
                    key={card.id}
                    card={card}
                    onClick={() => openCardDetail(card.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Layers className="h-8 w-8 text-text-muted/50 mb-2" />
            <p className="text-sm text-text-muted">No cards yet</p>
            <p className="text-xs text-text-muted/70 mt-1">
              Add your first bookmark or note to get started
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
