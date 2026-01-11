'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Library, Calendar, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileSidebar } from './mobile-sidebar';

interface MobileNavProps {
  className?: string;
}

const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
];

// Edge swipe detection constants
const EDGE_THRESHOLD = 30; // pixels from left edge to trigger
const SWIPE_THRESHOLD = 50; // minimum swipe distance to open

export function MobileNav({ className }: MobileNavProps) {
  const pathname = usePathname();
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

  return (
    <>
      <nav
        className={cn(
          'min-h-[4rem] bg-bg-surface-1 border-t border-border-subtle',
          'flex items-center justify-around px-2',
          'safe-area-pb',
          className
        )}
      >
        {/* Menu button to open sidebar */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px] text-text-muted active:text-text-secondary"
        >
          <Menu className="h-5 w-5" />
          <span className="text-xs font-medium">Menu</span>
        </button>

        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]',
                isActive
                  ? 'text-[var(--color-accent)]'
                  : 'text-text-muted active:text-text-secondary'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <MobileSidebar open={isSidebarOpen} onOpenChange={setIsSidebarOpen} />
    </>
  );
}
