/**
 * Hook to read debug values with production fallback
 * In production: returns the default value (no store access)
 * In development: returns the live value from debug store
 */

import { DEBUG_DEFAULTS, useDebugStore, type DebugState } from '@/lib/stores/debug-store';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Get a single debug value
 * Falls back to default in production
 */
export function useDebugValue<K extends keyof DebugState>(key: K): DebugState[K] {
  const storeValue = useDebugStore((state) => state[key]);

  if (!isDev) {
    return DEBUG_DEFAULTS[key];
  }

  return storeValue;
}

/**
 * Get grid-related debug values
 * Pre-defined selector to avoid creating new objects
 */
export function useDebugGridValues() {
  const layoutDuration = useDebugStore((s) => s.layoutDuration);
  const layoutOnResize = useDebugStore((s) => s.layoutOnResize);
  const showDuration = useDebugStore((s) => s.showDuration);
  const hideDuration = useDebugStore((s) => s.hideDuration);
  const fillGaps = useDebugStore((s) => s.fillGaps);
  const layoutEasing = useDebugStore((s) => s.layoutEasing);

  if (!isDev) {
    return {
      layoutDuration: DEBUG_DEFAULTS.layoutDuration,
      layoutOnResize: DEBUG_DEFAULTS.layoutOnResize,
      showDuration: DEBUG_DEFAULTS.showDuration,
      hideDuration: DEBUG_DEFAULTS.hideDuration,
      fillGaps: DEBUG_DEFAULTS.fillGaps,
      layoutEasing: DEBUG_DEFAULTS.layoutEasing,
    };
  }

  return {
    layoutDuration,
    layoutOnResize,
    showDuration,
    hideDuration,
    fillGaps,
    layoutEasing,
  };
}

/**
 * Get a debug value without React hooks (for non-component code)
 * Falls back to default in production
 */
export function getDebugValue<K extends keyof DebugState>(key: K): DebugState[K] {
  if (!isDev) {
    return DEBUG_DEFAULTS[key];
  }

  return useDebugStore.getState()[key];
}

/**
 * Get multiple debug values without React hooks
 * Falls back to defaults in production
 */
export function getDebugValues<K extends keyof DebugState>(
  keys: K[]
): Pick<DebugState, K> {
  if (!isDev) {
    return keys.reduce(
      (acc, key) => {
        acc[key] = DEBUG_DEFAULTS[key];
        return acc;
      },
      {} as Pick<DebugState, K>
    );
  }

  const state = useDebugStore.getState();
  return keys.reduce(
    (acc, key) => {
      acc[key] = state[key];
      return acc;
    },
    {} as Pick<DebugState, K>
  );
}
