'use client';

import { useState, useEffect, useCallback } from 'react';
import { Omnibar } from './omnibar';
import { ToastStack } from './toast-stack';
import { cn } from '@/lib/utils';

interface OmnibarContainerProps {
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

const SCROLL_THRESHOLD = 50; // px before compact mode

export function OmnibarContainer({ scrollContainerRef, className }: OmnibarContainerProps) {
  const [isCompact, setIsCompact] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    setIsCompact(target.scrollTop > SCROLL_THRESHOLD);
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef?.current;
    if (!scrollContainer) return;

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef, handleScroll]);

  // Also listen for scroll on window for pages that scroll the main body
  useEffect(() => {
    if (scrollContainerRef?.current) return; // Skip if using a ref

    const handleWindowScroll = () => {
      setIsCompact(window.scrollY > SCROLL_THRESHOLD);
    };

    window.addEventListener('scroll', handleWindowScroll);
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, [scrollContainerRef]);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={cn(
        'sticky top-0 left-0 right-0 z-50',
        'flex justify-center',
        'pt-4 pb-4',
        'pointer-events-none',
        className
      )}
    >
      <div className="relative pointer-events-auto">
        <Omnibar isCompact={isCompact} />
        <ToastStack isCompact={isCompact} />
      </div>
    </div>
  );
}
