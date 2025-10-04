"use client";

import { useEffect } from "react";
import { useSettingsStore, type AccentColor } from "@/lib/hooks/settings-store";

const ACCENT_COLOR_VALUES: Record<AccentColor, { h: number; s: number; l: number }> = {
  purple: { h: 270, s: 70, l: 60 },
  blue: { h: 217, s: 91, l: 60 },
  green: { h: 142, s: 71, l: 45 },
  red: { h: 0, s: 84, l: 60 },
  orange: { h: 25, s: 95, l: 53 },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const accentColor = useSettingsStore((state) => state.accentColor);
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    const color = ACCENT_COLOR_VALUES[accentColor];

    // Set CSS variables for the accent color
    document.documentElement.style.setProperty("--accent-h", color.h.toString());
    document.documentElement.style.setProperty("--accent-s", `${color.s}%`);
    document.documentElement.style.setProperty("--accent-l", `${color.l}%`);
  }, [accentColor]);

  useEffect(() => {
    // Apply theme class to html element
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else if (theme === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
    // Auto theme would check system preference here
  }, [theme]);

  return <>{children}</>;
}
