'use client';

/**
 * References Section
 * Shows outgoing @ mentions from a card's content (dates, cards, Pawkits)
 */

import { useMemo } from 'react';
import { AtSign, Calendar, FileText, Link2, FolderOpen, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useCards, useCollections, useCardById, useReferences } from '@/lib/contexts/convex-data-context';
import type { Card } from '@/lib/types/convex';
import { useModalStore } from '@/lib/stores/modal-store';
import { useRouter } from '@/lib/navigation';
import { format, parseISO } from 'date-fns';

// Local Reference type definition (replaces LocalReference from db)
interface Reference {
  id: string;
  sourceId: string;
  targetId: string;
  targetType: 'card' | 'date' | 'pawkit';
  linkText: string;
  workspaceId: string;
}

interface ReferencesSectionProps {
  cardId: string;
  workspaceId: string;
}

interface ReferenceItemProps {
  reference: Reference;
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
  // Get outgoing references from the Convex references table
  const references = useReferences(cardId);
  const cards = useCards();
  const collections = useCollections();
  const { openCardDetail } = useModalStore();
  const router = useRouter();

  // Group references by type and enrich with related data
  const grouped = useMemo(() => {
    const dates: (Reference & { parsedDate?: Date; isDeleted?: boolean })[] = [];
    const cardRefs: (Reference & { card?: Card; isDeleted?: boolean })[] = [];
    const pawkitRefs: (Reference & { collection?: typeof collections[0]; isDeleted?: boolean })[] = [];

    for (const ref of references) {
      if (ref.targetType === 'date') {
        try {
          const parsedDate = parseISO(ref.targetId);
          dates.push({
            id: ref._id,
            sourceId: ref.sourceId,
            targetId: ref.targetId,
            targetType: 'date',
            linkText: ref.linkText,
            workspaceId: ref.workspaceId,
            parsedDate,
          });
        } catch {
          dates.push({
            id: ref._id,
            sourceId: ref.sourceId,
            targetId: ref.targetId,
            targetType: 'date',
            linkText: ref.linkText,
            workspaceId: ref.workspaceId,
          });
        }
      } else if (ref.targetType === 'card') {
        const referencedCard = cards.find((c) => c._id === ref.targetId);
        cardRefs.push({
          id: ref._id,
          sourceId: ref.sourceId,
          targetId: ref.targetId,
          targetType: 'card',
          linkText: ref.linkText,
          workspaceId: ref.workspaceId,
          card: referencedCard,
          isDeleted: !referencedCard || referencedCard.deleted,
        });
      } else if (ref.targetType === 'pawkit') {
        const referencedCollection = collections.find((c) => c.slug === ref.targetId);
        pawkitRefs.push({
          id: ref._id,
          sourceId: ref.sourceId,
          targetId: ref.targetId,
          targetType: 'pawkit',
          linkText: ref.linkText,
          workspaceId: ref.workspaceId,
          collection: referencedCollection,
          isDeleted: !referencedCollection || referencedCollection.deleted,
        });
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
    <>
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
      <Separator className="bg-border-subtle mt-4" />
    </>
  );
}

export default ReferencesSection;
