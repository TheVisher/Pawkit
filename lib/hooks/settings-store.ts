"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const DEFAULT_PREVIEW_URL = process.env.NEXT_PUBLIC_PREVIEW_SERVICE_URL ?? "http://localhost:8787/preview?url={{url}}";

export type Theme = "dark" | "light" | "auto";
export type AccentColor = "purple" | "blue" | "green" | "red" | "orange";

export type SettingsState = {
  autoFetchMetadata: boolean;
  showThumbnails: boolean;
  previewServiceUrl: string;
  theme: Theme;
  accentColor: AccentColor;
  notifications: boolean;
  autoSave: boolean;
  compactMode: boolean;
  showPreviews: boolean;
  serverSync: boolean;
  cardSize: number; // 1-5 scale
  showCardTitles: boolean;
  showCardUrls: boolean;
  showCardTags: boolean;
  cardPadding: number; // 0-4 scale (None, XS, SM, MD, LG)
  setAutoFetchMetadata: (value: boolean) => void;
  setShowThumbnails: (value: boolean) => void;
  setPreviewServiceUrl: (value: string) => void;
  setTheme: (value: Theme) => void;
  setAccentColor: (value: AccentColor) => void;
  setNotifications: (value: boolean) => void;
  setAutoSave: (value: boolean) => void;
  setCompactMode: (value: boolean) => void;
  setShowPreviews: (value: boolean) => void;
  setServerSync: (value: boolean) => void;
  setCardSize: (value: number) => void;
  setShowCardTitles: (value: boolean) => void;
  setShowCardUrls: (value: boolean) => void;
  setShowCardTags: (value: boolean) => void;
  setCardPadding: (value: number) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoFetchMetadata: true,
      showThumbnails: true,
      previewServiceUrl: DEFAULT_PREVIEW_URL,
      theme: "dark",
      accentColor: "purple",
      notifications: true,
      autoSave: true,
      compactMode: false,
      showPreviews: true,
      serverSync: true,
      cardSize: 3, // Default medium size
      showCardTitles: true,
      showCardUrls: true,
      showCardTags: true,
      cardPadding: 2, // Default SM padding
      setAutoFetchMetadata: (value) => set({ autoFetchMetadata: value }),
      setShowThumbnails: (value) => set({ showThumbnails: value }),
      setPreviewServiceUrl: (value) => set({ previewServiceUrl: value }),
      setTheme: (value) => set({ theme: value }),
      setAccentColor: (value) => set({ accentColor: value }),
      setNotifications: (value) => set({ notifications: value }),
      setAutoSave: (value) => set({ autoSave: value }),
      setCompactMode: (value) => set({ compactMode: value }),
      setShowPreviews: (value) => set({ showPreviews: value }),
      setServerSync: (value) => set({ serverSync: value }),
      setCardSize: (value) => set({ cardSize: value }),
      setShowCardTitles: (value) => set({ showCardTitles: value }),
      setShowCardUrls: (value) => set({ showCardUrls: value }),
      setShowCardTags: (value) => set({ showCardTags: value }),
      setCardPadding: (value) => set({ cardPadding: value })
    }),
    {
      name: "vbm-settings"
    }
  )
);
