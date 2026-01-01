/**
 * Hook to enable dragging cards OUT of the portal to external apps
 *
 * Uses native OS drag via tauri-plugin-drag for true file dragging to:
 * - Discord, Slack, iMessage (file attachments)
 * - Finder (creates bookmark)
 * - Email apps (file attachment)
 *
 * Falls back to HTML5 drag for in-browser targets.
 */

import { useCallback, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { startDrag } from '@crabnebula/tauri-plugin-drag';
import type { LocalCard } from '../stores/portal-stores';

// Cache the drag icon path so we don't create it repeatedly
let cachedIconPath: string | null = null;

async function createDragIcon(): Promise<string> {
  if (cachedIconPath) return cachedIconPath;
  cachedIconPath = await invoke<string>('create_drag_icon');
  return cachedIconPath;
}

interface UseDragOutOptions {
  card: LocalCard;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

interface DragFileState {
  weblocPath: string | null;
  notePath: string | null;
}

export function useDragOut({ card, onDragStart, onDragEnd }: UseDragOutOptions) {
  const dragFilesRef = useRef<DragFileState>({ weblocPath: null, notePath: null });
  const [isPreparing, setIsPreparing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);

  // Pre-create drag files when mouse enters (for faster drag start)
  const prepareFiles = useCallback(async () => {
    if (isPreparing) return;

    const isNote = card.type === 'md-note' || card.type === 'quick-note';

    if (!card.url && !isNote) return;

    setIsPreparing(true);
    try {
      if (isNote) {
        // Create markdown file for notes
        const title = card.title || 'Untitled Note';
        const content = card.content || '';
        const notePath = await invoke<string>('create_note_file', { title, content });
        dragFilesRef.current.notePath = notePath;
        console.log('[DragOut] Prepared note file:', notePath);
      } else if (card.url) {
        // Create webloc file for URLs
        const title = card.title || new URL(card.url).hostname;
        const weblocPath = await invoke<string>('create_webloc_file', {
          url: card.url,
          title,
        });
        dragFilesRef.current.weblocPath = weblocPath;
        console.log('[DragOut] Prepared webloc:', weblocPath);
      }
    } catch (e) {
      console.warn('[DragOut] Failed to prepare files:', e);
    } finally {
      setIsPreparing(false);
    }
  }, [card, isPreparing]);

  // Handle mouse down - record position for drag threshold
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  // Handle mouse move - start native drag if threshold exceeded
  const handleMouseMove = useCallback(async (e: React.MouseEvent) => {
    if (!mouseDownPos.current || isDragging) return;

    // Only process left mouse button
    if (e.buttons !== 1) {
      mouseDownPos.current = null;
      return;
    }

    const dx = e.clientX - mouseDownPos.current.x;
    const dy = e.clientY - mouseDownPos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Start drag after 5px movement
    if (distance > 5) {
      mouseDownPos.current = null;
      setIsDragging(true);
      onDragStart?.();

      try {
        const isNote = card.type === 'md-note' || card.type === 'quick-note';
        let filePath: string | null = null;

        console.log('[DragOut] Card type:', card.type, 'isNote:', isNote, 'url:', card.url);

        // Always create fresh file for reliability
        if (isNote) {
          const title = card.title || 'Untitled Note';
          const content = card.content || '';
          console.log('[DragOut] Creating note file for:', title);
          filePath = await invoke<string>('create_note_file', { title, content });
          console.log('[DragOut] Note file created:', filePath);
        } else if (card.url) {
          const title = card.title || new URL(card.url).hostname;
          console.log('[DragOut] Creating webloc for:', title, card.url);
          filePath = await invoke<string>('create_webloc_file', { url: card.url, title });
          console.log('[DragOut] Webloc file created:', filePath);
        }

        if (filePath) {
          console.log('[DragOut] Starting native drag with file:', filePath);

          // Create a simple drag icon (1x1 transparent PNG as base64)
          // The plugin requires an icon, so we create a minimal one
          const iconPath = await createDragIcon();

          // Start native OS drag with the file
          const result = await startDrag({
            item: [filePath],
            icon: iconPath,
          });

          console.log('[DragOut] Native drag result:', result);
        } else {
          console.warn('[DragOut] No file path created!');
        }
      } catch (e) {
        console.error('[DragOut] Native drag failed:', e);
      } finally {
        setIsDragging(false);
        onDragEnd?.();

        // Don't clean up files immediately - let user have time to use them
        // Files are in temp dir anyway
      }
    }
  }, [card, isDragging, onDragStart, onDragEnd]);

  // Handle mouse up - reset position
  const handleMouseUp = useCallback(() => {
    mouseDownPos.current = null;
  }, []);

  // Handle mouse leave - reset position
  const handleMouseLeave = useCallback(() => {
    mouseDownPos.current = null;
  }, []);

  const isNote = card.type === 'md-note' || card.type === 'quick-note';
  const isDraggable = !!card.url || isNote;

  return {
    dragProps: {
      onMouseEnter: prepareFiles,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      // Disable HTML5 drag since we're using native
      draggable: false,
    },
    isDraggable,
    isPreparing,
    isDragging,
  };
}
