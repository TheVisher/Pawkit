'use client';

import { useState, useEffect, useCallback, type RefObject } from 'react';

/**
 * Hook to detect collision between a header element and the centered omnibar.
 *
 * The omnibar is 400px wide and centered in the content area. This hook measures
 * the header's actual rendered width and determines if it would overlap with the
 * omnibar zone. When collision is detected, the consuming component should add
 * padding to push the header below the omnibar.
 *
 * Usage:
 * ```tsx
 * const headerRef = useRef<HTMLDivElement>(null);
 * const needsOffset = useOmnibarCollision(headerRef);
 *
 * return (
 *   <div className={cn(needsOffset && 'md:pt-20')}>
 *     <div ref={headerRef} className="w-fit">
 *       <PageHeader ... />
 *     </div>
 *   </div>
 * );
 * ```
 *
 * IMPORTANT: The ref element must have `w-fit` (width: fit-content) so that
 * it only spans the actual content width, not the full container width.
 */

// Omnibar is 400px wide, centered. We add 20px margin on each side for breathing room.
const OMNIBAR_HALF_WIDTH = 220;

export function useOmnibarCollision(
  headerRef: RefObject<HTMLElement | null>,
  deps: unknown[] = []
): boolean {
  const [needsOffset, setNeedsOffset] = useState(false);

  const checkCollision = useCallback(() => {
    if (!headerRef.current) return;

    // Only check on desktop (md and up, 768px)
    if (window.innerWidth < 768) {
      setNeedsOffset(false);
      return;
    }

    // Get the header's bounding rect relative to viewport
    const headerRect = headerRef.current.getBoundingClientRect();

    // Calculate where the omnibar zone starts (center panel's center - half omnibar width)
    // The omnibar is centered within the scroll container (center panel)
    const scrollContainer = headerRef.current.closest('.overflow-auto');
    if (!scrollContainer) {
      setNeedsOffset(false);
      return;
    }

    const containerRect = scrollContainer.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    const omnibarLeft = containerCenter - OMNIBAR_HALF_WIDTH;

    // If header extends into omnibar zone, we need to offset it down
    setNeedsOffset(headerRect.right > omnibarLeft);
  }, [headerRef]);

  // Check collision on mount, resize, and when dependencies change
  useEffect(() => {
    checkCollision();

    window.addEventListener('resize', checkCollision);
    return () => window.removeEventListener('resize', checkCollision);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkCollision, ...deps]);

  return needsOffset;
}
