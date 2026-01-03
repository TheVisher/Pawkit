'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useDataStore } from '@/lib/stores/data-store';
import { runTagArchitectureMigration, normalizeAllTags } from '@/lib/migrations/tag-architecture-migration';
import { useSync } from '@/lib/hooks/use-sync';
import { useTauriEvents } from '@/lib/hooks/use-tauri-events';
import { useRealtimeSync } from '@/lib/hooks/use-realtime-sync';
import { useLayoutAnchors, getRightSidebarWidth } from '@/lib/stores/ui-store';
import { useApplySettings } from '@/lib/stores/settings-store';
import { useActiveToast } from '@/lib/stores/toast-store';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { RightSidebar } from '@/components/layout/right-sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { AddCardModal } from '@/components/modals/add-card-modal';
import { CardDetailModal } from '@/components/modals/card-detail';
import { CreatePawkitModal } from '@/components/modals/create-pawkit-modal';
import { CoverImagePickerModal } from '@/components/modals/cover-image-picker-modal';
import { CardPhotoPickerModal } from '@/components/modals/card-photo-picker-modal';
import { useModalStore } from '@/lib/stores/modal-store';
import { CardsDragHandler } from '@/components/pawkits/cards-drag-handler';
import { Omnibar } from '@/components/layout/omnibar';
import { ToastStack } from '@/components/layout/toast-stack';
import { ErrorBoundary } from '@/components/error-boundary';
import { AppDndProvider } from '@/lib/contexts/dnd-context';
import { DataProvider } from '@/lib/contexts/data-context';
import { cn } from '@/lib/utils';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('DashboardShell');

// Scroll threshold for omnibar collapse (pixels)
const OMNIBAR_SCROLL_THRESHOLD = 20;

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

  // Hover state for revealing closed sidebars
  const [leftHovered, setLeftHovered] = useState(false);
  const [rightHovered, setRightHovered] = useState(false);

  // Scroll state for omnibar collapse
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Toast state - omnibar expands when toast is active
  const activeToast = useActiveToast();

  // Timeout refs for delayed hide (gives user time to move mouse onto panel)
  const leftHideTimeout = useRef<NodeJS.Timeout | null>(null);
  const rightHideTimeout = useRef<NodeJS.Timeout | null>(null);

  const setBasicUserInfo = useAuthStore((s) => s.setBasicUserInfo);
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

  // Listen for Tauri events (desktop app portal, etc.)
  useTauriEvents();

  // Subscribe to Supabase Realtime for cross-device sync
  useRealtimeSync();

  // Apply appearance settings (accent color, background) as CSS variables
  useApplySettings();

  // Layout anchor state for visual merging
  const { leftOpen, rightOpen, leftAnchored, rightAnchored, rightExpandedMode } = useLayoutAnchors();

  // Dynamic right sidebar width based on expansion mode
  const rightSidebarWidth = getRightSidebarWidth(rightExpandedMode);

  // Check if card detail modal is open (sidebar needs higher z-index to stay above backdrop)
  const activeCardId = useModalStore((s) => s.activeCardId);
  const isCardModalOpen = Boolean(activeCardId);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function init() {
      if (initStarted.current) return;
      initStarted.current = true;

      // Set user info in auth store
      setBasicUserInfo({ id: userId, email: userEmail });
      setLoading(false);

      // Load workspaces from Dexie
      await loadWorkspaces(userId);
    }

    init();
  }, [userId, userEmail, setBasicUserInfo, setLoading, loadWorkspaces]);

  useEffect(() => {
    async function ensureWorkspace() {
      // Wait for workspaces to finish loading before checking
      if (workspacesLoading) return;
      if (isInitialized) return;

      // Ref guard prevents double execution in React Strict Mode
      if (workspaceEnsured.current) return;
      workspaceEnsured.current = true;

      // Simple workspace logic:
      // 1. Fetch workspaces from server
      // 2. If any exist, use the default one
      // 3. If none exist, create ONE default workspace
      // That's it. No magic, no cleanup, no complexity.

      try {
        const response = await fetch('/api/workspaces');
        if (response.ok) {
          const data = await response.json();
          const serverWorkspaces = data.workspaces || [];

          if (serverWorkspaces.length > 0) {
            // Use existing workspaces
            setWorkspaces(serverWorkspaces);

            // Find default workspace, or use first one
            const defaultWorkspace = serverWorkspaces.find((w: { isDefault?: boolean }) => w.isDefault) || serverWorkspaces[0];
            setCurrentWorkspace(defaultWorkspace);

            log.info('Using workspace:', defaultWorkspace.name);
            setIsInitialized(true);
            return;
          }
        }
      } catch (error) {
        log.error('Failed to fetch workspaces:', error);
        // Fall back to local workspaces if server unavailable
        if (workspaces.length > 0) {
          setIsInitialized(true);
          return;
        }
      }

      // No workspaces exist - create the default (only happens on first signup)
      log.info('First time user, creating default workspace...');
      await createWorkspace('My Workspace', userId);
      setIsInitialized(true);
    }

    ensureWorkspace();
  }, [workspaces, workspacesLoading, userId, createWorkspace, setWorkspaces, setCurrentWorkspace, isInitialized]);

  const purgeOldTrash = useDataStore((s) => s.purgeOldTrash);

  useEffect(() => {
    // Load data when workspace is available
    if (currentWorkspace) {
      // Run tag architecture migration (one-time, merges collections into tags)
      // See: .claude/skills/pawkit-tag-architecture/SKILL.md
      runTagArchitectureMigration(false, currentWorkspace.id)
        .then((result) => {
          if (result.cardsUpdated > 0) {
            log.info(`Tag migration: updated ${result.cardsUpdated} cards`);
          }
        })
        .catch((error) => {
          log.error('Tag migration failed:', error);
        });

      // Normalize all tags to lowercase (one-time, ensures consistent matching)
      normalizeAllTags(currentWorkspace.id)
        .then((result) => {
          if (result.cardsUpdated > 0) {
            log.info(`Tag normalization: updated ${result.cardsUpdated} cards`);
          }
        })
        .catch((error) => {
          log.error('Tag normalization failed:', error);
        });

      loadAll(currentWorkspace.id);

      // Auto-purge trash items older than 30 days
      purgeOldTrash(currentWorkspace.id, 30).then((purgedCount) => {
        if (purgedCount > 0) {
          log.info(`Auto-purged ${purgedCount} old trash items`);
        }
      });
    }
  }, [currentWorkspace, loadAll, purgeOldTrash]);

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

  // Callback ref to capture scroll container
  const handleContentRef = useCallback((node: HTMLDivElement | null) => {
    contentRef.current = node;
    setScrollContainer(node);
  }, []);

  // Track scroll position for omnibar collapse
  useEffect(() => {
    if (!scrollContainer) return;

    const handleScroll = () => {
      const shouldCollapse = scrollContainer.scrollTop > OMNIBAR_SCROLL_THRESHOLD;
      setIsScrolled(shouldCollapse);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [scrollContainer]);

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
  // Uses CSS variable --panel-inset-opacity (0.15 light, 0.35 dark)
  const leftInsetShadow = 'shadow-[inset_8px_0_12px_-4px_hsl(0_0%_0%/var(--panel-inset-opacity))]';
  const rightInsetShadow = 'shadow-[inset_-8px_0_12px_-4px_hsl(0_0%_0%/var(--panel-inset-opacity))]';
  const bothInsetShadow = 'shadow-[inset_8px_0_12px_-4px_hsl(0_0%_0%/var(--panel-inset-opacity)),inset_-8px_0_12px_-4px_hsl(0_0%_0%/var(--panel-inset-opacity))]';

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
    <DataProvider>
      <AppDndProvider>
        <div className="h-screen w-screen bg-bg-base text-text-primary">
        {/* Mobile bottom nav - only shows < 768px */}
        <MobileNav className="md:hidden fixed bottom-0 left-0 right-0 z-50" />

        {/* Main layout with padding to show purple gradient background */}
        <div
          className="h-full flex flex-col"
          style={{
            // Animate padding for smooth full-screen transition
            paddingTop: isFullScreen ? 0 : 16,
            paddingLeft: isFullScreen ? 0 : 16,
            paddingRight: isFullScreen ? 0 : 16,
            paddingBottom: isFullScreen 
              ? 'var(--mobile-nav-height)' 
              : 'calc(16px + var(--mobile-nav-height))',
            transition: 'padding 300ms ease-out, background-color 300ms ease-out',
            backgroundColor: 'var(--bg-gradient-base)',
            backgroundImage: 'var(--bg-gradient-image)',
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
              // When merged: sidebar width (flush, container padding provides offset when not fullscreen)
              // When not merged: sidebar width + 16px gap
              marginRight: rightInFlow ? (rightMerged ? rightSidebarWidth : rightSidebarWidth + 16) : 0,
              transition: 'margin 300ms ease-out, border-radius 300ms ease-out, box-shadow 300ms ease-out',
            }}
          >
            <div ref={handleContentRef} className="flex-1 overflow-auto relative scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {/* OMNIBAR - Sticky but with zero-height wrapper so it doesn't push content down */}
              <div className="hidden md:block sticky top-0 z-50 h-0 overflow-visible">
                <div className="flex justify-center pt-5 pb-2 pointer-events-none">
                  <div className="relative pointer-events-auto w-[400px]">
                    <Omnibar isCompact={isScrolled && !activeToast} />
                    <ToastStack isCompact={isScrolled && !activeToast} />
                  </div>
                </div>
              </div>
              {/* Content - starts at top, scrolls under the omnibar */}
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
              
              {/* Mobile Omnibar - Sticky at bottom on mobile, above MobileNav */}
              <div className="md:hidden sticky bottom-4 z-50 flex justify-center px-4 pointer-events-none">
                <div className="relative pointer-events-auto w-full max-w-[400px]">
                  <Omnibar isCompact={isScrolled && !activeToast} />
                  <ToastStack isCompact={isScrolled && !activeToast} />
                </div>
              </div>
            </div>
          </main>

          {/* RIGHT SIDEBAR - Fixed position, slides in/out, width varies with expansion mode */}
          {/* z-index bumps to 60 when card modal is open so sidebar stays above backdrop */}
          <aside
            className={cn(
              'hidden xl:flex fixed',
              isCardModalOpen ? 'z-[60]' : 'z-40',
              panelBase,
              // Always apply shadow when not merged (slides with panel during animation)
              !rightMerged && floatingShadow,
              // Rounding based on anchor state and full screen mode
              rightMerged
                ? (isFullScreen ? 'rounded-none' : 'rounded-r-2xl rounded-l-none')
                : 'rounded-2xl'
            )}
            style={{
              width: rightSidebarWidth,
              top: rightEdgeOffset,
              right: rightEdgeOffset,
              bottom: rightEdgeOffset,
              // Slide completely off-screen when not visible
              transform: isRightVisible ? 'translateX(0)' : 'translateX(calc(100% + 32px))',
              transition: 'width 300ms ease-out, transform 300ms ease-out, top 300ms ease-out, right 300ms ease-out, bottom 300ms ease-out, border-radius 300ms ease-out, box-shadow 300ms ease-out',
            }}
            onMouseEnter={handleRightMouseEnter}
            onMouseLeave={handleRightMouseLeave}
          >
            <RightSidebar />
          </aside>
        </div>

        <AddCardModal />
        <CardDetailModal />
        <CreatePawkitModal />
        <CoverImagePickerModal />
        <CardPhotoPickerModal />
        <CardsDragHandler />
        </div>
      </AppDndProvider>
    </DataProvider>
  );
}
