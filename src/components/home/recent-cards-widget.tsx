'use client';

/**
 * Recent Cards Widget
 * Shows recently added cards in a responsive grid (max 600px height)
 */

import { useMemo } from 'react';
import { Layers, ChevronRight, ExternalLink } from 'lucide-react';
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
      .slice(0, 30); // Max 30 cards for 2-row horizontal scroll
  }, [cards]);

  return (
    <Card className="border-border-subtle bg-bg-surface-2 py-0 h-full">
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
            {/* Horizontal scroll grid layout */}
            <div
              className="h-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-bg-surface-3 scrollbar-track-transparent"
              style={{ scrollbarWidth: 'thin' }}
            >
              <div
                className="h-full grid gap-2"
                style={{
                  gridTemplateRows: 'repeat(2, 1fr)',
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
