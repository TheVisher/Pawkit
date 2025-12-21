'use client';

import { useState, useCallback, memo } from 'react';
import Image from 'next/image';
import { Globe, FileText, StickyNote, Pin, Loader2 } from 'lucide-react';
import type { LocalCard } from '@/lib/db';
import { cn } from '@/lib/utils';

// Minimum height for cards without images (more substantial)
const MIN_THUMBNAIL_HEIGHT = 180;
// Default aspect ratio (16:10) until image loads
const DEFAULT_ASPECT_RATIO = 16 / 10;

interface CardItemProps {
  card: LocalCard;
  variant?: 'grid' | 'list';
  onClick?: () => void;
}

function getCardIcon(type: string) {
  switch (type) {
    case 'url':
      return Globe;
    case 'md-note':
    case 'text-note':
      return FileText;
    case 'quick-note':
      return StickyNote;
    default:
      return Globe;
  }
}

function getDomain(url: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/**
 * Card item component - memoized to prevent re-renders when other cards change
 */
export const CardItem = memo(function CardItem({ card, variant = 'grid', onClick }: CardItemProps) {
  const [imageError, setImageError] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const Icon = getCardIcon(card.type);
  const domain = card.domain || getDomain(card.url);
  const isListView = variant === 'list';
  const isSyncing = !card._synced;

  const hasImage = card.image && !imageError;
  const hasFavicon = card.favicon && !imageError;

  // Handle image load to get natural dimensions
  const handleImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const ratio = img.naturalWidth / img.naturalHeight;
      // Clamp aspect ratio to reasonable bounds (0.5 to 2.5)
      // This prevents super tall or super wide cards
      const clampedRatio = Math.max(0.5, Math.min(2.5, ratio));
      setImageAspectRatio(clampedRatio);
    }
  }, []);

  // Calculate the aspect ratio to use for the thumbnail container
  const thumbnailAspectRatio = hasImage
    ? (imageAspectRatio || DEFAULT_ASPECT_RATIO)
    : DEFAULT_ASPECT_RATIO;

  // Grid view - vertical card with thumbnail on top
  if (!isListView) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'group relative w-full text-left rounded-2xl overflow-hidden',
          'transition-all duration-300 ease-out',
          'hover:-translate-y-1',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'focus:ring-offset-[var(--bg-base)]'
        )}
        style={{
          background: 'var(--bg-surface-2)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--card-shadow, 0 2px 8px rgba(0, 0, 0, 0.08))',
        }}
      >
        {/* Colored blur background effect - uses thumbnail as blurred background */}
        {hasImage && (
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <Image
              src={card.image!}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 300px"
              className="object-cover scale-110 blur-3xl opacity-30 saturate-150"
              onError={() => setImageError(true)}
            />
          </div>
        )}

        {/* Card content container */}
        <div className="relative flex flex-col backdrop-blur-sm">
          {/* Thumbnail / Image */}
          <div
            className="relative overflow-hidden"
            style={{
              aspectRatio: hasImage ? thumbnailAspectRatio : undefined,
              minHeight: hasImage ? undefined : MIN_THUMBNAIL_HEIGHT,
            }}
          >
            {hasImage ? (
              <Image
                src={card.image!}
                alt={card.title || 'Card thumbnail'}
                fill
                sizes="(max-width: 768px) 100vw, 300px"
                priority
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                onError={() => setImageError(true)}
                onLoad={handleImageLoad}
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, var(--bg-surface-2) 0%, var(--bg-surface-3) 100%)`,
                }}
              >
                {hasFavicon ? (
                  <Image
                    src={card.favicon!}
                    alt=""
                    width={64}
                    height={64}
                    className="rounded-xl"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <Icon className="w-16 h-16" style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
            )}

            {/* Pinned indicator */}
            {card.pinned && (
              <div
                className="absolute top-2 right-2 p-1.5 rounded-full"
                style={{
                  background: 'hsla(var(--accent-h) var(--accent-s) var(--accent-l) / 0.9)',
                  color: 'white',
                }}
              >
                <Pin className="h-3 w-3" />
              </div>
            )}

            {/* Syncing indicator - compact spinner, expands on hover */}
            {isSyncing && (
              <div
                className="absolute top-2 left-2 flex items-center gap-1.5 px-1.5 py-1.5 rounded-full text-xs transition-all duration-200 hover:px-2.5 hover:gap-1.5 group/sync"
                style={{
                  background: 'rgba(0, 0, 0, 0.6)',
                  backdropFilter: 'blur(8px)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover/sync:max-w-[60px]">
                  Syncing
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-3">
            {/* Title */}
            <h3
              className={cn(
                'font-medium text-sm line-clamp-2 transition-colors',
                'group-hover:text-[var(--ds-accent)]'
              )}
              style={{ color: 'var(--text-primary)' }}
            >
              {card.title || 'Untitled'}
            </h3>

            {/* Domain / URL */}
            {domain && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                {hasFavicon ? (
                  <Image
                    src={card.favicon!}
                    alt=""
                    width={12}
                    height={12}
                    className="rounded-sm"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <Globe className="h-3 w-3" />
                )}
                <span className="truncate">{domain}</span>
              </div>
            )}

            {/* Tags */}
            {card.tags && card.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {card.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded"
                    style={{
                      background: 'var(--bg-surface-1)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
                {card.tags.length > 3 && (
                  <span
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded"
                    style={{
                      background: 'var(--bg-surface-1)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    +{card.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Hover glow effect */}
        <div
          className={cn(
            'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl'
          )}
          style={{
            boxShadow: '0 0 30px hsla(var(--accent-h) var(--accent-s) 50% / 0.3), 0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        />

        {/* Border highlight on hover */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            border: '1px solid hsla(var(--accent-h) var(--accent-s) 50% / 0.5)',
          }}
        />
      </button>
    );
  }

  // List view - horizontal compact row
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative text-left w-full rounded-xl overflow-hidden',
        'flex items-center gap-4 p-3',
        'transition-all duration-200 ease-out',
        'hover:translate-x-1',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'focus:ring-offset-[var(--bg-base)]'
      )}
      style={{
        background: 'var(--bg-surface-2)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--card-shadow, 0 2px 8px rgba(0, 0, 0, 0.08))',
      }}
    >
      {/* Favicon / Icon */}
      <div className="flex-shrink-0">
        {hasFavicon ? (
          <Image
            src={card.favicon!}
            alt=""
            width={20}
            height={20}
            className="rounded"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ background: 'var(--bg-surface-1)' }}
          >
            <Icon className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
          </div>
        )}
      </div>

      {/* Title */}
      <h3
        className={cn(
          'flex-1 font-medium text-sm truncate transition-colors',
          'group-hover:text-[var(--ds-accent)]'
        )}
        style={{ color: 'var(--text-primary)' }}
      >
        {card.title || 'Untitled'}
      </h3>

      {/* Domain */}
      {domain && (
        <span className="text-xs truncate max-w-[150px]" style={{ color: 'var(--text-muted)' }}>
          {domain}
        </span>
      )}

      {/* Syncing indicator */}
      {isSyncing && (
        <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          <Loader2 className="h-3 w-3 animate-spin" />
        </div>
      )}

      {/* Pinned */}
      {card.pinned && (
        <Pin className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--ds-accent)' }} />
      )}

      {/* Tags */}
      {card.tags && card.tags.length > 0 && (
        <div className="flex gap-1">
          {card.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded"
              style={{
                background: 'var(--bg-surface-1)',
                color: 'var(--text-muted)',
              }}
            >
              {tag}
            </span>
          ))}
          {card.tags.length > 2 && (
            <span
              className="px-1.5 py-0.5 text-[10px] font-medium rounded"
              style={{
                background: 'var(--bg-surface-1)',
                color: 'var(--text-muted)',
              }}
            >
              +{card.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Hover border */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          border: '1px solid hsla(var(--accent-h) var(--accent-s) 50% / 0.5)',
        }}
      />
    </button>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders when card content hasn't changed
  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.card.title === nextProps.card.title &&
    prevProps.card.image === nextProps.card.image &&
    prevProps.card.favicon === nextProps.card.favicon &&
    prevProps.card.domain === nextProps.card.domain &&
    prevProps.card.url === nextProps.card.url &&
    prevProps.card.pinned === nextProps.card.pinned &&
    prevProps.card._synced === nextProps.card._synced &&
    prevProps.card.status === nextProps.card.status &&
    prevProps.card.type === nextProps.card.type &&
    prevProps.variant === nextProps.variant &&
    JSON.stringify(prevProps.card.tags) === JSON.stringify(nextProps.card.tags)
  );
})
