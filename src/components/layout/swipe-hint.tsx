'use client';

import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'pawkit-swipe-hint-shown';
const DISPLAY_DURATION = 3000; // 3 seconds before fade out

/**
 * SwipeHint - First-visit swipe gesture hint
 *
 * Shows an animated arrow on the left edge to teach users
 * about the swipe-to-navigate gesture. Only displays once,
 * then sets a localStorage flag to never show again.
 */
export function SwipeHint() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Check if hint was already shown
    const wasShown = localStorage.getItem(STORAGE_KEY);
    if (wasShown) return;

    // Show the hint
    setVisible(true);

    // Mark as shown immediately so it won't show on next page load
    localStorage.setItem(STORAGE_KEY, 'true');

    // Start fade out after display duration
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, DISPLAY_DURATION);

    // Hide completely after fade animation
    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, DISPLAY_DURATION + 500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed left-0 top-1/2 -translate-y-1/2 z-[100]',
        'flex items-center gap-2 pl-2 pr-4 py-3',
        'bg-bg-surface-2/95 backdrop-blur-sm',
        'rounded-r-xl border border-l-0 border-border-subtle',
        'shadow-lg',
        'transition-all duration-500 ease-out',
        fading ? 'opacity-0 -translate-x-full' : 'opacity-100 translate-x-0'
      )}
    >
      {/* Animated arrow */}
      <div className="animate-bounce-x">
        <ChevronRight className="h-5 w-5 text-[var(--color-accent)]" />
      </div>

      {/* Hint text */}
      <span className="text-sm font-medium text-text-primary whitespace-nowrap">
        Swipe to navigate
      </span>
    </div>
  );
}
