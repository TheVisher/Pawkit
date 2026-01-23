'use client';

/**
 * Mobile Content Sheet
 * Bottom sheet for mobile devices with drag-to-dismiss and edge swipe gestures
 */

import { useCallback } from 'react';
import { Drawer } from 'vaul';
import { useUIStore } from '@/lib/stores/ui-store';
import { useSwipeGesture } from '@/lib/hooks/use-swipe-gesture';
import { CardDetailContent } from '@/components/modals/card-detail/content';

interface MobileContentSheetProps {
  cardId: string;
  onClose: () => void;
}

export function MobileContentSheet({ cardId, onClose }: MobileContentSheetProps) {
  const setLeftSidebarOpen = useUIStore((s) => s.setLeftSidebarOpen);
  const setRightSidebarOpen = useUIStore((s) => s.setRightSidebarOpen);

  // Edge swipe gestures for revealing sidebars
  const handleSwipeFromLeft = useCallback(() => {
    setLeftSidebarOpen(true);
  }, [setLeftSidebarOpen]);

  const handleSwipeFromRight = useCallback(() => {
    setRightSidebarOpen(true);
  }, [setRightSidebarOpen]);

  useSwipeGesture({
    onSwipeFromLeft: handleSwipeFromLeft,
    onSwipeFromRight: handleSwipeFromRight,
    enabled: true,
  });

  return (
    <Drawer.Root open={true} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex flex-col rounded-t-[20px] outline-none"
          style={{
            height: '85vh',
            background: 'var(--glass-panel-bg)',
            backdropFilter: 'blur(var(--glass-blur))',
            WebkitBackdropFilter: 'blur(var(--glass-blur))',
            borderTop: '1px solid var(--glass-border)',
          }}
        >
          {/* Drag handle */}
          <div className="mx-auto mt-4 h-1.5 w-12 flex-shrink-0 rounded-full bg-[var(--color-text-muted)] opacity-20" />

          {/* Content */}
          <CardDetailContent
            cardId={cardId}
            onClose={onClose}
            className="bg-transparent"
          />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
