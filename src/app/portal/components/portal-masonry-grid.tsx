'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { LocalCard } from '@/lib/db/types';
import { PortalCardItem } from './portal-card-item';

// Configuration - matches main app
const DEFAULT_GAP = 12;
const MIN_CARD_WIDTH = 200;

// Default aspect ratio and content padding for height estimation
const DEFAULT_ASPECT_RATIO = 16 / 10;
const MIN_THUMBNAIL_HEIGHT = 120;
const CONTENT_PADDING = 48;

/**
 * Estimate card height based on content
 * Same algorithm as main app's masonry-grid.tsx
 */
function estimateHeight(card: LocalCard, cardWidth: number): number {
  // Quick notes are compact
  if (card.type === 'quick-note') {
    return 80;
  }

  // For cards with images, use aspect ratio
  const thumbnailHeight = card.image
    ? cardWidth / DEFAULT_ASPECT_RATIO
    : MIN_THUMBNAIL_HEIGHT;

  let height = thumbnailHeight + CONTENT_PADDING;

  // Add extra height for long titles
  if (card.title && card.title.length > 50) height += 20;

  return height;
}

interface PortalMasonryGridProps {
  cards: LocalCard[];
  gap?: number;
}

/**
 * Portal Masonry Grid
 *
 * Uses the same "shortest column first" algorithm as the main app's MasonryGrid.
 * This ensures cards are ordered left-to-right (newest cards appear horizontally
 * across columns, not vertically down a single column).
 *
 * Simplified version without drag-and-drop or layout caching since the portal
 * runs in a separate webview context.
 */
export function PortalMasonryGrid({ cards, gap = DEFAULT_GAP }: PortalMasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [measuredHeights, setMeasuredHeights] = useState<Map<string, number>>(new Map());
  const [isStable, setIsStable] = useState(false);
  const stabilityCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const cols = Math.floor((containerWidth + gap) / (MIN_CARD_WIDTH + gap));
    return Math.max(1, Math.min(cols, 3)); // Max 3 columns in portal
  }, [containerWidth, gap]);

  const cardWidth = useMemo(() => {
    if (containerWidth <= 0) return MIN_CARD_WIDTH;
    const totalGap = (columnCount - 1) * gap;
    return (containerWidth - totalGap) / columnCount;
  }, [containerWidth, columnCount, gap]);

  // Calculate masonry positions using "shortest column first"
  // This is the key algorithm that ensures left-to-right ordering
  const { positions, totalHeight } = useMemo(() => {
    if (cards.length === 0 || cardWidth <= 0) {
      return { positions: new Map<string, { x: number; y: number }>(), totalHeight: 0 };
    }

    const columnHeights = new Array(columnCount).fill(0);
    const posMap = new Map<string, { x: number; y: number }>();

    for (const card of cards) {
      // Find shortest column - this is what gives us left-to-right ordering
      let shortestCol = 0;
      let minHeight = columnHeights[0];
      for (let i = 1; i < columnCount; i++) {
        if (columnHeights[i] < minHeight) {
          minHeight = columnHeights[i];
          shortestCol = i;
        }
      }

      // Calculate position
      const x = shortestCol * (cardWidth + gap);
      const y = columnHeights[shortestCol];

      posMap.set(card.id, { x, y });

      // Update column height
      const cardHeight = measuredHeights.get(card.id) || estimateHeight(card, cardWidth);
      columnHeights[shortestCol] += cardHeight + gap;
    }

    const maxHeight = Math.max(...columnHeights);
    return { positions: posMap, totalHeight: maxHeight > 0 ? maxHeight - gap : 0 };
  }, [cards, columnCount, cardWidth, measuredHeights, gap]);

  // Reset stability when cards change - but don't hide existing cards
  // Only reset measured heights for removed cards
  useEffect(() => {
    setMeasuredHeights(prev => {
      const cardIds = new Set(cards.map(c => c.id));
      const filtered = new Map<string, number>();
      for (const [id, height] of prev) {
        if (cardIds.has(id)) {
          filtered.set(id, height);
        }
      }
      return filtered;
    });
    // Mark as stable immediately - let the layout flow naturally
    setIsStable(true);
  }, [cards.length]);

  // Measure card heights after render
  useEffect(() => {
    if (containerWidth === 0 || cardWidth <= 0) return;

    const container = containerRef.current;
    if (!container) return;

    // ResizeObserver for when images load
    const resizeObserver = new ResizeObserver((entries) => {
      const newHeights = new Map<string, number>();

      for (const entry of entries) {
        const id = (entry.target as HTMLElement).getAttribute('data-card-id');
        if (id) {
          const rect = entry.target.getBoundingClientRect();
          if (rect.height > 0) {
            newHeights.set(id, rect.height);
          }
        }
      }

      if (newHeights.size > 0) {
        setMeasuredHeights(prev => {
          let hasChanges = false;
          for (const [id, h] of newHeights) {
            const prevHeight = prev.get(id);
            if (!prevHeight || Math.abs(prevHeight - h) > 2) {
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

      // Schedule stability check
      if (stabilityCheckRef.current) clearTimeout(stabilityCheckRef.current);
      stabilityCheckRef.current = setTimeout(() => {
        setIsStable(true);
      }, 50);
    });

    // Observe all card elements
    const cardElements = container.querySelectorAll('[data-card-id]');
    cardElements.forEach((el) => resizeObserver.observe(el));

    // Initial stability timeout
    stabilityCheckRef.current = setTimeout(() => {
      setIsStable(true);
    }, 100);

    return () => {
      if (stabilityCheckRef.current) clearTimeout(stabilityCheckRef.current);
      resizeObserver.disconnect();
    };
  }, [containerWidth, cards, cardWidth]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        minHeight: containerWidth === 0 ? 200 : Math.max(200, totalHeight),
        height: containerWidth === 0 ? 'auto' : totalHeight || 'auto',
      }}
    >
      {containerWidth === 0 ? (
        // Skeleton while measuring
        <div className="grid gap-3 grid-cols-2">
          {cards.slice(0, 4).map((card) => (
            <div
              key={card.id}
              className="h-32 rounded-2xl animate-pulse"
              style={{ background: 'var(--color-bg-surface-2)' }}
            />
          ))}
        </div>
      ) : (
        // Masonry layout with absolute positioning
        cards.map((card) => {
          const pos = positions.get(card.id);
          if (!pos) return null;

          return (
            <div
              key={card.id}
              data-card-id={card.id}
              style={{
                position: 'absolute',
                width: cardWidth,
                left: pos.x,
                top: pos.y,
                visibility: isStable ? 'visible' : 'hidden',
                opacity: isStable ? 1 : 0,
                transition: isStable ? 'opacity 150ms ease-out' : 'none',
              }}
            >
              <PortalCardItem card={card} />
            </div>
          );
        })
      )}
    </div>
  );
}
