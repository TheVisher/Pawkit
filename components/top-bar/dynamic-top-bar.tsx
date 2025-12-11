'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { TopBarExpanded } from './top-bar-expanded';
import { TopBarCollapsed } from './top-bar-collapsed';
import { useKitStore } from '@/lib/hooks/use-kit-store';
import { cn } from '@/lib/utils';
import './top-bar.css';

const SCROLL_THRESHOLD = 50; // Pixels scrolled before collapsing

export function DynamicTopBar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { toggleOpen: toggleKit } = useKitStore();
  const pathname = usePathname();

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      // Don't collapse if search is focused
      if (isSearchFocused) return;

      // Get scroll position from the main content area or window
      const scrollContainer = document.querySelector('.content-panel-scroll');
      const scrollY = scrollContainer
        ? scrollContainer.scrollTop
        : window.scrollY;
      setIsCollapsed(scrollY > SCROLL_THRESHOLD);
    };

    // Try to attach to scroll container, fall back to window
    const scrollContainer = document.querySelector('.content-panel-scroll');
    const target = scrollContainer || window;

    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => target.removeEventListener('scroll', handleScroll);
  }, [isSearchFocused]);

  // Reset to expanded when navigating
  useEffect(() => {
    setIsCollapsed(false);
  }, [pathname]);

  // Keep expanded while search is focused
  const handleSearchFocus = useCallback(() => {
    setIsSearchFocused(true);
    setIsCollapsed(false);
  }, []);

  const handleSearchBlur = useCallback(() => {
    setIsSearchFocused(false);
  }, []);

  // Expand when clicking search in collapsed bar
  const handleExpandClick = useCallback(() => {
    setIsCollapsed(false);
    // Scroll to top smoothly
    const scrollContainer = document.querySelector('.content-panel-scroll');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  return (
    <div
      className={cn(
        "dynamic-top-bar-container",
        isCollapsed ? "is-collapsed" : "is-expanded"
      )}
    >
      {/* Background slopes for collapsed state */}
      <div
        className={cn(
          "dynamic-top-bar-slopes",
          isCollapsed ? "slopes-visible" : "slopes-hidden"
        )}
      />

      {/* The bar itself */}
      <div
        className={cn(
          "dynamic-top-bar",
          isCollapsed ? "collapsed" : "expanded"
        )}
      >
        {isCollapsed ? (
          <TopBarCollapsed
            onSearchClick={handleExpandClick}
            onKitClick={toggleKit}
          />
        ) : (
          <TopBarExpanded
            onSearchFocus={handleSearchFocus}
            onSearchBlur={handleSearchBlur}
            onKitClick={toggleKit}
          />
        )}
      </div>
    </div>
  );
}
