'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import DOMPurify from 'dompurify';
import { Globe, Pin, Loader2, Clock, CheckCircle2, AlertTriangle, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LocalCard } from '@/lib/db';
import { calculateReadingTime } from '@/lib/db/schema';
import { TagBadgeList } from '@/components/tags/tag-badge';
import {
  type CardDisplaySettings,
  DEFAULT_CARD_DISPLAY,
  MIN_THUMBNAIL_HEIGHT,
  DEFAULT_ASPECT_RATIO,
  getCardIcon,
  getDomain,
  getLuminance,
  getAverageColor,
  isNoteCard,
} from './types';

interface GridCardProps {
  card: LocalCard;
  onClick?: () => void;
  displaySettings?: Partial<CardDisplaySettings>;
  uniformHeight?: boolean;
}

/**
 * Grid card component - V1 style: blurred padding, glass pill overlay, metadata footer
 * Note: Uses DOMPurify.sanitize() for safe HTML rendering of note content
 */
export function GridCard({
  card,
  onClick,
  displaySettings = {},
  uniformHeight = false,
}: GridCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [isDarkBackground, setIsDarkBackground] = useState(true); // Default to dark (safer for overlays)
  const Icon = getCardIcon(card.type);
  const domain = card.domain || getDomain(card.url);
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
      // The blurred background has a 20% black overlay, so we account for that
      const avgColor = getAverageColor(img);
      if (avgColor) {
        // Apply the 20% black overlay effect to the average color
        const overlayedR = avgColor.r * 0.8;
        const overlayedG = avgColor.g * 0.8;
        const overlayedB = avgColor.b * 0.8;
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

  // Sanitize note content for safe rendering
  const sanitizedContent = isNoteCard(card.type)
    ? DOMPurify.sanitize(card.content || '<p>Empty note</p>')
    : '';

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full text-left',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1',
        'focus:outline-none',
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
          border: '1px solid var(--glass-border)',
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
              className="object-cover scale-150 blur-2xl saturate-200 opacity-90"
              onError={() => setImageError(true)}
            />
            {/* Darken overlay to ensure contrast */}
            <div className="absolute inset-0 bg-black/20" />
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
          ) : isNoteCard(card.type) ? (
            /* Note card preview - title at top, formatted content below */
            <div
              className="absolute inset-0 flex flex-col p-4 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, var(--color-bg-surface-2) 0%, var(--color-bg-surface-3) 100%)`,
              }}
            >
              {/* Note title */}
              <h3
                className="font-semibold text-base line-clamp-2 mb-2 shrink-0"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {card.title || 'Untitled'}
              </h3>
              {/* Formatted content preview - sanitized with DOMPurify */}
              <div
                className="note-card-preview flex-1 overflow-hidden text-sm"
                style={{ color: 'var(--color-text-muted)' }}
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
              />
              {/* Fade overlay at bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
                style={{
                  background: 'linear-gradient(to top, var(--color-bg-surface-2) 0%, transparent 100%)',
                }}
              />
              {/* Small icon in corner */}
              <div className="absolute bottom-3 right-3 z-10">
                <Icon className="w-5 h-5 text-text-muted opacity-50" />
              </div>
            </div>
          ) : (
            /* URL/bookmark placeholder - centered icon or favicon */
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
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm domain-pill"
                style={{
                  background: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(12px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
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
                <span className="truncate max-w-[180px] text-white/90">{domain}</span>
              </div>
            </div>
          )}

          {/* Top right indicators */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {/* Scheduled date indicator */}
            {card.scheduledDate && (
              <div
                className="p-1.5 rounded-full"
                style={{
                  background: 'rgba(59, 130, 246, 0.9)',
                  color: 'white',
                }}
                title={`Scheduled for ${new Date(card.scheduledDate).toLocaleDateString()}`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
              </div>
            )}

            {/* Broken link warning */}
            {card.linkStatus === 'broken' && (
              <div
                className="p-1.5 rounded-full"
                style={{
                  background: 'rgba(239, 68, 68, 0.9)',
                  color: 'white',
                }}
                title="This link may be broken"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
            )}

            {/* Pinned indicator */}
            {card.pinned && (
              <div
                className="p-1.5 rounded-full"
                style={{
                  background: 'var(--color-accent)',
                  color: 'white',
                }}
              >
                <Pin className="h-3.5 w-3.5" />
              </div>
            )}
          </div>

          {/* Reading time and status badges - top left */}
          {!isNoteCard(card.type) && (card.readingTime || card.wordCount || card.isRead) && (() => {
            // Calculate reading time from wordCount if not stored
            const displayReadingTime = card.readingTime || (card.wordCount ? calculateReadingTime(card.wordCount) : 0);

            return (
            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              {displayReadingTime > 0 && !card.isRead && (
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                  style={{
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(8px)',
                    color: 'white',
                  }}
                >
                  <Clock className="h-3 w-3" />
                  <span>{displayReadingTime}m</span>
                </div>
              )}
              {card.isRead && (
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                  style={{
                    background: 'rgba(34, 197, 94, 0.8)',
                    backdropFilter: 'blur(8px)',
                    color: 'white',
                  }}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Read</span>
                </div>
              )}
            </div>
            );
          })()}

          {/* Syncing indicator - only show if no reading badges */}
          {isSyncing && !card.readingTime && !card.wordCount && !card.isRead && (
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

          {/* Reading progress bar - shown for in-progress articles */}
          {!isNoteCard(card.type) && card.readProgress !== undefined && card.readProgress > 0 && !card.isRead && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
              <div
                className="h-full bg-[var(--color-accent)] transition-all duration-300"
                style={{ width: `${card.readProgress}%` }}
              />
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

            {/* Tags with deterministic colors */}
            {settings.showTags && card.tags && card.tags.length > 0 && (
              <div className="mt-1.5">
                <TagBadgeList
                  tags={card.tags}
                  maxVisible={3}
                  size="sm"
                  showLeafOnly
                />
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
