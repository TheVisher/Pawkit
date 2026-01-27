'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Image from '@/components/ui/image';
import DOMPurify from 'dompurify';
import { TweetPreview } from './tweet-preview';
import { RedditPreview } from './reddit-preview';
import {
  TikTokPreview,
  prefetchTikTokData,
  seedTikTokCache,
  type TikTokOEmbed,
} from './tiktok-preview';
import { InstagramPreview, prefetchInstagramEmbed } from './instagram-preview';
import { PinterestPreview, prefetchPinterestEmbed } from './pinterest-preview';
import { FacebookPreview } from './facebook-preview';
import { useModalStore } from '@/lib/stores/modal-store';
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
import { cn } from '@/lib/utils';
import { buildConvexHttpUrl } from '@/lib/convex-site-url';
import type { Card, CardUpdate } from '@/lib/types/convex';
import { TagBadgeList } from '@/components/tags/tag-badge';
import { getSystemTagsForCard } from '@/lib/utils/system-tags';
import type { SystemTag } from '@/lib/utils/system-tags';
import { useMutations } from '@/lib/contexts/convex-data-context';
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
import { isPlateJson, parseJsonContent, plateToHtml } from '@/lib/plate/html-to-plate';
import {
  extractRedditPostId,
  extractTweetId,
  isFacebookUrl,
  isInstagramUrl,
  isPinterestUrl,
  isTikTokUrl,
} from '@/lib/utils/url-detection';

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
// Note: All extract functions now support both Plate JSON and HTML formats
function extractAllInfo(content: unknown, tags: string[]): Record<string, string | undefined> {
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
  card: Card;
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
  const [faviconSrc, setFaviconSrc] = useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [isDarkBackground, setIsDarkBackground] = useState(true); // Default to dark (safer for overlays)
  const cardRef = useRef<HTMLButtonElement | HTMLDivElement>(null);
  const Icon = getCardIcon(card.type);

  // Reset error states when card or image/favicon changes
  useEffect(() => {
    setImageError(false);
  }, [card._id, card.image]);

  useEffect(() => {
    setFaviconError(false);
  }, [card._id, card.favicon]);
  const domain = card.domain || (card.url ? getDomain(card.url) : undefined);

  // Worker hook for off-main-thread color extraction
  const { extractImageData } = useImageColorWorker();
  const { updateCard } = useMutations();
  const processingRef = useRef(false);
  const idleCallbackIdRef = useRef<number | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Merge with defaults
  const settings: CardDisplaySettings = { ...DEFAULT_CARD_DISPLAY, ...displaySettings };

  const tweetId = card.url ? extractTweetId(card.url) : null;
  const redditPostId = card.url ? extractRedditPostId(card.url) : null;
  const isTweet = !!tweetId;
  const isReddit = !!redditPostId;
  const isTikTok = !!card.url && isTikTokUrl(card.url);
  const isInstagram = !!card.url && isInstagramUrl(card.url);
  const instagramAspectRatio = card.aspectRatio || 4 / 5;
  const isPinterest = !!card.url && isPinterestUrl(card.url);
  const isFacebook = !!card.url && isFacebookUrl(card.url);
  const isEmbedCard = isTweet || isReddit || isTikTok || isInstagram || isPinterest || isFacebook;
  const hasImage = card.image && !imageError;
  const fallbackFavicon = isReddit
    ? 'https://www.reddit.com/favicon.ico'
    : isTweet
      ? 'https://abs.twimg.com/favicons/twitter.2.ico'
      : isTikTok
        ? 'https://www.tiktok.com/favicon.ico'
        : isInstagram
          ? 'https://www.instagram.com/favicon.ico'
          : isPinterest
            ? 'https://www.pinterest.com/favicon.ico'
            : isFacebook
              ? 'https://www.facebook.com/favicon.ico'
            : null;

  useEffect(() => {
    setFaviconError(false);
    setFaviconSrc(card.favicon || fallbackFavicon);
  }, [card._id, card.favicon, fallbackFavicon]);

  const hasFavicon = !!faviconSrc && !faviconError;
  const showBlurBackground = hasImage && !isEmbedCard;

  const handleFaviconError = useCallback(() => {
    if (card.favicon && fallbackFavicon && faviconSrc === card.favicon) {
      setFaviconSrc(fallbackFavicon);
      return;
    }
    setFaviconError(true);
  }, [card.favicon, fallbackFavicon, faviconSrc]);

  const handleInstagramPrefetch = useCallback(() => {
    prefetchInstagramEmbed();
  }, []);

  const handlePinterestPrefetch = useCallback(() => {
    prefetchPinterestEmbed();
  }, []);

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
      const result = await extractImageData(card._id, card.image!);
      if (result) {
        // Persist to DB - updates trigger Convex subscription which updates the UI
        // Note: Previously used startTransition but it was causing updates to be
        // deferred indefinitely, preventing Convex reactivity from working
        updateCard(card._id, {
          dominantColor: result.dominantColor,
          aspectRatio: result.aspectRatio,
          blurDataUri: result.blurDataUri,
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
  }, [card._id, card.image, card.aspectRatio, card.blurDataUri, extractImageData, updateCard]);

  // Effect: Re-fetch metadata for URL cards that don't have it
  // This handles cards where Convex's simple scraper failed (Reddit, TikTok, etc.)
  // Uses the Next.js API route which has site-specific handlers
  const metadataFetchRef = useRef(false);
  useEffect(() => {
    // Only process URL cards that need metadata
    if (card.type !== 'url' || !card.url) return;

    // Skip if already has proper metadata (title that's not just the URL, and has image)
    const hasProperTitle = card.title && card.title !== card.url && !card.title.startsWith('http');
    if (hasProperTitle && card.image) return;

    // Skip if already fetching or previously attempted
    if (metadataFetchRef.current) return;

    // Skip if status indicates we shouldn't retry (avoid infinite loops)
    if (card.status === 'READY' && hasProperTitle) return;

    metadataFetchRef.current = true;

    const fetchMetadata = async () => {
      try {
        const response = await fetch(buildConvexHttpUrl('/api/metadata'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: card.url }),
        });

        if (!response.ok) return;

        const metadata = await response.json();

        // Only update if we got useful data
        if (metadata.title || metadata.image) {
          // Update card - Convex subscription will trigger UI refresh
          updateCard(card._id, {
            ...(metadata.title && { title: metadata.title }),
            ...(metadata.description && { description: metadata.description }),
            ...(metadata.image && { image: metadata.image }),
            ...(metadata.images && { images: metadata.images }),
            ...(metadata.favicon && { favicon: metadata.favicon }),
            ...(metadata.domain && { domain: metadata.domain }),
            status: 'READY',
          });
        }
      } catch (error) {
        console.warn('[GridCard] Metadata re-fetch failed:', card._id, error);
      }
    };

    // Delay to avoid overwhelming the API during initial render
    const timeoutId = setTimeout(fetchMetadata, 500 + Math.random() * 1000);
    return () => clearTimeout(timeoutId);
  }, [card._id, card.type, card.url, card.title, card.image, card.status, updateCard]);

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
  // Special case: YouTube thumbnails (sddefault/hqdefault) are 4:3 with letterboxing
  // Force 16:9 for YouTube so object-cover crops out the black bars
  const isYouTubeThumbnail = card.image?.includes('ytimg.com') || card.image?.includes('youtube.com');
  const YOUTUBE_ASPECT_RATIO = 16 / 9;

  const thumbnailAspectRatio = hasImage
    ? (isYouTubeThumbnail ? YOUTUBE_ASPECT_RATIO : (card.aspectRatio || imageAspectRatio || DEFAULT_ASPECT_RATIO))
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

  // Extract note content for preview - handles both Plate JSON and legacy HTML
  const sanitizedContent = useMemo(() => {
    if (!isNoteCard(card.type)) return '';
    const content = card.content || '';
    if (!content) return '<p>Empty note</p>';
    if (Array.isArray(content) && content.length === 0) return '<p>Empty note</p>';

    // Check if content is Plate JSON
    if (isPlateJson(content)) {
      const parsed = parseJsonContent(content);
      if (parsed) {
        // Convert Plate JSON to HTML for formatted preview
        const html = plateToHtml(parsed);
        return html ? DOMPurify.sanitize(html) : '<p>Empty note</p>';
      }
    }

    // Fallback to HTML sanitization for legacy content
    if (typeof content !== 'string') return '<p>Empty note</p>';
    return DOMPurify.sanitize(content);
  }, [card.content, card.type]);

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
    [card.tags, card.scheduledDates, card.isRead, card.readProgress]
  );

  // Display tags - just use the card's tags directly
  const displayTags = useMemo(() => {
    return card.tags || [];
  }, [card.tags]);


  // Handle click with FLIP animation support
  // GridCard handles opening the card detail modal directly for FLIP animation
  // The onClick prop should NOT open the modal - it's for additional behavior only
  const openCardDetailWithRect = useModalStore((s) => s.openCardDetailWithRect);
  const handleCardClick = useCallback((event?: React.MouseEvent) => {
    if (isTweet && event?.target instanceof HTMLElement) {
      const target = event.target;
      if (
        target.closest('video') ||
        target.closest('button') ||
        target.closest('[aria-label="View video on X"]') ||
        target.closest('[class*="videoButton"]')
      ) {
        return;
      }
    }
    // Capture bounding rect for FLIP animation
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      openCardDetailWithRect(card._id, rect);
    }
    // Note: We don't call onClick here anymore since it was typically used to open the modal
    // which is now handled internally. If additional behavior is needed, it should be
    // implemented differently (e.g., via a separate callback prop).
  }, [card._id, isTweet, openCardDetailWithRect]);

  const redditSubreddit = useMemo(() => {
    if (!isReddit || !card.url) return null;
    try {
      const parsed = new URL(card.url);
      const match = parsed.pathname.match(/\/r\/([^/]+)/i);
      return match?.[1] || null;
    } catch {
      return null;
    }
  }, [card.url, isReddit]);

  const redditPersistedRef = useRef(false);
  useEffect(() => {
    redditPersistedRef.current = false;
  }, [card._id, redditPostId]);

  const persistRedditPost = useCallback(
    async (post: {
      id: string;
      title?: string;
      selftext?: string;
      domain?: string;
      media?: Array<{ type: string; url: string }>;
    }) => {
      if (!isReddit || redditPersistedRef.current) return;

      const imageUrls = (post.media || [])
        .filter((item) => item.type === 'image' && item.url)
        .map((item) => item.url);

      const needsTitle = !card.title || card.title === card.url || card.title.startsWith('http');
      const needsImage = !card.image && imageUrls.length > 0;
      const needsDomain = !card.domain && post.domain;

      if (!needsTitle && !needsImage && !needsDomain) {
        redditPersistedRef.current = true;
        return;
      }

      const updates: CardUpdate = {};

      if (needsTitle && post.title) {
        updates.title = post.title;
      }

      if (!card.description && post.selftext) {
        updates.description = post.selftext.trim().slice(0, 280);
      }

      if (needsDomain && post.domain) {
        updates.domain = post.domain;
      }

      if (needsImage && imageUrls[0]) {
        updates.image = imageUrls[0];
        updates.images = imageUrls;
      }

      const existingMetadata =
        card.metadata && typeof card.metadata === 'object'
          ? (card.metadata as Record<string, unknown>)
          : {};
      updates.metadata = {
        ...existingMetadata,
        reddit: post,
      };

      if (Object.keys(updates).length === 0) {
        redditPersistedRef.current = true;
        return;
      }

      redditPersistedRef.current = true;
      try {
        await updateCard(card._id, updates);
      } catch (error) {
        // Allow a retry later if the mutation fails.
        redditPersistedRef.current = false;
        console.warn('[GridCard] Failed to persist reddit metadata:', card._id, error);
      }
    },
    [card._id, card.description, card.domain, card.image, card.metadata, card.title, card.url, isReddit, updateCard]
  );

  const redditFallback = useMemo(() => {
    if (!isReddit) return undefined;
    const images = card.images?.length ? card.images : card.image ? [card.image] : [];
    const media = images.map((url) => ({ type: 'image', url }));
    return {
      id: redditPostId || undefined,
      title: card.title || (redditSubreddit ? `r/${redditSubreddit}` : 'Reddit post'),
      selftext: card.description,
      permalink: card.url,
      url: card.url,
      domain: card.domain || 'reddit.com',
      subreddit: redditSubreddit || undefined,
      subreddit_name_prefixed: redditSubreddit ? `r/${redditSubreddit}` : undefined,
      media,
    };
  }, [
    card.description,
    card.domain,
    card.image,
    card.images,
    card.title,
    card.url,
    isReddit,
    redditPostId,
    redditSubreddit,
  ]);

  const tiktokInitialData = useMemo(() => {
    if (!isTikTok || !card.metadata || typeof card.metadata !== 'object') return null;
    const value = (card.metadata as Record<string, unknown>).tiktok;
    if (!value || typeof value !== 'object') return null;
    return value as TikTokOEmbed;
  }, [card.metadata, isTikTok]);

  const handleTikTokPrefetch = useCallback(() => {
    if (card.url) {
      if (tiktokInitialData) {
        seedTikTokCache(card.url, tiktokInitialData);
      }
      prefetchTikTokData(card.url);
    }
  }, [card.url, tiktokInitialData]);

  const cardShell = (
    <>
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
        {showBlurBackground && (
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
        {!showBlurBackground && (
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
            aspectRatio: !isEmbedCard && hasImage
              ? thumbnailAspectRatio
              : isInstagram
                ? instagramAspectRatio
                : isPinterest
                  ? card.aspectRatio || 2 / 3
                  : isFacebook
                    ? card.aspectRatio || 1
                  : undefined,
            minHeight: !isEmbedCard && hasImage
              ? undefined
              : isInstagram
                ? undefined
                : isPinterest
                  ? undefined
                  : isFacebook
                    ? undefined
                : MIN_THUMBNAIL_HEIGHT,
          }}
        >
          {/* Thumbnail image or placeholder */}
          {isTweet ? (
            <TweetPreview tweetId={tweetId!} />
          ) : isReddit ? (
            <RedditPreview postId={redditPostId!} eager={false} fallback={redditFallback} url={card.url} />
          ) : isTikTok && card.url ? (
            <TikTokPreview url={card.url} initialData={tiktokInitialData} />
          ) : isInstagram ? (
            <InstagramPreview title={card.title} image={card.image} aspectRatio={instagramAspectRatio} />
          ) : isPinterest ? (
            <PinterestPreview title={card.title} image={card.image} aspectRatio={card.aspectRatio || 2 / 3} />
          ) : isFacebook ? (
            <FacebookPreview title={card.title} image={card.image} aspectRatio={card.aspectRatio || 1} />
          ) : hasImage ? (
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
                  src={faviconSrc!}
                  alt=""
                  width={64}
                  height={64}
                  className="rounded-xl"
                  onError={handleFaviconError}
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
                  src={faviconSrc!}
                  alt=""
                  width={18}
                  height={18}
                  className="rounded-sm"
                  onError={handleFaviconError}
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

      </div>
    </>
  );

  if (isEmbedCard) {
    return (
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onPointerEnter={
          isTikTok
            ? handleTikTokPrefetch
            : isInstagram
              ? handleInstagramPrefetch
              : isPinterest
                ? handlePinterestPrefetch
                : undefined
        }
        onFocus={
          isTikTok
            ? handleTikTokPrefetch
            : isInstagram
              ? handleInstagramPrefetch
              : isPinterest
                ? handlePinterestPrefetch
                : undefined
        }
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleCardClick();
          }
        }}
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
        contain: 'layout style',
      }}
    >
      {/* Hover glow effect - accent glow around card edges */}
      <div
        className="absolute inset-0 rounded-[22px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10"
        style={{
          boxShadow: `0 0 20px hsl(var(--hue-accent) var(--sat-accent) 55% / 0.45)`,
        }}
      />
      {cardShell}
    </div>
  );
}

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={handleCardClick}
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
        contain: 'layout style',
      }}
    >
      {/* Hover glow effect - accent glow around card edges */}
      <div
        className="absolute inset-0 rounded-[22px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10"
        style={{
          boxShadow: `0 0 20px hsl(var(--hue-accent) var(--sat-accent) 55% / 0.45)`,
        }}
      />
      {cardShell}
    </button>
  );
}
