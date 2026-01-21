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
import { useCards, useBacklinks } from '@/lib/contexts/convex-data-context';
import { useModalStore } from '@/lib/stores/modal-store';
import type { Card } from '@/lib/types/convex';

// Local Reference type definition (replaces LocalReference from db)
interface Reference {
  id: string;
  sourceId: string;
  targetId: string;
  targetType: 'card' | 'date' | 'pawkit';
  linkText: string;
  workspaceId: string;
}

interface BacklinksSectionProps {
  card: Card;
  workspaceId: string;
}

interface BacklinkItemProps {
  reference: Reference;
  sourceCard: Card | undefined;
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
  const cards = useCards();
  const { openCardDetail } = useModalStore();

  // Get card backlinks from Convex references table
  const cardBacklinks = useBacklinks(card._id, 'card');

  // For daily notes, also get date backlinks
  const dailyNoteDate = useMemo(() => {
    if (!card.isDailyNote) return undefined;
    // Use the first scheduledDates entry
    if (card.scheduledDates && card.scheduledDates.length > 0) {
      return card.scheduledDates[0];
    }
    return undefined;
  }, [card.isDailyNote, card.scheduledDates]);

  const dateBacklinks = useBacklinks(dailyNoteDate, 'date');

  // Combine and enrich backlinks with source card data
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
      reference: {
        id: ref._id,
        sourceId: ref.sourceId,
        targetId: ref.targetId,
        targetType: ref.targetType as 'card' | 'date' | 'pawkit',
        linkText: ref.linkText,
        workspaceId: ref.workspaceId,
      },
      sourceCard: cards.find((c) => c._id === ref.sourceId),
    })).filter((item) => item.sourceCard && !item.sourceCard.deleted) as { reference: Reference; sourceCard: Card }[];
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
