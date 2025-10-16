"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LayoutMode as LayoutModeType } from "@/lib/constants";

export type LayoutMode = LayoutModeType; // Re-export for convenience
export type ViewType = "library" | "notes" | "den" | "timeline" | "pawkits" | "home" | "favorites" | "trash";
export type SortBy = "createdAt" | "title" | "url" | "updatedAt" | "pawkit";
export type SortOrder = "asc" | "desc";

export type ViewSettings = {
  // Layout settings
  layout: LayoutMode;
  cardSize: number; // 1-5 scale
  
  // Display settings
  showTitles: boolean;
  showUrls: boolean;
  showTags: boolean;
  cardPadding: number; // 0-4 scale
  
  // Sorting settings
  sortBy: SortBy;
  sortOrder: SortOrder;
  
  // View-specific settings (flexible JSON)
  viewSpecific?: Record<string, any>;
};

export type ViewSettingsState = {
  // Settings per view
  settings: Record<ViewType, ViewSettings>;
  
  // Loading states
  isLoading: boolean;
  isSyncing: boolean;
  
  // Actions
  getSettings: (view: ViewType) => ViewSettings;
  updateSettings: (view: ViewType, updates: Partial<ViewSettings>) => Promise<void>;
  setLayout: (view: ViewType, layout: LayoutMode) => Promise<void>;
  setCardSize: (view: ViewType, size: number) => Promise<void>;
  setShowTitles: (view: ViewType, show: boolean) => Promise<void>;
  setShowUrls: (view: ViewType, show: boolean) => Promise<void>;
  setShowTags: (view: ViewType, show: boolean) => Promise<void>;
  setCardPadding: (view: ViewType, padding: number) => Promise<void>;
  setSortBy: (view: ViewType, sortBy: SortBy) => Promise<void>;
  setSortOrder: (view: ViewType, sortOrder: SortOrder) => Promise<void>;
  setViewSpecific: (view: ViewType, data: Record<string, any>) => Promise<void>;
  
  // Sync with server
  syncToServer: (view: ViewType) => Promise<void>;
  loadFromServer: () => Promise<void>;
};

const defaultSettings: ViewSettings = {
  layout: "grid",
  cardSize: 3,
  showTitles: true,
  showUrls: true,
  showTags: true,
  cardPadding: 2,
  sortBy: "createdAt",
  sortOrder: "desc",
  viewSpecific: {},
};

const createDefaultSettings = (): Record<ViewType, ViewSettings> => ({
  library: { ...defaultSettings },
  notes: { ...defaultSettings, sortBy: "createdAt" },
  den: { ...defaultSettings },
  timeline: { ...defaultSettings, layout: "grid" },
  pawkits: { ...defaultSettings },
  home: { ...defaultSettings },
  favorites: { ...defaultSettings },
  trash: { ...defaultSettings },
});

export const useViewSettingsStore = create<ViewSettingsState>()(
  persist(
    (set, get) => ({
      settings: createDefaultSettings(),
      isLoading: false,
      isSyncing: false,

      getSettings: (view) => {
        const settings = get().settings[view];
        return settings || defaultSettings;
      },

      updateSettings: async (view, updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [view]: {
              ...state.settings[view],
              ...updates,
            },
          },
        }));

        // Sync to server
        await get().syncToServer(view);
      },

      setLayout: async (view, layout) => {
        await get().updateSettings(view, { layout });
      },

      setCardSize: async (view, size) => {
        await get().updateSettings(view, { cardSize: size });
      },

      setShowTitles: async (view, show) => {
        await get().updateSettings(view, { showTitles: show });
      },

      setShowUrls: async (view, show) => {
        await get().updateSettings(view, { showUrls: show });
      },

      setShowTags: async (view, show) => {
        await get().updateSettings(view, { showTags: show });
      },

      setCardPadding: async (view, padding) => {
        await get().updateSettings(view, { cardPadding: padding });
      },

      setSortBy: async (view, sortBy) => {
        await get().updateSettings(view, { sortBy });
      },

      setSortOrder: async (view, sortOrder) => {
        await get().updateSettings(view, { sortOrder });
      },

      setViewSpecific: async (view, data) => {
        await get().updateSettings(view, { viewSpecific: data });
      },

      syncToServer: async (view) => {
        const state = get();
        const settings = state.settings[view];

        // Check if server sync is enabled
        const serverSyncEnabled = typeof window !== 'undefined' 
          ? localStorage.getItem('vbm-settings')
          : null;
        
        if (serverSyncEnabled) {
          const parsed = JSON.parse(serverSyncEnabled);
          if (parsed?.state?.serverSync === false) {
            // Local-only mode - don't sync to server
            return;
          }
        }

        set({ isSyncing: true });

        try {
          const response = await fetch('/api/user/view-settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              view,
              settings: {
                ...settings,
                viewSpecific: settings.viewSpecific ? JSON.stringify(settings.viewSpecific) : null,
              },
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            if (error.localOnly) {
              // Local-only mode is active on server - this is fine
              console.log('[ViewSettings] Local-only mode active, settings stored locally only');
            } else {
              throw new Error('Failed to sync settings to server');
            }
          }
        } catch (error) {
          console.error('[ViewSettings] Failed to sync to server:', error);
          // Don't throw - settings are still saved locally
        } finally {
          set({ isSyncing: false });
        }
      },

      loadFromServer: async () => {
        set({ isLoading: true });

        try {
          const response = await fetch('/api/user/view-settings');
          
          if (!response.ok) {
            throw new Error('Failed to load settings from server');
          }

          const data = await response.json();
          
          if (data.settings && Array.isArray(data.settings)) {
            const loadedSettings = createDefaultSettings();
            
            // Merge server settings with defaults
            data.settings.forEach((item: any) => {
              const view = item.view as ViewType;
              if (view in loadedSettings) {
                loadedSettings[view] = {
                  layout: item.layout as LayoutMode,
                  cardSize: item.cardSize,
                  showTitles: item.showTitles,
                  showUrls: item.showUrls,
                  showTags: item.showTags,
                  cardPadding: item.cardPadding,
                  sortBy: item.sortBy as SortBy,
                  sortOrder: item.sortOrder as SortOrder,
                  viewSpecific: item.viewSpecific ? JSON.parse(item.viewSpecific) : {},
                };
              }
            });

            set({ settings: loadedSettings });
          }
        } catch (error) {
          console.error('[ViewSettings] Failed to load from server:', error);
          // Keep local settings on error
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "view-settings-storage",
    }
  )
);

