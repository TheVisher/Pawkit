'use client';

/**
 * Scheduled Today Widget
 * Shows cards scheduled for today with quick access
 */

import { useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { CalendarCheck, ChevronRight, Clock } from 'lucide-react';
import { Card as UICard, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCards } from '@/lib/contexts/convex-data-context';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { cn } from '@/lib/utils';
import type { Card } from '@/lib/types/convex';

interface ScheduledCardItemProps {
  card: Card;
  onClick: () => void;
}

function ScheduledCardItem({ card, onClick }: ScheduledCardItemProps) {
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
      ) : (
        <div className="w-5 h-5 rounded bg-bg-surface-3 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary font-medium truncate">
          {card.title || 'Untitled'}
        </p>
        {card.domain && (
          <p className="text-xs text-text-muted truncate">{card.domain}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
    </button>
  );
}

export function ScheduledTodayWidget() {
  const workspace = useCurrentWorkspace();
  const cards = useCards();
  const openCardDetail = useModalStore((s) => s.openCardDetail);

  const scheduledToday = useMemo(() => {
    const today = new Date();
    return cards
      .filter((c) => {
        if (c.deleted) return false;
        if (c.isDailyNote) return false; // Exclude daily notes
        if (!c.scheduledDates?.[0]) return false;
        return isSameDay(new Date(c.scheduledDates[0]), today);
      })
      .sort((a, b) => {
        // Sort by creation date, newest first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 5); // Limit to 5 items
  }, [cards]);

  const totalScheduled = useMemo(() => {
    const today = new Date();
    return cards.filter((c) => {
      if (c.deleted) return false;
      if (c.isDailyNote) return false;
      if (!c.scheduledDates?.[0]) return false;
      return isSameDay(new Date(c.scheduledDates[0]), today);
    }).length;
  }, [cards]);

  return (
    <UICard className="border-border-subtle bg-bg-surface-2 h-full py-0">
      <CardContent className="p-3 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <CalendarCheck className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-text-primary text-sm">Scheduled Today</h3>
            <p className="text-xs text-text-muted">
              {totalScheduled} {totalScheduled === 1 ? 'item' : 'items'} for today
            </p>
          </div>
        </div>

        {scheduledToday.length > 0 ? (
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {scheduledToday.map((card) => (
              <ScheduledCardItem
                key={card._id}
                card={card}
                onClick={() => openCardDetail(card._id)}
              />
            ))}
            {totalScheduled > 5 && (
              <p className="text-xs text-text-muted text-center pt-1">
                +{totalScheduled - 5} more
              </p>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Clock className="h-8 w-8 text-text-muted/50 mb-2" />
            <p className="text-sm text-text-muted">Nothing scheduled for today</p>
            <p className="text-xs text-text-muted/70 mt-1">
              Schedule items from the calendar view
            </p>
          </div>
        )}
      </CardContent>
    </UICard>
  );
}
