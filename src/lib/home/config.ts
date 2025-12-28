/**
 * Home View Widget Configuration
 *
 * Config-based widget rendering for future customization support.
 * V1: Uses default config only
 * V2: Will expose UI for drag-and-drop reordering, toggle visibility
 */

export type HomeWidgetId = 'daily-log' | 'scheduled-today' | 'continue-reading' | 'recent-cards';

export type HomeWidgetWidth = 'full' | 'half';

export interface HomeWidget {
  id: HomeWidgetId;
  enabled: boolean;
  order: number;
  width: HomeWidgetWidth;
}

/**
 * Default widget configuration
 *
 * Layout:
 * - Stats Banner (fixed, not in config - includes activity streak)
 * - Daily Log (full width)
 * - Scheduled Today + Continue Reading (side by side)
 * - Recently Added (full width, tall)
 */
export const DEFAULT_HOME_WIDGETS: HomeWidget[] = [
  { id: 'daily-log', enabled: true, order: 0, width: 'full' },
  { id: 'scheduled-today', enabled: true, order: 1, width: 'half' },
  { id: 'continue-reading', enabled: true, order: 2, width: 'half' },
  { id: 'recent-cards', enabled: true, order: 3, width: 'full' },
];

/**
 * Get enabled widgets sorted by order
 */
export function getEnabledWidgets(config: HomeWidget[] = DEFAULT_HOME_WIDGETS): HomeWidget[] {
  return config
    .filter((w) => w.enabled)
    .sort((a, b) => a.order - b.order);
}
