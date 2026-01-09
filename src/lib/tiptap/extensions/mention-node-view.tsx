'use client';

/**
 * Mention NodeView Component
 *
 * Renders @ mentions with dynamic label lookup and hover preview.
 * The label is looked up from the current card/collection title,
 * not the static label stored in the content.
 */

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { parseISO, format } from 'date-fns';
import { Calendar, FileText, Link2, FolderOpen } from 'lucide-react';
import { useCardsFromContext, useCollectionsFromContext } from '@/lib/contexts/data-context';
import { useModalStore } from '@/lib/stores/modal-store';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import type { MentionType } from './mention';

export function MentionNodeView({ node }: NodeViewProps) {
  const attrs = node.attrs as {
    id: string;
    label: string;
    type: MentionType;
    deleted?: boolean;
  };
  const { id, label, type, deleted } = attrs;

  // Navigation hooks
  const router = useRouter();
  const openCardDetail = useModalStore((s) => s.openCardDetail);
  const setCalendarDate = useCalendarStore((s) => s.setDate);

  // Get current data from context
  const cards = useCardsFromContext();
  const collections = useCollectionsFromContext();

  // Look up current title based on type
  const currentLabel = useMemo(() => {
    if (type === 'card') {
      const card = cards.find((c) => c.id === id);
      if (card) {
        return card.title || label;
      }
      // Card might be deleted - return stored label
      return label;
    }

    if (type === 'pawkit') {
      const collection = collections.find((c) => c.slug === id);
      if (collection) {
        return collection.name;
      }
      // Collection might be deleted
      return label;
    }

    // For dates, use the stored label (formatted date string)
    return label;
  }, [type, id, label, cards, collections]);

  // Check if the referenced item exists
  const isDeleted = useMemo(() => {
    if (deleted) return true;

    if (type === 'card') {
      return !cards.find((c) => c.id === id);
    }

    if (type === 'pawkit') {
      return !collections.find((c) => c.slug === id);
    }

    // Dates can't be deleted
    return false;
  }, [deleted, type, id, cards, collections]);

  // Handle click to navigate to the mentioned item
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isDeleted) return;

    switch (type) {
      case 'card':
        openCardDetail(id);
        break;
      case 'pawkit':
        router.push(`/pawkits/${id}`);
        break;
      case 'date':
        try {
          const date = parseISO(id);
          setCalendarDate(date);
          router.push('/calendar');
        } catch {
          console.error('Invalid date format:', id);
        }
        break;
    }
  }, [type, id, isDeleted, openCardDetail, router, setCalendarDate]);

  // Determine CSS class based on type and deleted state
  const className = `mention-pill mention-pill-${type}${isDeleted ? ' mention-deleted' : ''}`;

  // Get card or collection for preview
  const previewData = useMemo(() => {
    if (type === 'card') {
      const card = cards.find((c) => c.id === id);
      return { card, collection: null };
    }
    if (type === 'pawkit') {
      const collection = collections.find((c) => c.slug === id);
      // Count cards in this collection
      const cardCount = cards.filter((c) => c.tags?.includes(id)).length;
      return { card: null, collection, cardCount };
    }
    return { card: null, collection: null };
  }, [type, id, cards, collections]);

  // Render preview content based on type
  const renderPreview = () => {
    if (isDeleted) {
      return (
        <div className="text-center">
          <p className="text-sm text-text-muted">This item was deleted</p>
        </div>
      );
    }

    switch (type) {
      case 'card': {
        const card = previewData.card;
        if (!card) return null;

        const isNote = ['md-note', 'text-note', 'quick-note'].includes(card.type);
        const contentSnippet = card.content
          ? card.content.replace(/<[^>]*>/g, '').slice(0, 100)
          : null;

        return (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="shrink-0 mt-0.5 text-text-muted">
                {isNote ? (
                  <FileText className="h-4 w-4" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {card.title || 'Untitled'}
                </p>
                <p className="text-xs text-text-muted">
                  {isNote ? 'Note' : card.domain || 'Bookmark'}
                </p>
              </div>
            </div>
            {contentSnippet && (
              <p className="text-xs text-text-secondary line-clamp-2">
                {contentSnippet}...
              </p>
            )}
            {card.image && (
              <img
                src={card.image}
                alt=""
                className="w-full h-20 object-cover rounded-md"
              />
            )}
          </div>
        );
      }

      case 'pawkit': {
        const collection = previewData.collection;
        if (!collection) return null;

        return (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="shrink-0 mt-0.5 text-purple-500">
                <FolderOpen className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {collection.name}
                </p>
                <p className="text-xs text-text-muted">
                  {previewData.cardCount} {previewData.cardCount === 1 ? 'card' : 'cards'}
                </p>
              </div>
            </div>
          </div>
        );
      }

      case 'date': {
        try {
          const date = parseISO(id);
          return (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5 text-blue-500">
                  <Calendar className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {format(date, 'EEEE')}
                  </p>
                  <p className="text-xs text-text-muted">
                    {format(date, 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
              <p className="text-xs text-text-secondary">
                Click to view in calendar
              </p>
            </div>
          );
        } catch {
          return null;
        }
      }

      default:
        return null;
    }
  };

  return (
    <NodeViewWrapper
      as="span"
      data-pawkit-mention=""
      data-id={id}
      data-type={type}
      data-label={currentLabel}
      data-deleted={isDeleted ? 'true' : undefined}
    >
      <HoverCard openDelay={400} closeDelay={100}>
        <HoverCardTrigger asChild>
          <span
            className={className}
            onClick={handleClick}
            style={{ cursor: isDeleted ? 'not-allowed' : 'pointer' }}
          >
            @{currentLabel}
          </span>
        </HoverCardTrigger>
        <HoverCardContent side="top" align="start" className="w-64">
          {renderPreview()}
        </HoverCardContent>
      </HoverCard>
    </NodeViewWrapper>
  );
}

export default MentionNodeView;
