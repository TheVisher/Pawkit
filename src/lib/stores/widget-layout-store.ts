import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMemo } from 'react';
import type { LayoutItem } from 'react-grid-layout';

// Widget types available
export type WidgetType =
  | 'daily-log'
  | 'scheduled-today'
  | 'continue-reading'
  | 'recent-cards'
  | 'tasks'
  | 'bills';

// Widget configuration (what widget and if it's enabled)
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  enabled: boolean;
}

// Grid layout constants
export const GRID_CONFIG = {
  cols: 4, // 4 columns
  rowHeight: 360, // Height per row unit in pixels (increased for better 1x1 widgets)
  margin: [16, 16] as [number, number], // Gap between widgets
  containerPadding: [0, 0] as [number, number],
};

// Minimum sizes per widget type (w x h in grid units)
export const WIDGET_MIN_SIZE: Record<WidgetType, { minW: number; minH: number }> = {
  'daily-log': { minW: 1, minH: 1 },
  'scheduled-today': { minW: 1, minH: 1 },
  'continue-reading': { minW: 1, minH: 1 },
  'recent-cards': { minW: 1, minH: 1 },
  'tasks': { minW: 1, minH: 1 },
  'bills': { minW: 1, minH: 1 },
};

// Maximum sizes per widget type
export const WIDGET_MAX_SIZE: Record<WidgetType, { maxW: number; maxH: number }> = {
  'daily-log': { maxW: 4, maxH: 4 },
  'scheduled-today': { maxW: 2, maxH: 3 },
  'continue-reading': { maxW: 2, maxH: 4 },
  'recent-cards': { maxW: 4, maxH: 6 }, // Can be full width and tall
  'tasks': { maxW: 2, maxH: 4 },
  'bills': { maxW: 2, maxH: 4 },
};

// Widget metadata for display
export const WIDGET_METADATA: Record<WidgetType, { name: string; description: string }> = {
  'daily-log': { name: "Today's Log", description: 'Quick notes and daily journal' },
  'scheduled-today': { name: 'Scheduled Today', description: 'Items scheduled for today' },
  'continue-reading': { name: 'Continue Reading', description: 'Articles in progress' },
  'recent-cards': { name: 'Recently Added', description: 'Your latest saves' },
  'tasks': { name: 'Tasks', description: 'Your todo list' },
  'bills': { name: 'Bills', description: 'Subscription tracking' },
};

// Default widget configs
const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'daily-log', type: 'daily-log', enabled: true },
  { id: 'scheduled-today', type: 'scheduled-today', enabled: true },
  { id: 'continue-reading', type: 'continue-reading', enabled: true },
  { id: 'recent-cards', type: 'recent-cards', enabled: true },
  { id: 'tasks', type: 'tasks', enabled: true },
  { id: 'bills', type: 'bills', enabled: true },
];

// Default grid layout positions (react-grid-layout format)
// x: column, y: row, w: width in columns, h: height in rows
const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: 'daily-log', x: 0, y: 0, w: 2, h: 2, minW: 1, minH: 1, maxW: 4, maxH: 4 },
  { i: 'scheduled-today', x: 2, y: 0, w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 3 },
  { i: 'continue-reading', x: 3, y: 0, w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 4 },
  { i: 'recent-cards', x: 2, y: 1, w: 2, h: 1, minW: 1, minH: 1, maxW: 4, maxH: 6 },
  { i: 'tasks', x: 0, y: 2, w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 4 },
  { i: 'bills', x: 1, y: 2, w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 4 },
];

interface WidgetLayoutState {
  widgets: WidgetConfig[];
  layout: LayoutItem[];

  // Actions
  setLayout: (layout: LayoutItem[]) => void;
  setWidgetEnabled: (widgetId: string, enabled: boolean) => void;
  resetToDefaults: () => void;
}

export const useWidgetLayoutStore = create<WidgetLayoutState>()(
  persist(
    (set, get) => ({
      widgets: DEFAULT_WIDGETS,
      layout: DEFAULT_LAYOUT,

      setLayout: (layout) => set({ layout }),

      setWidgetEnabled: (widgetId, enabled) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === widgetId ? { ...w, enabled } : w
          ),
          // If disabling, remove from layout; if enabling, add back with default position
          layout: enabled
            ? state.layout.find((l) => l.i === widgetId)
              ? state.layout
              : [
                  ...state.layout,
                  DEFAULT_LAYOUT.find((l) => l.i === widgetId) || {
                    i: widgetId,
                    x: 0,
                    y: Infinity, // Will be placed at bottom
                    w: 1,
                    h: 1,
                  },
                ]
            : state.layout.filter((l) => l.i !== widgetId),
        })),

      resetToDefaults: () =>
        set({
          widgets: DEFAULT_WIDGETS,
          layout: DEFAULT_LAYOUT,
        }),
    }),
    {
      name: 'pawkit-widget-layout-v2', // New key to avoid conflicts with old format
    }
  )
);

// Hook for enabled widgets (memoized)
export function useEnabledWidgets() {
  const widgets = useWidgetLayoutStore((state) => state.widgets);

  return useMemo(() => widgets.filter((w) => w.enabled), [widgets]);
}

// Hook for layout of enabled widgets only
export function useEnabledLayout() {
  const layout = useWidgetLayoutStore((state) => state.layout);
  const widgets = useWidgetLayoutStore((state) => state.widgets);

  return useMemo(() => {
    const enabledIds = new Set(widgets.filter((w) => w.enabled).map((w) => w.id));
    return layout.filter((l) => enabledIds.has(l.i));
  }, [layout, widgets]);
}

// Hook for a specific widget config
export function useWidgetConfig(widgetId: string) {
  const widgets = useWidgetLayoutStore((state) => state.widgets);

  return useMemo(
    () => widgets.find((w) => w.id === widgetId),
    [widgets, widgetId]
  );
}

// Get widget type from id
export function getWidgetType(widgetId: string): WidgetType | undefined {
  const widget = DEFAULT_WIDGETS.find((w) => w.id === widgetId);
  return widget?.type;
}
