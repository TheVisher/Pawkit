'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useDataStore } from '@/lib/stores/data-store';
import { useLayoutAnchors } from '@/lib/stores/ui-store';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { RightSidebar } from '@/components/layout/right-sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { AddCardModal } from '@/components/modals/add-card-modal';
import { cn } from '@/lib/utils';

interface DashboardShellProps {
  userId: string;
  userEmail: string;
  children: React.ReactNode;
}

export function DashboardShell({ userId, userEmail, children }: DashboardShellProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const initStarted = useRef(false);

  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const loadAll = useDataStore((s) => s.loadAll);

  // Layout anchor state for visual merging
  const { leftOpen, rightOpen, leftAnchored, rightAnchored } = useLayoutAnchors();

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Use defaults during SSR to prevent hydration mismatch
  // Defaults: left open, right closed, both floating (not anchored)
  const isLeftOpen = mounted ? leftOpen : true;
  const isRightOpen = mounted ? rightOpen : false;
  const isLeftAnchored = mounted ? leftAnchored : false;
  const isRightAnchored = mounted ? rightAnchored : false;

  // Compute anchor visual states
  // When anchored, panels "merge" by removing gap and shared border radius
  const leftMerged = isLeftOpen && isLeftAnchored;
  const rightMerged = isRightOpen && isRightAnchored;

  if (!isInitialized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-base text-text-primary">
        <div className="text-text-muted">Loading...</div>
      </div>
    );
  }

  // Panel base styles - V1 Glass mode (transparent + blur)
  const panelBase = cn(
    'flex-col overflow-hidden',
    'bg-[hsl(0_0%_12%/0.70)]',
    'backdrop-blur-[12px] backdrop-saturate-[1.2]',
    'border border-white/10',
    'shadow-[0_4px_8px_hsl(0_0%_0%/0.5),0_8px_16px_hsl(0_0%_0%/0.3),0_0_0_1px_hsl(0_0%_100%/0.05)]'
  );

  return (
    <div className="h-screen w-screen bg-bg-base text-text-primary">
      {/* Mobile bottom nav - only shows < 768px */}
      <MobileNav className="md:hidden fixed bottom-0 left-0 right-0 z-50" />

      {/* Main layout with padding to show splotchy purple gradient background */}
      <div
        className="h-full p-0 md:p-3 lg:p-4 pb-16 md:pb-3 lg:pb-4"
        style={{
          backgroundColor: '#0a0814',
          backgroundImage: `
            radial-gradient(1200px circle at 12% 0%, rgba(122, 92, 250, 0.28), rgba(10, 8, 20, 0)),
            radial-gradient(900px circle at 88% 8%, rgba(122, 92, 250, 0.18), rgba(10, 8, 20, 0)),
            radial-gradient(600px circle at 25% 90%, rgba(122, 92, 250, 0.14), rgba(10, 8, 20, 0)),
            linear-gradient(160deg, rgba(10, 8, 20, 0.96), rgba(5, 5, 12, 1))
          `,
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Inner flex container for the 3 floating panels */}
        <div className="h-full flex">

          {/* LEFT SIDEBAR - Floating panel, hidden on mobile/tablet */}
          {isLeftOpen && (
            <aside
              className={cn(
                'hidden lg:flex w-[325px] shrink-0',
                panelBase,
                // Full rounded when floating, partial when merged
                leftMerged
                  ? 'rounded-l-2xl rounded-r-none border-r-0'
                  : 'rounded-2xl mr-4'
              )}
            >
              <LeftSidebar />
            </aside>
          )}

          {/* CENTER - Floating panel, full width on mobile */}
          <main
            className={cn(
              'flex-1 min-w-0 flex flex-col',
              panelBase,
              // Dynamic rounding based on anchor state
              leftMerged && rightMerged
                ? 'rounded-none border-l-0 border-r-0'
                : leftMerged && !rightMerged
                  ? 'rounded-l-none rounded-r-2xl border-l-0'
                  : !leftMerged && rightMerged
                    ? 'rounded-l-2xl rounded-r-none border-r-0'
                    : 'rounded-2xl',
              // Gap to right sidebar when right is open but not merged
              isRightOpen && !rightMerged && 'mr-4'
            )}
          >
            <TopBar />
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </main>

          {/* RIGHT SIDEBAR - Floating panel, hidden on mobile/tablet */}
          {isRightOpen && (
            <aside
              className={cn(
                'hidden xl:flex w-[325px] shrink-0',
                panelBase,
                // Full rounded when floating, partial when merged
                rightMerged
                  ? 'rounded-r-2xl rounded-l-none border-l-0'
                  : 'rounded-2xl'
              )}
            >
              <RightSidebar />
            </aside>
          )}

        </div>
      </div>

      <AddCardModal />
    </div>
  );
}
