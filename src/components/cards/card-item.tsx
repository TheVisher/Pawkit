'use client';

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import Image from 'next/image';
import { Globe, FileText, StickyNote, Pin, Loader2 } from 'lucide-react';
import type { LocalCard } from '@/lib/db';
import { cn } from '@/lib/utils';

/**
 * Calculate relative luminance of an RGB color
 * Returns value between 0 (black) and 1 (white)
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Sample average color from an image using canvas
 */
function getAverageColor(img: HTMLImageElement): { r: number; g: number; b: number } | null {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Sample at small size for performance
    const size = 50;
    canvas.width = size;
    canvas.height = size;

    ctx.drawImage(img, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size).data;

    let r = 0, g = 0, b = 0;
    const pixelCount = size * size;

    for (let i = 0; i < imageData.length; i += 4) {
      r += imageData[i];
      g += imageData[i + 1];
      b += imageData[i + 2];
    }

    return {
      r: Math.round(r / pixelCount),
      g: Math.round(g / pixelCount),
      b: Math.round(b / pixelCount),
    };
  } catch {
    return null;
  }
}

// Minimum height for cards without images (more substantial)
const MIN_THUMBNAIL_HEIGHT = 180;
// Default aspect ratio (16:10) until image loads
const DEFAULT_ASPECT_RATIO = 16 / 10;

// Card display settings interface
export interface CardDisplaySettings {
  cardPadding: number;        // 0-40 pixels
  showMetadataFooter: boolean; // Show title/tags inside card
  showUrlPill: boolean;       // Show URL pill overlay
  showTitles: boolean;        // Show title text
  showTags: boolean;          // Show tag pills
}

// Default display settings
export const DEFAULT_CARD_DISPLAY: CardDisplaySettings = {
  cardPadding: 10,
  showMetadataFooter: true,
  showUrlPill: true,
  showTitles: true,
  showTags: true,
};

interface CardItemProps {
  card: LocalCard;
  variant?: 'grid' | 'list';
  onClick?: () => void;
  displaySettings?: Partial<CardDisplaySettings>;
  uniformHeight?: boolean; // For grid view - crops images to fit uniform aspect ratio
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
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Card item component - memoized to prevent re-renders when other cards change
 * V1-style design: blurred padding around thumbnail, glass pill overlay, metadata footer
 */
export const CardItem = memo(function CardItem({
  card,
  variant = 'grid',
  onClick,
  displaySettings = {},
  uniformHeight = false,
}: CardItemProps) {
  const [imageError, setImageError] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [isDarkBackground, setIsDarkBackground] = useState(true); // Default to dark (safer for overlays)
  const Icon = getCardIcon(card.type);
  const domain = card.domain || getDomain(card.url);
  const isListView = variant === 'list';
  const isSyncing = !card._synced;

  // Merge with defaults
  const settings: CardDisplaySettings = { ...DEFAULT_CARD_DISPLAY, ...displaySettings };

  const hasImage = card.image && !imageError;
  const hasFavicon = card.favicon && !imageError;

  // Handle image load to get natural dimensions and calculate background brightness
  const handleImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const ratio = img.naturalWidth / img.naturalHeight;
      // Clamp aspect ratio to reasonable bounds (0.5 to 2.5)
      const clampedRatio = Math.max(0.5, Math.min(2.5, ratio));
      setImageAspectRatio(clampedRatio);

      // Calculate average color and determine if background is dark
      // The blurred background has a 30% black overlay, so we account for that
      const avgColor = getAverageColor(img);
      if (avgColor) {
        // Apply the 30% black overlay effect to the average color
        const overlayedR = avgColor.r * 0.7;
        const overlayedG = avgColor.g * 0.7;
        const overlayedB = avgColor.b * 0.7;
        const luminance = getLuminance(overlayedR, overlayedG, overlayedB);
        // If luminance > 0.4, background is light enough to need dark text
        setIsDarkBackground(luminance <= 0.4);
      }
    }
  }, []);

  // Calculate the aspect ratio to use for the thumbnail container
  const thumbnailAspectRatio = hasImage
    ? (imageAspectRatio || DEFAULT_ASPECT_RATIO)
    : DEFAULT_ASPECT_RATIO;

  // Determine if we should show the metadata footer
  const showFooter = settings.showMetadataFooter && (
    (settings.showTitles && card.title) ||
    (settings.showTags && card.tags && card.tags.length > 0)
  );

  // Calculate padding values - bottom has a minimum when footer is shown
  const sidePadding = settings.cardPadding;
  const MIN_FOOTER_PADDING = 8;
  const bottomPadding = showFooter
    ? Math.max(MIN_FOOTER_PADDING, settings.cardPadding)
    : settings.cardPadding;

  // Footer horizontal inset - provides breathing room from thumbnail edge
  const FOOTER_INSET = 4;

  // Grid view - V1 style: blurred padding, glass pill overlay, metadata footer inside
  if (!isListView) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'group relative w-full text-left',
          'transition-all duration-300 ease-out',
          'hover:-translate-y-1',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2',
          'focus:ring-offset-transparent',
          uniformHeight && 'h-full'
        )}
      >
        {/* Outer card container with configurable blurred padding */}
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl",
            uniformHeight && "h-full flex flex-col"
          )}
          style={{
            padding: uniformHeight
              ? `${sidePadding}px`
              : `${sidePadding}px ${sidePadding}px ${bottomPadding}px ${sidePadding}px`,
            boxShadow: 'var(--card-shadow)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Blurred thumbnail background - creates colored blur padding */}
          {hasImage && (
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <Image
                src={card.image!}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 300px"
                className="object-cover scale-125 blur-2xl saturate-150 opacity-80"
                onError={() => setImageError(true)}
              />
              {/* Darken overlay to ensure contrast */}
              <div className="absolute inset-0 bg-black/30" />
            </div>
          )}

          {/* Fallback background for cards without images */}
          {!hasImage && (
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'var(--color-bg-surface-2)',
              }}
            />
          )}

          {/* Inner thumbnail container */}
          <div
            className={cn(
              "relative overflow-hidden rounded-xl",
              uniformHeight && "h-full w-full"
            )}
            style={uniformHeight ? undefined : {
              aspectRatio: hasImage ? thumbnailAspectRatio : undefined,
              minHeight: hasImage ? undefined : MIN_THUMBNAIL_HEIGHT,
            }}
          >
            {/* Thumbnail image or placeholder */}
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
                  background: `linear-gradient(135deg, var(--color-bg-surface-2) 0%, var(--color-bg-surface-3) 100%)`,
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
                  <Icon className="w-16 h-16 text-text-muted" />
                )}
              </div>
            )}

            {/* Glass pill overlay at bottom - CENTERED domain/URL (toggleable) */}
            {settings.showUrlPill && domain && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center px-3">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                  style={{
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(12px) saturate(1.5)',
                    WebkitBackdropFilter: 'blur(12px) saturate(1.5)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {hasFavicon ? (
                    <Image
                      src={card.favicon!}
                      alt=""
                      width={16}
                      height={16}
                      className="rounded-full shrink-0"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <Globe className="h-4 w-4 shrink-0 text-white/70" />
                  )}
                  <span className="truncate text-white/90 max-w-[180px]">{domain}</span>
                </div>
              </div>
            )}

            {/* Pinned indicator */}
            {card.pinned && (
              <div
                className="absolute top-3 right-3 p-1.5 rounded-full"
                style={{
                  background: 'var(--color-accent)',
                  color: 'white',
                }}
              >
                <Pin className="h-3.5 w-3.5" />
              </div>
            )}

            {/* Syncing indicator */}
            {isSyncing && (
              <div
                className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                style={{
                  background: 'rgba(0, 0, 0, 0.6)',
                  backdropFilter: 'blur(8px)',
                  color: 'white',
                }}
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Syncing</span>
              </div>
            )}
          </div>

          {/* Metadata footer - INSIDE the card, below thumbnail (toggleable) */}
          {showFooter && (
            <div
              className="relative mt-2"
              style={{ paddingLeft: FOOTER_INSET, paddingRight: FOOTER_INSET }}
            >
              {/* Title - dynamic color based on background brightness */}
              {settings.showTitles && card.title && (
                <h3
                  className={cn(
                    'font-medium text-sm line-clamp-2 transition-colors',
                    'group-hover:text-[var(--color-accent)]'
                  )}
                  style={{
                    color: hasImage
                      ? (isDarkBackground ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.85)')
                      : 'var(--color-text-primary)',
                  }}
                >
                  {card.title}
                </h3>
              )}

              {/* Tags - dynamic color based on background brightness */}
              {settings.showTags && card.tags && card.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {card.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-[11px] font-medium rounded-md"
                      style={{
                        background: hasImage
                          ? (isDarkBackground ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)')
                          : 'var(--color-bg-surface-3)',
                        color: hasImage
                          ? (isDarkBackground ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.75)')
                          : 'var(--color-text-secondary)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                  {card.tags.length > 3 && (
                    <span
                      className="px-2 py-0.5 text-[11px] font-medium rounded-md"
                      style={{
                        background: hasImage
                          ? (isDarkBackground ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)')
                          : 'var(--color-bg-surface-3)',
                        color: hasImage
                          ? (isDarkBackground ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.75)')
                          : 'var(--color-text-secondary)',
                      }}
                    >
                      +{card.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hover glow effect - gradient glow around the card */}
          <div
            className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10"
            style={{
              background: `radial-gradient(ellipse at center, hsl(var(--hue-accent) var(--sat-accent) 50% / 0.4) 0%, transparent 70%)`,
              filter: 'blur(20px)',
            }}
          />
        </div>
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
        background: 'var(--glass-panel-bg)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--card-shadow)',
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
            className="rounded-full"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: 'var(--glass-bg)' }}
          >
            <Icon className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
          </div>
        )}
      </div>

      {/* Title */}
      {settings.showTitles && (
        <h3
          className={cn(
            'flex-1 font-medium text-sm truncate transition-colors',
            'group-hover:text-[var(--color-accent)]'
          )}
          style={{ color: 'var(--text-primary)' }}
        >
          {card.title || 'Untitled'}
        </h3>
      )}

      {/* Domain - Pill shaped */}
      {settings.showUrlPill && domain && (
        <span
          className="px-2 py-0.5 rounded-full text-xs truncate max-w-[150px]"
          style={{
            background: 'var(--glass-bg)',
            color: 'var(--text-muted)',
          }}
        >
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
        <Pin className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
      )}

      {/* Tags - Pill shaped */}
      {settings.showTags && card.tags && card.tags.length > 0 && (
        <div className="flex gap-1">
          {card.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-[10px] font-medium rounded-full"
              style={{
                background: 'var(--glass-bg)',
                color: 'var(--text-muted)',
              }}
            >
              {tag}
            </span>
          ))}
          {card.tags.length > 2 && (
            <span
              className="px-2 py-0.5 text-[10px] font-medium rounded-full"
              style={{
                background: 'var(--glass-bg)',
                color: 'var(--text-muted)',
              }}
            >
              +{card.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Hover glow effect */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          boxShadow: 'var(--card-glow)',
        }}
      />

      {/* Hover border */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          border: '1px solid var(--card-glow-border)',
        }}
      />
    </button>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders when card content hasn't changed
  const prevSettings = { ...DEFAULT_CARD_DISPLAY, ...prevProps.displaySettings };
  const nextSettings = { ...DEFAULT_CARD_DISPLAY, ...nextProps.displaySettings };

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
    JSON.stringify(prevProps.card.tags) === JSON.stringify(nextProps.card.tags) &&
    // Compare display settings
    prevSettings.cardPadding === nextSettings.cardPadding &&
    prevSettings.showMetadataFooter === nextSettings.showMetadataFooter &&
    prevSettings.showUrlPill === nextSettings.showUrlPill &&
    prevSettings.showTitles === nextSettings.showTitles &&
    prevSettings.showTags === nextSettings.showTags &&
    prevProps.uniformHeight === nextProps.uniformHeight
  );
});
