'use client';

/**
 * Card Detail Modal
 * Shell component that handles modal wrapper, backdrop, and responsive behavior
 */

import { useEffect, useCallback } from 'react';
import { Drawer } from 'vaul';
import { useModalStore } from '@/lib/stores/modal-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { useMobile } from '@/lib/hooks/use-mobile';
import { triggerSync } from '@/lib/services/sync-queue';
import { cn } from '@/lib/utils';
import { CardDetailContent } from './content';

export function CardDetailModal() {
  const activeCardId = useModalStore((s) => s.activeCardId);
  const closeCardDetail = useModalStore((s) => s.closeCardDetail);
  const rightSidebarOpen = useUIStore((s) => s.rightSidebarOpen);
  const isMobile = useMobile();

  // Handle close with sync
  const handleClose = useCallback(() => {
    closeCardDetail();
    // Trigger sync when modal closes (fire-and-forget)
    triggerSync().catch(() => {
      // Ignore sync errors on close
    });
  }, [closeCardDetail]);

  // Close on escape
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

  if (isMobile) {
    return (
      <Drawer.Root open={!!activeCardId} onOpenChange={(open) => !open && handleClose()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex h-[96%] flex-col rounded-t-[20px] bg-[var(--glass-panel-bg)] backdrop-blur-[var(--glass-blur)] border-t border-[var(--glass-border)] outline-none">
            <div className="mx-auto mt-4 h-1.5 w-12 flex-shrink-0 rounded-full bg-[var(--color-text-muted)] opacity-20" />
            <CardDetailContent
              cardId={activeCardId}
              onClose={handleClose}
              className="bg-transparent"
            />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Desktop Modal */}
      <div
        className={cn(
          'fixed z-50 flex items-stretch pointer-events-none transition-all duration-300',
          'top-4 bottom-4 left-4 right-4',
          'md:top-6 md:bottom-6 md:left-8 md:right-8',
          'lg:top-4 lg:bottom-4 lg:left-12',
          // Don't cover right sidebar when open
          rightSidebarOpen ? 'lg:right-[336px]' : 'lg:right-12'
        )}
      >
        <div
          className={cn(
            'pointer-events-auto w-full max-w-5xl mx-auto overflow-hidden',
            'flex flex-col rounded-2xl border border-[var(--glass-border)] shadow-[var(--glass-shadow)]',
            'bg-[#0d0d0d]' // Solid background to prevent flicker
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <CardDetailContent cardId={activeCardId} onClose={handleClose} />
        </div>
      </div>
    </>
  );
}

// Re-export for convenience
export { CardDetailContent } from './content';
