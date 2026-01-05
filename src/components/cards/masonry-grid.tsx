'use client';

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { CardItem, type CardDisplaySettings } from './card-item';
import type { SystemTag } from '@/lib/utils/system-tags';
import { QuickNoteCard } from './quick-note-card';
import { CardContextMenu } from '@/components/context-menus';
import type { LocalCard } from '@/lib/db';
import { useModalStore } from '@/lib/stores/modal-store';
import { useLayoutCacheStore, generateCardContentHash } from '@/lib/stores/layout-cache-store';

// Virtualization: pixels of overscan above/below viewport for IntersectionObserver rootMargin
// Using 1200px buffer to prevent "flying cards" on fast up-scroll
// This gives browser time to mount cards before they hit the visible viewport
const VIRTUALIZATION_OVERSCAN = 1200;

/**
 * Shallow comparison for string arrays - O(n) instead of O(n) JSON.stringify + compare
 * Avoids micro-stutters from serialization overhead on every memo check
 */
function arraysShallowEqual(a?: string[], b?: string[]): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Shallow comparison for display settings object
 */
function displaySettingsEqual(
  a?: Partial<CardDisplaySettings>,
  b?: Partial<CardDisplaySettings>
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.cardPadding === b.cardPadding &&
    a.showMetadataFooter === b.showMetadataFooter &&
    a.showTitles === b.showTitles &&
    a.showTags === b.showTags
  );
}

// Configuration
const DEFAULT_GAP = 16;

// Card size configurations - min column widths
type CardSize = 'small' | 'medium' | 'large' | 'xl';
const CARD_SIZE_WIDTHS: Record<CardSize, number> = {
  small: 180,    // Compact - more columns
  medium: 280,   // Default
  large: 400,    // Spacious - fewer columns
  xl: 520,       // Extra large - minimal columns
};

interface MasonryGridProps {
  cards: LocalCard[];
  cardSize?: CardSize;
  cardSpacing?: number;
  displaySettings?: Partial<CardDisplaySettings>;
  currentCollection?: string;
  /** Called when a user tag in the footer is clicked (for filtering) */
  onTagClick?: (tag: string) => void;
  /** Called when a system tag in the footer is clicked (for filtering) */
  onSystemTagClick?: (tag: SystemTag) => void;
  /** Disable virtualization - useful for grouped views with smaller card sets */
  disableVirtualization?: boolean;
}

interface MasonryCardProps {
  card: LocalCard;
  onClick: () => void;
  displaySettings?: Partial<CardDisplaySettings>;
  currentCollection?: string;
  onTagClick?: (tag: string) => void;
  onSystemTagClick?: (tag: SystemTag) => void;
}

/**
 * Individual card component for masonry grid
 * Memoized to prevent re-renders when other cards in the list change
 */
const MasonryCard = memo(function MasonryCard({
  card,
  onClick,
  displaySettings,
  currentCollection,
  onTagClick,
  onSystemTagClick
}: MasonryCardProps) {
  return (
    <CardContextMenu card={card} currentCollection={currentCollection}>
      <div className="w-full">
        {card.type === 'quick-note' ? (
          <QuickNoteCard card={card} onClick={onClick} />
        ) : (
          <CardItem
            card={card}
            variant="grid"
            onClick={onClick}
            displaySettings={displaySettings}
            onTagClick={onTagClick}
            onSystemTagClick={onSystemTagClick}
          />
        )}
      </div>
    </CardContextMenu>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the card content actually changed
  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.card.title === nextProps.card.title &&
    prevProps.card.image === nextProps.card.image &&
    prevProps.card.favicon === nextProps.card.favicon &&
    prevProps.card.domain === nextProps.card.domain &&
    prevProps.card.url === nextProps.card.url &&
    prevProps.card.content === nextProps.card.content &&
    prevProps.card.type === nextProps.card.type &&
    prevProps.card.pinned === nextProps.card.pinned &&
    prevProps.card._synced === nextProps.card._synced &&
    prevProps.card.status === nextProps.card.status &&
    prevProps.card.convertedToTodo === nextProps.card.convertedToTodo &&
    prevProps.card.dismissedTodoSuggestion === nextProps.card.dismissedTodoSuggestion &&
    prevProps.card.scheduledDate === nextProps.card.scheduledDate &&
    prevProps.card.linkStatus === nextProps.card.linkStatus &&
    prevProps.card.isRead === nextProps.card.isRead &&
    prevProps.card.readProgress === nextProps.card.readProgress &&
    prevProps.card.readingTime === nextProps.card.readingTime &&
    prevProps.currentCollection === nextProps.currentCollection &&
    arraysShallowEqual(prevProps.card.tags, nextProps.card.tags) &&
    displaySettingsEqual(prevProps.displaySettings, nextProps.displaySettings)
  );
});

// Default aspect ratio and minimum height from CardItem
const DEFAULT_ASPECT_RATIO = 16 / 10;
const MIN_THUMBNAIL_HEIGHT = 240;
const CONTENT_PADDING = 56; // Approximate height for title + domain + tags area

/**
 * Estimate card height based on content
 * This is used for initial layout before actual measurements
 *
 * Uses stored aspectRatio from DB when available for accurate initial sizing
 * This prevents "pop-in" effect when images load
 */
function estimateHeight(card: LocalCard, cardWidth: number): number {
  // Quick notes are compact - fixed small height
  if (card.type === 'quick-note') {
    return 100; // Matches min-h-[80px] + padding
  }

  // For cards with images, use stored aspectRatio if available
  // Otherwise fall back to default. This provides stable sizing before image loads.
  let thumbnailHeight: number;
  if (card.image) {
    // Use stored aspectRatio from DB (extracted by web worker) for accurate height
    // This is key to preventing layout shift when scrolling back up
    const aspectRatio = card.aspectRatio || DEFAULT_ASPECT_RATIO;
    thumbnailHeight = cardWidth / aspectRatio;
  } else {
    thumbnailHeight = MIN_THUMBNAIL_HEIGHT;
  }

  let height = thumbnailHeight + CONTENT_PADDING;

  // Add extra height for long titles
  if (card.title && card.title.length > 50) height += 24;

  // Add height for tags
  if (card.tags && card.tags.length > 0) height += 28;

  // Use Math.ceil to ensure integer heights (prevents sub-pixel cumulative errors)
  return Math.ceil(height);
}

/**
 * Masonry grid layout with IntersectionObserver-based virtualization
 *
 * Virtualization strategy:
 * - Uses IntersectionObserver to track which cards are visible
 * - Completely unmounts off-screen cards (clears React Fiber tree)
 * - Renders lightweight placeholder divs with cached height for invisible cards
 * - This reduces DOM nodes from ~180 to ~20-30 visible cards
 */
export function MasonryGrid({ cards, cardSize = 'medium', cardSpacing = DEFAULT_GAP, displaySettings, currentCollection, onTagClick, onSystemTagClick, disableVirtualization = false }: MasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Initialize with cached width for instant rendering on return navigation
  const cachedWidth = useLayoutCacheStore((s) => s.lastContainerWidth);
  const [containerWidth, setContainerWidth] = useState(() => cachedWidth || 0);
  const [measuredHeights, setMeasuredHeights] = useState<Map<string, number>>(new Map());
  const openCardDetail = useModalStore((s) => s.openCardDetail);

  // Virtualization: track which card IDs are currently visible
  const [visibleCardIds, setVisibleCardIds] = useState<Set<string>>(() => new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Track if layout is stable (heights confirmed by ResizeObserver)
  // Cards render with opacity:0 until stable, then fade in
  // Use lazy initialization to check if we can start stable (all heights cached)
  const [isStable, setIsStable] = useState(() => {
    // Can't be stable on first render - need to calculate container width first
    return false;
  });
  const stabilityCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCardsLengthRef = useRef(cards.length);
  const initialStabilityCheckedRef = useRef(false);
  // Track whether we've achieved stability at least once (don't reset timeout after)
  const hasAchievedStabilityRef = useRef(false);
  // Track when layout is settling (cards added/deleted) - disable transitions during this
  const [isLayoutSettling, setIsLayoutSettling] = useState(false);
  const layoutSettlingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Layout cache for persistent heights across navigation
  const { getHeightsMap, setHeights, lastContainerWidth, setLastContainerWidth } = useLayoutCacheStore();

  // Generate content hashes for all cards (for cache invalidation)
  const contentHashes = useMemo(() => {
    const hashes = new Map<string, string>();
    for (const card of cards) {
      hashes.set(card.id, generateCardContentHash(card));
    }
    return hashes;
  }, [cards]);

  // Get minimum card width based on size setting
  const minCardWidth = CARD_SIZE_WIDTHS[cardSize];

  // Observe container width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const width = container.offsetWidth;
      if (width > 0) {
        setContainerWidth(width);
        // Cache width for instant rendering on return navigation
        setLastContainerWidth(width);
      }
    };

    // Initial measurement
    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [setLastContainerWidth]);

  // Effect 1: Handle disabled virtualization (keep cards dependency)
  useEffect(() => {
    if (disableVirtualization) {
      setVisibleCardIds(new Set(cards.map(c => c.id)));
    }
  }, [disableVirtualization, cards]);

  // Effect 2: Create IntersectionObserver ONCE (remove cards dependency)
  // MutationObserver below handles observing newly added cards
  useEffect(() => {
    if (disableVirtualization) return;

    // Find scroll container for rootMargin calculation
    const container = containerRef.current;
    if (!container) return;

    let scrollContainer: HTMLElement | null = container.parentElement;
    while (scrollContainer) {
      const style = getComputedStyle(scrollContainer);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        break;
      }
      scrollContainer = scrollContainer.parentElement;
    }

    // Create IntersectionObserver with overscan buffer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        setVisibleCardIds((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            const id = entry.target.getAttribute('data-card-id');
            if (id) {
              if (entry.isIntersecting) {
                next.add(id);
              } else {
                next.delete(id);
              }
            }
          }
          return next;
        });
      },
      {
        root: scrollContainer || null, // null = viewport
        rootMargin: `${VIRTUALIZATION_OVERSCAN}px 0px`, // Overscan above/below
        threshold: 0, // Trigger as soon as any pixel is visible
      }
    );

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [disableVirtualization]); // REMOVED 'cards' from deps

  // Effect 3: Clean up removed cards from visibleCardIds
  useEffect(() => {
    const currentIds = new Set(cards.map(c => c.id));
    setVisibleCardIds(prev => {
      let changed = false;
      const next = new Set(prev);
      for (const id of prev) {
        if (!currentIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [cards]);

  // Calculate columns and card width
  const columnCount = useMemo(() => {
    if (containerWidth <= 0) return 1;
    
    // On mobile (containerWidth < 600), we allow 2 columns for 'small' size
    // by slightly reducing the effective minCardWidth
    const effectiveMinCardWidth = (containerWidth < 600 && cardSize === 'small') 
      ? Math.min(minCardWidth, (containerWidth - cardSpacing) / 2 - 1)
      : minCardWidth;
      
    const cols = Math.floor((containerWidth + cardSpacing) / (effectiveMinCardWidth + cardSpacing));
    return Math.max(1, cols);
  }, [containerWidth, minCardWidth, cardSpacing, cardSize]);

  const cardWidth = useMemo(() => {
    if (containerWidth <= 0) return minCardWidth;
    const totalGap = (columnCount - 1) * cardSpacing;
    return (containerWidth - totalGap) / columnCount;
  }, [containerWidth, columnCount, minCardWidth, cardSpacing]);

  // Initialize measured heights from cache when component mounts or cards change
  useEffect(() => {
    if (cardWidth <= 0 || cards.length === 0) return;

    const cardIds = cards.map(c => c.id);
    const cachedHeights = getHeightsMap(cardIds, cardWidth, contentHashes);

    if (cachedHeights.size > 0) {
      setMeasuredHeights(prev => {
        // Merge cached heights with any existing measurements
        const merged = new Map(prev);
        for (const [id, height] of cachedHeights) {
          merged.set(id, height);
        }
        return merged;
      });

      // If ALL cards have cached heights, we can be stable immediately
      // This provides instant rendering when navigating back to library
      if (cachedHeights.size === cards.length && !initialStabilityCheckedRef.current) {
        initialStabilityCheckedRef.current = true;
        setIsStable(true);
      }
    }
  }, [cards, cardWidth, getHeightsMap, contentHashes]);

  // Track the last column count to detect when layout fundamentally changes
  const lastColumnCountRef = useRef(columnCount);
  const lastCardIdsRef = useRef<Set<string>>(new Set());

  // Anchored positions - stored in ref to prevent recalculation on height changes
  // Only recalculates when: column count changes, card order changes, or cardWidth changes
  const anchoredPositionsRef = useRef<Map<string, { x: number; y: number; column: number }>>(new Map());

  // Calculate masonry positions with anchoring
  // Key insight: Once a card is placed in a column, KEEP it there even if heights change slightly
  // This prevents "flying cards" when scrolling up and heights fluctuate
  const { positions, totalHeight } = useMemo(() => {
    if (cards.length === 0) {
      anchoredPositionsRef.current.clear();
      return { positions: new Map<string, { x: number; y: number }>(), totalHeight: 0 };
    }

    // Use Set-based comparison to detect actual card additions/removals
    // This prevents false positives when Dexie returns cards in different internal order
    const currentCardIds = new Set(cards.map(c => c.id));
    const columnCountChanged = columnCount !== lastColumnCountRef.current;

    if (columnCountChanged) {
      // Column count changed - must recalculate all positions
      anchoredPositionsRef.current.clear();
      lastColumnCountRef.current = columnCount;
    }

    // Only remove anchors for cards that were actually deleted
    for (const id of lastCardIdsRef.current) {
      if (!currentCardIds.has(id)) {
        anchoredPositionsRef.current.delete(id);
      }
    }
    lastCardIdsRef.current = currentCardIds;

    const columnHeights = new Array(columnCount).fill(0);
    const posMap = new Map<string, { x: number; y: number }>();

    for (const card of cards) {
      const existingAnchor = anchoredPositionsRef.current.get(card.id);
      let column: number;

      if (existingAnchor && existingAnchor.column < columnCount) {
        // Use anchored column - prevents cards from "jumping" columns
        column = existingAnchor.column;
      } else {
        // New card or layout changed - find shortest column
        column = 0;
        let minHeight = columnHeights[0];
        for (let i = 1; i < columnCount; i++) {
          if (columnHeights[i] < minHeight) {
            minHeight = columnHeights[i];
            column = i;
          }
        }
      }

      // Calculate position
      const x = column * (cardWidth + cardSpacing);
      const y = columnHeights[column];

      posMap.set(card.id, { x, y });

      // Anchor this card to its column
      anchoredPositionsRef.current.set(card.id, { x, y, column });

      // Update column height
      const cardHeight = measuredHeights.get(card.id) || estimateHeight(card, cardWidth);
      columnHeights[column] += cardHeight + cardSpacing;
    }

    const maxHeight = Math.max(...columnHeights);
    return { positions: posMap, totalHeight: maxHeight > 0 ? maxHeight - cardSpacing : 0 };
  }, [cards, columnCount, cardWidth, measuredHeights, cardSpacing]);

  // Reset stability when cards array changes significantly
  useEffect(() => {
    if (cards.length !== prevCardsLengthRef.current) {
      prevCardsLengthRef.current = cards.length;
      setIsStable(false);
      initialStabilityCheckedRef.current = false;
      hasAchievedStabilityRef.current = false; // Allow new stability timeout

      // Mark layout as settling - disable transitions temporarily
      setIsLayoutSettling(true);
      if (layoutSettlingTimeoutRef.current) {
        clearTimeout(layoutSettlingTimeoutRef.current);
      }
      // Re-enable transitions after layout settles
      layoutSettlingTimeoutRef.current = setTimeout(() => {
        setIsLayoutSettling(false);
      }, 300);
    }

    return () => {
      if (layoutSettlingTimeoutRef.current) {
        clearTimeout(layoutSettlingTimeoutRef.current);
      }
    };
  }, [cards.length]);

  // Measure card heights after render and when cards resize (e.g., images load)
  useEffect(() => {
    if (containerWidth === 0 || cardWidth <= 0) return;

    const container = containerRef.current;
    if (!container) return;

    // Check which cards need measurement (don't have valid cached height)
    const cardIds = cards.map(c => c.id);
    const cachedHeights = getHeightsMap(cardIds, cardWidth, contentHashes);
    const cardsNeedingMeasurement = cardIds.filter(id => !cachedHeights.has(id));

    // If all cards have cached heights, skip initial measurement entirely
    const allCached = cardsNeedingMeasurement.length === 0;

    const measureCards = (forceAll = false) => {
      const newHeights = new Map<string, number>();
      const cacheEntries: Array<{ cardId: string; height: number; width: number; contentHash: string }> = [];
      const cardElements = container.querySelectorAll('[data-card-id]');

      cardElements.forEach((el) => {
        const id = el.getAttribute('data-card-id');
        if (!id) return;

        // Skip cards that already have valid cached heights (unless forced)
        if (!forceAll && cachedHeights.has(id)) return;

        const rect = el.getBoundingClientRect();
        if (rect.height > 0) {
          // CRITICAL: Use Math.ceil() to eliminate sub-pixel cumulative errors
          const height = Math.ceil(rect.height);
          newHeights.set(id, height);
          // Prepare cache entry
          const hash = contentHashes.get(id);
          if (hash) {
            cacheEntries.push({
              cardId: id,
              height,
              width: cardWidth,
              contentHash: hash,
            });
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

        // Save measurements to global cache for persistence across navigation
        if (cacheEntries.length > 0) {
          setHeights(cacheEntries);
        }
      }
    };

    // Only schedule initial measurement if there are cards without cached heights
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (!allCached) {
      const delay = cardsNeedingMeasurement.length < cards.length * 0.5 ? 0 : 150;
      timer = setTimeout(() => measureCards(false), delay);
    }

    // ResizeObserver for when images load - uses contentBoxSize (no forced layout)
    // OPTIMIZATION: contentBoxSize is already computed by the browser, unlike
    // getBoundingClientRect() which forces a synchronous layout recalculation
    const resizeObserver = new ResizeObserver((entries) => {
      const newHeights = new Map<string, number>();
      const cacheEntries: Array<{ cardId: string; height: number; width: number; contentHash: string }> = [];

      for (const entry of entries) {
        const id = (entry.target as HTMLElement).getAttribute('data-card-id');
        if (!id) continue;

        // Use contentBoxSize (no forced layout) instead of getBoundingClientRect
        // Falls back to contentRect.height for older browsers
        // CRITICAL: Use Math.ceil() to eliminate sub-pixel cumulative errors
        // Sub-pixel heights (350.5px) cause layout drift when virtualization unmounts cards
        const rawHeight = entry.contentBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        const height = Math.ceil(rawHeight);

        if (height > 0) {
          newHeights.set(id, height);
          const hash = contentHashes.get(id);
          if (hash) {
            cacheEntries.push({ cardId: id, height, width: cardWidth, contentHash: hash });
          }
        }
      }

      if (newHeights.size > 0) {
        let hasChanges = false;

        setMeasuredHeights(prev => {
          for (const [id, h] of newHeights) {
            // Only update if height changed by more than 2px (ignore sub-pixel differences)
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

        if (cacheEntries.length > 0) {
          setHeights(cacheEntries);
        }
      }

      // Schedule stability check - mark stable after measurements settle
      // Once stable, stay stable (don't reset timeout on every ResizeObserver fire)
      if (!hasAchievedStabilityRef.current) {
        if (stabilityCheckRef.current) clearTimeout(stabilityCheckRef.current);
        stabilityCheckRef.current = setTimeout(() => {
          setIsStable(true);
          hasAchievedStabilityRef.current = true;
        }, 10);
      }
    });

    // Observe all card elements for resize (images loading, content changes)
    const cardElements = container.querySelectorAll('[data-card-id]');
    cardElements.forEach((el) => resizeObserver.observe(el));

    // Use MutationObserver to detect new cards added to DOM (from virtualization scroll)
    // This avoids re-running the entire effect on every scroll
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            // Check if it's a card element or contains card elements
            if (node.hasAttribute('data-card-id')) {
              resizeObserver.observe(node);
              // Also observe with IntersectionObserver for visibility
              observerRef.current?.observe(node);
            } else {
              const newCards = node.querySelectorAll('[data-card-id]');
              newCards.forEach((el) => {
                resizeObserver.observe(el);
                observerRef.current?.observe(el);
              });
            }
          }
        }
      }
    });

    mutationObserver.observe(container, { childList: true, subtree: true });

    // Also set up initial IntersectionObserver observations
    if (observerRef.current) {
      cardElements.forEach((el) => observerRef.current?.observe(el));
    }

    // Initial stability timeout for when all cards are cached and no resize needed
    // Skip if we already set stable from the cache initialization effect
    if (allCached && !initialStabilityCheckedRef.current) {
      initialStabilityCheckedRef.current = true;
      // Use queueMicrotask instead of setTimeout for faster stability
      queueMicrotask(() => setIsStable(true));
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (stabilityCheckRef.current) clearTimeout(stabilityCheckRef.current);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [containerWidth, cards, cardWidth, contentHashes, getHeightsMap, setHeights]);

  // Always render the container with ref, but show skeleton or content
  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        minHeight: containerWidth === 0 ? 400 : Math.max(200, totalHeight),
        height: containerWidth === 0 ? 'auto' : totalHeight || 'auto',
        // Disable browser scroll anchoring - we manage positions manually
        // This prevents jitter when elements are added/removed during virtualization
        overflowAnchor: 'none',
      }}
    >
      {containerWidth === 0 ? (
        // Skeleton while measuring container width
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
        // Masonry layout with IntersectionObserver-based virtualization
        // Strategy: Render position holders for ALL cards to maintain layout,
        // but only mount the actual card component for visible ones.
        // This reduces React component count from ~180 to ~20-30 visible cards.
        cards.map((card) => {
          const pos = positions.get(card.id);
          if (!pos) return null;

          const isVisible = visibleCardIds.has(card.id);
          const cachedHeight = measuredHeights.get(card.id) || estimateHeight(card, cardWidth);
          // Use stored aspectRatio for CSS locking, fallback to default
          const aspectRatio = card.aspectRatio || DEFAULT_ASPECT_RATIO;

          return (
            <div
              key={card.id}
              data-card-id={card.id}
              style={{
                position: 'absolute',
                width: cardWidth,
                // GPU compositing: use translate3d instead of top/left
                // This creates a compositor layer, making position changes GPU-only
                // (no Layout/Paint on scroll, just Composite)
                top: 0,
                left: 0,
                transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
                // Force GPU layer ownership - prevents fallback to CPU rendering
                backfaceVisibility: 'hidden',
                // Hide until layout is stable (initial measurement complete)
                visibility: isStable ? 'visible' : 'hidden',
                opacity: isStable ? 1 : 0,
                // Let browser skip rendering off-screen cards (native optimization)
                contentVisibility: 'auto',
                containIntrinsicSize: `${cardWidth}px ${cachedHeight}px`,
                // Smooth transitions when stable
                transition: isStable && !isLayoutSettling
                  ? 'opacity 150ms ease-out, transform 200ms ease-out'
                  : 'none',
              }}
            >
              {isVisible ? (
                // Full card component - only mounted when visible
                // Use cachedHeight as minHeight to match placeholder exactly
                <div
                  style={{
                    minHeight: cachedHeight,
                    boxSizing: 'border-box',
                  }}
                >
                  <MasonryCard
                    card={card}
                    onClick={() => openCardDetail(card.id)}
                    displaySettings={displaySettings}
                    currentCollection={currentCollection}
                    onTagClick={onTagClick}
                    onSystemTagClick={onSystemTagClick}
                  />
                </div>
              ) : (
                // Lightweight placeholder - must use fixed height (not minHeight)
                // because empty div will collapse without content
                // box-sizing: border-box ensures padding/border don't add to height
                // contain: strict tells browser this box size is FINAL
                <div
                  style={{
                    height: cachedHeight,
                    background: card.dominantColor || 'var(--color-bg-surface-2)',
                    borderRadius: '1rem',
                    boxSizing: 'border-box',
                    contain: 'strict',
                  }}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

