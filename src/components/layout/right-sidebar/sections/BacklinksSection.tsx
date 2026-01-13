'use client';

/**
 * Backlinks Section
 * Shows cards that @ mention this card
 * For daily notes, also shows cards that @ mention the date
 */

import { useMemo } from 'react';
import { format } from 'date-fns';
import { Link2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBacklinks, useCards } from '@/lib/hooks/use-live-data';
import { useModalStore } from '@/lib/stores/modal-store';
import type { LocalReference, LocalCard } from '@/lib/db';

interface BacklinksSectionProps {
  card: LocalCard;
  workspaceId: string;
}

interface BacklinkItemProps {
  reference: LocalReference;
  sourceCard: LocalCard | undefined;
  onClick: () => void;
}

function BacklinkItem({ reference, sourceCard, onClick }: BacklinkItemProps) {
  const isNote = sourceCard && ['md-note', 'text-note'].includes(sourceCard.type);

  if (!sourceCard) {
    // Source card was deleted - don't show orphaned backlinks
    return null;
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-bg-surface-2 transition-colors"
    >
      <span className="shrink-0 text-text-muted">
        {isNote ? (
          <FileText className="h-3.5 w-3.5" />
        ) : (
          <Link2 className="h-3.5 w-3.5" />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-text-primary truncate">
          {sourceCard.title || 'Untitled'}
        </div>
        <div className="text-[10px] text-text-muted truncate">
          {isNote ? 'Note' : sourceCard.domain || 'Bookmark'}
        </div>
      </div>
    </button>
  );
}

export function BacklinksSection({ card, workspaceId }: BacklinksSectionProps) {
  // Get card backlinks (references with targetType: 'card')
  const cardBacklinks = useBacklinks(card.id, 'card');

  // For daily notes, also get date backlinks
  // Daily notes are linked via @date mentions using the ISO date string
  const dailyNoteDate = useMemo(() => {
    if (!card.isDailyNote) return undefined;
    // Use scheduledDate or the first scheduledDates entry
    if (card.scheduledDate) {
      return format(new Date(card.scheduledDate), 'yyyy-MM-dd');
    }
    if (card.scheduledDates && card.scheduledDates.length > 0) {
      return card.scheduledDates[0];
    }
    return undefined;
  }, [card.isDailyNote, card.scheduledDate, card.scheduledDates]);

  const dateBacklinks = useBacklinks(dailyNoteDate, 'date');

  const cards = useCards(workspaceId);
  const { openCardDetail } = useModalStore();

  // Combine and deduplicate backlinks
  const enrichedBacklinks = useMemo(() => {
    // Combine card and date backlinks
    const allBacklinks = [...cardBacklinks, ...dateBacklinks];

    // Deduplicate by sourceId (same card might link via both card and date)
    const seenSourceIds = new Set<string>();
    const unique = allBacklinks.filter((ref) => {
      if (seenSourceIds.has(ref.sourceId)) return false;
      seenSourceIds.add(ref.sourceId);
      return true;
    });

    return unique.map((ref) => ({
      reference: ref,
      sourceCard: cards.find((c) => c.id === ref.sourceId),
    })).filter((item) => item.sourceCard); // Filter out deleted source cards
  }, [cardBacklinks, dateBacklinks, cards]);

  const handleCardClick = (cardId: string) => {
    openCardDetail(cardId);
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-text-muted mb-3">
        <Link2 className="h-5 w-5" />
        <span className="text-xs font-medium uppercase">Backlinks</span>
        {enrichedBacklinks.length > 0 && (
          <span className="text-xs text-text-muted">({enrichedBacklinks.length})</span>
        )}
      </div>

      {enrichedBacklinks.length > 0 ? (
        <div className="space-y-0.5">
          {enrichedBacklinks.map(({ reference, sourceCard }) => (
            <BacklinkItem
              key={reference.id}
              reference={reference}
              sourceCard={sourceCard}
              onClick={() => handleCardClick(reference.sourceId)}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-text-muted italic">No backlinks yet</p>
      )}
    </div>
  );
}

export default BacklinksSection;
