"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Default to empty string in production (localhost URL only works in dev)
const DEFAULT_PREVIEW_URL = process.env.NODE_ENV === 'production'
  ? ''
  : (process.env.NEXT_PUBLIC_PREVIEW_SERVICE_URL ?? "http://localhost:8787/preview?url={{url}}");

// Debounce helper
let syncTimeout: NodeJS.Timeout | null = null;
const SYNC_DEBOUNCE_MS = 1000; // Wait 1 second after last change before syncing

export type Theme = "dark" | "light" | "auto";
export type AccentColor = "purple" | "blue" | "green" | "red" | "orange";
export type UiStyle = "modern" | "classic";  // modern = neutral, classic = purple-tinted
export type Area = "library" | "home" | "den" | "pawkit" | "notes";

// Recently viewed item type
export interface RecentItem {
  id: string;
  title: string;
  type: "card" | "note";
  url?: string;
  image?: string;
  timestamp: number;
}

export type DisplaySettings = {
  showCardTitles: boolean;
  showCardUrls: boolean;
  showCardTags: boolean;
  cardPadding: number; // 0-4 scale (None, XS, SM, MD, LG)
};

// Helper function to sync settings to server
async function syncSettingsToServer(state: SettingsState) {
  // Only sync if serverSync is enabled
  if (!state.serverSync) {
    return;
  }

  try {
    await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        autoFetchMetadata: state.autoFetchMetadata,
        showThumbnails: state.showThumbnails,
        previewServiceUrl: state.previewServiceUrl,
        theme: state.theme,
        accentColor: state.accentColor,
        notifications: state.notifications,
        autoSave: state.autoSave,
        compactMode: state.compactMode,
        showPreviews: state.showPreviews,
        autoSyncOnReconnect: state.autoSyncOnReconnect,
        cardSize: state.cardSize,
        displaySettings: state.displaySettings,
        pinnedNoteIds: state.pinnedNoteIds,
        recentHistory: state.recentHistory,
        // Note: showSyncStatusInSidebar, showKeyboardShortcutsInSidebar,
        // defaultView, defaultSort are localStorage-only and not synced to server
      })
    });
  } catch (error) {
    // Silently fail - settings will sync on next attempt
  }
}

// Debounced sync function
function debouncedSync(state: SettingsState) {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  syncTimeout = setTimeout(() => {
    syncSettingsToServer(state);
  }, SYNC_DEBOUNCE_MS);
}

export type SettingsState = {
  displayName: string;
  autoFetchMetadata: boolean;
  showThumbnails: boolean;
  previewServiceUrl: string;
  theme: Theme;
  accentColor: AccentColor;
  uiStyle: UiStyle;  // modern = neutral surfaces, classic = purple-tinted
  notifications: boolean;
  autoSave: boolean;
  compactMode: boolean;
  showPreviews: boolean;
  serverSync: boolean;
  autoSyncOnReconnect: boolean; // Auto-sync pending changes when re-enabling server sync
  cardSize: number; // 1-5 scale
  // Per-area display settings
  displaySettings: Record<Area, DisplaySettings>;
  // Pinned notes (max 10)
  pinnedNoteIds: string[];
  // Recently viewed items (max 10)
  recentHistory: RecentItem[];
  // Sidebar panel visibility
  showSyncStatusInSidebar: boolean;
  showKeyboardShortcutsInSidebar: boolean;
  // Default fallback preferences (used when no remembered state)
  defaultView: "grid" | "masonry" | "list";
  defaultSort: "dateAdded" | "recentlyModified" | "title" | "domain";
  setDisplayName: (value: string) => void;
  setAutoFetchMetadata: (value: boolean) => void;
  setShowThumbnails: (value: boolean) => void;
  setPreviewServiceUrl: (value: string) => void;
  setTheme: (value: Theme) => void;
  setAccentColor: (value: AccentColor) => void;
  setUiStyle: (value: UiStyle) => void;
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
  pinNote: (noteId: string) => boolean; // Returns false if already at max (10)
  unpinNote: (noteId: string) => void;
  reorderPinnedNotes: (noteIds: string[]) => void;
  // Recent history management
  addToHistory: (item: Omit<RecentItem, "timestamp">) => void;
  clearHistory: () => void;
  // Sidebar panel visibility setters
  setShowSyncStatusInSidebar: (value: boolean) => void;
  setShowKeyboardShortcutsInSidebar: (value: boolean) => void;
  // Default preferences setters
  setDefaultView: (value: "grid" | "masonry" | "list") => void;
  setDefaultSort: (value: "dateAdded" | "recentlyModified" | "title" | "domain") => void;
  // Server sync
  loadFromServer: () => Promise<void>;
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
      displayName: "",
      autoFetchMetadata: true,
      showThumbnails: true,
      previewServiceUrl: DEFAULT_PREVIEW_URL,
      theme: "dark",
      accentColor: "purple",
      uiStyle: "modern",  // Default to new neutral design
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
      // Initialize recent history as empty array
      recentHistory: [],
      // Initialize sidebar panel visibility
      showSyncStatusInSidebar: true,
      showKeyboardShortcutsInSidebar: true,
      // Initialize default preferences
      defaultView: "masonry",
      defaultSort: "dateAdded",
      setDisplayName: (value) => {
        set({ displayName: value });
        // Don't sync display name to server - it's local only
      },
      setAutoFetchMetadata: (value) => {
        set({ autoFetchMetadata: value });
        debouncedSync(get());
      },
      setShowThumbnails: (value) => {
        set({ showThumbnails: value });
        debouncedSync(get());
      },
      setPreviewServiceUrl: (value) => {
        set({ previewServiceUrl: value });
        debouncedSync(get());
      },
      setTheme: (value) => {
        set({ theme: value });
        debouncedSync(get());
      },
      setAccentColor: (value) => {
        set({ accentColor: value });
        debouncedSync(get());
      },
      setUiStyle: (value) => {
        set({ uiStyle: value });
        debouncedSync(get());
      },
      setNotifications: (value) => {
        set({ notifications: value });
        debouncedSync(get());
      },
      setAutoSave: (value) => {
        set({ autoSave: value });
        debouncedSync(get());
      },
      setCompactMode: (value) => {
        set({ compactMode: value });
        debouncedSync(get());
      },
      setShowPreviews: (value) => {
        set({ showPreviews: value });
        debouncedSync(get());
      },
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
        }
      },
      setAutoSyncOnReconnect: (value) => {
        set({ autoSyncOnReconnect: value });
        debouncedSync(get());
      },
      setCardSize: (value) => {
        set({ cardSize: value });
        debouncedSync(get());
      },
      setShowCardTitles: (area, value) => {
        set((state) => ({
          displaySettings: {
            ...state.displaySettings,
            [area]: { ...state.displaySettings[area], showCardTitles: value },
          },
        }));
        debouncedSync(get());
      },
      setShowCardUrls: (area, value) => {
        set((state) => ({
          displaySettings: {
            ...state.displaySettings,
            [area]: { ...state.displaySettings[area], showCardUrls: value },
          },
        }));
        debouncedSync(get());
      },
      setShowCardTags: (area, value) => {
        set((state) => ({
          displaySettings: {
            ...state.displaySettings,
            [area]: { ...state.displaySettings[area], showCardTags: value },
          },
        }));
        debouncedSync(get());
      },
      setCardPadding: (area, value) => {
        set((state) => ({
          displaySettings: {
            ...state.displaySettings,
            [area]: { ...state.displaySettings[area], cardPadding: value },
          },
        }));
        debouncedSync(get());
      },
      // Pinned notes management
      pinNote: (noteId) => {
        const currentPinned = get().pinnedNoteIds;

        // Check if already pinned
        if (currentPinned.includes(noteId)) {
          return true;
        }

        // Check if at max limit (10)
        if (currentPinned.length >= 10) {
          return false;
        }

        // Add to pinned notes
        const newPinned = [...currentPinned, noteId];
        set({ pinnedNoteIds: newPinned });
        debouncedSync(get());
        return true;
      },
      unpinNote: (noteId) => {
        const currentPinned = get().pinnedNoteIds;
        set({ pinnedNoteIds: currentPinned.filter(id => id !== noteId) });
        debouncedSync(get());
      },
      reorderPinnedNotes: (noteIds) => {
        // Validate that all IDs are currently pinned and max 10
        const currentPinned = get().pinnedNoteIds;
        const validIds = noteIds.filter(id => currentPinned.includes(id)).slice(0, 10);
        set({ pinnedNoteIds: validIds });
        debouncedSync(get());
      },
      // Recent history management
      addToHistory: (item) => {
        const currentHistory = get().recentHistory;

        // Create new item with timestamp
        const newItem: RecentItem = {
          ...item,
          timestamp: Date.now(),
        };

        // Remove if already exists (to move to front)
        const filtered = currentHistory.filter((i) => i.id !== item.id);

        // Add to front and limit to 10 items
        const updated = [newItem, ...filtered].slice(0, 10);

        set({ recentHistory: updated });
        debouncedSync(get());
      },
      clearHistory: () => {
        set({ recentHistory: [] });
        debouncedSync(get());
      },
      // Sidebar panel visibility setters
      setShowSyncStatusInSidebar: (value) => {
        set({ showSyncStatusInSidebar: value });
        debouncedSync(get());
      },
      setShowKeyboardShortcutsInSidebar: (value) => {
        set({ showKeyboardShortcutsInSidebar: value });
        debouncedSync(get());
      },
      // Default preferences setters
      setDefaultView: (value) => {
        set({ defaultView: value });
        debouncedSync(get());
      },
      setDefaultSort: (value) => {
        set({ defaultSort: value });
        debouncedSync(get());
      },
      // Load settings from server
      loadFromServer: async () => {
        try {
          const response = await fetch('/api/user/settings');

          if (response.ok) {
            const data = await response.json();

            // Handle both wrapped ({ success: true, data: {...} }) and raw ({ id, userId, ... }) responses
            const settings = data.success && data.data ? data.data : data;

            // Validate we have settings data
            if (!settings || !settings.userId) {
              return;
            }

            // Merge recent history: combine local + server, dedupe by timestamp
            const localHistory = get().recentHistory;
            const serverHistory = settings.recentHistory || [];

            const mergedHistory = [...localHistory, ...serverHistory]
              .reduce((acc, item) => {
                const existing = acc.find((i: RecentItem) => i.id === item.id);
                if (!existing || item.timestamp > existing.timestamp) {
                  return [...acc.filter((i: RecentItem) => i.id !== item.id), item];
                }
                return acc;
              }, [] as RecentItem[])
              .sort((a: RecentItem, b: RecentItem) => b.timestamp - a.timestamp)
              .slice(0, 10);

            set({
              autoFetchMetadata: settings.autoFetchMetadata,
              showThumbnails: settings.showThumbnails,
              previewServiceUrl: settings.previewServiceUrl,
              theme: settings.theme,
              accentColor: settings.accentColor,
              notifications: settings.notifications,
              autoSave: settings.autoSave,
              compactMode: settings.compactMode,
              showPreviews: settings.showPreviews,
              autoSyncOnReconnect: settings.autoSyncOnReconnect,
              cardSize: settings.cardSize,
              displaySettings: settings.displaySettings,
              pinnedNoteIds: settings.pinnedNoteIds,
              recentHistory: mergedHistory,
              showSyncStatusInSidebar: settings.showSyncStatusInSidebar ?? true,
              showKeyboardShortcutsInSidebar: settings.showKeyboardShortcutsInSidebar ?? true,
              defaultView: settings.defaultView ?? "masonry",
              defaultSort: settings.defaultSort ?? "dateAdded"
            });
          }
        } catch (error) {
          // Silently fail - settings will load on next attempt
        }
      },

      // USER SWITCHING: Reset and reload settings for new user/workspace
      _switchUser: async (userId: string, workspaceId: string) => {

        // Reset to defaults
        set({
          displayName: "",
          autoFetchMetadata: true,
          showThumbnails: true,
          previewServiceUrl: DEFAULT_PREVIEW_URL,
          theme: "dark",
          accentColor: "purple",
          uiStyle: "modern",
          notifications: true,
          autoSave: true,
          compactMode: false,
          showPreviews: true,
          serverSync: true,
          autoSyncOnReconnect: true,
          cardSize: 3,
          displaySettings: {
            library: { ...defaultDisplaySettings },
            home: { ...defaultDisplaySettings },
            den: { ...defaultDisplaySettings },
            pawkit: { ...defaultDisplaySettings },
            notes: { ...defaultDisplaySettings },
          },
          pinnedNoteIds: [],
          recentHistory: [],
          showSyncStatusInSidebar: true,
          showKeyboardShortcutsInSidebar: true,
          defaultView: "masonry",
          defaultSort: "dateAdded",
        });

        // Try to load from user-specific localStorage
        const key = `vbm-settings-${userId}-${workspaceId}`;
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.state) {
              set(parsed.state);
            }
          }
        } catch (error) {
        }

        // Load from server
        await get().loadFromServer();
      },
    }),
    {
      name: "vbm-settings"
    }
  )
);
