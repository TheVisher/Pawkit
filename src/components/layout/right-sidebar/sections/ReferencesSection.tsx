'use client';

/**
 * References Section
 * Shows outgoing @ mentions from a card's content (dates, cards, Pawkits)
 */

import { useMemo } from 'react';
import { AtSign, Calendar, FileText, Link2, FolderOpen, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReferences, useCards, useCollections } from '@/lib/hooks/use-live-data';
import { useModalStore } from '@/lib/stores/modal-store';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import type { LocalReference } from '@/lib/db';

interface ReferencesSectionProps {
  cardId: string;
  workspaceId: string;
}

interface ReferenceItemProps {
  reference: LocalReference;
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClick: () => void;
  isDeleted?: boolean;
}

function ReferenceItem({ reference, label, subtitle, icon, onClick, isDeleted }: ReferenceItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors',
        isDeleted
          ? 'opacity-60 hover:opacity-80'
          : 'hover:bg-bg-surface-2'
      )}
    >
      <span className={cn(
        'shrink-0',
        isDeleted ? 'text-red-400' : 'text-text-muted'
      )}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className={cn(
          'text-xs truncate',
          isDeleted ? 'text-red-400 line-through' : 'text-text-primary'
        )}>
          {label}
        </div>
        {subtitle && (
          <div className="text-[10px] text-text-muted truncate">{subtitle}</div>
        )}
      </div>
      {isDeleted && (
        <Trash2 className="h-3 w-3 text-red-400 shrink-0" />
      )}
    </button>
  );
}

export function ReferencesSection({ cardId, workspaceId }: ReferencesSectionProps) {
  const references = useReferences(cardId);
  const cards = useCards(workspaceId);
  const collections = useCollections(workspaceId);
  const { openCardDetail } = useModalStore();
  const router = useRouter();

  // Group references by type
  const grouped = useMemo(() => {
    const dates: (LocalReference & { parsedDate?: Date; isDeleted?: boolean })[] = [];
    const cardRefs: (LocalReference & { card?: typeof cards[0]; isDeleted?: boolean })[] = [];
    const pawkitRefs: (LocalReference & { collection?: typeof collections[0]; isDeleted?: boolean })[] = [];

    for (const ref of references) {
      if (ref.targetType === 'date') {
        try {
          dates.push({ ...ref, parsedDate: parseISO(ref.targetId) });
        } catch {
          dates.push(ref);
        }
      } else if (ref.targetType === 'card') {
        const card = cards.find((c) => c.id === ref.targetId);
        cardRefs.push({ ...ref, card, isDeleted: !card });
      } else if (ref.targetType === 'pawkit') {
        const collection = collections.find((c) => c.slug === ref.targetId);
        pawkitRefs.push({ ...ref, collection, isDeleted: !collection });
      }
    }

    // Sort dates chronologically
    dates.sort((a, b) => {
      if (!a.parsedDate || !b.parsedDate) return 0;
      return a.parsedDate.getTime() - b.parsedDate.getTime();
    });

    return { dates, cards: cardRefs, pawkits: pawkitRefs };
  }, [references, cards, collections]);

  const hasReferences = grouped.dates.length > 0 || grouped.cards.length > 0 || grouped.pawkits.length > 0;

  const handleDateClick = (dateStr: string) => {
    // Navigate to calendar with this date
    router.push(`/calendar?date=${dateStr}`);
  };

  const handleCardClick = (cardId: string) => {
    openCardDetail(cardId);
  };

  const handlePawkitClick = (slug: string) => {
    router.push(`/pawkits/${slug}`);
  };

  if (!hasReferences) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-text-muted mb-3">
        <AtSign className="h-5 w-5" />
        <span className="text-xs font-medium uppercase">References</span>
      </div>

      <div className="space-y-3">
        {/* Date references */}
        {grouped.dates.length > 0 && (
          <div>
            <div className="text-[10px] font-medium uppercase text-text-muted mb-1 px-2">
              Scheduled
            </div>
            {grouped.dates.map((ref) => (
              <ReferenceItem
                key={ref.id}
                reference={ref}
                label={ref.parsedDate ? format(ref.parsedDate, 'MMMM d, yyyy') : ref.linkText}
                subtitle={ref.parsedDate ? format(ref.parsedDate, 'EEEE') : undefined}
                icon={<Calendar className="h-3.5 w-3.5" />}
                onClick={() => handleDateClick(ref.targetId)}
              />
            ))}
          </div>
        )}

        {/* Card references */}
        {grouped.cards.length > 0 && (
          <div>
            <div className="text-[10px] font-medium uppercase text-text-muted mb-1 px-2">
              Cards
            </div>
            {grouped.cards.map((ref) => {
              const isNote = ref.card && ['md-note', 'text-note'].includes(ref.card.type);
              return (
                <ReferenceItem
                  key={ref.id}
                  reference={ref}
                  label={ref.card?.title || ref.linkText}
                  subtitle={ref.isDeleted ? 'Deleted' : (isNote ? 'Note' : ref.card?.domain)}
                  icon={isNote ? <FileText className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                  onClick={() => !ref.isDeleted && handleCardClick(ref.targetId)}
                  isDeleted={ref.isDeleted}
                />
              );
            })}
          </div>
        )}

        {/* Pawkit references */}
        {grouped.pawkits.length > 0 && (
          <div>
            <div className="text-[10px] font-medium uppercase text-text-muted mb-1 px-2">
              Pawkits
            </div>
            {grouped.pawkits.map((ref) => (
              <ReferenceItem
                key={ref.id}
                reference={ref}
                label={ref.collection?.name || ref.linkText}
                icon={<FolderOpen className="h-3.5 w-3.5" />}
                onClick={() => !ref.isDeleted && handlePawkitClick(ref.targetId)}
                isDeleted={ref.isDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReferencesSection;
