'use client';

/**
 * Content Panel
 * Full-width immersive content panel with FLIP animation from card
 * Replaces the centered modal for a more immersive reading experience
 */

import { useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { useModalStore } from '@/lib/stores/modal-store';
import { useUIStore, useRightSidebar, SIDEBAR_WIDTHS } from '@/lib/stores/ui-store';
import { useMobile } from '@/lib/hooks/use-mobile';
import { useContentPanelAnimation } from '@/lib/hooks/use-content-panel-animation';
import { CardDetailContent } from '@/components/modals/card-detail/content';
import { MobileContentSheet } from './mobile-sheet';
import { cn } from '@/lib/utils';

// Panel padding from viewport edge
const PANEL_PADDING = 16;
// Gap between panel and sidebar when sidebar is open
const SIDEBAR_GAP = 16;
// Animation duration that matches sidebar transitions
const TRANSITION_DURATION = 500; // ms

export function ContentPanel() {
  const activeCardId = useModalStore((s) => s.activeCardId);
  const closeCardDetail = useModalStore((s) => s.closeCardDetail);
  const setIsClosingPanel = useModalStore((s) => s.setIsClosingPanel);

  const rightSidebarOpen = useUIStore((s) => s.rightSidebarOpen);
  const rightSidebarExpandedMode = useUIStore((s) => s.rightSidebarExpandedMode);
  const { setExpandedMode } = useRightSidebar();

  const isMobile = useMobile();

  const { panelRef, isAnimating, animationStyles, backdropOpacity, startCloseAnimation } = useContentPanelAnimation();

  // Track the card ID for use in close handler
  const lastCardIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeCardId) {
      lastCardIdRef.current = activeCardId;
    }
  }, [activeCardId]);

  // Handle close with animation back to card
  // Start sidebar collapse simultaneously with the modal animation
  const handleClose = useCallback(() => {
    // Mark that we're closing - prevents sidebar from re-expanding
    setIsClosingPanel(true);

    // Start sidebar collapse immediately (runs in parallel with modal animation)
    if (rightSidebarExpandedMode === 'card-detail') {
      setExpandedMode(null);
    }

    // Start modal close animation
    startCloseAnimation(() => {
      closeCardDetail();
    });
  }, [closeCardDetail, startCloseAnimation, rightSidebarExpandedMode, setExpandedMode, setIsClosingPanel]);

  // Close on escape - also uses animated close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  if (!activeCardId) return null;

  // Mobile: use bottom sheet (uses immediate close since it has its own drag-to-dismiss)
  if (isMobile) {
    return <MobileContentSheet cardId={activeCardId} onClose={closeCardDetail} />;
  }

  // Calculate right edge position
  // When a card is open and sidebar is visible, always use the card-detail width (480px)
  // This ensures the panel opens at the correct size from the start,
  // rather than shrinking after the sidebar expands
  const sidebarWidth = rightSidebarOpen
    ? SIDEBAR_WIDTHS['card-detail'] // Always use expanded width when sidebar is open
    : 0;
  const rightOffset = rightSidebarOpen
    ? sidebarWidth + SIDEBAR_GAP + PANEL_PADDING
    : PANEL_PADDING;

  return (
    <>
      {/* Backdrop with blur - fades in simultaneously with panel animation */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        style={{
          opacity: backdropOpacity,
          transition: `opacity ${TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        }}
      />

      {/* Content Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden',
          'rounded-2xl border border-[var(--glass-border)]',
          'shadow-[var(--glass-shadow)]',
          'bg-[#0d0d0d]' // Solid background to prevent content flicker during animation
        )}
        style={{
          top: PANEL_PADDING,
          left: PANEL_PADDING,
          bottom: PANEL_PADDING,
          right: rightOffset,
          // When animating, let animationStyles handle everything
          // When not animating, apply transition for sidebar width changes
          ...animationStyles,
          // Override transition only when not animating (animationStyles sets transition during animation)
          ...(isAnimating ? {} : { transition: `right ${TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)` }),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className={cn(
            'absolute top-4 right-4 z-10 p-2 rounded-full',
            'bg-[var(--glass-bg)] backdrop-blur-md',
            'border border-[var(--glass-border)]',
            'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
            'transition-colors duration-200',
            'hover:bg-[var(--color-bg-surface-2)]'
          )}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Card content */}
        <CardDetailContent
          cardId={activeCardId}
          onClose={handleClose}
        />
      </div>
    </>
  );
}
