"use client";

import {
  useEffect,
  useRef,
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
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  // Pass item count explicitly to control when to reinitialize
  itemCount: number;
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
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<MuuriGrid | null>(null);
    const lastItemCountRef = useRef<number>(0);

    // Initialize Muuri only once on mount, or when itemCount changes significantly
    useEffect(() => {
      if (!containerRef.current || !Muuri) return;

      // Only reinitialize if item count actually changed (cards added/removed)
      const shouldReinit = !gridRef.current || lastItemCountRef.current !== itemCount;

      if (!shouldReinit) return;

      // Small delay to ensure React has rendered children
      const timeoutId = setTimeout(() => {
        if (!containerRef.current) return;

        // Destroy existing grid
        if (gridRef.current) {
          try {
            gridRef.current.destroy(false);
          } catch {
            // Grid might already be destroyed
          }
          gridRef.current = null;
        }

        // Check if there are items
        const items = containerRef.current.querySelectorAll(".muuri-item");
        if (items.length === 0) return;

        lastItemCountRef.current = itemCount;

        const grid = new Muuri(containerRef.current, {
          items: ".muuri-item",
          layout: {
            fillGaps,
            horizontal,
            alignRight,
            alignBottom,
            rounding: true,
          },
          layoutOnResize: 100,
          layoutOnInit: true,
          layoutDuration,
          layoutEasing,
          dragEnabled,
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
            useDragContainer: true,
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
      }, 100);

      return () => {
        clearTimeout(timeoutId);
      };
    }, [
      itemCount,
      fillGaps,
      horizontal,
      alignRight,
      alignBottom,
      dragEnabled,
      dragHandle,
      layoutDuration,
      layoutEasing,
      onDragStart,
      onDragEnd,
      onDragMove,
      onLayoutEnd,
      onOrderChange,
    ]);

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
      <div className="flex justify-center w-full">
        <div
          ref={containerRef}
          className={`muuri-grid ${className}`}
          style={{
            position: "relative",
            display: "inline-block", // Shrink-wrap to content for centering
            ...style,
          }}
        >
          {children}
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
