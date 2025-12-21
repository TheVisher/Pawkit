'use client';

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragMoveEvent,
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CardItem } from './card-item';
import type { LocalCard } from '@/lib/db';
import { useModalStore } from '@/lib/stores/modal-store';

// Configuration
const MIN_CARD_WIDTH = 280;
const GAP = 16;

interface MasonryGridProps {
  cards: LocalCard[];
  onReorder?: (reorderedIds: string[]) => void;
}

interface SortableCardProps {
  card: LocalCard;
  onClick: () => void;
}

interface SortableCardInnerProps extends SortableCardProps {
  isDraggingThis: boolean;
  isDropTarget: boolean;
}

/**
 * Sortable wrapper for individual cards
 * Memoized to prevent re-renders when other cards in the list change
 *
 * IMPORTANT: We do NOT apply dnd-kit transforms here because we use
 * absolute positioning. Transforms would conflict and cause offset issues.
 * The DragOverlay handles the visual dragging instead.
 */
const SortableCard = memo(function SortableCard({ card, onClick, isDraggingThis, isDropTarget }: SortableCardInnerProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
  } = useSortable({ id: card.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        // Hide the original card while dragging - DragOverlay shows it instead
        opacity: isDraggingThis ? 0.3 : 1,
        cursor: isDraggingThis ? 'grabbing' : 'grab',
      }}
      className="w-full"
      {...attributes}
      {...listeners}
    >
      {/* Drop indicator - shows above the card when it's a drop target */}
      {isDropTarget && (
        <div
          className="absolute -top-2 left-0 right-0 h-1 rounded-full z-10"
          style={{
            background: 'var(--ds-accent)',
            boxShadow: '0 0 12px hsla(var(--accent-h) var(--accent-s) 50% / 0.6)',
          }}
        />
      )}
      <div
        className="relative"
        style={{
          // Glow effect on drop target
          boxShadow: isDropTarget
            ? '0 0 0 2px var(--ds-accent), 0 0 20px hsla(var(--accent-h) var(--accent-s) 50% / 0.4)'
            : 'none',
          borderRadius: '1rem',
          transition: 'box-shadow 150ms ease',
        }}
      >
        <CardItem card={card} variant="grid" onClick={onClick} />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the card content actually changed
  // Compare by ID and key fields that affect rendering
  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.card.title === nextProps.card.title &&
    prevProps.card.image === nextProps.card.image &&
    prevProps.card.favicon === nextProps.card.favicon &&
    prevProps.card.domain === nextProps.card.domain &&
    prevProps.card.url === nextProps.card.url &&
    prevProps.card.pinned === nextProps.card.pinned &&
    prevProps.card._synced === nextProps.card._synced &&
    prevProps.card.status === nextProps.card.status &&
    prevProps.isDraggingThis === nextProps.isDraggingThis &&
    prevProps.isDropTarget === nextProps.isDropTarget &&
    JSON.stringify(prevProps.card.tags) === JSON.stringify(nextProps.card.tags)
  );
});

// Default aspect ratio and minimum height from CardItem
const DEFAULT_ASPECT_RATIO = 16 / 10;
const MIN_THUMBNAIL_HEIGHT = 180;
const CONTENT_PADDING = 56; // Approximate height for title + domain + tags area

/**
 * Estimate card height based on content
 * This is used for initial layout before actual measurements
 */
function estimateHeight(card: LocalCard, cardWidth: number): number {
  // For cards with images, use aspect ratio to estimate thumbnail height
  // We can't know the actual aspect ratio until the image loads, so use default
  const thumbnailHeight = card.image
    ? cardWidth / DEFAULT_ASPECT_RATIO
    : MIN_THUMBNAIL_HEIGHT;

  let height = thumbnailHeight + CONTENT_PADDING;

  // Add extra height for long titles
  if (card.title && card.title.length > 50) height += 24;

  // Add height for tags
  if (card.tags && card.tags.length > 0) height += 28;

  return height;
}

/**
 * Masonry grid layout with drag-and-drop support
 */
export function MasonryGrid({ cards, onReorder }: MasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [measuredHeights, setMeasuredHeights] = useState<Map<string, number>>(new Map());
  const openCardDetail = useModalStore((s) => s.openCardDetail);

  // Observe container width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const width = container.offsetWidth;
      if (width > 0) {
        setContainerWidth(width);
      }
    };

    // Initial measurement
    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Calculate columns and card width
  const columnCount = useMemo(() => {
    if (containerWidth <= 0) return 1;
    const cols = Math.floor((containerWidth + GAP) / (MIN_CARD_WIDTH + GAP));
    return Math.max(1, cols);
  }, [containerWidth]);

  const cardWidth = useMemo(() => {
    if (containerWidth <= 0) return MIN_CARD_WIDTH;
    const totalGap = (columnCount - 1) * GAP;
    return (containerWidth - totalGap) / columnCount;
  }, [containerWidth, columnCount]);

  // Calculate masonry positions
  const { positions, totalHeight } = useMemo(() => {
    if (cards.length === 0) {
      return { positions: new Map<string, { x: number; y: number }>(), totalHeight: 0 };
    }

    const columnHeights = new Array(columnCount).fill(0);
    const posMap = new Map<string, { x: number; y: number }>();

    for (const card of cards) {
      // Find shortest column
      let shortestCol = 0;
      let minHeight = columnHeights[0];
      for (let i = 1; i < columnCount; i++) {
        if (columnHeights[i] < minHeight) {
          minHeight = columnHeights[i];
          shortestCol = i;
        }
      }

      // Calculate position
      const x = shortestCol * (cardWidth + GAP);
      const y = columnHeights[shortestCol];

      posMap.set(card.id, { x, y });

      // Update column height
      const cardHeight = measuredHeights.get(card.id) || estimateHeight(card, cardWidth);
      columnHeights[shortestCol] += cardHeight + GAP;
    }

    const maxHeight = Math.max(...columnHeights);
    return { positions: posMap, totalHeight: maxHeight > 0 ? maxHeight - GAP : 0 };
  }, [cards, columnCount, cardWidth, measuredHeights]);

  // Measure card heights after render and when cards resize (e.g., images load)
  useEffect(() => {
    if (containerWidth === 0) return;

    const container = containerRef.current;
    if (!container) return;

    const measureCards = () => {
      const newHeights = new Map<string, number>();
      const cardElements = container.querySelectorAll('[data-card-id]');

      cardElements.forEach((el) => {
        const id = el.getAttribute('data-card-id');
        if (id) {
          const rect = el.getBoundingClientRect();
          if (rect.height > 0) {
            newHeights.set(id, rect.height);
          }
        }
      });

      if (newHeights.size > 0) {
        setMeasuredHeights(prev => {
          // Only update if heights actually changed
          let hasChanges = false;
          for (const [id, h] of newHeights) {
            if (prev.get(id) !== h) {
              hasChanges = true;
              break;
            }
          }
          if (!hasChanges) return prev;

          const merged = new Map(prev);
          for (const [id, h] of newHeights) {
            merged.set(id, h);
          }
          return merged;
        });
      }
    };

    // Initial measurement after a short delay
    const timer = setTimeout(measureCards, 150);

    // Also observe size changes on card elements (for when images load)
    const resizeObserver = new ResizeObserver(() => {
      measureCards();
    });

    // Observe all card elements
    const cardElements = container.querySelectorAll('[data-card-id]');
    cardElements.forEach((el) => resizeObserver.observe(el));

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [containerWidth, cards]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setOverId(null);
  }, []);

  const handleDragOver = useCallback((event: DragMoveEvent) => {
    const { over } = event;
    // Update overId to show drop indicator
    setOverId(over?.id as string | null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverId(null);

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
    [cards, onReorder]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
  }, []);

  const activeCard = useMemo(
    () => cards.find((c) => c.id === activeId),
    [cards, activeId]
  );

  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);

  // Always render the container with ref, but show skeleton or content
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div
          ref={containerRef}
          className="relative w-full"
          style={{
            minHeight: containerWidth === 0 ? 400 : Math.max(200, totalHeight),
            height: containerWidth === 0 ? 'auto' : totalHeight || 'auto',
          }}
        >
          {containerWidth === 0 ? (
            // Skeleton while measuring
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {cards.slice(0, 8).map((card) => (
                <div
                  key={card.id}
                  className="h-48 rounded-2xl animate-pulse"
                  style={{ background: 'var(--bg-surface-2)' }}
                />
              ))}
            </div>
          ) : (
            // Masonry layout
            cards.map((card) => {
              const pos = positions.get(card.id);
              if (!pos) {
                console.warn('No position for card:', card.id);
                return null;
              }

              return (
                <div
                  key={card.id}
                  data-card-id={card.id}
                  style={{
                    position: 'absolute',
                    width: cardWidth,
                    left: pos.x,
                    top: pos.y,
                    transition: activeId ? 'none' : 'all 250ms ease',
                  }}
                >
                  <SortableCard
                    card={card}
                    onClick={() => openCardDetail(card.id)}
                    isDraggingThis={activeId === card.id}
                    isDropTarget={overId === card.id && activeId !== card.id}
                  />
                </div>
              );
            })
          )}
        </div>
      </SortableContext>

      <DragOverlay
        adjustScale={false}
        dropAnimation={null}
        modifiers={[snapCenterToCursor]}
      >
        {activeCard && (
          <div
            style={{
              width: cardWidth * 0.6, // 60% of original size
              opacity: 0.85,
              transform: 'rotate(-2deg)', // Slight tilt for visual feedback
              pointerEvents: 'none',
              filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4))',
            }}
          >
            <CardItem card={activeCard} variant="grid" />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
