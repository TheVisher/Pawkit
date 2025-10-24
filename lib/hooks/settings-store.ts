"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const DEFAULT_PREVIEW_URL = process.env.NEXT_PUBLIC_PREVIEW_SERVICE_URL ?? "http://localhost:8787/preview?url={{url}}";

export type Theme = "dark" | "light" | "auto";
export type AccentColor = "purple" | "blue" | "green" | "red" | "orange";
export type Area = "library" | "home" | "den" | "pawkit" | "notes";

export type DisplaySettings = {
  showCardTitles: boolean;
  showCardUrls: boolean;
  showCardTags: boolean;
  cardPadding: number; // 0-4 scale (None, XS, SM, MD, LG)
};

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
  autoSyncOnReconnect: boolean; // Auto-sync pending changes when re-enabling server sync
  cardSize: number; // 1-5 scale
  // Per-area display settings
  displaySettings: Record<Area, DisplaySettings>;
  // Pinned notes (max 3)
  pinnedNoteIds: string[];
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
  setAutoSyncOnReconnect: (value: boolean) => void;
  setCardSize: (value: number) => void;
  // Per-area display setters
  setShowCardTitles: (area: Area, value: boolean) => void;
  setShowCardUrls: (area: Area, value: boolean) => void;
  setShowCardTags: (area: Area, value: boolean) => void;
  setCardPadding: (area: Area, value: number) => void;
  // Pinned notes management
  pinNote: (noteId: string) => boolean; // Returns false if already at max (3)
  unpinNote: (noteId: string) => void;
  reorderPinnedNotes: (noteIds: string[]) => void;
};

const defaultDisplaySettings: DisplaySettings = {
  showCardTitles: true,
  showCardUrls: true,
  showCardTags: true,
  cardPadding: 2, // Default SM padding
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
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
      autoSyncOnReconnect: true, // Default to auto-syncing when re-enabled
      cardSize: 3, // Default medium size
      // Initialize display settings for all areas
      displaySettings: {
        library: { ...defaultDisplaySettings },
        home: { ...defaultDisplaySettings },
        den: { ...defaultDisplaySettings },
        pawkit: { ...defaultDisplaySettings },
        notes: { ...defaultDisplaySettings },
      },
      // Initialize pinned notes as empty array
      pinnedNoteIds: [],
      setAutoFetchMetadata: (value) => set({ autoFetchMetadata: value }),
      setShowThumbnails: (value) => set({ showThumbnails: value }),
      setPreviewServiceUrl: (value) => set({ previewServiceUrl: value }),
      setTheme: (value) => set({ theme: value }),
      setAccentColor: (value) => set({ accentColor: value }),
      setNotifications: (value) => set({ notifications: value }),
      setAutoSave: (value) => set({ autoSave: value }),
      setCompactMode: (value) => set({ compactMode: value }),
      setShowPreviews: (value) => set({ showPreviews: value }),
      setServerSync: async (value) => {
        set({ serverSync: value });

        // Sync to database
        try {
          await fetch('/api/user', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serverSync: value }),
          });
        } catch (error) {
          console.error('[Settings] Failed to sync serverSync to database:', error);
        }
      },
      setAutoSyncOnReconnect: (value) => set({ autoSyncOnReconnect: value }),
      setCardSize: (value) => set({ cardSize: value }),
      setShowCardTitles: (area, value) =>
        set((state) => ({
          displaySettings: {
            ...state.displaySettings,
            [area]: { ...state.displaySettings[area], showCardTitles: value },
          },
        })),
      setShowCardUrls: (area, value) =>
        set((state) => ({
          displaySettings: {
            ...state.displaySettings,
            [area]: { ...state.displaySettings[area], showCardUrls: value },
          },
        })),
      setShowCardTags: (area, value) =>
        set((state) => ({
          displaySettings: {
            ...state.displaySettings,
            [area]: { ...state.displaySettings[area], showCardTags: value },
          },
        })),
      setCardPadding: (area, value) =>
        set((state) => ({
          displaySettings: {
            ...state.displaySettings,
            [area]: { ...state.displaySettings[area], cardPadding: value },
          },
        })),
      // Pinned notes management
      pinNote: (noteId) => {
        const currentPinned = get().pinnedNoteIds;

        // Check if already pinned
        if (currentPinned.includes(noteId)) {
          return true;
        }

        // Check if at max limit (3)
        if (currentPinned.length >= 3) {
          return false;
        }

        // Add to pinned notes
        set({ pinnedNoteIds: [...currentPinned, noteId] });
        return true;
      },
      unpinNote: (noteId) => {
        const currentPinned = get().pinnedNoteIds;
        set({ pinnedNoteIds: currentPinned.filter(id => id !== noteId) });
      },
      reorderPinnedNotes: (noteIds) => {
        // Validate that all IDs are currently pinned and max 3
        const currentPinned = get().pinnedNoteIds;
        const validIds = noteIds.filter(id => currentPinned.includes(id)).slice(0, 3);
        set({ pinnedNoteIds: validIds });
      },
    }),
    {
      name: "vbm-settings"
    }
  )
);
