"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const DEFAULT_PREVIEW_URL = process.env.NEXT_PUBLIC_PREVIEW_SERVICE_URL ?? "http://localhost:8787/preview?url={{url}}";

// Debounce helper
let syncTimeout: NodeJS.Timeout | null = null;
const SYNC_DEBOUNCE_MS = 1000; // Wait 1 second after last change before syncing

export type Theme = "dark" | "light" | "auto";
export type AccentColor = "purple" | "blue" | "green" | "red" | "orange";
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
        showSyncStatusInSidebar: state.showSyncStatusInSidebar,
        showKeyboardShortcutsInSidebar: state.showKeyboardShortcutsInSidebar,
        defaultView: state.defaultView,
        defaultSort: state.defaultSort
      })
    });
  } catch (error) {
    console.error('[Settings] Failed to sync to server:', error);
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
          console.error('[Settings] Failed to sync serverSync to database:', error);
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

        // Check if at max limit (3)
        if (currentPinned.length >= 3) {
          return false;
        }

        // Add to pinned notes
        set({ pinnedNoteIds: [...currentPinned, noteId] });
        debouncedSync(get());
        return true;
      },
      unpinNote: (noteId) => {
        const currentPinned = get().pinnedNoteIds;
        set({ pinnedNoteIds: currentPinned.filter(id => id !== noteId) });
        debouncedSync(get());
      },
      reorderPinnedNotes: (noteIds) => {
        // Validate that all IDs are currently pinned and max 3
        const currentPinned = get().pinnedNoteIds;
        const validIds = noteIds.filter(id => currentPinned.includes(id)).slice(0, 3);
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
        console.log('[Settings] Loading settings from server...');
        try {
          const response = await fetch('/api/user/settings');
          console.log('[Settings] API response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('[Settings] API response data:', data);

            if (data.success && data.data) {
              const settings = data.data;
              console.log('[Settings] Parsed settings:', {
                pinnedNoteIds: settings.pinnedNoteIds,
                recentHistory: settings.recentHistory,
                theme: settings.theme
              });

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

              console.log('[Settings] Merging settings with pinned notes:', settings.pinnedNoteIds);

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

              console.log('[Settings] Settings loaded successfully. Pinned notes count:', settings.pinnedNoteIds?.length || 0);
            } else {
              console.warn('[Settings] API response missing success or data:', data);
            }
          } else {
            console.error('[Settings] API response not OK:', response.status, response.statusText);
          }
        } catch (error) {
          console.error('[Settings] Failed to load from server:', error);
        }
      },

      // USER SWITCHING: Reset and reload settings for new user/workspace
      _switchUser: async (userId: string, workspaceId: string) => {
        console.log('[Settings] Switching user context', { userId, workspaceId });

        // Reset to defaults
        set({
          displayName: "",
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
              console.log('[Settings] Loaded from localStorage:', key);
            }
          }
        } catch (error) {
          console.error('[Settings] Error loading from localStorage:', error);
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
