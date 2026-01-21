'use client';

import { useEffect, useState, useRef, useCallback, startTransition } from 'react';
import { useConvexAuth } from 'convex/react';
import { useRouter } from '@/lib/navigation';
import { WorkspaceProvider } from '@/lib/stores/workspace-store';
import { hydrateLayoutCache } from '@/lib/stores/layout-cache-store';
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
import { ConvexDataProvider } from '@/lib/contexts/convex-data-context';
import { cn } from '@/lib/utils';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('DashboardShell');

// Scroll threshold for omnibar collapse (pixels)
const OMNIBAR_SCROLL_THRESHOLD = 20;

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-400">Redirecting...</div>
      </div>
    );
  }

  return <AuthenticatedDashboardShell>{children}</AuthenticatedDashboardShell>;
}

function AuthenticatedDashboardShell({ children }: DashboardShellProps) {
  const [mounted, setMounted] = useState(false);
  const initStarted = useRef(false);

  // Hover state for revealing closed sidebars
  const [leftHovered, setLeftHovered] = useState(false);
  const [rightHovered, setRightHovered] = useState(false);

  // Track screen size for responsive margin adjustments
  // Sidebars are hidden on mobile/tablet, so margins should be 0
  const [isDesktop, setIsDesktop] = useState(false); // lg breakpoint (1024px) for left sidebar
  const [isLargeDesktop, setIsLargeDesktop] = useState(false); // xl breakpoint (1280px) for right sidebar

  // Scroll state for omnibar collapse
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Toast state - omnibar expands when toast is active
  const activeToast = useActiveToast();

  // Timeout refs for delayed hide (gives user time to move mouse onto panel)
  const leftHideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rightHideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track current hover state with refs to avoid triggering re-renders for repeated setState calls
  const leftHoveredRef = useRef(false);
  const rightHoveredRef = useRef(false);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Standard SSR hydration pattern
    setMounted(true);
  }, []);

  // Track window size for responsive margin adjustments
  useEffect(() => {
    const updateScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024); // lg breakpoint
      setIsLargeDesktop(window.innerWidth >= 1280); // xl breakpoint
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // Initialize auth store with user info
  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;

    // Hydrate layout cache for UI optimization
    hydrateLayoutCache().catch((error) => {
      log.error('Layout cache hydration failed:', error);
    });
  }, []);

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
    if (!isLeftOpen && !leftHoveredRef.current) {
      leftHoveredRef.current = true;
      setLeftHovered(true);
    }
  }, [isLeftOpen]);

  const handleLeftMouseLeave = useCallback(() => {
    // Delay hiding to give user time to move mouse onto panel
    leftHideTimeout.current = setTimeout(() => {
      leftHoveredRef.current = false;
      setLeftHovered(false);
    }, 550);
  }, []);

  const handleRightMouseEnter = useCallback(() => {
    // Cancel any pending hide
    if (rightHideTimeout.current) {
      clearTimeout(rightHideTimeout.current);
      rightHideTimeout.current = null;
    }
    if (!isRightOpen && !rightHoveredRef.current) {
      rightHoveredRef.current = true;
      setRightHovered(true);
    }
  }, [isRightOpen]);

  const handleRightMouseLeave = useCallback(() => {
    // Delay hiding to give user time to move mouse onto panel
    rightHideTimeout.current = setTimeout(() => {
      rightHoveredRef.current = false;
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
  // Only update state when crossing the threshold to avoid unnecessary re-renders on every scroll
  const isScrolledRef = useRef(false);
  useEffect(() => {
    if (!scrollContainer) return;

    const handleScroll = () => {
      const shouldCollapse = scrollContainer.scrollTop > OMNIBAR_SCROLL_THRESHOLD;
      // Only trigger state update when crossing the threshold
      if (shouldCollapse !== isScrolledRef.current) {
        isScrolledRef.current = shouldCollapse;
        // Use startTransition to defer the state update, preventing scroll jank
        // The omnibar animation is low-priority compared to smooth scrolling
        startTransition(() => setIsScrolled(shouldCollapse));
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [scrollContainer]);

  // Global pointer move handler - works better with inactive windows on macOS
  // Checks mouse position to trigger edge hover zones
  useEffect(() => {
    const triggerZoneWidth = 20;
    let rafId: number | null = null;

    const handlePointerMove = (e: PointerEvent) => {
      // Use RAF throttle to coalesce rapid pointermove events
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const windowWidth = window.innerWidth;
        const x = e.clientX;

        // Left edge zone - only set state if changing to true
        if (x <= triggerZoneWidth && !isLeftOpen && !leftHoveredRef.current) {
          leftHoveredRef.current = true;
          // Cancel any pending hide
          if (leftHideTimeout.current) {
            clearTimeout(leftHideTimeout.current);
            leftHideTimeout.current = null;
          }
          setLeftHovered(true);
        }

        // Right edge zone - only set state if changing to true
        if (x >= windowWidth - triggerZoneWidth && !isRightOpen && !rightHoveredRef.current) {
          rightHoveredRef.current = true;
          // Cancel any pending hide
          if (rightHideTimeout.current) {
            clearTimeout(rightHideTimeout.current);
            rightHideTimeout.current = null;
          }
          setRightHovered(true);
        }
      });
    };

    // Use document level listener with capture for better event reception
    document.addEventListener('pointermove', handlePointerMove, { capture: true, passive: true });

    return () => {
      document.removeEventListener('pointermove', handlePointerMove, { capture: true });
      if (rafId !== null) cancelAnimationFrame(rafId);
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

  // NOTE: We no longer block rendering while waiting for workspace initialization
  // Pages handle their own loading states via DataContext.isLoading
  // This dramatically improves LCP by allowing the shell to render immediately

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
    <WorkspaceProvider>
      <ConvexDataProvider>
        <div className="h-screen w-screen bg-bg-base text-text-primary">
        {/* Mobile bottom nav - only shows < 768px */}
        <MobileNav className="md:hidden fixed bottom-0 left-0 right-0 z-50" />

        {/* Main layout with padding to show purple gradient background */}
        <div
          className="h-full flex flex-col"
          style={{
            // Animate padding for smooth full-screen transition
            // On mobile (< lg), use 0 padding since sidebars are hidden
            paddingTop: isDesktop ? (isFullScreen ? 0 : 16) : 0,
            paddingLeft: isDesktop ? (isFullScreen ? 0 : 16) : 0,
            paddingRight: isDesktop ? (isFullScreen ? 0 : 16) : 0,
            paddingBottom: isDesktop
              ? (isFullScreen ? 'var(--mobile-nav-height)' : 'calc(16px + var(--mobile-nav-height))')
              : 'var(--mobile-nav-height)',
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
              // TEST: Chrome flickering bug when exactly ONE sidebar is anchored (not both, not neither)
              // Issue: Cards flicker/vanish on hover in Library masonry view. Works fine in Dia browser.
              // Symptoms: Cards disappear on hover enter/exit, scroll breaks, layout corrupts
              // Tried: GPU hints (will-change, translateZ), removing inset shadows, adding transform to cards
              // Hypothesis: Asymmetric inset shadows + backdrop-blur + card hover transforms = Chrome compositor bug
              // Working states: both sidebars floating, both sidebars anchored
              // Broken states: left anchored + right floating, left floating + right anchored
              // Next steps: Test on other machines/browsers, check Chrome DevTools Layers panel, try removing backdrop-blur
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
              // Only apply on desktop (lg+) since sidebar is hidden on mobile/tablet
              marginLeft: isDesktop && leftInFlow ? (leftMerged ? 325 : 341) : 0,
              // Right margin: account for right sidebar when it's in flow
              // When merged: sidebar width (flush, container padding provides offset when not fullscreen)
              // When not merged: sidebar width + 16px gap
              // Only apply on large desktop (xl+) since right sidebar is hidden below that
              marginRight: isLargeDesktop && rightInFlow ? (rightMerged ? rightSidebarWidth : rightSidebarWidth + 16) : 0,
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
      </ConvexDataProvider>
    </WorkspaceProvider>
  );
}
