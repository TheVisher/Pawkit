'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useDataStore } from '@/lib/stores/data-store';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { RightSidebar } from '@/components/layout/right-sidebar';
import { TopBar } from '@/components/layout/top-bar';

interface DashboardShellProps {
  userId: string;
  userEmail: string;
  children: React.ReactNode;
}

export function DashboardShell({ userId, userEmail, children }: DashboardShellProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const initStarted = useRef(false);

  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const loadAll = useDataStore((s) => s.loadAll);

  useEffect(() => {
    async function init() {
      if (initStarted.current) return;
      initStarted.current = true;

      // Set user info in auth store
      setUser({ id: userId, email: userEmail } as never);
      setLoading(false);

      // Load workspaces from Dexie
      await loadWorkspaces(userId);
    }

    init();
  }, [userId, userEmail, setUser, setLoading, loadWorkspaces]);

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

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <LeftSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <RightSidebar />
    </div>
  );
}
