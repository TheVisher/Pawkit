'use client';

import { useState, useEffect, useCallback } from 'react';
import { Omnibar } from './omnibar';
import { ToastStack } from './toast-stack';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Content for the left side (page title, breadcrumbs, etc.) */
  children?: React.ReactNode;
  /** Ref to the scroll container for compact mode detection */
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

const SCROLL_THRESHOLD = 50;

export function PageHeader({ children, scrollContainerRef, className }: PageHeaderProps) {
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

  useEffect(() => {
    if (scrollContainerRef?.current) return;

    const handleWindowScroll = () => {
      setIsCompact(window.scrollY > SCROLL_THRESHOLD);
    };

    window.addEventListener('scroll', handleWindowScroll);
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, [scrollContainerRef]);

  if (!mounted) {
    return (
      <div className="pt-5 pb-4 px-6 min-h-[76px]" />
    );
  }

  return (
    <div
      className={cn(
        'sticky top-0 left-0 right-0 z-50',
        'flex items-center justify-center',
        'pt-5 pb-4 px-6',
        'min-h-[76px]',
        className
      )}
    >
      {/* Left - Page title/header content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>

      {/* Center - Omnibar (absolute positioned to stay centered) */}
      <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="relative pointer-events-auto">
          <Omnibar isCompact={isCompact} />
          <ToastStack isCompact={isCompact} />
        </div>
      </div>

      {/* Right - Spacer to balance the layout */}
      <div className="flex-1" />
    </div>
  );
}
