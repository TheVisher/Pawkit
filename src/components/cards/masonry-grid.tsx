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
import {
  calculateColumnCount,
  calculateCardWidth,
  calculateMasonryLayout,
  estimateCardHeight,
} from '@/lib/utils/masonry';

interface MasonryGridProps {
  cards: LocalCard[];
  onReorder?: (reorderedIds: string[]) => void;
}

interface SortableCardProps {
  card: LocalCard;
  onClick: () => void;
  isDragging: boolean;
}

/**
 * Sortable wrapper for individual cards
 */
function SortableCard({ card, onClick, isDragging: isParentDragging }: SortableCardProps) {
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
    cursor: isParentDragging ? 'grabbing' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <CardItem card={card} variant="grid" onClick={onClick} />
    </div>
  );
}

/**
 * Masonry grid layout with drag-and-drop support
 */
export function MasonryGrid({ cards, onReorder }: MasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cardHeights, setCardHeights] = useState<Map<string, number>>(new Map());
  const openCardDetail = useModalStore((s) => s.openCardDetail);

  // Observe container width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(container);
    setContainerWidth(container.offsetWidth);

    return () => observer.disconnect();
  }, []);

  // Calculate layout dimensions
  const columnCount = useMemo(
    () => calculateColumnCount(containerWidth),
    [containerWidth]
  );

  const cardWidth = useMemo(
    () => calculateCardWidth(containerWidth, columnCount),
    [containerWidth, columnCount]
  );

  // Build card dimensions array using estimates
  const cardDimensions = useMemo(() => {
    return cards.map((card) => ({
      id: card.id,
      height: cardHeights.get(card.id) || estimateCardHeight(card),
    }));
  }, [cards, cardHeights]);

  // Calculate layout positions
  const layout = useMemo(() => {
    if (columnCount <= 0 || cardWidth <= 0) {
      return { positions: [], columnHeights: [], totalHeight: 0 };
    }
    return calculateMasonryLayout(cardDimensions, columnCount, cardWidth);
  }, [cardDimensions, columnCount, cardWidth]);

  // Create position map for quick lookup
  const positionMap = useMemo(() => {
    return new Map(layout.positions.map((p) => [p.id, p]));
  }, [layout.positions]);

  // Measure card heights after render
  const measureCardHeights = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const newHeights = new Map<string, number>();
    const cardElements = container.querySelectorAll('[data-card-id]');

    cardElements.forEach((el) => {
      const id = el.getAttribute('data-card-id');
      if (id) {
        newHeights.set(id, el.getBoundingClientRect().height);
      }
    });

    if (newHeights.size > 0) {
      setCardHeights((prev) => {
        // Only update if heights changed
        let changed = false;
        for (const [id, height] of newHeights) {
          if (prev.get(id) !== height) {
            changed = true;
            break;
          }
        }
        return changed ? new Map([...prev, ...newHeights]) : prev;
      });
    }
  }, []);

  // Measure heights on mount and when cards change
  useEffect(() => {
    // Give React time to render the cards
    const timer = setTimeout(measureCardHeights, 100);
    return () => clearTimeout(timer);
  }, [cards.length, measureCardHeights]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    })
  );

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (over && active.id !== over.id) {
        const oldIndex = cards.findIndex((c) => c.id === active.id);
        const newIndex = cards.findIndex((c) => c.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          // Create new order
          const newOrder = [...cards];
          const [removed] = newOrder.splice(oldIndex, 1);
          newOrder.splice(newIndex, 0, removed);

          // Notify parent of reorder
          onReorder?.(newOrder.map((c) => c.id));
        }
      }
    },
    [cards, onReorder]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // Get active card for drag overlay
  const activeCard = useMemo(
    () => cards.find((c) => c.id === activeId),
    [cards, activeId]
  );

  // Card IDs for sortable context
  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);

  // Don't render until we have container width
  if (containerWidth === 0) {
    return (
      <div ref={containerRef} className="w-full">
        {/* Skeleton loading */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.slice(0, 8).map((card) => (
            <div
              key={card.id}
              className="h-48 rounded-2xl animate-pulse"
              style={{ background: 'var(--bg-surface-2)' }}
            />
          ))}
        </div>
      </div>
    );
  }

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
            height: layout.totalHeight || 'auto',
            minHeight: 200,
          }}
        >
          {cards.map((card) => {
            const position = positionMap.get(card.id);
            if (!position) return null;

            return (
              <div
                key={card.id}
                data-card-id={card.id}
                style={{
                  position: 'absolute',
                  width: cardWidth,
                  left: position.x,
                  top: position.y,
                  transition: activeId ? 'none' : 'all 250ms ease',
                }}
              >
                <SortableCard
                  card={card}
                  onClick={() => openCardDetail(card.id)}
                  isDragging={!!activeId}
                />
              </div>
            );
          })}
        </div>
      </SortableContext>

      {/* Drag overlay */}
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
