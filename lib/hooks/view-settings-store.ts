"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LayoutMode as LayoutModeType } from "@/lib/constants";

export type LayoutMode = LayoutModeType; // Re-export for convenience
export type ViewType = "library" | "notes" | "timeline" | "pawkits" | "home" | "favorites" | "trash" | "tags" | "den";
export type SortBy = "createdAt" | "title" | "url" | "updatedAt" | "pawkit";
export type SortOrder = "asc" | "desc";

export type ContentType = "url" | "md-note" | "text-note" | "file" | "image" | "pdf" | "document" | "audio" | "video" | "email" | "bookmark" | "highlight" | "folder" | "other";

export type ViewSettings = {
  // Layout settings
  layout: LayoutMode;
  cardSize: number; // 1-100 scale (smooth)
  cardSpacing: number; // 1-100 scale (gap between cards)

  // Display settings
  showLabels: boolean; // Show URL pills on bookmarks and title pills on notes
  showMetadata: boolean; // Show card info below (title, collections, etc.) for bookmarks
  showTags: boolean;
  showPreview: boolean; // Show plain text preview for notes
  cardPadding: number; // 1-100 scale (smooth)

  // Filtering settings
  contentTypeFilter: ContentType[]; // Array of content types to show (empty = show all)

  // Sorting settings
  sortBy: SortBy;
  sortOrder: SortOrder;

  // View-specific settings (flexible JSON)
  viewSpecific?: Record<string, unknown>;
};

// Server response shape for view settings API
interface ServerViewSettingsItem {
  view: string;
  layout: string;
  cardSize: number;
  cardSpacing?: number;
  showLabels?: boolean;
  showTitles?: boolean;  // Legacy field
  showUrls?: boolean;    // Legacy field
  showMetadata?: boolean;
  showTags: boolean;
  showPreview?: boolean;
  cardPadding: number;
  contentTypeFilter?: ContentType[];
  sortBy: string;
  sortOrder: string;
  viewSpecific?: string; // JSON string
}

// ViewKey can be a static ViewType or a dynamic key like "pawkit-my-collection"
export type ViewKey = ViewType | `pawkit-${string}`;

export type ViewSettingsState = {
  // Settings per view (supports both static ViewType and dynamic pawkit keys)
  settings: Record<string, ViewSettings>;

  // Loading states
  isLoading: boolean;
  isSyncing: boolean;

  // Actions - accept ViewKey (ViewType | pawkit-slug) for flexibility
  getSettings: (view: ViewKey) => ViewSettings;
  updateSettings: (view: ViewKey, updates: Partial<ViewSettings>) => Promise<void>;
  setLayout: (view: ViewKey, layout: LayoutMode) => Promise<void>;
  setCardSize: (view: ViewKey, size: number) => Promise<void>;
  setCardSpacing: (view: ViewKey, spacing: number) => Promise<void>;
  setShowLabels: (view: ViewKey, show: boolean) => Promise<void>;
  setShowMetadata: (view: ViewKey, show: boolean) => Promise<void>;
  setShowTags: (view: ViewKey, show: boolean) => Promise<void>;
  setShowPreview: (view: ViewKey, show: boolean) => Promise<void>;
  setCardPadding: (view: ViewKey, padding: number) => Promise<void>;
  setContentTypeFilter: (view: ViewKey, contentTypes: ContentType[]) => Promise<void>;
  setSortBy: (view: ViewKey, sortBy: SortBy) => Promise<void>;
  setSortOrder: (view: ViewKey, sortOrder: SortOrder) => Promise<void>;
  setViewSpecific: (view: ViewKey, data: Record<string, unknown>) => Promise<void>;

  // Sync with server
  syncToServer: (view: ViewKey) => Promise<void>;
  loadFromServer: () => Promise<void>;
};

const defaultSettings: ViewSettings = {
  layout: "grid",
  cardSize: 50, // Middle of 1-100 scale (was 3 on 1-5 scale)
  cardSpacing: 16, // Default gap between cards
  showLabels: true, // Show URL pills and note title pills
  showMetadata: true, // Show card info below
  showTags: true,
  showPreview: true, // Show note previews by default
  cardPadding: 40, // Middle of 1-100 scale (was 2 on 0-4 scale)
  contentTypeFilter: [], // Empty array = show all content types
  sortBy: "createdAt",
  sortOrder: "desc",
  viewSpecific: {},
};

const createDefaultSettings = (): Record<string, ViewSettings> => ({
  library: { ...defaultSettings },
  notes: { ...defaultSettings, sortBy: "createdAt" },
  timeline: { ...defaultSettings, layout: "grid" },
  pawkits: { ...defaultSettings },
  home: { ...defaultSettings },
  favorites: { ...defaultSettings },
  trash: { ...defaultSettings },
  tags: { ...defaultSettings },
  den: { ...defaultSettings },
});

export const useViewSettingsStore = create<ViewSettingsState>()(
  persist(
    (set, get) => ({
      settings: createDefaultSettings(),
      isLoading: false,
      isSyncing: false,

      getSettings: (view) => {
        const settings = get().settings[view];
        if (!settings) return defaultSettings;

        // Migration: Convert old contentTypeFilter string to array
        if (typeof settings.contentTypeFilter === 'string' || settings.contentTypeFilter === undefined) {
          settings.contentTypeFilter = [];
        }

        return settings;
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

      setShowLabels: async (view, show) => {
        await get().updateSettings(view, { showLabels: show });
      },

      setShowMetadata: async (view, show) => {
        await get().updateSettings(view, { showMetadata: show });
      },

      setShowTags: async (view, show) => {
        await get().updateSettings(view, { showTags: show });
      },

      setCardPadding: async (view, padding) => {
        await get().updateSettings(view, { cardPadding: padding });
      },

      setCardSpacing: async (view, spacing) => {
        await get().updateSettings(view, { cardSpacing: spacing });
      },

      setShowPreview: async (view, show) => {
        await get().updateSettings(view, { showPreview: show });
      },

      setContentTypeFilter: async (view, contentTypes) => {
        await get().updateSettings(view, { contentTypeFilter: contentTypes });
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
          // Map client fields to server fields:
          // 1. Field names: showLabels/showMetadata (client) → showUrls/showTitles (server)
          // 2. Value scales: cardSize 1-100 (client) → 1-5 (server), cardPadding 1-100 (client) → 0-4 (server)

          // Scale cardSize from 1-100 to 1-5
          const scaledCardSize = Math.round(((settings.cardSize - 1) / 99) * 4 + 1);
          // Scale cardPadding from 1-100 to 0-4
          const scaledCardPadding = Math.round((settings.cardPadding / 100) * 4);

          const apiSettings = {
            layout: settings.layout,
            cardSize: scaledCardSize,
            showTitles: settings.showMetadata,  // showMetadata -> showTitles (server field name)
            showUrls: settings.showLabels,      // showLabels -> showUrls (server field name)
            showTags: settings.showTags,
            cardPadding: scaledCardPadding,
            sortBy: settings.sortBy,
            sortOrder: settings.sortOrder,
            viewSpecific: settings.viewSpecific ? JSON.stringify(settings.viewSpecific) : null,
          };

          const response = await fetch('/api/user/view-settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              view,
              settings: apiSettings,
            }),
          });

          if (!response.ok) {
            try {
              const error = await response.json();
              if (error.data?.localOnly) {
                // Local-only mode is active on server - this is fine, settings stored locally only
              } else {
                console.warn('[ViewSettings] Failed to sync to server (non-critical):', response.status);
              }
            } catch {
              console.warn('[ViewSettings] Failed to sync to server (non-critical):', response.status);
            }
          }
        } catch (error) {
          console.warn('[ViewSettings] Failed to sync to server (non-critical):', error);
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
            console.warn('[ViewSettings] Failed to load from server (non-critical):', response.status);
            set({ isLoading: false });
            return;
          }

          const data = await response.json();

          if (data.settings && Array.isArray(data.settings)) {
            // Start with defaults for static views
            const loadedSettings: Record<string, ViewSettings> = createDefaultSettings();

            // Merge server settings (both static and pawkit-specific)
            (data.settings as ServerViewSettingsItem[]).forEach((item) => {
              const view = item.view;

              // Scale server values (1-5, 0-4) to client values (1-100)
              const scaledCardSize = Math.round(((item.cardSize - 1) / 4) * 99 + 1);
              const scaledCardPadding = Math.round((item.cardPadding / 4) * 100);

              // Load all views - both static ViewType and dynamic pawkit-* keys
              loadedSettings[view] = {
                layout: item.layout as LayoutMode,
                cardSize: scaledCardSize,
                cardSpacing: item.cardSpacing || 16,
                showLabels: item.showLabels ?? (item.showTitles || item.showUrls) ?? true, // Migrate old settings
                showMetadata: item.showMetadata ?? item.showTitles ?? true, // Migrate old settings
                showTags: item.showTags,
                showPreview: item.showPreview ?? true,
                cardPadding: scaledCardPadding,
                contentTypeFilter: item.contentTypeFilter || [],
                sortBy: item.sortBy as SortBy,
                sortOrder: item.sortOrder as SortOrder,
                viewSpecific: item.viewSpecific ? JSON.parse(item.viewSpecific) : {},
              };
            });

            set({ settings: loadedSettings });
          }
        } catch (error) {
          console.warn('[ViewSettings] Failed to load from server (non-critical):', error);
          // Keep local settings on error - settings are still available from localStorage
        } finally {
          set({ isLoading: false });
        }
      },

      // USER SWITCHING: Reset and reload view settings for new user/workspace
      _switchUser: async (userId: string, workspaceId: string) => {

        // Reset to defaults
        set({
          settings: createDefaultSettings(),
          isLoading: false,
        });

        // Try to load from user-specific localStorage
        const key = `view-settings-storage-${userId}-${workspaceId}`;
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.state && parsed.state.settings) {
              set({ settings: parsed.state.settings });
            }
          }
        } catch (error) {
        }

        // Load from server
        await get().loadFromServer();
      },
    }),
    {
      name: "view-settings-storage",
    }
  )
);

