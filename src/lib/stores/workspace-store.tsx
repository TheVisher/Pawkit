'use client';

/**
 * Workspace Store (Convex)
 * Manages current workspace selection using Convex data.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useConvexWorkspace } from '@/lib/hooks/convex/use-convex-workspace';
import type { Workspace } from '@/lib/types/convex';
import type { Id } from '@/lib/types/convex';

interface WorkspaceContextValue {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  currentWorkspaceId: Id<'workspaces'> | null;

  setCurrentWorkspace: (workspace: Workspace | null) => void;
  switchWorkspace: (workspaceId: Id<'workspaces'>) => void;
  createWorkspace: (name: string, icon?: string) => Promise<Id<'workspaces'>>;
  updateWorkspace: (id: Id<'workspaces'>, updates: Partial<{ name: string; icon: string; isDefault: boolean }>) => Promise<void>;
  deleteWorkspace: (id: Id<'workspaces'>) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const {
    workspaces,
    defaultWorkspace,
    isLoading,
    createWorkspace: createWorkspaceMutation,
    updateWorkspace,
    deleteWorkspace,
  } = useConvexWorkspace();

  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<Id<'workspaces'> | null>(null);

  useEffect(() => {
    if (!currentWorkspaceId && defaultWorkspace) {
      setCurrentWorkspaceId(defaultWorkspace._id);
    }
  }, [currentWorkspaceId, defaultWorkspace]);

  const currentWorkspace = useMemo(() => {
    if (currentWorkspaceId) {
      const match = workspaces.find((w) => w._id === currentWorkspaceId);
      if (match) return match;
    }
    return defaultWorkspace ?? null;
  }, [workspaces, currentWorkspaceId, defaultWorkspace]);

  const value = useMemo<WorkspaceContextValue>(() => {
    return {
      currentWorkspace,
      workspaces,
      isLoading,
      currentWorkspaceId,
      setCurrentWorkspace: (workspace) => setCurrentWorkspaceId(workspace?._id ?? null),
      switchWorkspace: (workspaceId) => setCurrentWorkspaceId(workspaceId),
      createWorkspace: async (name, icon) => {
        return await createWorkspaceMutation({ name, icon });
      },
      updateWorkspace: async (id, updates) => {
        await updateWorkspace(id, updates);
      },
      deleteWorkspace: async (id) => {
        await deleteWorkspace(id);
      },
    };
  }, [
    currentWorkspace,
    workspaces,
    isLoading,
    currentWorkspaceId,
    createWorkspaceMutation,
    updateWorkspace,
    deleteWorkspace,
  ]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceStore<T>(selector: (state: WorkspaceContextValue) => T): T {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspaceStore must be used within a WorkspaceProvider');
  }
  return selector(ctx);
}

export function useCurrentWorkspace() {
  return useWorkspaceStore((s) => s.currentWorkspace);
}

export function useWorkspaces() {
  return useWorkspaceStore((s) => s.workspaces);
}

export function useCurrentWorkspaceId() {
  return useWorkspaceStore((s) => s.currentWorkspaceId);
}

export const selectCurrentWorkspace = (state: WorkspaceContextValue) => state.currentWorkspace;
export const selectWorkspaces = (state: WorkspaceContextValue) => state.workspaces;
export const selectCurrentWorkspaceId = (state: WorkspaceContextValue) => state.currentWorkspaceId;
