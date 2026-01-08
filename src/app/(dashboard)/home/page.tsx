'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { Coffee, Sun, Sunset, Moon } from 'lucide-react';
import GridLayout from 'react-grid-layout';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useGreeting } from '@/lib/hooks/use-greeting';
import { useOmnibarCollision } from '@/lib/hooks/use-omnibar-collision';
import { ContentAreaContextMenu, WidgetContextMenu } from '@/components/context-menus';
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
import {
  useEnabledWidgets,
  useEnabledLayout,
  useWidgetLayoutStore,
  GRID_CONFIG,
  type WidgetType,
} from '@/lib/stores/widget-layout-store';

// Import react-grid-layout styles
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Time icon mapping
const timeIcons = {
  coffee: Coffee,
  sun: Sun,
  sunset: Sunset,
  moon: Moon,
};

// Map widget type to component
const WIDGET_COMPONENTS: Record<WidgetType, React.ComponentType> = {
  'daily-log': DailyLogWidget,
  'scheduled-today': ScheduledTodayWidget,
  'continue-reading': ContinueReadingWidget,
  'recent-cards': RecentCardsWidget,
  'tasks': TodoWidget,
  'bills': BillsWidget,
};

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const { message, displayName, formattedDate, timeIcon, mounted } = useGreeting(user?.email);
  const enabledWidgets = useEnabledWidgets();
  const layout = useEnabledLayout();
  const setLayout = useWidgetLayoutStore((s) => s.setLayout);

  // Track container width using ResizeObserver for accurate measurement
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Collision detection: measure header width and compare to omnibar zone
  const headerRef = useRef<HTMLDivElement>(null);
  const needsOffset = useOmnibarCollision(headerRef, [displayName, message, mounted]);

  const TimeIcon = timeIcons[timeIcon as keyof typeof timeIcons] || Coffee;

  // Use ResizeObserver for accurate container width measurement
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use contentRect for accurate inner width (excludes padding/border)
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Handle layout changes from drag/resize
  const handleLayoutChange = useCallback(
    (newLayout: GridLayout.Layout[]) => {
      setLayout(newLayout);
    },
    [setLayout]
  );

  return (
    <ContentAreaContextMenu>
      <div className="flex flex-col h-full min-h-0">
        {/* Header with collision-aware offset */}
        <div
          className={cn(
            'shrink-0 transition-[padding] duration-200',
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

        {/* Widget grid with drag-and-drop - fills remaining space */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 md:px-6 py-4"
        >
          {containerWidth > 0 && (
            <GridLayout
              className="widget-grid"
              layout={layout}
              cols={GRID_CONFIG.cols}
              rowHeight={GRID_CONFIG.rowHeight}
              width={containerWidth}
              margin={GRID_CONFIG.margin}
              containerPadding={GRID_CONFIG.containerPadding}
              onLayoutChange={handleLayoutChange}
              draggableHandle=".widget-drag-handle"
              isResizable={true}
              isDraggable={true}
              isBounded={true}
              compactType="vertical"
              preventCollision={false}
            >
              {enabledWidgets.map((widget) => {
                const WidgetComponent = WIDGET_COMPONENTS[widget.type];

                return (
                  <div key={widget.id} className="widget-container">
                    <WidgetContextMenu
                      widgetId={widget.id}
                      widgetType={widget.type}
                    >
                      <div className="h-full w-full widget-drag-handle cursor-move">
                        <WidgetComponent />
                      </div>
                    </WidgetContextMenu>
                  </div>
                );
              })}
            </GridLayout>
          )}
        </div>
      </div>
    </ContentAreaContextMenu>
  );
}
