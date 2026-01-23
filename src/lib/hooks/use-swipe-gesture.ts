'use client';

/**
 * Swipe Gesture Hook
 * Detects swipes from screen edges for sidebar reveals on mobile
 */

import { useRef, useEffect, useCallback } from 'react';

interface SwipeGestureOptions {
  /** Width of the edge trigger zone in pixels */
  edgeThreshold?: number;
  /** Minimum swipe distance to trigger */
  minSwipeDistance?: number;
  /** Maximum vertical movement allowed (to distinguish from scrolling) */
  maxVerticalRatio?: number;
  /** Callback when swiping from left edge */
  onSwipeFromLeft?: () => void;
  /** Callback when swiping from right edge */
  onSwipeFromRight?: () => void;
  /** Whether gestures are enabled */
  enabled?: boolean;
}

interface TouchState {
  startX: number;
  startY: number;
  startedFromLeftEdge: boolean;
  startedFromRightEdge: boolean;
}

export function useSwipeGesture({
  edgeThreshold = 20,
  minSwipeDistance = 50,
  maxVerticalRatio = 0.5,
  onSwipeFromLeft,
  onSwipeFromRight,
  enabled = true,
}: SwipeGestureOptions = {}) {
  const touchStateRef = useRef<TouchState | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    const touch = e.touches[0];
    if (!touch) return;

    const windowWidth = window.innerWidth;
    const startedFromLeftEdge = touch.clientX <= edgeThreshold;
    const startedFromRightEdge = touch.clientX >= windowWidth - edgeThreshold;

    // Only track if started from an edge
    if (!startedFromLeftEdge && !startedFromRightEdge) {
      touchStateRef.current = null;
      return;
    }

    touchStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startedFromLeftEdge,
      startedFromRightEdge,
    };
  }, [enabled, edgeThreshold]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const state = touchStateRef.current;
    if (!state || !enabled) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Check if this is a horizontal swipe (not vertical scroll)
    if (absY / absX > maxVerticalRatio) {
      touchStateRef.current = null;
      return;
    }

    // Check minimum distance
    if (absX < minSwipeDistance) {
      touchStateRef.current = null;
      return;
    }

    // Swipe from left edge (moving right)
    if (state.startedFromLeftEdge && deltaX > 0) {
      onSwipeFromLeft?.();
    }

    // Swipe from right edge (moving left)
    if (state.startedFromRightEdge && deltaX < 0) {
      onSwipeFromRight?.();
    }

    touchStateRef.current = null;
  }, [enabled, minSwipeDistance, maxVerticalRatio, onSwipeFromLeft, onSwipeFromRight]);

  const handleTouchCancel = useCallback(() => {
    touchStateRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [enabled, handleTouchStart, handleTouchEnd, handleTouchCancel]);
}
