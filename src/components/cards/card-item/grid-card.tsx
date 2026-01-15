'use client';

import { useState, useCallback, useMemo, useEffect, useRef, startTransition } from 'react';
import Image from 'next/image';
import DOMPurify from 'dompurify';
import {
  Globe,
  Pin,
  AlertTriangle,
  ExternalLink,
  Phone,
  Mail,
  MessageSquare,
  Video,
  ShoppingCart,
  Shield,
  Gift,
} from 'lucide-react';
import {
  getActionsForTags,
  extractContactInfo,
  extractSubscriptionInfo,
  extractRecipeInfo,
  extractReadingInfo,
  extractMeetingInfo,
  extractWishlistInfo,
  extractWarrantyInfo,
} from '@/lib/tags/supertags';
import { SyncStatusIndicator } from '@/components/cards/sync-status-indicator';
import { cn } from '@/lib/utils';
import type { LocalCard } from '@/lib/db';
import { TagBadgeList } from '@/components/tags/tag-badge';
import { getSystemTagsForCard } from '@/lib/utils/system-tags';
import type { SystemTag } from '@/lib/utils/system-tags';
import { useDataStore } from '@/lib/stores/data-store';
import { useDataContext } from '@/lib/contexts/data-context';
import { getCardPrivacy } from '@/lib/services/privacy';
import { SYSTEM_TAGS } from '@/lib/constants/system-tags';
import { useImageColorWorker, isImageWorkerSupported } from '@/lib/hooks/use-image-color-worker';
import {
  type CardDisplaySettings,
  DEFAULT_CARD_DISPLAY,
  MIN_THUMBNAIL_HEIGHT,
  DEFAULT_ASPECT_RATIO,
  getCardIcon,
  getDomain,
  getLuminance,
  isNoteCard,
} from './types';

// Icon mapping for action icons
const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  'external-link': ExternalLink,
  'phone': Phone,
  'mail': Mail,
  'message-square': MessageSquare,
  'video': Video,
  'shopping-cart': ShoppingCart,
  'shield': Shield,
  'gift': Gift,
};

// Extract all info from content based on tags
function extractAllInfo(content: string, tags: string[]): Record<string, string | undefined> {
  const info: Record<string, string | undefined> = {};
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));

  if (tagSet.has('contact')) {
    const contactInfo = extractContactInfo(content);
    if (contactInfo.phone) info.phone = contactInfo.phone;
    if (contactInfo.email) info.email = contactInfo.email;
  }

  if (tagSet.has('subscription')) {
    const subInfo = extractSubscriptionInfo(content);
    if (subInfo.websiteUrl) info.websiteUrl = subInfo.websiteUrl;
    if (subInfo.accountEmail) info.accountEmail = subInfo.accountEmail;
  }

  if (tagSet.has('recipe')) {
    const recipeInfo = extractRecipeInfo(content);
    if (recipeInfo.sourceUrl) info.sourceUrl = recipeInfo.sourceUrl;
  }

  if (tagSet.has('reading')) {
    const readingInfo = extractReadingInfo(content);
    if (readingInfo.storeUrl) info.storeUrl = readingInfo.storeUrl;
  }

  if (tagSet.has('meeting')) {
    const meetingInfo = extractMeetingInfo(content);
    if (meetingInfo.meetingUrl) info.meetingUrl = meetingInfo.meetingUrl;
  }

  if (tagSet.has('wishlist')) {
    const wishlistInfo = extractWishlistInfo(content);
    if (wishlistInfo.storeUrl) info.storeUrl = wishlistInfo.storeUrl;
  }

  if (tagSet.has('warranty')) {
    const warrantyInfo = extractWarrantyInfo(content);
    if (warrantyInfo.supportUrl) info.supportUrl = warrantyInfo.supportUrl;
    if (warrantyInfo.supportPhone) info.supportPhone = warrantyInfo.supportPhone;
    if (warrantyInfo.supportEmail) info.supportEmail = warrantyInfo.supportEmail;
  }

  return info;
}

interface GridCardProps {
  card: LocalCard;
  onClick?: () => void;
  displaySettings?: Partial<CardDisplaySettings>;
  uniformHeight?: boolean;
  /** Called when a user tag in the footer is clicked (for filtering) */
  onTagClick?: (tag: string) => void;
  /** Called when a system tag in the footer is clicked (for filtering) */
  onSystemTagClick?: (tag: SystemTag) => void;
  /** Prioritize this card's image for LCP (use for first ~6 visible cards) */
  priority?: boolean;
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
  onTagClick,
  onSystemTagClick,
  priority = false,
}: GridCardProps) {
  const [imageError, setImageError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [isDarkBackground, setIsDarkBackground] = useState(true); // Default to dark (safer for overlays)
  const cardRef = useRef<HTMLButtonElement>(null);
  const Icon = getCardIcon(card.type);

  // Reset error states when card or image/favicon changes
  useEffect(() => {
    setImageError(false);
  }, [card.id, card.image]);

  useEffect(() => {
    setFaviconError(false);
  }, [card.id, card.favicon]);
  const domain = card.domain || getDomain(card.url);

  // Worker hook for off-main-thread color extraction
  const { extractImageData } = useImageColorWorker();
  const updateCard = useDataStore((s) => s.updateCard);
  const { collections } = useDataContext();
  const processingRef = useRef(false);
  const idleCallbackIdRef = useRef<number | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Merge with defaults
  const settings: CardDisplaySettings = { ...DEFAULT_CARD_DISPLAY, ...displaySettings };

  const hasImage = card.image && !imageError;
  const hasFavicon = card.favicon && !faviconError;

  // Effect: Process cards without dominantColor/aspectRatio/blurDataUri using Web Worker
  // This runs once per card and persists the result to DB
  // NOTE: New cards now get aspectRatio extracted at creation time via metadata-service.ts
  // This effect handles legacy cards that were created before that optimization
  useEffect(() => {
    // Skip if: no image, already has all cached data, already processing, or worker not supported
    // We check aspectRatio as the primary indicator since it affects layout stability
    if (!card.image || (card.aspectRatio && card.blurDataUri) || processingRef.current || !isImageWorkerSupported()) {
      return;
    }

    processingRef.current = true;

    // Use requestIdleCallback for non-blocking processing
    const processImage = async () => {
      const result = await extractImageData(card.id, card.image!);
      if (result) {
        // Persist to DB using startTransition for low-priority update
        // This prevents blocking scroll/interactions while React applies the state change
        startTransition(() => {
          updateCard(card.id, {
            dominantColor: result.dominantColor,
            aspectRatio: result.aspectRatio,
            blurDataUri: result.blurDataUri,
          });
        });
      }
      processingRef.current = false;
    };

    // Defer processing with short timeout (100ms) to avoid blocking scroll
    // Previous 5000ms timeout caused accumulated callbacks to block when user resumed scrolling
    if ('requestIdleCallback' in window) {
      idleCallbackIdRef.current = requestIdleCallback(() => {
        idleCallbackIdRef.current = null;
        processImage();
      }, { timeout: 100 });
    } else {
      // Fallback for Safari - use setTimeout with cleanup
      timeoutIdRef.current = setTimeout(() => {
        timeoutIdRef.current = null;
        processImage();
      }, 50);
    }

    // Cleanup: cancel pending callbacks on unmount to prevent stale processing
    return () => {
      if (idleCallbackIdRef.current !== null && 'cancelIdleCallback' in window) {
        cancelIdleCallback(idleCallbackIdRef.current);
        idleCallbackIdRef.current = null;
      }
      if (timeoutIdRef.current !== null) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };
  }, [card.id, card.image, card.aspectRatio, card.blurDataUri, extractImageData, updateCard]);

  // Use cached dominantColor to determine background brightness
  useEffect(() => {
    if (card.dominantColor) {
      // Parse hex color
      const hex = card.dominantColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      // Apply 20% black overlay effect and calculate luminance
      const overlayedR = r * 0.8;
      const overlayedG = g * 0.8;
      const overlayedB = b * 0.8;
      const luminance = getLuminance(overlayedR, overlayedG, overlayedB);
      setIsDarkBackground(luminance <= 0.4);
    }
  }, [card.dominantColor]);


  // Handle image load - now only updates local aspect ratio state
  // Color extraction is handled by the effect above via Web Worker
  const handleImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const ratio = img.naturalWidth / img.naturalHeight;
      // Clamp aspect ratio to reasonable bounds (0.5 to 2.5)
      const clampedRatio = Math.max(0.5, Math.min(2.5, ratio));
      setImageAspectRatio(clampedRatio);
    }
  }, []);

  // Calculate the aspect ratio to use for the thumbnail container
  // Prefer cached aspectRatio from DB, then measured, then default
  const thumbnailAspectRatio = hasImage
    ? (card.aspectRatio || imageAspectRatio || DEFAULT_ASPECT_RATIO)
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

  // Sanitize note content for safe rendering (memoized to avoid parsing on every render)
  const sanitizedContent = useMemo(
    () => isNoteCard(card.type) ? DOMPurify.sanitize(card.content || '<p>Empty note</p>') : '',
    [card.content, card.type]
  );

  // Get actions for this card based on its tags
  const actions = useMemo(
    () => getActionsForTags(card.tags || []),
    [card.tags]
  );

  // Extract all relevant info from content
  const extractedInfo = useMemo(
    () => extractAllInfo(card.content || '', card.tags || []),
    [card.content, card.tags]
  );

  // Build list of available quick actions (only those with extracted values)
  const availableActions = useMemo(() => {
    const result: Array<{
      id: string;
      label: string;
      icon: string;
      href: string;
      isExternal?: boolean;
    }> = [];

    // Special handling for contact cards (call, email, sms)
    const isContactCard = (card.tags || []).some((t) => t.toLowerCase() === 'contact');
    if (isContactCard && extractedInfo.phone) {
      result.push({ id: 'call', label: 'Call', icon: 'phone', href: `tel:${extractedInfo.phone}` });
      result.push({ id: 'sms', label: 'Message', icon: 'message-square', href: `sms:${extractedInfo.phone}` });
    }
    if (isContactCard && extractedInfo.email) {
      result.push({ id: 'email', label: 'Email', icon: 'mail', href: `mailto:${extractedInfo.email}` });
    }

    // Process other supertag actions
    for (const action of actions) {
      // Skip contact actions (handled specially above)
      if (action.id === 'call' || action.id === 'email' || action.id === 'sms') continue;

      const fieldValue = action.field ? extractedInfo[action.field] : undefined;
      if (!fieldValue) continue;

      const protocol = action.protocol || '';
      const href = protocol ? `${protocol}${fieldValue}` : fieldValue;
      const isExternal = !protocol || protocol === 'https://';

      result.push({
        id: action.id,
        label: action.label,
        icon: action.icon || 'external-link',
        href,
        isExternal,
      });
    }

    return result;
  }, [actions, extractedInfo, card.tags]);

  const hasQuickActions = availableActions.length > 0;

  // Cache system tags (memoized to avoid recomputation on every render)
  const systemTags = useMemo(
    () => getSystemTagsForCard(card),
    [card.tags, card.scheduledDate, card.isRead, card.readProgress]
  );

  // Compute display tags with inherited privacy indicators
  // Cards inherit privacy from their Pawkits but don't have the tag directly
  const displayTags = useMemo(() => {
    const baseTags = card.tags || [];
    const privacy = getCardPrivacy(card, collections);

    // If privacy is inherited from Pawkit (not from direct tag), add virtual tags for display
    if (privacy.source === 'pawkit') {
      const extraTags: string[] = [];
      if (privacy.isPrivate && !baseTags.includes(SYSTEM_TAGS.PRIVATE)) {
        extraTags.push(SYSTEM_TAGS.PRIVATE);
      }
      if (privacy.isLocalOnly && !baseTags.includes(SYSTEM_TAGS.LOCAL_ONLY)) {
        extraTags.push(SYSTEM_TAGS.LOCAL_ONLY);
      }
      if (extraTags.length > 0) {
        return [...extraTags, ...baseTags];
      }
    }
    return baseTags;
  }, [card, collections]);


  return (
    <button
      ref={cardRef}
      onClick={onClick}
      className={cn(
        'group relative w-full text-left',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1',
        'focus:outline-none',
        uniformHeight && 'h-full'
      )}
      style={{
        // CSS containment: isolate this card's layout/paint from affecting others
        // Reduces paint scope and enables browser optimizations
        contain: 'layout style paint',
      }}
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
        {/* Blurred thumbnail background using tiny data URI (~500 bytes)
            Data URIs don't trigger LCP measurement, so blur loads instantly with cards
            16x16 JPEG is visually identical when CSS blur(32px) is applied */}
        {hasImage && (
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            {/* Instant placeholder: solid color background using cached dominantColor
                Renders immediately while blur data URI loads (Fabric-style UX) */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: card.dominantColor || 'var(--color-bg-surface-2)',
              }}
            />
            {/* Blurred image layer - uses tiny data URI (no LCP impact) */}
            {card.blurDataUri && (
              <div
                className="absolute inset-[-20px] scale-110"
                aria-hidden="true"
                style={{
                  backgroundImage: `url(${card.blurDataUri})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(32px) saturate(2)',
                  opacity: 0.9,
                }}
              />
            )}
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
              className="object-cover"
              onError={() => setImageError(true)}
              onLoad={handleImageLoad}
              priority={priority}
              loading={priority ? undefined : 'lazy'}
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
                  onError={() => setFaviconError(true)}
                />
              ) : (
                <Icon className="w-16 h-16 text-text-muted" />
              )}
            </div>
          )}

          {/* Hover-reveal link button - opens URL directly */}
          {card.url && (
            <a
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'absolute bottom-3 right-3 p-2 rounded-lg',
                'opacity-0 group-hover:opacity-100',
                'translate-y-1 group-hover:translate-y-0',
                'transition-all duration-200 ease-out',
                'hover:scale-110 active:scale-95',
                'z-10'
              )}
              style={{
                background: 'var(--glass-bg)',
                backdropFilter: `blur(var(--glass-blur)) saturate(var(--glass-saturate))`,
                WebkitBackdropFilter: `blur(var(--glass-blur)) saturate(var(--glass-saturate))`,
                border: '1px solid var(--glass-border)',
              }}
              title={`Open ${domain || 'link'}`}
            >
              {hasFavicon ? (
                <Image
                  src={card.favicon!}
                  alt=""
                  width={18}
                  height={18}
                  className="rounded-sm"
                  onError={() => setFaviconError(true)}
                />
              ) : (
                <ExternalLink className="h-4.5 w-4.5" style={{ color: 'var(--color-text-primary)' }} />
              )}
            </a>
          )}

          {/* Quick actions - centered at bottom of thumbnail */}
          {hasQuickActions && (
            <div
              className={cn(
                'absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5',
                'opacity-0 group-hover:opacity-100',
                'translate-y-1 group-hover:translate-y-0',
                'transition-all duration-200 ease-out',
                'z-10'
              )}
            >
              {availableActions.map((action) => {
                const IconComponent = ACTION_ICONS[action.icon] || ExternalLink;
                return (
                  <a
                    key={action.id}
                    href={action.href}
                    target={action.isExternal ? '_blank' : undefined}
                    rel={action.isExternal ? 'noopener noreferrer' : undefined}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      'p-2 rounded-lg',
                      'hover:scale-110 active:scale-95',
                      'transition-transform duration-150'
                    )}
                    style={{
                      background: 'var(--glass-bg)',
                      backdropFilter: `blur(var(--glass-blur)) saturate(var(--glass-saturate))`,
                      WebkitBackdropFilter: `blur(var(--glass-blur)) saturate(var(--glass-saturate))`,
                      border: '1px solid var(--glass-border)',
                    }}
                    title={action.label}
                  >
                    <IconComponent className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
                  </a>
                );
              })}
            </div>
          )}

          {/* Top right indicators - only broken link and pinned (scheduled moved to footer as system tag) */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
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

          {/* Sync status indicator - top left (shows queued, syncing, or failed) */}
          <SyncStatusIndicator
            cardId={card.id}
            isSynced={card._synced}
            variant="pill"
          />

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

            {/* Tags - system tags (read, scheduled, reading time) + user tags (with inherited privacy) */}
            {settings.showTags && (() => {
              // Show tags section if we have any tags (system or user/privacy)
              if (systemTags.length === 0 && displayTags.length === 0) return null;
              return (
                <div className="mt-1.5">
                  <TagBadgeList
                    tags={displayTags}
                    systemTags={systemTags}
                    maxVisible={4}
                    size="sm"
                    showLeafOnly
                    onTagClick={onTagClick}
                    onSystemTagClick={onSystemTagClick}
                  />
                </div>
              );
            })()}
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
