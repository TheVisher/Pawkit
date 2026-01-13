'use client';

import { useState, useCallback, useRef } from 'react';
import { Pin, Globe, FileText, ExternalLink, GripVertical } from 'lucide-react';
import type { LocalCard } from '@/lib/db/types';
import { setInternalDragActive } from '../utils/drag-state';

interface PortalCardItemProps {
  card: LocalCard;
  onClick?: () => void;
}

/**
 * Portal card item with drag-out support
 * Uses native OS drag via Tauri for file dragging to external apps
 *
 * Design: Glass padding with blurred background effect
 */
export function PortalCardItem({ card, onClick }: PortalCardItemProps) {
  const [imageError, setImageError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);

  const hasImage = card.image && !imageError;
  const isNote = card.type === 'md-note' || card.type === 'text-note';
  const isDraggable = !!card.url || isNote;

  let domain = '';
  try {
    domain = card.domain || (card.url ? new URL(card.url).hostname.replace('www.', '') : '');
  } catch {
    domain = card.domain || '';
  }

  // Drag-out handlers for native file drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isDraggable) return;
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
  }, [isDraggable]);

  const handleMouseMove = useCallback(
    async (e: React.MouseEvent) => {
      if (!mouseDownPos.current || isDragging || !isDraggable) return;
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
        // Mark that this is an internal drag (from portal card)
        // This prevents the drop zone from showing and tracks the URL to prevent duplicates
        setInternalDragActive(true, card.url || undefined);

        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const { startDrag } = await import('@crabnebula/tauri-plugin-drag');

          let filePath: string | null = null;

          if (isNote) {
            const title = card.title || 'Untitled Note';
            const content = card.content || '';
            filePath = await invoke<string>('create_note_file', { title, content });
          } else if (card.url) {
            const title = card.title || new URL(card.url).hostname;
            filePath = await invoke<string>('create_webloc_file', { url: card.url, title });
          }

          if (filePath) {
            const iconPath = await invoke<string>('create_drag_icon');
            await startDrag({ item: [filePath], icon: iconPath });
          }
        } catch (e) {
          console.error('[Portal] Native drag failed:', e);
        } finally {
          setIsDragging(false);
          // Clear internal drag flag - the URL will be tracked for 2 more seconds
          // as a safety net for edge cases
          setInternalDragActive(false);
        }
      }
    },
    [card, isDragging, isDraggable, isNote]
  );

  const handleMouseUp = useCallback(() => {
    mouseDownPos.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseDownPos.current = null;
  }, []);

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`group relative w-full text-left transition-all duration-300 ease-out hover:-translate-y-1 focus:outline-none cursor-pointer overflow-hidden rounded-2xl ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div
        className="relative overflow-hidden rounded-2xl flex flex-col"
        style={{
          padding: '8px',
          boxShadow: 'var(--card-shadow)',
          border: '1px solid var(--glass-border)',
          /* Force GPU compositing to fix border-radius clipping bug */
          transform: 'translateZ(0)',
          isolation: 'isolate',
        }}
      >
        {/* Blurred background - the beautiful glass effect */}
        {hasImage && (
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <img
              src={card.image!}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-150 blur-2xl saturate-200 opacity-90 rounded-2xl"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-black/20 rounded-2xl" />
          </div>
        )}

        {/* Fallback background for cards without images */}
        {!hasImage && (
          <div
            className="absolute inset-0 rounded-2xl"
            style={{ background: 'var(--color-bg-surface-2)' }}
          />
        )}

        {/* Inner content - image fits naturally */}
        <div className="relative overflow-hidden rounded-xl">
          {hasImage ? (
            <img
              src={card.image!}
              alt={card.title || 'Card thumbnail'}
              className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : isNote ? (
            <div
              className="flex flex-col p-3 min-h-[100px]"
              style={{
                background:
                  'linear-gradient(135deg, var(--color-bg-surface-2) 0%, var(--color-bg-surface-3) 100%)',
              }}
            >
              <h3 className="font-semibold text-sm line-clamp-2 mb-1.5 text-text-primary">
                {card.title || 'Untitled'}
              </h3>
              <p className="text-xs text-text-muted line-clamp-4 flex-1">
                {card.content?.replace(/<[^>]*>/g, '').slice(0, 200) || 'Empty note'}
              </p>
              <div className="absolute bottom-2 right-2">
                <FileText className="w-4 h-4 text-text-muted opacity-50" />
              </div>
            </div>
          ) : (
            <div
              className="flex items-center justify-center min-h-[120px]"
              style={{
                background:
                  'linear-gradient(135deg, var(--color-bg-surface-2) 0%, var(--color-bg-surface-3) 100%)',
              }}
            >
              {card.favicon ? (
                <img
                  src={card.favicon}
                  alt=""
                  className="w-12 h-12 rounded-lg"
                  onError={() => setImageError(true)}
                />
              ) : (
                <Globe className="w-12 h-12 text-text-muted" />
              )}
            </div>
          )}

          {/* External link button */}
          {card.url && (
            <a
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 z-10"
              style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--glass-border)',
              }}
              title={`Open ${domain}`}
            >
              <ExternalLink className="h-3.5 w-3.5 text-text-primary" />
            </a>
          )}

          {/* Pinned indicator */}
          {card.pinned && (
            <div
              className="absolute top-2 right-2 p-1 rounded-full"
              style={{ background: 'var(--color-accent)', color: 'white' }}
            >
              <Pin className="h-3 w-3" />
            </div>
          )}

          {/* Drag handle */}
          {isDraggable && !card.pinned && (
            <div
              className="absolute top-2 left-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
              style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--glass-border)',
              }}
              title="Drag to external apps"
            >
              <GripVertical className="h-3 w-3 text-text-muted" />
            </div>
          )}
        </div>

        {/* Title footer */}
        {card.title && (
          <div className="relative mt-1.5 px-1">
            <h3 className="font-medium text-xs line-clamp-2 text-white/90 group-hover:text-accent transition-colors">
              {card.title}
            </h3>
          </div>
        )}

        {/* Hover glow */}
        <div
          className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10"
          style={{
            background:
              'radial-gradient(ellipse at center, hsl(var(--hue-accent) var(--sat-accent) 50% / 0.4) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
      </div>
    </div>
  );
}
