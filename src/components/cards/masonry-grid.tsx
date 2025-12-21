'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

/**
 * Sortable wrapper for individual cards
 */
function SortableCard({ card, onClick }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform) || undefined,
    transition: transition || 'transform 250ms ease',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-full"
      {...attributes}
      {...listeners}
    >
      <CardItem card={card} variant="grid" onClick={onClick} />
    </div>
  );
}

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
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

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
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={cardIds} strategy={rectSortingStrategy}>
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
                  />
                </div>
              );
            })
          )}
        </div>
      </SortableContext>

      <DragOverlay adjustScale={false}>
        {activeCard && (
          <div style={{ width: cardWidth }}>
            <CardItem card={activeCard} variant="grid" />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
