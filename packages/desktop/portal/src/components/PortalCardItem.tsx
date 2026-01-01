/**
 * Portal-specific card item - simplified version without main app dependencies
 * Matches the visual style but avoids React instance conflicts
 * Supports drag OUT to external apps
 */

import { useState } from 'react';
import { Pin, Globe, FileText, ExternalLink, GripVertical } from 'lucide-react';
import type { LocalCard } from '../stores/portal-stores';
import { useDragOut } from '../hooks/use-drag-out';

interface PortalCardItemProps {
  card: LocalCard;
  onClick?: () => void;
}

export function PortalCardItem({ card, onClick }: PortalCardItemProps) {
  const [imageError, setImageError] = useState(false);

  // Drag out hook - provides native file drag
  const { dragProps, isDraggable, isDragging } = useDragOut({ card });

  const hasImage = card.image && !imageError;
  const isNote = card.type === 'md-note' || card.type === 'quick-note';

  // Get display info
  const domain = card.domain || (card.url ? new URL(card.url).hostname.replace('www.', '') : '');

  return (
    <div
      {...dragProps}
      onClick={onClick}
      className={`group relative w-full h-full text-left transition-all duration-300 ease-out hover:-translate-y-1 focus:outline-none cursor-pointer ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div
        className="relative overflow-hidden rounded-2xl h-full flex flex-col"
        style={{
          padding: '8px',
          boxShadow: 'var(--card-shadow)',
          border: '1px solid var(--glass-border)',
        }}
      >
        {/* Blurred background for cards with images */}
        {hasImage && (
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <img
              src={card.image!}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-150 blur-2xl saturate-200 opacity-90"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>
        )}

        {/* Fallback background */}
        {!hasImage && (
          <div
            className="absolute inset-0 rounded-2xl"
            style={{ background: 'var(--color-bg-surface-2)' }}
          />
        )}

        {/* Inner content */}
        <div className="relative flex-1 overflow-hidden rounded-xl">
          {hasImage ? (
            <img
              src={card.image!}
              alt={card.title || 'Card thumbnail'}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : isNote ? (
            /* Note card preview */
            <div
              className="absolute inset-0 flex flex-col p-3 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, var(--color-bg-surface-2) 0%, var(--color-bg-surface-3) 100%)',
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
            /* URL/bookmark placeholder */
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--color-bg-surface-2) 0%, var(--color-bg-surface-3) 100%)',
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

          {/* External link button on hover */}
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

          {/* Drag handle indicator for URL cards */}
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
            <h3 className="font-medium text-xs line-clamp-2 text-white/90 group-hover:text-[var(--color-accent)] transition-colors">
              {card.title}
            </h3>
          </div>
        )}

        {/* Hover glow */}
        <div
          className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(var(--hue-accent) var(--sat-accent) 50% / 0.4) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
      </div>
    </div>
  );
}
