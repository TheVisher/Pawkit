'use client';

import { useState, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { DragOverlay, useDndMonitor, type Modifier } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CardItem, type CardDisplaySettings } from './card-item';
import type { SystemTag } from '@/lib/utils/system-tags';
import { QuickNoteCard } from './quick-note-card';
import { MasonryGrid } from './masonry-grid';
import { CardListView, type CardGroup } from './card-list-view';
import { CardContextMenu } from '@/components/context-menus';
import type { LocalCard } from '@/lib/db';
import { useModalStore } from '@/lib/stores/modal-store';

type CardSize = 'small' | 'medium' | 'large' | 'xl';

// Custom modifier that centers the overlay on cursor based on overlay size
const centerOverlayOnCursor: Modifier = ({ transform, draggingNodeRect }) => {
  if (draggingNodeRect) {
    return {
      ...transform,
      x: transform.x - draggingNodeRect.width / 2,
      y: transform.y - draggingNodeRect.height / 2,
    };
  }
  return transform;
};

// Card size to width mapping for grid
const CARD_SIZE_WIDTHS: Record<CardSize, number> = {
  small: 180,
  medium: 280,
  large: 400,
  xl: 520,
};

// Sortable card wrapper for grid view
const SortableGridCard = memo(function SortableGridCard({
  card,
  onClick,
  displaySettings,
  isDraggingThis,
  isDropTarget,
  currentCollection,
  onTagClick,
  onSystemTagClick,
}: {
  card: LocalCard;
  onClick: () => void;
  displaySettings?: Partial<CardDisplaySettings>;
  isDraggingThis: boolean;
  isDropTarget: boolean;
  currentCollection?: string;
  onTagClick?: (tag: string) => void;
  onSystemTagClick?: (tag: SystemTag) => void;
}) {
  const { attributes, listeners, setNodeRef } = useSortable({
    id: card.id,
    data: { type: 'Card', card },
  });

  // Quick notes get compact display - use uniformHeight in grid view to stretch
  if (card.type === 'quick-note') {
    return (
      <CardContextMenu card={card} currentCollection={currentCollection}>
        <div
          ref={setNodeRef}
          className="aspect-[4/5] overflow-hidden"
          style={{
            opacity: isDraggingThis ? 0.3 : 1,
            cursor: isDraggingThis ? 'grabbing' : 'grab',
            boxShadow: isDropTarget
              ? '0 0 0 2px var(--color-accent), 0 0 20px hsl(var(--hue-accent) var(--sat-accent) 50% / 0.4)'
              : 'none',
            borderRadius: '1rem',
            transition: 'box-shadow 150ms ease',
          }}
          {...attributes}
          {...listeners}
        >
          <QuickNoteCard card={card} onClick={onClick} isDragging={isDraggingThis} uniformHeight />
        </div>
      </CardContextMenu>
    );
  }

  return (
    <CardContextMenu card={card} currentCollection={currentCollection}>
      <div
        ref={setNodeRef}
        className="aspect-[4/5] overflow-hidden"
        style={{
          opacity: isDraggingThis ? 0.3 : 1,
          cursor: isDraggingThis ? 'grabbing' : 'grab',
          boxShadow: isDropTarget
            ? '0 0 0 2px var(--color-accent), 0 0 20px hsl(var(--hue-accent) var(--sat-accent) 50% / 0.4)'
            : 'none',
          borderRadius: '1rem',
          transition: 'box-shadow 150ms ease',
        }}
        {...attributes}
        {...listeners}
      >
        <CardItem
          card={card}
          variant="grid"
          onClick={onClick}
          displaySettings={displaySettings}
          uniformHeight
          onTagClick={onTagClick}
          onSystemTagClick={onSystemTagClick}
        />
      </div>
    </CardContextMenu>
  );
});

interface CardGridProps {
  cards: LocalCard[];
  layout: string;
  onReorder?: (reorderedIds: string[]) => void;
  cardSize?: CardSize;
  cardSpacing?: number;
  displaySettings?: Partial<CardDisplaySettings>;
  groups?: CardGroup[];
  groupIcon?: React.ComponentType<{ className?: string }>;
  /** Current collection slug for context menu actions */
  currentCollection?: string;
  /** Called when a user tag in the footer is clicked (for filtering) */
  onTagClick?: (tag: string) => void;
  /** Called when a system tag in the footer is clicked (for filtering) */
  onSystemTagClick?: (tag: SystemTag) => void;
}

export function CardGrid({
  cards,
  layout,
  onReorder,
  cardSize = 'medium',
  cardSpacing = 16,
  displaySettings,
  groups,
  groupIcon,
  currentCollection,
  onTagClick,
  onSystemTagClick,
}: CardGridProps) {
  const openCardDetail = useModalStore((s) => s.openCardDetail);

  // DnD state for grid view
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<LocalCard | null>(null);

  // DnD monitor for grid view
  useDndMonitor({
    onDragStart: (event) => {
      // Only handle if this is a grid card
      if (layout !== 'grid') return;
      setActiveId(event.active.id as string);
      setOverId(null);
      const card = cards.find((c) => c.id === event.active.id);
      setActiveDragItem(card || null);
    },
    onDragOver: (event) => {
      if (layout !== 'grid') return;
      setOverId(event.over?.id as string | null);
    },
    onDragEnd: (event) => {
      if (layout !== 'grid') {
        setActiveId(null);
        setOverId(null);
        setActiveDragItem(null);
        return;
      }

      const { active, over } = event;
      setActiveId(null);
      setOverId(null);
      setActiveDragItem(null);

      if (over && active.id !== over.id && onReorder) {
        const oldIndex = cards.findIndex((c) => c.id === active.id);
        const newIndex = cards.findIndex((c) => c.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = [...cards];
          const [removed] = newOrder.splice(oldIndex, 1);
          newOrder.splice(newIndex, 0, removed);
          onReorder(newOrder.map((c) => c.id));
        }
      }
    },
    onDragCancel: () => {
      setActiveId(null);
      setOverId(null);
      setActiveDragItem(null);
    },
  });

  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);

  // Masonry layout with drag-and-drop
  if (layout === 'masonry') {
    return (
      <MasonryGrid
        cards={cards}
        onReorder={onReorder}
        cardSize={cardSize}
        cardSpacing={cardSpacing}
        displaySettings={displaySettings}
        currentCollection={currentCollection}
        onTagClick={onTagClick}
        onSystemTagClick={onSystemTagClick}
      />
    );
  }

  // List view - dedicated component
  if (layout === 'list') {
    return (
      <CardListView
        cards={cards}
        groups={groups}
        groupIcon={groupIcon}
        onReorder={onReorder}
        currentCollection={currentCollection}
        onTagClick={onTagClick}
        onSystemTagClick={onSystemTagClick}
      />
    );
  }

  // Grid view - Uniform card sizes with fixed aspect ratio and DnD
  const minWidth = CARD_SIZE_WIDTHS[cardSize];

  return (
    <>
      <SortableContext items={cardIds} strategy={rectSortingStrategy}>
        <div
          className="grid"
          style={{
            gap: cardSpacing,
            gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
          }}
        >
          {cards.map((card) => (
            <SortableGridCard
              key={card.id}
              card={card}
              onClick={() => openCardDetail(card.id)}
              displaySettings={displaySettings}
              isDraggingThis={activeId === card.id}
              isDropTarget={overId === card.id && activeId !== card.id}
              currentCollection={currentCollection}
              onTagClick={onTagClick}
              onSystemTagClick={onSystemTagClick}
            />
          ))}
        </div>
      </SortableContext>

      {typeof document !== 'undefined' &&
        createPortal(
          <DragOverlay
            adjustScale={false}
            dropAnimation={null}
            modifiers={[centerOverlayOnCursor]}
            style={{ zIndex: 9999 }}
          >
            {activeDragItem && (
              <div
                style={{
                  width: activeDragItem.type === 'quick-note' ? minWidth * 0.8 : minWidth * 0.6,
                  opacity: 0.85,
                  transform: 'rotate(-2deg)',
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4))',
                }}
              >
                {activeDragItem.type === 'quick-note' ? (
                  <QuickNoteCard card={activeDragItem} isDragging />
                ) : (
                  <CardItem card={activeDragItem} variant="grid" displaySettings={displaySettings} />
                )}
              </div>
            )}
          </DragOverlay>,
          document.body
        )}
    </>
  );
}
