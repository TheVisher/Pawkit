'use client';

import { useRef } from 'react';
import { Coffee, Sun, Sunset, Moon } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useGreeting } from '@/lib/hooks/use-greeting';
import { useOmnibarCollision } from '@/lib/hooks/use-omnibar-collision';
import { ContentAreaContextMenu } from '@/components/context-menus';
import {
  InlineStats,
  MobileStatsRow,
  DailyLogWidget,
  ScheduledTodayWidget,
  ContinueReadingWidget,
  RecentCardsWidget,
  TodoWidget,
  BillsWidget,
} from '@/components/home';
import { cn } from '@/lib/utils';

// Time icon mapping
const timeIcons = {
  coffee: Coffee,
  sun: Sun,
  sunset: Sunset,
  moon: Moon,
};

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const { message, displayName, formattedDate, timeIcon, mounted } = useGreeting(user?.email);

  // Collision detection: measure header width and compare to omnibar zone
  const headerRef = useRef<HTMLDivElement>(null);
  const needsOffset = useOmnibarCollision(headerRef, [displayName, message, mounted]);

  const TimeIcon = timeIcons[timeIcon as keyof typeof timeIcons] || Coffee;

  return (
    <ContentAreaContextMenu>
      <div className="flex-1">
        {/* Header with collision-aware offset */}
        <div
          className={cn(
            'transition-[padding] duration-200',
            needsOffset && 'md:pt-20'
          )}
        >
          {/* Custom header layout: greeting on left, stats on right */}
          <div className="pt-5 pb-4 px-4 md:px-6 min-h-[76px]">
            <div className="flex items-start justify-between gap-4">
              {/* Title area - measured for collision */}
              <div ref={headerRef} className="w-fit space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <TimeIcon className="h-3.5 w-3.5" />
                  <span>{mounted ? formattedDate : ''}</span>
                </div>
                <h1 className="text-2xl font-semibold text-text-primary">
                  {message}, <span className="text-[var(--color-accent)]">{displayName || 'friend'}</span>
                </h1>
              </div>
              {/* Stats - right aligned on desktop */}
              <div className="flex items-center gap-2 shrink-0 pt-1">
                <InlineStats />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile stats row - shows below header on mobile */}
        <MobileStatsRow />

        {/* Page content - 2-column grid on wider screens */}
        <div className="px-4 md:px-6 pt-4 pb-6 space-y-4">
          {/* 2-column layout: Daily Log (left) | Scheduled + Continue Reading (right) */}
          {/* Min heights locked to look good at 1920x1080 - this is the baseline */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 xl:grid-rows-[minmax(180px,1fr)_minmax(180px,1fr)]">
            {/* Left column - Daily Log spans both rows, min 380px */}
            <div className="xl:row-span-2 min-h-[380px]">
              <DailyLogWidget />
            </div>
            {/* Right column - Scheduled Today, min 180px */}
            <div className="min-h-[180px]">
              <ScheduledTodayWidget />
            </div>
            {/* Right column - Continue Reading, min 180px */}
            <div className="min-h-[180px]">
              <ContinueReadingWidget />
            </div>
          </div>

          {/* Bottom row: Recently Added (1/3) + Tasks (1/3) + Bills (1/3) */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            <div className="min-h-[200px]">
              <RecentCardsWidget />
            </div>
            <div className="min-h-[200px]">
              <TodoWidget />
            </div>
            <div className="min-h-[200px]">
              <BillsWidget />
            </div>
          </div>
        </div>
      </div>
    </ContentAreaContextMenu>
  );
}
