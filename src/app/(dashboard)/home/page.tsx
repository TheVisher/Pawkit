'use client';

import { useRef } from 'react';
import { Coffee, Sun, Sunset, Moon } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useGreeting } from '@/lib/hooks/use-greeting';
import { useOmnibarCollision } from '@/lib/hooks/use-omnibar-collision';
import { PageHeader } from '@/components/layout/page-header';
import { ContentAreaContextMenu } from '@/components/context-menus';
import {
  StatsBanner,
  DailyLogWidget,
  ScheduledTodayWidget,
  ContinueReadingWidget,
  RecentCardsWidget,
} from '@/components/home';
import { getEnabledWidgets, type HomeWidget } from '@/lib/home/config';
import { cn } from '@/lib/utils';

// Time icon mapping
const timeIcons = {
  coffee: Coffee,
  sun: Sun,
  sunset: Sunset,
  moon: Moon,
};

// Widget component mapping
const widgetComponents: Record<string, React.ComponentType> = {
  'daily-log': DailyLogWidget,
  'scheduled-today': ScheduledTodayWidget,
  'continue-reading': ContinueReadingWidget,
  'recent-cards': RecentCardsWidget,
};

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const { message, displayName, formattedDate, timeIcon, mounted } = useGreeting(user?.email);

  // Collision detection: measure header width and compare to omnibar zone
  const headerRef = useRef<HTMLDivElement>(null);
  const needsOffset = useOmnibarCollision(headerRef, [displayName, message, mounted]);

  const TimeIcon = timeIcons[timeIcon as keyof typeof timeIcons] || Coffee;

  const subtitle = (
    <div className="flex items-center gap-1.5">
      <TimeIcon className="h-3.5 w-3.5" />
      <span>{mounted ? formattedDate : ''}</span>
    </div>
  );

  const title = (
    <>
      {message}, <span className="text-[var(--color-accent)]">{displayName || 'friend'}</span>
    </>
  );

  // Get enabled widgets from config
  const widgets = getEnabledWidgets();

  // Group widgets by row (full-width widgets are their own row, half-width widgets pair up)
  const renderWidgets = () => {
    const rows: React.ReactNode[] = [];
    let halfWidgets: HomeWidget[] = [];

    widgets.forEach((widget, index) => {
      const Component = widgetComponents[widget.id];
      if (!Component) return;

      if (widget.width === 'full') {
        // Flush any pending half-width widgets first
        if (halfWidgets.length > 0) {
          rows.push(
            <div key={`half-row-${index}`} className="grid md:grid-cols-2 gap-4">
              {halfWidgets.map((hw) => {
                const HalfComponent = widgetComponents[hw.id];
                return HalfComponent ? <HalfComponent key={hw.id} /> : null;
              })}
            </div>
          );
          halfWidgets = [];
        }
        // Add full-width widget
        rows.push(<Component key={widget.id} />);
      } else {
        // Collect half-width widgets
        halfWidgets.push(widget);
        // If we have 2 half-width widgets, render them
        if (halfWidgets.length === 2) {
          rows.push(
            <div key={`half-row-${index}`} className="grid md:grid-cols-2 gap-4">
              {halfWidgets.map((hw) => {
                const HalfComponent = widgetComponents[hw.id];
                return HalfComponent ? <HalfComponent key={hw.id} /> : null;
              })}
            </div>
          );
          halfWidgets = [];
        }
      }
    });

    // Handle any remaining half-width widget
    if (halfWidgets.length > 0) {
      rows.push(
        <div key="half-row-final" className="grid md:grid-cols-2 gap-4">
          {halfWidgets.map((hw) => {
            const HalfComponent = widgetComponents[hw.id];
            return HalfComponent ? <HalfComponent key={hw.id} /> : null;
          })}
        </div>
      );
    }

    return rows;
  };

  return (
    <ContentAreaContextMenu>
      <div className="flex-1">
        {/* Header with collision-aware offset */}
        {/* w-fit makes the container only as wide as the content */}
        {/* When header text would overlap with centered omnibar, drop it down */}
        <div
          className={cn(
            'transition-[padding] duration-200',
            needsOffset && 'md:pt-20' // 80px = omnibar height + breathing room
          )}
        >
          <div ref={headerRef} className="w-fit">
            <PageHeader title={title} subtitle={subtitle} />
          </div>
        </div>

        {/* Page content */}
        <div className="px-4 md:px-6 pb-6 space-y-4">
          {/* Stats Banner (fixed, not in widget config) */}
          <StatsBanner />

          {/* Config-based widgets */}
          {renderWidgets()}
        </div>
      </div>
    </ContentAreaContextMenu>
  );
}
