'use client';

/**
 * Continue Reading Widget
 * Shows cards with reading progress for quick access
 */

import { useMemo } from 'react';
import { BookOpen, ChevronRight, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useCards } from '@/lib/hooks/use-live-data';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { cn } from '@/lib/utils';
import { calculateReadingTime } from '@/lib/db/schema';
import type { LocalCard } from '@/lib/db';

interface ReadingCardItemProps {
  card: LocalCard;
  onClick: () => void;
}

function ReadingCardItem({ card, onClick }: ReadingCardItemProps) {
  const progress = card.readProgress || 0;
  const readingTime = card.readingTime || (card.wordCount ? calculateReadingTime(card.wordCount) : 0);
  const remainingTime = readingTime > 0 ? Math.ceil(readingTime * (1 - progress / 100)) : 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg transition-colors',
        'bg-bg-surface-3/50 hover:bg-bg-surface-3',
        'border border-transparent hover:border-[var(--color-accent)]/30'
      )}
    >
      <div className="flex items-center gap-3">
        {card.favicon ? (
          <img
            src={card.favicon}
            alt=""
            className="w-5 h-5 rounded shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-5 h-5 rounded bg-bg-surface-3 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary font-medium truncate">
            {card.title || 'Untitled'}
          </p>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            {remainingTime > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {remainingTime} min left
              </span>
            )}
            <span>{Math.round(progress)}% complete</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1 rounded-full bg-bg-surface-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progress}%`,
            background: 'var(--color-accent)',
          }}
        />
      </div>
    </button>
  );
}

export function ContinueReadingWidget() {
  const workspace = useCurrentWorkspace();
  const cards = useCards(workspace?.id);
  const openCardDetail = useModalStore((s) => s.openCardDetail);

  const inProgressCards = useMemo(() => {
    return cards
      .filter((c) => {
        if (c._deleted) return false;
        if (c.type !== 'url') return false;
        // Has reading progress between 1 and 99
        return c.readProgress && c.readProgress > 0 && c.readProgress < 100;
      })
      .sort((a, b) => {
        // Sort by last updated (most recent first)
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })
      .slice(0, 5);
  }, [cards]);

  return (
    <Card className="border-border-subtle bg-bg-surface-2 h-full py-0">
      <CardContent className="p-3 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-green-500/20">
            <BookOpen className="h-4 w-4 text-green-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-text-primary text-sm">Continue Reading</h3>
            <p className="text-xs text-text-muted">
              {inProgressCards.length} {inProgressCards.length === 1 ? 'article' : 'articles'} in progress
            </p>
          </div>
        </div>

        {inProgressCards.length > 0 ? (
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {inProgressCards.map((card) => (
              <ReadingCardItem
                key={card.id}
                card={card}
                onClick={() => openCardDetail(card.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <BookOpen className="h-8 w-8 text-text-muted/50 mb-2" />
            <p className="text-sm text-text-muted">No articles in progress</p>
            <p className="text-xs text-text-muted/70 mt-1">
              Open reader mode to start tracking
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
