/**
 * Workspace Store
 * Manages workspaces and current workspace selection
 */

import { create } from 'zustand';
import { db, createSyncMetadata, markModified } from '@/lib/db';
import type { LocalWorkspace } from '@/lib/db';
import { triggerSync } from '@/lib/services/sync-queue';

interface WorkspaceState {
  // State
  currentWorkspace: LocalWorkspace | null;
  workspaces: LocalWorkspace[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentWorkspace: (workspace: LocalWorkspace | null) => void;
  setWorkspaces: (workspaces: LocalWorkspace[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Async actions
  loadWorkspaces: (userId: string) => Promise<void>;
  createWorkspace: (name: string, userId: string, icon?: string) => Promise<LocalWorkspace>;
  updateWorkspace: (id: string, updates: Partial<LocalWorkspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  // Initial state
  currentWorkspace: null,
  workspaces: [],
  isLoading: false,
  error: null,

  // Setters
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Load all workspaces for a user
  loadWorkspaces: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const workspaces = await db.workspaces
        .where('userId')
        .equals(userId)
        .filter((w) => !w._deleted)
        .toArray();

      // Sort by default first, then by name
      workspaces.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return a.name.localeCompare(b.name);
      });

      set({ workspaces, isLoading: false });

      // Auto-select default workspace if none selected
      const { currentWorkspace } = get();
      if (!currentWorkspace && workspaces.length > 0) {
        const defaultWorkspace = workspaces.find((w) => w.isDefault) || workspaces[0];
        set({ currentWorkspace: defaultWorkspace });
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Create a new workspace
  createWorkspace: async (name, userId, icon) => {
    const { workspaces } = get();
    const isFirst = workspaces.length === 0;

    const workspace: LocalWorkspace = {
      id: crypto.randomUUID(),
      name,
      icon: icon,
      userId,
      isDefault: isFirst, // First workspace is default
      createdAt: new Date(),
      updatedAt: new Date(),
      ...createSyncMetadata(),
    };

    await db.workspaces.add(workspace);

    // Queue sync
    await db.syncQueue.add({
      entityType: 'workspace',
      entityId: workspace.id,
      operation: 'create',
      payload: {
        id: workspace.id,
        name: workspace.name,
        icon: workspace.icon,
        userId: workspace.userId,
        isDefault: workspace.isDefault,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      },
      retryCount: 0,
      createdAt: new Date(),
    });
    triggerSync();

    set({ workspaces: [...workspaces, workspace] });

    // If first workspace, set as current
    if (isFirst) {
      set({ currentWorkspace: workspace });
    }

    return workspace;
  },

  // Update a workspace
  updateWorkspace: async (id, updates) => {
    const { workspaces, currentWorkspace } = get();

    const existing = await db.workspaces.get(id);
    if (!existing) return;

    const updated = markModified({
      ...existing,
      ...updates,
      updatedAt: new Date(),
    });

    await db.workspaces.put(updated);

    // Queue sync
    await db.syncQueue.add({
      entityType: 'workspace',
      entityId: id,
      operation: 'update',
      payload: updates,
      retryCount: 0,
      createdAt: new Date(),
    });
    triggerSync();

    // Update state
    set({
      workspaces: workspaces.map((w) => (w.id === id ? updated : w)),
      currentWorkspace: currentWorkspace?.id === id ? updated : currentWorkspace,
    });
  },

  // Delete a workspace (soft delete)
  deleteWorkspace: async (id) => {
    const { workspaces, currentWorkspace } = get();

    const workspace = await db.workspaces.get(id);
    if (!workspace || workspace.isDefault) return; // Can't delete default

    const deleted = markModified({
      ...workspace,
      _deleted: true,
    });

    await db.workspaces.put(deleted);

    // Queue sync
    await db.syncQueue.add({
      entityType: 'workspace',
      entityId: id,
      operation: 'delete',
      retryCount: 0,
      createdAt: new Date(),
    });
    triggerSync();

    // Update state
    const remaining = workspaces.filter((w) => w.id !== id);
    set({ workspaces: remaining });

    // Switch to default if deleted current
    if (currentWorkspace?.id === id) {
      const defaultWorkspace = remaining.find((w) => w.isDefault) || remaining[0];
      set({ currentWorkspace: defaultWorkspace ?? null });
    }
  },

  // Switch to a different workspace
  switchWorkspace: async (workspaceId) => {
    const { workspaces } = get();
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (workspace) {
      set({ currentWorkspace: workspace });
    }
  },
}));

// =============================================================================
// SELECTORS
// =============================================================================

export const selectCurrentWorkspace = (state: WorkspaceState) => state.currentWorkspace;
export const selectWorkspaces = (state: WorkspaceState) => state.workspaces;
export const selectCurrentWorkspaceId = (state: WorkspaceState) => state.currentWorkspace?.id ?? null;

// =============================================================================
// HOOKS
// =============================================================================

export function useCurrentWorkspace() {
  return useWorkspaceStore(selectCurrentWorkspace);
}

export function useWorkspaces() {
  return useWorkspaceStore(selectWorkspaces);
}

export function useCurrentWorkspaceId() {
  return useWorkspaceStore(selectCurrentWorkspaceId);
}
