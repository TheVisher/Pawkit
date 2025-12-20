'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useDataStore } from '@/lib/stores/data-store';

interface DashboardProviderProps {
  userId: string;
  userEmail: string;
  children: React.ReactNode;
}

export function DashboardProvider({ userId, userEmail, children }: DashboardProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  const initialize = useAuthStore((s) => s.initialize);
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const loadAll = useDataStore((s) => s.loadAll);

  useEffect(() => {
    async function init() {
      // Initialize auth state
      initialize({ id: userId, email: userEmail } as never, null);

      // Load workspaces
      await loadWorkspaces(userId);
    }

    init();
  }, [userId, userEmail, initialize, loadWorkspaces]);

  useEffect(() => {
    async function ensureWorkspace() {
      // Create default workspace if none exists
      if (workspaces.length === 0 && !isInitialized) {
        await createWorkspace('My Workspace', userId);
        setIsInitialized(true);
      } else if (workspaces.length > 0) {
        setIsInitialized(true);
      }
    }

    ensureWorkspace();
  }, [workspaces, userId, createWorkspace, isInitialized]);

  useEffect(() => {
    // Load data when workspace is available
    if (currentWorkspace) {
      loadAll(currentWorkspace.id);
    }
  }, [currentWorkspace, loadAll]);

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
