'use client';

/**
 * Recent Cards Widget
 * Shows recently added cards in a responsive vertical scroll grid
 * Columns adjust based on widget width (targeting ~220px per card)
 */

import { useMemo, useRef, useState, useEffect } from 'react';
import { Layers } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { useCards } from '@/lib/hooks/use-live-data';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { cn } from '@/lib/utils';
import type { LocalCard } from '@/lib/db';
import { formatDistanceToNow } from 'date-fns';

// Card sizing constants
const TARGET_CARD_WIDTH = 320; // Target width per card in pixels
const MIN_CARD_WIDTH = 280; // Minimum card width
const GAP_SIZE = 12; // Gap between cards (gap-3 = 12px)

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
  const cards = useCards(workspace?.id);
  const openCardDetail = useModalStore((s) => s.openCardDetail);

  // Track container width for dynamic column calculation
  const gridRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Use ResizeObserver to track widget width changes
  useEffect(() => {
    const container = gridRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Calculate number of columns based on available width
  const columnCount = useMemo(() => {
    if (containerWidth === 0) return 2; // Default

    // Calculate how many columns fit at target width
    const columnsAtTarget = Math.floor((containerWidth + GAP_SIZE) / (TARGET_CARD_WIDTH + GAP_SIZE));

    // Ensure at least 1 column, cap at reasonable max
    return Math.max(1, Math.min(columnsAtTarget, 6));
  }, [containerWidth]);

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
      .slice(0, 30); // Show up to 30 recent cards
  }, [cards]);

  return (
    <Card className="border-border-subtle bg-bg-surface-2 py-0 h-full">
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
          <div
            ref={gridRef}
            className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-bg-surface-3 scrollbar-track-transparent pr-1"
          >
            {/* Responsive vertical scroll grid - columns based on width */}
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${columnCount}, minmax(${MIN_CARD_WIDTH}px, 1fr))`,
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
    </Card>
  );
}
