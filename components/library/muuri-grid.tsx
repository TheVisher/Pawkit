"use client";

import {
  useEffect,
  useRef,
  useState,
  ReactNode,
  forwardRef,
  useImperativeHandle,
} from "react";

// Muuri type declarations (library doesn't include types)
declare class MuuriGrid {
  constructor(element: HTMLElement | string, options?: MuuriOptions);
  add(elements: HTMLElement | HTMLElement[], options?: { index?: number; layout?: boolean }): MuuriItem[];
  remove(items: MuuriItem | MuuriItem[], options?: { removeElements?: boolean; layout?: boolean }): MuuriItem[];
  show(items: MuuriItem | MuuriItem[], options?: { instant?: boolean; onFinish?: () => void }): this;
  hide(items: MuuriItem | MuuriItem[], options?: { instant?: boolean; onFinish?: () => void }): this;
  filter(predicate: string | ((item: MuuriItem) => boolean), options?: { instant?: boolean }): this;
  sort(comparer: string | ((a: MuuriItem, b: MuuriItem) => number) | MuuriItem[], options?: { layout?: boolean }): this;
  move(item: MuuriItem | HTMLElement | number, position: MuuriItem | HTMLElement | number, options?: { action?: string; layout?: boolean }): this;
  layout(instant?: boolean, callback?: () => void): this;
  refreshItems(items?: MuuriItem[]): this;
  refreshSortData(items?: MuuriItem[]): this;
  synchronize(): this;
  getItems(targets?: HTMLElement | HTMLElement[] | MuuriItem | MuuriItem[] | number | number[]): MuuriItem[];
  getElement(): HTMLElement;
  // eslint-disable-next-line
  on(event: string, listener: (...args: any[]) => void): this;
  // eslint-disable-next-line
  off(event: string, listener: (...args: any[]) => void): this;
  destroy(removeElements?: boolean): this;
}

interface MuuriItem {
  getElement(): HTMLElement;
  getGrid(): MuuriGrid;
  isActive(): boolean;
  isVisible(): boolean;
  isShowing(): boolean;
  isHiding(): boolean;
  isPositioning(): boolean;
  isDragging(): boolean;
  isReleasing(): boolean;
  isDestroyed(): boolean;
}

interface MuuriOptions {
  items?: string | HTMLElement[];
  showDuration?: number;
  showEasing?: string;
  hideDuration?: number;
  hideEasing?: string;
  visibleStyles?: Record<string, string | number>;
  hiddenStyles?: Record<string, string | number>;
  layout?: {
    fillGaps?: boolean;
    horizontal?: boolean;
    alignRight?: boolean;
    alignBottom?: boolean;
    rounding?: boolean;
  };
  layoutOnResize?: boolean | number;
  layoutOnInit?: boolean;
  layoutDuration?: number;
  layoutEasing?: string;
  sortData?: Record<string, (item: MuuriItem, element: HTMLElement) => unknown>;
  dragEnabled?: boolean;
  dragContainer?: HTMLElement | null;
  dragHandle?: string | null;
  dragStartPredicate?: {
    distance?: number;
    delay?: number;
  };
  dragAxis?: "x" | "y" | "xy";
  dragSort?: boolean | (() => MuuriGrid[]);
  dragSortHeuristics?: {
    sortInterval?: number;
    minDragDistance?: number;
    minBounceBackAngle?: number;
  };
  dragSortPredicate?: {
    threshold?: number;
    action?: string;
    migrateAction?: string;
  };
  dragRelease?: {
    duration?: number;
    easing?: string;
    useDragContainer?: boolean;
  };
  dragCssProps?: {
    touchAction?: string;
    userSelect?: string;
    userDrag?: string;
    tapHighlightColor?: string;
    touchCallout?: string;
    contentZooming?: string;
  };
  dragPlaceholder?: {
    enabled?: boolean;
    createElement?: ((item: MuuriItem) => HTMLElement) | null;
    onCreate?: ((item: MuuriItem, element: HTMLElement) => void) | null;
    onRemove?: ((item: MuuriItem, element: HTMLElement) => void) | null;
  };
  dragAutoScroll?: {
    targets?: Array<{ element: HTMLElement | Window; priority?: number; axis?: number }>;
    handle?: ((item: MuuriItem, itemClientX: number, itemClientY: number, itemWidth: number, itemHeight: number, pointerClientX: number, pointerClientY: number) => { left: number; top: number; width: number; height: number }) | null;
    threshold?: number;
    safeZone?: number;
    speed?: number | ((item: MuuriItem, scrollElement: HTMLElement | Window, scrollData: unknown) => number);
    sortDuringScroll?: boolean;
    smoothStop?: boolean;
    onStart?: ((item: MuuriItem, scrollElement: HTMLElement | Window, direction: number) => void) | null;
    onStop?: ((item: MuuriItem, scrollElement: HTMLElement | Window, direction: number) => void) | null;
  };
  containerClass?: string;
  itemClass?: string;
  itemVisibleClass?: string;
  itemHiddenClass?: string;
  itemPositioningClass?: string;
  itemDraggingClass?: string;
  itemReleasingClass?: string;
  itemPlaceholderClass?: string;
}

// Import Muuri dynamically to avoid SSR issues
let Muuri: typeof MuuriGrid | null = null;
if (typeof window !== "undefined") {
  // eslint-disable-next-line
  const muuriModule = require("muuri");
  // Handle both CommonJS and ES module exports
  Muuri = (muuriModule.default || muuriModule) as typeof MuuriGrid;
}

export type MuuriGridProps = {
  children: ReactNode | ((calculatedWidth: number) => ReactNode);
  className?: string;
  style?: React.CSSProperties;
  // Pass item count explicitly to control when to reinitialize
  itemCount: number;
  // Pass card IDs to detect when IDs change (even if count stays same)
  cardIds?: string;
  // Minimum item width - cards will stretch to fill available space
  minItemWidth?: number;
  // Edge padding on left/right of grid
  edgePadding?: number;
  // Layout options
  fillGaps?: boolean;
  horizontal?: boolean;
  alignRight?: boolean;
  alignBottom?: boolean;
  // Drag options
  dragEnabled?: boolean;
  dragHandle?: string;
  // Animation
  layoutDuration?: number;
  layoutEasing?: string;
  // Callbacks
  onDragStart?: (item: MuuriItem) => void;
  onDragEnd?: (item: MuuriItem) => void;
  onDragMove?: (item: MuuriItem) => void;
  onLayoutEnd?: () => void;
  onOrderChange?: (newOrder: string[]) => void;
  // Callback to notify parent of calculated item width
  onItemWidthCalculated?: (width: number) => void;
};

export type MuuriGridRef = {
  layout: (instant?: boolean) => void;
  refreshItems: () => void;
  getItems: () => MuuriItem[];
  filter: (predicate: (item: MuuriItem) => boolean) => void;
  sort: (comparer: (a: MuuriItem, b: MuuriItem) => number) => void;
};

export const MuuriGridComponent = forwardRef<MuuriGridRef, MuuriGridProps>(
  function MuuriGridComponent(
    {
      children,
      className = "",
      style,
      itemCount,
      cardIds,
      minItemWidth = 200,
      edgePadding = 0,
      fillGaps = true,
      horizontal = false,
      alignRight = false,
      alignBottom = false,
      dragEnabled = false,
      dragHandle,
      layoutDuration = 300,
      layoutEasing = "ease-out",
      onDragStart,
      onDragEnd,
      onDragMove,
      onLayoutEnd,
      onOrderChange,
      onItemWidthCalculated,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<MuuriGrid | null>(null);
    // Track both cardId AND element reference to detect when React recreates elements
    const trackedElementsRef = useRef<Map<string, HTMLElement>>(new Map());
    const isInitializedRef = useRef(false);
    const [calculatedItemWidth, setCalculatedItemWidth] = useState<number>(minItemWidth);
    const [isReady, setIsReady] = useState(false);

    // Calculate stretched item width to fill available space with consistent edge padding
    useEffect(() => {
      if (!wrapperRef.current || itemCount === 0) {
        setCalculatedItemWidth(minItemWidth);
        return;
      }

      const calculateWidth = () => {
        if (!wrapperRef.current) return;

        const totalWidth = wrapperRef.current.offsetWidth;
        // Available width after edge padding
        const availableWidth = totalWidth - (edgePadding * 2);

        // Calculate how many columns fit at minimum width
        const numColumns = Math.max(1, Math.floor(availableWidth / minItemWidth));

        // Stretch items to fill available width evenly
        const stretchedWidth = Math.floor(availableWidth / numColumns);

        setCalculatedItemWidth(stretchedWidth);
        onItemWidthCalculated?.(stretchedWidth);
      };

      // Initial calculation
      calculateWidth();

      // Recalculate on resize - debounced to wait for sidebar animations to complete
      // Sidebar transitions are 300ms, so wait 350ms before recalculating
      let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
      const resizeObserver = new ResizeObserver(() => {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(calculateWidth, 350);
      });
      resizeObserver.observe(wrapperRef.current);

      return () => {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeObserver.disconnect();
      };
    }, [minItemWidth, itemCount, edgePadding, onItemWidthCalculated]);

    // Initialize Muuri once on mount
    useEffect(() => {
      if (!containerRef.current || !Muuri || isInitializedRef.current) return;

      // Hide grid until first layout completes
      setIsReady(false);

      // Small delay to ensure React has rendered children
      const timeoutId = setTimeout(() => {
        if (!containerRef.current || isInitializedRef.current) return;

        // Check if there are items
        const items = containerRef.current.querySelectorAll(".muuri-item");
        if (items.length === 0) return;

        // Track initial card IDs and their element references
        items.forEach((item) => {
          const element = item as HTMLElement;
          const cardId = element.dataset.cardId;
          if (cardId) trackedElementsRef.current.set(cardId, element);
        });

        const grid = new Muuri(containerRef.current, {
          items: ".muuri-item",
          layout: {
            fillGaps,
            horizontal,
            alignRight,
            alignBottom,
            rounding: true,
          },
          // Debounce resize layouts to wait for sidebar animations (300ms) to complete
          layoutOnResize: 350,
          layoutOnInit: true,
          layoutDuration,
          layoutEasing,
          dragEnabled,
          dragContainer: document.body, // Move to body during drag to escape overflow clipping
          dragHandle: dragHandle || null,
          dragStartPredicate: {
            distance: 10,
            delay: 100,
          },
          dragSort: true,
          dragSortHeuristics: {
            sortInterval: 100,
            minDragDistance: 10,
            minBounceBackAngle: 1,
          },
          dragSortPredicate: {
            threshold: 50,
            action: "move",
          },
          dragRelease: {
            duration: 300,
            easing: "ease-out",
            useDragContainer: false, // Re-parent to grid BEFORE release animation to fix positioning
          },
          dragPlaceholder: {
            enabled: true,
            createElement: (item) => {
              const el = item.getElement();
              const placeholder = document.createElement("div");
              placeholder.style.width = el.offsetWidth + "px";
              placeholder.style.height = el.offsetHeight + "px";
              placeholder.style.background = "var(--ds-accent-muted, rgba(168, 85, 247, 0.2))";
              placeholder.style.borderRadius = "16px";
              placeholder.style.border = "2px dashed var(--ds-accent, #a855f7)";
              return placeholder;
            },
          },
          showDuration: 200,
          hideDuration: 200,
          visibleStyles: {
            opacity: 1,
            transform: "scale(1)",
          },
          hiddenStyles: {
            opacity: 0,
            transform: "scale(0.8)",
          },
        });

        gridRef.current = grid;
        isInitializedRef.current = true;

        // Event listeners
        if (onDragStart) {
          grid.on("dragStart", (item: MuuriItem) => onDragStart(item));
        }

        if (onDragEnd) {
          grid.on("dragEnd", (item: MuuriItem) => {
            onDragEnd(item);
            if (onOrderChange) {
              const items = grid.getItems();
              const newOrder = items
                .map((i) => i.getElement().dataset.cardId || "")
                .filter(Boolean);
              onOrderChange(newOrder);
            }
          });
        }

        if (onDragMove) {
          grid.on("dragMove", (item: MuuriItem) => onDragMove(item));
        }

        if (onLayoutEnd) {
          grid.on("layoutEnd", () => onLayoutEnd());
        }

        // Mark grid as ready after first layout completes
        const markReady = () => {
          setIsReady(true);
          grid.off("layoutEnd", markReady);
        };
        grid.on("layoutEnd", markReady);

        // Trigger layout to position items and fire layoutEnd
        grid.layout();
      }, 100);

      return () => {
        clearTimeout(timeoutId);
      };
    // Only run on mount - dependencies are intentionally limited
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync Muuri with DOM when items change (add/remove cards)
    useEffect(() => {
      if (!gridRef.current || !containerRef.current || !isInitializedRef.current) return;

      const syncTimeoutId = setTimeout(() => {
        if (!gridRef.current || !containerRef.current) return;

        const grid = gridRef.current;
        const domItems = containerRef.current.querySelectorAll(".muuri-item");

        // Get current DOM card IDs
        const domCardIds = new Set<string>();
        const domElementsByCardId = new Map<string, HTMLElement>();
        domItems.forEach((item) => {
          const cardId = (item as HTMLElement).dataset.cardId;
          if (cardId) {
            domCardIds.add(cardId);
            domElementsByCardId.set(cardId, item as HTMLElement);
          }
        });

        // Find items to remove (in Muuri but not in DOM, OR element reference changed)
        const itemsToRemove: MuuriItem[] = [];
        grid.getItems().forEach((muuriItem) => {
          const muuriElement = muuriItem.getElement();
          const cardId = muuriElement.dataset.cardId;

          if (cardId) {
            const domElement = domElementsByCardId.get(cardId);

            // Remove if: cardId not in DOM, OR the element reference changed
            // (React recreated the element with same cardId but different DOM node)
            if (!domElement || domElement !== muuriElement) {
              itemsToRemove.push(muuriItem);
              trackedElementsRef.current.delete(cardId);
            }
          }
        });

        // Find elements to add (in DOM but not tracked, OR element reference changed)
        const elementsToAdd: HTMLElement[] = [];
        domCardIds.forEach((cardId) => {
          const domElement = domElementsByCardId.get(cardId);
          const trackedElement = trackedElementsRef.current.get(cardId);

          // Add if: not tracked, OR element reference changed
          if (!trackedElement || trackedElement !== domElement) {
            if (domElement) {
              elementsToAdd.push(domElement);
              trackedElementsRef.current.set(cardId, domElement);
            }
          }
        });

        // Remove items that no longer exist
        if (itemsToRemove.length > 0) {
          grid.remove(itemsToRemove, { removeElements: false, layout: false });
        }

        // Add new items
        if (elementsToAdd.length > 0) {
          grid.add(elementsToAdd, { index: 0, layout: false });
        }

        // Trigger layout if anything changed
        if (itemsToRemove.length > 0 || elementsToAdd.length > 0) {
          grid.refreshItems();
          grid.layout();
        }
      }, 50);

      return () => {
        clearTimeout(syncTimeoutId);
      };
    }, [itemCount, cardIds]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (gridRef.current) {
          try {
            gridRef.current.destroy(false);
          } catch {
            // Ignore
          }
          gridRef.current = null;
        }
        isInitializedRef.current = false;
        trackedElementsRef.current.clear();
      };
    }, []);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      layout: (instant = false) => {
        if (gridRef.current) {
          gridRef.current.refreshItems();
          gridRef.current.layout(instant);
        }
      },
      refreshItems: () => {
        if (gridRef.current) {
          gridRef.current.refreshItems();
          gridRef.current.layout();
        }
      },
      getItems: () => {
        return gridRef.current?.getItems() || [];
      },
      filter: (predicate) => {
        gridRef.current?.filter(predicate);
      },
      sort: (comparer) => {
        gridRef.current?.sort(comparer);
      },
    }));

    return (
      <div
        ref={wrapperRef}
        className="w-full"
        style={{ padding: `0 ${edgePadding}px` }}
      >
        <div
          ref={containerRef}
          className={`muuri-grid ${className}`}
          style={{
            position: "relative",
            width: "100%",
            // Hide grid until Muuri has positioned items to prevent stacking flash
            opacity: isReady ? 1 : 0,
            transition: "opacity 0.15s ease-out",
            ...style,
          }}
        >
          {typeof children === "function"
            ? (children as (width: number) => ReactNode)(calculatedItemWidth)
            : children}
        </div>
      </div>
    );
  }
);

// Wrapper for individual items - uses CSS width, Muuri handles positioning
export type MuuriItemProps = {
  children: ReactNode;
  cardId: string;
  className?: string;
  width: number; // Width in pixels (content width)
  spacing: number; // Gap between items in pixels
};

export function MuuriItem({ children, cardId, className = "", width, spacing }: MuuriItemProps) {
  // Half spacing on each side creates the gap between items
  const margin = spacing / 2;

  return (
    <div
      className={`muuri-item ${className}`}
      data-card-id={cardId}
      style={{
        width: `${width}px`,
        position: "absolute",
        padding: `${margin}px`, // Padding creates the visual gap
        boxSizing: "border-box",
      }}
    >
      <div className="muuri-item-content" style={{ width: "100%", height: "100%" }}>
        {children}
      </div>
    </div>
  );
}
