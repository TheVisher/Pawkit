/**
 * Hook to enable dragging cards OUT of the portal to external apps
 * Uses HTML5 drag API with proper data transfer types for cross-app compatibility
 */

import { useCallback, useRef } from 'react';
import type { LocalCard } from '../stores/portal-stores';

interface UseDragOutOptions {
  card: LocalCard;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function useDragOut({ card, onDragStart, onDragEnd }: UseDragOutOptions) {
  const dragImageRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      // Only drag URL cards
      if (!card.url) {
        e.preventDefault();
        return;
      }

      console.log('[DragOut] Starting drag for:', card.url);

      // Set data transfer with multiple formats for compatibility
      const dataTransfer = e.dataTransfer;

      // URL format - most apps understand this
      dataTransfer.setData('text/uri-list', card.url);

      // Plain text fallback
      dataTransfer.setData('text/plain', card.url);

      // HTML with link - for rich text apps
      const title = card.title || card.url;
      dataTransfer.setData('text/html', `<a href="${card.url}">${title}</a>`);

      // Set the drag effect
      dataTransfer.effectAllowed = 'copyLink';

      // Create custom drag image
      const dragImage = document.createElement('div');
      dragImage.style.cssText = `
        position: absolute;
        top: -1000px;
        left: -1000px;
        padding: 8px 12px;
        background: var(--color-bg-surface-2);
        border: 1px solid var(--glass-border);
        border-radius: 8px;
        font-size: 12px;
        color: var(--color-text-primary);
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        pointer-events: none;
        z-index: 9999;
      `;
      dragImage.textContent = card.title || new URL(card.url).hostname;
      document.body.appendChild(dragImage);
      dragImageRef.current = dragImage;

      // Set as drag image
      dataTransfer.setDragImage(dragImage, 0, 0);

      onDragStart?.();
    },
    [card, onDragStart]
  );

  const handleDragEnd = useCallback(
    (e: React.DragEvent) => {
      console.log('[DragOut] Drag ended, drop effect:', e.dataTransfer.dropEffect);

      // Clean up drag image
      if (dragImageRef.current) {
        document.body.removeChild(dragImageRef.current);
        dragImageRef.current = null;
      }

      onDragEnd?.();
    },
    [onDragEnd]
  );

  return {
    dragProps: {
      draggable: !!card.url,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
    },
    isDraggable: !!card.url,
  };
}
