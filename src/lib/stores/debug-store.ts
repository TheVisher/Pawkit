/**
 * Debug Store
 * Dev-only store for live-tuning performance parameters
 * Only loaded in development mode
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =============================================================================
// TYPES
// =============================================================================

export type ScrollBehavior = 'auto' | 'smooth' | 'instant';
export type ImageLoading = 'lazy' | 'eager' | 'auto';
export type ImageDecoding = 'async' | 'sync' | 'auto';
export type AnimationEasing = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';

export interface DebugState {
  // === ResizeObserver (CRITICAL - just removed this!) ===
  enableResizeObserver: boolean;
  resizeDebounce: number;
  resizeThreshold: number;

  // === Smooth Scroll (CRITICAL - V1 vs V2 theory) ===
  scrollBehavior: ScrollBehavior;
  smoothScrollDuration: number;

  // === Virtualization ===
  enableVirtualization: boolean;
  virtualizeThreshold: number;
  virtualizeOverscan: number;

  // === Masonry Grid ===
  layoutDuration: number;
  layoutOnResize: number;
  showDuration: number;
  hideDuration: number;
  fillGaps: boolean;
  layoutEasing: AnimationEasing;

  // === Card Display ===
  minItemWidthSmall: number;
  minItemWidthMedium: number;
  minItemWidthLarge: number;
  minItemWidthXL: number;

  // === React Rendering ===
  enableStartTransition: boolean;
  forceFlushSync: boolean;

  // === Framer Motion ===
  enableFramerMotion: boolean;
  animationDuration: number;

  // === Image Loading ===
  imageLazyLoading: ImageLoading;
  imageDecoding: ImageDecoding;
  blurBackgroundEnabled: boolean;
  priorityCardCount: number;

  // === Layout Cache ===
  cacheEnabled: boolean;
  widthTolerance: number;
  persistDebounceMs: number;

  // === Metrics Display ===
  showFpsCounter: boolean;
  showFrameDrops: boolean;
  showCacheStats: boolean;
  showMemoryUsage: boolean;

  // === Panel State ===
  isPanelOpen: boolean;
  expandedSections: string[];
}

export interface DebugActions {
  // Panel controls
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  toggleSection: (section: string) => void;

  // Setting updaters
  set: <K extends keyof DebugState>(key: K, value: DebugState[K]) => void;
  setMultiple: (updates: Partial<DebugState>) => void;

  // Presets
  applyPreset: (preset: 'v1' | 'v2' | 'maxPerf' | 'debug') => void;
  resetToDefaults: () => void;

  // Export
  exportSettings: () => DebugExport;
  exportSettingsJson: () => string;
}

export interface DebugExport {
  timestamp: string;
  browser: string;
  settings: Partial<DebugState>;
}

export type DebugStore = DebugState & DebugActions;

// =============================================================================
// DEFAULTS (Current V2 Production Values)
// =============================================================================

export const DEBUG_DEFAULTS: DebugState = {
  // ResizeObserver (OFF by default - we just removed it!)
  enableResizeObserver: false,
  resizeDebounce: 50,
  resizeThreshold: 5,

  // Smooth Scroll
  scrollBehavior: 'auto',
  smoothScrollDuration: 300,

  // Virtualization (ON in V2)
  enableVirtualization: true,
  virtualizeThreshold: 500,
  virtualizeOverscan: 5,

  // Masonry Grid
  layoutDuration: 300,
  layoutOnResize: 16,
  showDuration: 200,
  hideDuration: 200,
  fillGaps: true,
  layoutEasing: 'ease-out',

  // Card Display
  minItemWidthSmall: 180,
  minItemWidthMedium: 280,
  minItemWidthLarge: 400,
  minItemWidthXL: 520,

  // React Rendering
  enableStartTransition: true,
  forceFlushSync: false,

  // Framer Motion (ON in V2)
  enableFramerMotion: true,
  animationDuration: 150,

  // Image Loading
  imageLazyLoading: 'lazy',
  imageDecoding: 'async',
  blurBackgroundEnabled: true,
  priorityCardCount: 6,

  // Layout Cache
  cacheEnabled: true,
  widthTolerance: 20,
  persistDebounceMs: 1000,

  // Metrics (OFF by default)
  showFpsCounter: false,
  showFrameDrops: false,
  showCacheStats: false,
  showMemoryUsage: false,

  // Panel
  isPanelOpen: false,
  expandedSections: ['resizeObserver', 'scroll'],
};

// =============================================================================
// PRESETS
// =============================================================================

export const PRESETS = {
  // V1 Mode: Simpler, no fancy features
  v1: {
    enableResizeObserver: false,
    enableVirtualization: false,
    enableFramerMotion: false,
    enableStartTransition: false,
    blurBackgroundEnabled: false,
    scrollBehavior: 'auto' as ScrollBehavior,
    layoutDuration: 0,
    showDuration: 0,
    hideDuration: 0,
    animationDuration: 0,
  },

  // V2 Mode: Current defaults
  v2: { ...DEBUG_DEFAULTS },

  // Max Performance: Everything instant, no animations
  maxPerf: {
    enableResizeObserver: false,
    enableVirtualization: false,
    enableFramerMotion: false,
    enableStartTransition: false,
    blurBackgroundEnabled: false,
    scrollBehavior: 'instant' as ScrollBehavior,
    layoutDuration: 0,
    showDuration: 0,
    hideDuration: 0,
    animationDuration: 0,
    cacheEnabled: false,
    imageLazyLoading: 'eager' as ImageLoading,
    imageDecoding: 'sync' as ImageDecoding,
  },

  // Debug Mode: Slow animations, everything visible
  debug: {
    enableResizeObserver: true,
    resizeDebounce: 500,
    layoutDuration: 1000,
    showDuration: 500,
    hideDuration: 500,
    animationDuration: 500,
    showFpsCounter: true,
    showFrameDrops: true,
    showCacheStats: true,
    showMemoryUsage: true,
  },
} as const;

// =============================================================================
// STORE
// =============================================================================

export const useDebugStore = create<DebugStore>()(
  persist(
    (set, get) => ({
      ...DEBUG_DEFAULTS,

      // Panel controls
      togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),
      openPanel: () => set({ isPanelOpen: true }),
      closePanel: () => set({ isPanelOpen: false }),
      toggleSection: (section) =>
        set((s) => ({
          expandedSections: s.expandedSections.includes(section)
            ? s.expandedSections.filter((sec) => sec !== section)
            : [...s.expandedSections, section],
        })),

      // Setting updaters
      set: (key, value) => set({ [key]: value }),
      setMultiple: (updates) => set(updates),

      // Presets
      applyPreset: (preset) => {
        const presetValues = PRESETS[preset];
        set(presetValues);
      },
      resetToDefaults: () => set(DEBUG_DEFAULTS),

      // Export
      exportSettings: () => {
        const state = get();
        const changed: Partial<DebugState> = {};

        // Only include values that differ from defaults
        for (const key of Object.keys(DEBUG_DEFAULTS) as (keyof DebugState)[]) {
          if (
            key !== 'isPanelOpen' &&
            key !== 'expandedSections' &&
            state[key] !== DEBUG_DEFAULTS[key]
          ) {
            // @ts-expect-error - dynamic key assignment
            changed[key] = state[key];
          }
        }

        return {
          timestamp: new Date().toISOString(),
          browser: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          settings: changed,
        };
      },

      exportSettingsJson: () => {
        const exported = get().exportSettings();
        return JSON.stringify(exported, null, 2);
      },
    }),
    {
      name: 'pawkit-debug-settings',
      partialize: (state) => {
        // Don't persist panel open state or metrics toggles
        const { isPanelOpen, ...rest } = state;
        return rest;
      },
    }
  )
);

// =============================================================================
// DEV CHECK
// =============================================================================

export const isDev = process.env.NODE_ENV === 'development';
