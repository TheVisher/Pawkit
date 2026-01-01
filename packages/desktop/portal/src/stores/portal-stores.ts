/**
 * Portal-specific stores
 * Read from localStorage to share state with main app without React conflicts
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =============================================================================
// TYPES (copied from main app to avoid imports)
// =============================================================================

export interface LocalCard {
  id: string;
  workspaceId: string;
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  domain?: string;
  content?: string;
  type: 'url' | 'md-note' | 'quick-note';
  tags?: string[];
  collections?: string[];
  pinned?: boolean;
  isRead?: boolean;
  readProgress?: number;
  scheduledDate?: string | null;
  createdAt: string;
  updatedAt: string;
  _synced: boolean;
  _lastModified: string;
  _deleted: boolean;
}

export interface LocalCollection {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  _synced: boolean;
  _lastModified: string;
  _deleted: boolean;
}

// =============================================================================
// SETTINGS STORE - reads from localStorage
// =============================================================================

interface PortalSettingsState {
  theme: 'light' | 'dark' | 'system';
  accentHue: number;
  accentSaturation: number;
  accentLightness: number;

  // Hydration
  hydrate: () => void;
}

// Read from main app's localStorage
function getMainAppSettings() {
  try {
    const stored = localStorage.getItem('pawkit-settings');
    if (stored) {
      const data = JSON.parse(stored);
      return data.state || {};
    }
  } catch (e) {
    console.warn('Failed to read pawkit-settings:', e);
  }
  return {};
}

export const usePortalSettingsStore = create<PortalSettingsState>()((set) => ({
  theme: 'dark',
  accentHue: 270,
  accentSaturation: 60,
  accentLightness: 55,

  hydrate: () => {
    const settings = getMainAppSettings();
    set({
      theme: settings.theme || 'dark',
      accentHue: settings.accentHue ?? 270,
      accentSaturation: settings.accentSaturation ?? 60,
      accentLightness: settings.accentLightness ?? 55,
    });
  },
}));

// =============================================================================
// DATA STORE - reads from IndexedDB via Dexie
// =============================================================================

interface PortalDataState {
  cards: LocalCard[];
  collections: LocalCollection[];
  isLoading: boolean;
  _workspaceId: string | null;

  // Actions
  setCards: (cards: LocalCard[]) => void;
  setCollections: (collections: LocalCollection[]) => void;
  loadFromIndexedDB: (workspaceId: string) => Promise<void>;
  refresh: () => Promise<void>;
  setupSyncListener: () => () => void;
}

export const usePortalDataStore = create<PortalDataState>()((set, get) => ({
  cards: [],
  collections: [],
  isLoading: true,
  _workspaceId: null,

  setCards: (cards) => set({ cards }),
  setCollections: (collections) => set({ collections }),

  loadFromIndexedDB: async (workspaceId: string) => {
    set({ isLoading: true, _workspaceId: workspaceId });

    try {
      // Import Dexie and create local database instance
      const Dexie = (await import('dexie')).default;

      // Open the same database as main app - name is 'pawkit'
      const db = new Dexie('pawkit');
      db.version(1).stores({
        workspaces: 'id, userId, [userId+isDefault]',
        cards: 'id, workspaceId',
        collections: 'id, workspaceId',
        calendarEvents: 'id, workspaceId',
        todos: 'id, workspaceId',
      });

      const [cards, collections] = await Promise.all([
        db.table('cards').where('workspaceId').equals(workspaceId).toArray(),
        db.table('collections').where('workspaceId').equals(workspaceId).toArray(),
      ]);

      console.log('[Portal] Loaded from IndexedDB:', { cards: cards.length, collections: collections.length });

      set({
        cards: cards as LocalCard[],
        collections: collections as LocalCollection[],
        isLoading: false,
      });
    } catch (e) {
      console.error('Failed to load from IndexedDB:', e);
      set({ isLoading: false });
    }
  },

  // Refresh data from IndexedDB
  refresh: async () => {
    const workspaceId = get()._workspaceId;
    if (!workspaceId) return;

    console.log('[Portal] Refreshing data...');
    await get().loadFromIndexedDB(workspaceId);
  },

  // Listen for sync events from main app via BroadcastChannel
  setupSyncListener: () => {
    const channel = new BroadcastChannel('pawkit-sync');

    const handleMessage = (event: MessageEvent) => {
      console.log('[Portal] Received sync message:', event.data);
      // Refresh data when main app broadcasts a sync event
      const type = event.data?.type;
      if (type === 'sync-complete' || type === 'data-changed') {
        get().refresh();
      }
    };

    channel.addEventListener('message', handleMessage);
    console.log('[Portal] BroadcastChannel listener set up');

    // Return cleanup function
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  },
}));

// =============================================================================
// WORKSPACE STORE - loads from IndexedDB
// =============================================================================

interface PortalWorkspaceState {
  currentWorkspace: { id: string; name: string } | null;
  hydrate: () => Promise<void>;
}

export const usePortalWorkspaceStore = create<PortalWorkspaceState>()((set) => ({
  currentWorkspace: null,

  hydrate: async () => {
    try {
      // Import Dexie and load workspace from IndexedDB
      const Dexie = (await import('dexie')).default;

      const db = new Dexie('pawkit');
      db.version(1).stores({
        workspaces: 'id, userId, [userId+isDefault]',
        cards: 'id, workspaceId',
        collections: 'id, workspaceId',
      });

      // Get any workspace (first one found)
      const workspaces = await db.table('workspaces').toArray();
      console.log('[Portal] Found workspaces:', workspaces.length);

      if (workspaces.length > 0) {
        // Prefer default workspace, otherwise first one
        const defaultWs = workspaces.find((w: { isDefault?: boolean }) => w.isDefault);
        const workspace = defaultWs || workspaces[0];
        console.log('[Portal] Using workspace:', workspace.id, workspace.name);
        set({ currentWorkspace: { id: workspace.id, name: workspace.name } });
      }
    } catch (e) {
      console.error('Failed to load workspace from IndexedDB:', e);
    }
  },
}));
