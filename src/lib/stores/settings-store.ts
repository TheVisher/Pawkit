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

export interface HSLColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface SavedColor {
  id: string;
  name: string;
  hsl: HSLColor;
}

// =============================================================================
// COLOR UTILITIES
// =============================================================================

/**
 * Convert HSL to Hex
 */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Convert Hex to HSL
 */
export function hexToHsl(hex: string): HSLColor | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Handle 3-digit hex
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }

  if (hex.length !== 6) return null;

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Validate hex color string
 */
export function isValidHex(hex: string): boolean {
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
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
  // Appearance settings (persisted to localStorage, then synced)
  accentHue: number;
  accentSaturation: number;
  accentLightness: number;
  savedColors: SavedColor[];
  backgroundPreset: BackgroundPreset;

  // Actions
  setAccentHue: (hue: number) => void;
  setAccentSaturation: (saturation: number) => void;
  setAccentLightness: (lightness: number) => void;
  setAccentHSL: (h: number, s: number, l: number) => void;
  addSavedColor: (name: string) => void;
  removeSavedColor: (id: string) => void;
  applySavedColor: (id: string) => void;
  setBackgroundPreset: (preset: BackgroundPreset) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      accentHue: 270,
      accentSaturation: 60,
      accentLightness: 55,
      savedColors: [],
      backgroundPreset: 'default',

      // Actions
      setAccentHue: (hue) => set({ accentHue: hue }),
      setAccentSaturation: (saturation) => set({ accentSaturation: saturation }),
      setAccentLightness: (lightness) => set({ accentLightness: lightness }),
      setAccentHSL: (h, s, l) => set({ accentHue: h, accentSaturation: s, accentLightness: l }),
      addSavedColor: (name) => {
        const state = get();
        const newColor: SavedColor = {
          id: crypto.randomUUID(),
          name,
          hsl: {
            h: state.accentHue,
            s: state.accentSaturation,
            l: state.accentLightness,
          },
        };
        set({ savedColors: [...state.savedColors, newColor] });
      },
      removeSavedColor: (id) => {
        const state = get();
        set({ savedColors: state.savedColors.filter((c) => c.id !== id) });
      },
      applySavedColor: (id) => {
        const state = get();
        const color = state.savedColors.find((c) => c.id === id);
        if (color) {
          set({
            accentHue: color.hsl.h,
            accentSaturation: color.hsl.s,
            accentLightness: color.hsl.l,
          });
        }
      },
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
      accentSaturation: state.accentSaturation,
      accentLightness: state.accentLightness,
      savedColors: state.savedColors,
      backgroundPreset: state.backgroundPreset,
      setAccentHue: state.setAccentHue,
      setAccentSaturation: state.setAccentSaturation,
      setAccentLightness: state.setAccentLightness,
      setAccentHSL: state.setAccentHSL,
      addSavedColor: state.addSavedColor,
      removeSavedColor: state.removeSavedColor,
      applySavedColor: state.applySavedColor,
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
  const accentSaturation = useSettingsStore((state) => state.accentSaturation);
  const accentLightness = useSettingsStore((state) => state.accentLightness);
  const backgroundPreset = useSettingsStore((state) => state.backgroundPreset);

  useEffect(() => {
    // Apply accent HSL values
    document.documentElement.style.setProperty('--hue-accent', String(accentHue));
    document.documentElement.style.setProperty('--sat-accent', `${accentSaturation}%`);
    document.documentElement.style.setProperty('--light-accent', `${accentLightness}%`);
  }, [accentHue, accentSaturation, accentLightness]);

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
