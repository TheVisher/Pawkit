'use client';

import { useState, useEffect, useRef } from 'react';
import { MobileSidebar } from './mobile-sidebar';

// Edge swipe detection constants
const EDGE_THRESHOLD = 30; // pixels from left edge to trigger
const SWIPE_THRESHOLD = 50; // minimum swipe distance to open

/**
 * MobileNav - Invisible gesture handler for mobile navigation
 *
 * Detects left-edge swipe gestures to open the sidebar.
 * No visible UI - users navigate via swipe or omnibar.
 */
export function MobileNav() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Touch tracking refs
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isEdgeSwipe = useRef(false);

  // Handle edge swipe gesture to open sidebar
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;

      // Check if touch started near left edge
      isEdgeSwipe.current = touch.clientX < EDGE_THRESHOLD;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isEdgeSwipe.current || touchStartX.current === null || touchStartY.current === null) {
        return;
      }

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);

      // If vertical movement is greater than horizontal, it's not a sidebar swipe
      if (deltaY > Math.abs(deltaX)) {
        isEdgeSwipe.current = false;
        return;
      }

      // If swiped right far enough, open sidebar
      if (deltaX > SWIPE_THRESHOLD && !isSidebarOpen) {
        setIsSidebarOpen(true);
        isEdgeSwipe.current = false;
      }
    };

    const handleTouchEnd = () => {
      touchStartX.current = null;
      touchStartY.current = null;
      isEdgeSwipe.current = false;
    };

    // Add listeners to document for global swipe detection
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isSidebarOpen]);

  // No visible UI - just the sidebar that opens on swipe
  return <MobileSidebar open={isSidebarOpen} onOpenChange={setIsSidebarOpen} />;
}
