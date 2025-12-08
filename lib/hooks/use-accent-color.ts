"use client";

import { useSettingsStore, type AccentColor } from "@/lib/hooks/settings-store";

const ACCENT_COLOR_VALUES: Record<AccentColor, { h: number; s: number; l: number }> = {
  purple: { h: 270, s: 70, l: 60 },
  blue: { h: 217, s: 91, l: 60 },
  green: { h: 142, s: 71, l: 45 },
  red: { h: 0, s: 84, l: 60 },
  orange: { h: 25, s: 95, l: 53 },
};

export function useAccentColor() {
  const accentColor = useSettingsStore((state) => state.accentColor);
  const { h, s, l } = ACCENT_COLOR_VALUES[accentColor];

  return {
    accentColor,
    hsl: { h, s, l },
    // CSS color values
    accent: `hsl(${h} ${s}% ${l}%)`,
    accentHover: `hsl(${h} ${s}% ${l + 10}%)`,
    accentMuted: `hsl(${h} ${s}% 35%)`,
    accentSubtle: `hsl(${h} ${s}% 20%)`,
    // With opacity variants
    accentWithOpacity: (opacity: number) => `hsl(${h} ${s}% ${l}% / ${opacity})`,
    accentMutedWithOpacity: (opacity: number) => `hsl(${h} ${s}% 35% / ${opacity})`,
    // Style objects for common patterns
    styles: {
      bgAccent: { backgroundColor: `hsl(${h} ${s}% ${l}%)` },
      bgAccentLight: { backgroundColor: `hsl(${h} ${s}% ${l}% / 0.1)` },
      bgAccentMedium: { backgroundColor: `hsl(${h} ${s}% ${l}% / 0.2)` },
      textAccent: { color: `hsl(${h} ${s}% ${l}%)` },
      borderAccent: { borderColor: `hsl(${h} ${s}% ${l}%)` },
      borderAccentLight: { borderColor: `hsl(${h} ${s}% ${l}% / 0.3)` },
    },
  };
}
