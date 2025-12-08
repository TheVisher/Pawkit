"use client";

import { useEffect, useState } from "react";
import { useSettingsStore, type AccentColor, type UiStyle } from "@/lib/hooks/settings-store";

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
  const uiStyle = useSettingsStore((state) => state.uiStyle);
  const [systemPreference, setSystemPreference] = useState<"light" | "dark">("dark");

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setSystemPreference(e.matches ? "dark" : "light");
    };

    // Set initial value
    handleChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const color = ACCENT_COLOR_VALUES[accentColor];

    // Set CSS variables for the accent color
    document.documentElement.style.setProperty("--accent-h", color.h.toString());
    document.documentElement.style.setProperty("--accent-s", `${color.s}%`);
    document.documentElement.style.setProperty("--accent-l", `${color.l}%`);
  }, [accentColor]);

  useEffect(() => {
    // Determine the effective theme
    const effectiveTheme = theme === "auto" ? systemPreference : theme;

    // Apply theme class to html element
    if (effectiveTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, [theme, systemPreference]);

  // Apply UI style (modern vs classic purple)
  useEffect(() => {
    if (uiStyle === "classic") {
      document.documentElement.setAttribute("data-ui-style", "classic");
    } else {
      document.documentElement.removeAttribute("data-ui-style");
    }
  }, [uiStyle]);

  return <>{children}</>;
}
