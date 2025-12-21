'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useDataStore } from '@/lib/stores/data-store';
import { useSync } from '@/lib/hooks/use-sync';
import { useLayoutAnchors } from '@/lib/stores/ui-store';
import { useLeftSidebar, useRightSidebar } from '@/lib/stores/ui-store';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { RightSidebar } from '@/components/layout/right-sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { AddCardModal } from '@/components/modals/add-card-modal';
import { CardDetailModal } from '@/components/modals/card-detail-modal';
import { Omnibar } from '@/components/layout/omnibar';
import { ToastStack } from '@/components/layout/toast-stack';
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
  const workspaceEnsured = useRef(false); // Prevents double workspace creation in Strict Mode

  // Theme detection for background gradient
  const { resolvedTheme } = useTheme();

  // Hover state for revealing closed sidebars
  const [leftHovered, setLeftHovered] = useState(false);
  const [rightHovered, setRightHovered] = useState(false);

  // Timeout refs for delayed hide (gives user time to move mouse onto panel)
  const leftHideTimeout = useRef<NodeJS.Timeout | null>(null);
  const rightHideTimeout = useRef<NodeJS.Timeout | null>(null);

  // Ref for the main container to attach pointer move listener
  const containerRef = useRef<HTMLDivElement>(null);

  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const setWorkspaces = useWorkspaceStore((s) => s.setWorkspaces);
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const workspacesLoading = useWorkspaceStore((s) => s.isLoading);
  const loadAll = useDataStore((s) => s.loadAll);

  // Initialize sync engine (gets workspace from useWorkspaceStore internally)
  useSync();

  // Layout anchor state for visual merging
  const { leftOpen, rightOpen, leftAnchored, rightAnchored } = useLayoutAnchors();

  // Get setOpen functions for hover-to-open behavior
  const { setOpen: setLeftOpen } = useLeftSidebar();
  const { setOpen: setRightOpen } = useRightSidebar();

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
      // Wait for workspaces to finish loading before checking
      if (workspacesLoading) return;
      if (isInitialized) return;

      // Ref guard prevents double execution in React Strict Mode
      if (workspaceEnsured.current) return;
      workspaceEnsured.current = true;

      // ALWAYS check the server for workspaces (source of truth)
      // This prevents using stale/orphaned workspace IDs from local storage
      try {
        const response = await fetch('/api/workspaces');
        if (response.ok) {
          let serverWorkspaces = await response.json();
          if (serverWorkspaces.length > 0) {
            // Clean up duplicate workspaces if more than 1 exists (legacy bug fix)
            if (serverWorkspaces.length > 1) {
              console.log('[DashboardShell] Found', serverWorkspaces.length, 'workspaces, cleaning up duplicates...');
              try {
                const cleanupResponse = await fetch('/api/admin/cleanup-workspaces', {
                  method: 'POST',
                  credentials: 'include'
                });
                if (cleanupResponse.ok) {
                  const result = await cleanupResponse.json();
                  console.log('[DashboardShell] Cleanup result:', result.message);
                  // Refetch workspaces after cleanup
                  const refreshResponse = await fetch('/api/workspaces');
                  if (refreshResponse.ok) {
                    serverWorkspaces = await refreshResponse.json();
                  }
                }
              } catch (cleanupError) {
                console.error('[DashboardShell] Failed to cleanup workspaces:', cleanupError);
              }
            }

            // Server has workspaces - use them (they are authoritative)
            console.log('[DashboardShell] Using', serverWorkspaces.length, 'workspace(s) from server');

            // Set workspaces in store
            setWorkspaces(serverWorkspaces);

            // Set current workspace to default or first
            const defaultWorkspace = serverWorkspaces.find((w: { isDefault?: boolean }) => w.isDefault) || serverWorkspaces[0];
            setCurrentWorkspace(defaultWorkspace);

            setIsInitialized(true);
            return;
          }
        }
      } catch (error) {
        console.error('[DashboardShell] Failed to fetch workspaces from server:', error);
        // Fall back to local workspaces if server is unavailable
        if (workspaces.length > 0) {
          console.log('[DashboardShell] Using local workspaces as fallback');
          setIsInitialized(true);
          return;
        }
      }

      // No workspaces on server - create the default
      console.log('[DashboardShell] No workspaces found, creating default...');
      await createWorkspace('My Workspace', userId);
      setIsInitialized(true);
    }

    ensureWorkspace();
  }, [workspaces, workspacesLoading, userId, createWorkspace, setWorkspaces, setCurrentWorkspace, isInitialized]);

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

  // Handlers for hover with delayed hide
  const handleLeftMouseEnter = useCallback(() => {
    // Cancel any pending hide
    if (leftHideTimeout.current) {
      clearTimeout(leftHideTimeout.current);
      leftHideTimeout.current = null;
    }
    if (!isLeftOpen) setLeftHovered(true);
  }, [isLeftOpen]);

  const handleLeftMouseLeave = useCallback(() => {
    // Delay hiding to give user time to move mouse onto panel
    leftHideTimeout.current = setTimeout(() => {
      setLeftHovered(false);
    }, 550);
  }, []);

  const handleRightMouseEnter = useCallback(() => {
    // Cancel any pending hide
    if (rightHideTimeout.current) {
      clearTimeout(rightHideTimeout.current);
      rightHideTimeout.current = null;
    }
    if (!isRightOpen) setRightHovered(true);
  }, [isRightOpen]);

  const handleRightMouseLeave = useCallback(() => {
    // Delay hiding to give user time to move mouse onto panel
    rightHideTimeout.current = setTimeout(() => {
      setRightHovered(false);
    }, 550);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (leftHideTimeout.current) clearTimeout(leftHideTimeout.current);
      if (rightHideTimeout.current) clearTimeout(rightHideTimeout.current);
    };
  }, []);

  // Global pointer move handler - works better with inactive windows on macOS
  // Checks mouse position to trigger edge hover zones
  useEffect(() => {
    const triggerZoneWidth = 20;

    const handlePointerMove = (e: PointerEvent) => {
      const windowWidth = window.innerWidth;
      const x = e.clientX;

      // Left edge zone
      if (x <= triggerZoneWidth && !isLeftOpen) {
        // Cancel any pending hide
        if (leftHideTimeout.current) {
          clearTimeout(leftHideTimeout.current);
          leftHideTimeout.current = null;
        }
        setLeftHovered(true);
      }

      // Right edge zone
      if (x >= windowWidth - triggerZoneWidth && !isRightOpen) {
        // Cancel any pending hide
        if (rightHideTimeout.current) {
          clearTimeout(rightHideTimeout.current);
          rightHideTimeout.current = null;
        }
        setRightHovered(true);
      }
    };

    // Use document level listener with capture for better event reception
    document.addEventListener('pointermove', handlePointerMove, { capture: true });

    return () => {
      document.removeEventListener('pointermove', handlePointerMove, { capture: true });
    };
  }, [isLeftOpen, isRightOpen]);

  // Sidebar visibility includes hover state (visible if open OR hovered)
  const isLeftVisible = isLeftOpen || leftHovered;
  const isRightVisible = isRightOpen || rightHovered;

  // Compute anchor visual states
  // When anchored, panels "merge" by removing gap and shared border radius
  // Only merge if actually open (not just hovered)
  const leftMerged = isLeftOpen && isLeftAnchored;
  const rightMerged = isRightOpen && isRightAnchored;

  if (!isInitialized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-base text-text-primary">
        <div className="text-text-muted">Loading...</div>
      </div>
    );
  }

  // Panel base styles - Glass mode with backdrop blur (same for all panels, all states)
  // Uses CSS variables from globals.css for centralized theming
  const panelBase = cn(
    'flex-col overflow-hidden',
    'bg-[var(--glass-panel-bg)]',
    'backdrop-blur-[var(--glass-blur)] backdrop-saturate-[var(--glass-saturate)]',
    'border border-[var(--glass-border)]',
    'transition-all duration-300 ease-out'
  );

  // Floating sidebar shadow (all directions for floating panels)
  const floatingShadow = 'shadow-[var(--glass-shadow)]';

  // Inset shadow for center panel edges (makes sidebars appear elevated)
  // Light mode uses softer shadows (0.15), dark mode uses stronger (0.35)
  const shadowOpacity = resolvedTheme === 'light' ? '0.15' : '0.35';
  const leftInsetShadow = `shadow-[inset_8px_0_12px_-4px_hsl(0_0%_0%/${shadowOpacity})]`;
  const rightInsetShadow = `shadow-[inset_-8px_0_12px_-4px_hsl(0_0%_0%/${shadowOpacity})]`;
  const bothInsetShadow = `shadow-[inset_8px_0_12px_-4px_hsl(0_0%_0%/${shadowOpacity}),inset_-8px_0_12px_-4px_hsl(0_0%_0%/${shadowOpacity})]`;

  // Full screen mode - when LEFT sidebar is anchored (V1 behavior)
  const isFullScreen = leftMerged;

  // Determine if sidebars should take up space in layout (open) or float over (hovered only)
  const leftInFlow = isLeftOpen; // Only in flow when actually open, not just hovered
  // In fullscreen mode, right is only in flow when anchored (merged)
  // Otherwise it floats over the center panel
  const rightInFlow = isFullScreen ? rightMerged : isRightOpen;

  // Extra inset when floating (hovered but not open) to create gap from center panel
  const floatingInset = 8;
  const leftEdgeOffset = leftMerged ? 0 : (isLeftOpen ? 16 : 16 + floatingInset);
  // Right panel only goes to 0 offset when in full screen mode (left anchored)
  // Otherwise it attaches to center panel at 16px offset
  const rightEdgeOffset = rightMerged
    ? (isFullScreen ? 0 : 16)
    : (isRightOpen ? 16 : 16 + floatingInset);

  return (
    <div className="h-screen w-screen bg-bg-base text-text-primary">
      {/* Mobile bottom nav - only shows < 768px */}
      <MobileNav className="md:hidden fixed bottom-0 left-0 right-0 z-50" />

      {/* Main layout with padding to show purple gradient background */}
      <div
        className="h-full pb-16 md:pb-0"
        style={{
          // Animate padding for smooth full-screen transition
          padding: isFullScreen ? 0 : 16,
          transition: 'padding 300ms ease-out, background-color 300ms ease-out',
          backgroundColor: resolvedTheme === 'light' ? '#f5f0fa' : '#0a0814',
          backgroundImage: resolvedTheme === 'light'
            ? `
              radial-gradient(1200px circle at 12% 0%, rgba(168, 85, 247, 0.15), rgba(245, 240, 250, 0)),
              radial-gradient(900px circle at 88% 8%, rgba(168, 85, 247, 0.12), rgba(245, 240, 250, 0)),
              radial-gradient(600px circle at 25% 90%, rgba(168, 85, 247, 0.08), rgba(245, 240, 250, 0)),
              linear-gradient(160deg, rgba(250, 245, 255, 0.96), rgba(245, 240, 250, 1))
            `
            : `
              radial-gradient(1200px circle at 12% 0%, rgba(122, 92, 250, 0.28), rgba(10, 8, 20, 0)),
              radial-gradient(900px circle at 88% 8%, rgba(122, 92, 250, 0.18), rgba(10, 8, 20, 0)),
              radial-gradient(600px circle at 25% 90%, rgba(122, 92, 250, 0.14), rgba(10, 8, 20, 0)),
              linear-gradient(160deg, rgba(10, 8, 20, 0.96), rgba(5, 5, 12, 1))
            `,
          backgroundAttachment: 'fixed'
        }}
      >
        {/* LEFT EDGE HOVER ZONE - Uses padding area when left sidebar is closed */}
        {!isLeftOpen && (
          <div
            className="hidden lg:block fixed top-0 bottom-0 z-50"
            style={{ left: 0, width: 20 }}
            onMouseEnter={handleLeftMouseEnter}
            onMouseLeave={handleLeftMouseLeave}
          />
        )}

        {/* RIGHT EDGE HOVER ZONE - Uses padding area when right sidebar is closed */}
        {!isRightOpen && (
          <div
            className="hidden xl:block fixed top-0 bottom-0 z-50"
            style={{ right: 0, width: 20 }}
            onMouseEnter={handleRightMouseEnter}
            onMouseLeave={handleRightMouseLeave}
          />
        )}

        {/* LEFT SIDEBAR - Fixed position, slides in/out */}
        <aside
          className={cn(
            'hidden lg:flex fixed w-[325px] z-40',
            panelBase,
            // Always apply shadow when not merged (slides with panel during animation)
            !leftMerged && floatingShadow,
            // Rounding based on anchor state
            isFullScreen
              ? 'rounded-none'
              : leftMerged
                ? 'rounded-l-2xl rounded-r-none'
                : 'rounded-2xl'
          )}
          style={{
            top: leftEdgeOffset,
            left: leftEdgeOffset,
            bottom: leftEdgeOffset,
            // Slide completely off-screen when not visible
            transform: isLeftVisible ? 'translateX(0)' : 'translateX(calc(-100% - 32px))',
            transition: 'transform 300ms ease-out, top 300ms ease-out, left 300ms ease-out, bottom 300ms ease-out, border-radius 300ms ease-out, box-shadow 300ms ease-out',
          }}
          onMouseEnter={handleLeftMouseEnter}
          onMouseLeave={handleLeftMouseLeave}
        >
          <LeftSidebar />
        </aside>

        {/* CENTER CONTENT - Flex panel that expands when sidebars close */}
        <main
          className={cn(
            'h-full flex flex-col',
            panelBase,
            // Inset shadows on edges where sidebars are merged (makes sidebars appear elevated)
            leftMerged && rightMerged
              ? bothInsetShadow
              : leftMerged
                ? leftInsetShadow
                : rightMerged
                  ? rightInsetShadow
                  : floatingShadow,
            // Dynamic rounding based on anchor state
            isFullScreen && rightMerged
              ? 'rounded-none'
              : leftMerged && !rightMerged
                ? 'rounded-l-none rounded-r-2xl'
                : !leftMerged && rightMerged
                  ? 'rounded-l-2xl rounded-r-none'
                  : 'rounded-2xl'
          )}
          style={{
            // Left margin: account for left sidebar when it's in flow (open, not just hovered)
            marginLeft: leftInFlow ? (leftMerged ? 325 : 341) : 0,
            // Right margin: account for right sidebar when it's in flow
            // When merged: 325 (flush with sidebar, container padding provides offset when not fullscreen)
            // When not merged: 341 (sidebar width + 16px gap)
            marginRight: rightInFlow ? (rightMerged ? 325 : 341) : 0,
            transition: 'margin 300ms ease-out, border-radius 300ms ease-out, box-shadow 300ms ease-out',
          }}
        >
          <div className="flex-1 overflow-auto relative">
            {/* OMNIBAR - Absolute positioned at top center of content area */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
              <div className="pointer-events-auto">
                <Omnibar isCompact={false} />
                <ToastStack isCompact={false} />
              </div>
            </div>
            {children}
          </div>
        </main>

        {/* RIGHT SIDEBAR - Fixed position, slides in/out */}
        <aside
          className={cn(
            'hidden xl:flex fixed w-[325px] z-40',
            panelBase,
            // Always apply shadow when not merged (slides with panel during animation)
            !rightMerged && floatingShadow,
            // Rounding based on anchor state and full screen mode
            rightMerged
              ? (isFullScreen ? 'rounded-none' : 'rounded-r-2xl rounded-l-none')
              : 'rounded-2xl'
          )}
          style={{
            top: rightEdgeOffset,
            right: rightEdgeOffset,
            bottom: rightEdgeOffset,
            // Slide completely off-screen when not visible
            transform: isRightVisible ? 'translateX(0)' : 'translateX(calc(100% + 32px))',
            transition: 'transform 300ms ease-out, top 300ms ease-out, right 300ms ease-out, bottom 300ms ease-out, border-radius 300ms ease-out, box-shadow 300ms ease-out',
          }}
          onMouseEnter={handleRightMouseEnter}
          onMouseLeave={handleRightMouseLeave}
        >
          <RightSidebar />
        </aside>
      </div>

      <AddCardModal />
      <CardDetailModal />
    </div>
  );
}
