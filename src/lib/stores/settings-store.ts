/**
 * Settings Store
 * Manages app-level settings like appearance preferences
 * Persists to localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { useEffect } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type BackgroundPreset = 'default' | 'minimal' | 'blue' | 'teal' | 'warm';

export interface AccentColorPreset {
  name: string;
  hue: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const ACCENT_COLOR_PRESETS: AccentColorPreset[] = [
  { name: 'Purple', hue: 270 },
  { name: 'Blue', hue: 220 },
  { name: 'Teal', hue: 180 },
  { name: 'Green', hue: 140 },
  { name: 'Orange', hue: 30 },
  { name: 'Pink', hue: 330 },
];

export const BACKGROUND_PRESETS: Record<BackgroundPreset, { name: string; darkGradient: string; lightGradient: string }> = {
  default: {
    name: 'Purple Glow',
    darkGradient: `
      radial-gradient(1200px circle at 12% 0%, rgba(122, 92, 250, 0.28), rgba(10, 8, 20, 0)),
      radial-gradient(900px circle at 88% 8%, rgba(122, 92, 250, 0.18), rgba(10, 8, 20, 0)),
      radial-gradient(600px circle at 25% 90%, rgba(122, 92, 250, 0.14), rgba(10, 8, 20, 0)),
      linear-gradient(160deg, rgba(10, 8, 20, 0.96), rgba(5, 5, 12, 1))
    `,
    lightGradient: `
      radial-gradient(1200px circle at 12% 0%, rgba(168, 85, 247, 0.15), rgba(245, 240, 250, 0)),
      radial-gradient(900px circle at 88% 8%, rgba(168, 85, 247, 0.12), rgba(245, 240, 250, 0)),
      radial-gradient(600px circle at 25% 90%, rgba(168, 85, 247, 0.08), rgba(245, 240, 250, 0)),
      linear-gradient(160deg, rgba(250, 245, 255, 0.96), rgba(245, 240, 250, 1))
    `,
  },
  minimal: {
    name: 'Minimal',
    darkGradient: 'linear-gradient(160deg, rgba(10, 10, 14, 1), rgba(5, 5, 8, 1))',
    lightGradient: 'linear-gradient(160deg, rgba(250, 250, 252, 1), rgba(245, 245, 248, 1))',
  },
  blue: {
    name: 'Blue Glow',
    darkGradient: `
      radial-gradient(1200px circle at 12% 0%, rgba(59, 130, 246, 0.28), rgba(8, 12, 20, 0)),
      radial-gradient(900px circle at 88% 8%, rgba(59, 130, 246, 0.18), rgba(8, 12, 20, 0)),
      radial-gradient(600px circle at 25% 90%, rgba(59, 130, 246, 0.14), rgba(8, 12, 20, 0)),
      linear-gradient(160deg, rgba(8, 12, 20, 0.96), rgba(5, 8, 15, 1))
    `,
    lightGradient: `
      radial-gradient(1200px circle at 12% 0%, rgba(59, 130, 246, 0.15), rgba(240, 245, 255, 0)),
      radial-gradient(900px circle at 88% 8%, rgba(59, 130, 246, 0.12), rgba(240, 245, 255, 0)),
      radial-gradient(600px circle at 25% 90%, rgba(59, 130, 246, 0.08), rgba(240, 245, 255, 0)),
      linear-gradient(160deg, rgba(245, 250, 255, 0.96), rgba(240, 245, 255, 1))
    `,
  },
  teal: {
    name: 'Teal Glow',
    darkGradient: `
      radial-gradient(1200px circle at 12% 0%, rgba(20, 184, 166, 0.28), rgba(8, 18, 18, 0)),
      radial-gradient(900px circle at 88% 8%, rgba(20, 184, 166, 0.18), rgba(8, 18, 18, 0)),
      radial-gradient(600px circle at 25% 90%, rgba(20, 184, 166, 0.14), rgba(8, 18, 18, 0)),
      linear-gradient(160deg, rgba(8, 18, 18, 0.96), rgba(5, 12, 12, 1))
    `,
    lightGradient: `
      radial-gradient(1200px circle at 12% 0%, rgba(20, 184, 166, 0.15), rgba(240, 253, 250, 0)),
      radial-gradient(900px circle at 88% 8%, rgba(20, 184, 166, 0.12), rgba(240, 253, 250, 0)),
      radial-gradient(600px circle at 25% 90%, rgba(20, 184, 166, 0.08), rgba(240, 253, 250, 0)),
      linear-gradient(160deg, rgba(245, 255, 252, 0.96), rgba(240, 253, 250, 1))
    `,
  },
  warm: {
    name: 'Warm Glow',
    darkGradient: `
      radial-gradient(1200px circle at 12% 0%, rgba(249, 115, 22, 0.28), rgba(18, 12, 8, 0)),
      radial-gradient(900px circle at 88% 8%, rgba(249, 115, 22, 0.18), rgba(18, 12, 8, 0)),
      radial-gradient(600px circle at 25% 90%, rgba(249, 115, 22, 0.14), rgba(18, 12, 8, 0)),
      linear-gradient(160deg, rgba(18, 12, 8, 0.96), rgba(12, 8, 5, 1))
    `,
    lightGradient: `
      radial-gradient(1200px circle at 12% 0%, rgba(249, 115, 22, 0.15), rgba(255, 250, 245, 0)),
      radial-gradient(900px circle at 88% 8%, rgba(249, 115, 22, 0.12), rgba(255, 250, 245, 0)),
      radial-gradient(600px circle at 25% 90%, rgba(249, 115, 22, 0.08), rgba(255, 250, 245, 0)),
      linear-gradient(160deg, rgba(255, 252, 248, 0.96), rgba(255, 250, 245, 1))
    `,
  },
};

// =============================================================================
// STORE
// =============================================================================

interface SettingsState {
  // Appearance settings (persisted)
  accentHue: number;
  backgroundPreset: BackgroundPreset;

  // Actions
  setAccentHue: (hue: number) => void;
  setBackgroundPreset: (preset: BackgroundPreset) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial state
      accentHue: 270,
      backgroundPreset: 'default',

      // Actions
      setAccentHue: (hue) => set({ accentHue: hue }),
      setBackgroundPreset: (preset) => set({ backgroundPreset: preset }),
    }),
    {
      name: 'pawkit-settings',
    }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

export const selectAccentHue = (state: SettingsState) => state.accentHue;
export const selectBackgroundPreset = (state: SettingsState) => state.backgroundPreset;

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook for appearance settings
 */
export function useAppearanceSettings() {
  return useSettingsStore(
    useShallow((state) => ({
      accentHue: state.accentHue,
      backgroundPreset: state.backgroundPreset,
      setAccentHue: state.setAccentHue,
      setBackgroundPreset: state.setBackgroundPreset,
    }))
  );
}

/**
 * Hook to apply settings as CSS variables
 * Should be used once at the app root level
 */
export function useApplySettings() {
  const accentHue = useSettingsStore((state) => state.accentHue);
  const backgroundPreset = useSettingsStore((state) => state.backgroundPreset);

  useEffect(() => {
    // Apply accent hue
    document.documentElement.style.setProperty('--hue-accent', String(accentHue));
  }, [accentHue]);

  useEffect(() => {
    // Apply background gradient based on current theme
    const preset = BACKGROUND_PRESETS[backgroundPreset];
    if (!preset) return;

    const applyBackground = () => {
      const isDark = document.documentElement.classList.contains('dark');
      const gradient = isDark ? preset.darkGradient : preset.lightGradient;
      document.documentElement.style.setProperty('--bg-gradient-image', gradient);
    };

    // Apply immediately
    applyBackground();

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          applyBackground();
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, [backgroundPreset]);
}
