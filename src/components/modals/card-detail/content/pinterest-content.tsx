'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from '@/components/ui/image';
import { cn } from '@/lib/utils';
import { extractPinterestPinId, getPinterestEmbedUrl } from '@/lib/utils/url-detection';
import { buildConvexHttpUrl } from '@/lib/convex-site-url';
import type { Card, CardUpdate } from '@/lib/types/convex';
import { useMutations } from '@/lib/contexts/convex-data-context';

interface PinterestContentProps {
  card: Card;
  className?: string;
}

/**
 * Validate that a URL is a valid Pinterest embed URL.
 * Only allows https://assets.pinterest.com/ext/embed.html?id={pinId}
 */
function isValidPinterestEmbedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow HTTPS
    if (parsed.protocol !== 'https:') return false;
    // Only allow assets.pinterest.com
    if (parsed.hostname !== 'assets.pinterest.com') return false;
    // Only allow /ext/embed.html path
    if (parsed.pathname !== '/ext/embed.html') return false;
    // Must have id parameter
    const id = parsed.searchParams.get('id');
    if (!id || !/^[a-zA-Z0-9]+$/.test(id)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that a permalink URL is a valid Pinterest URL.
 */
function isValidPinterestPermalink(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    return hostname.includes('pinterest.') || hostname === 'pin.it';
  } catch {
    return false;
  }
}

export function PinterestContent({ card, className }: PinterestContentProps) {
  const embedRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState<number | null>(null);
  const hasImage = !!card.image;
  const persistedRef = useRef(false);
  const { updateCard } = useMutations();

  const persistedPinterest = useMemo(() => {
    const metadata = card.metadata;
    if (!metadata || typeof metadata !== 'object') return null;
    const value = (metadata as Record<string, unknown>).pinterest;
    if (!value || typeof value !== 'object') return null;
    return value as { id?: string | null; url?: string };
  }, [card.metadata]);

  useEffect(() => {
    persistedRef.current = false;
  }, [card._id, card.url]);

  const persistPinterest = useCallback(
    async (resolved: { id?: string | null; url: string }) => {
      if (persistedRef.current) return;

      const needsDomain = !card.domain;
      const existingMetadata =
        card.metadata && typeof card.metadata === 'object'
          ? (card.metadata as Record<string, unknown>)
          : {};
      const existingPinterest = existingMetadata.pinterest;
      const needsMetadata =
        !existingPinterest ||
        typeof existingPinterest !== 'object' ||
        (resolved.id && (existingPinterest as { id?: string | null }).id !== resolved.id) ||
        (resolved.url && (existingPinterest as { url?: string }).url !== resolved.url);

      if (!needsDomain && !needsMetadata) {
        persistedRef.current = true;
        return;
      }

      const updates: CardUpdate = {};
      if (needsDomain) {
        updates.domain = 'pinterest.com';
      }
      updates.metadata = {
        ...existingMetadata,
        pinterest: {
          ...(typeof existingPinterest === 'object' ? existingPinterest : {}),
          id: resolved.id ?? (typeof existingPinterest === 'object' ? (existingPinterest as any).id : undefined),
          url: resolved.url,
        },
      };

      persistedRef.current = true;
      try {
        await updateCard(card._id, updates);
      } catch (error) {
        persistedRef.current = false;
        console.warn('[PinterestContent] Failed to persist Pinterest metadata:', card._id, error);
      }
    },
    [card._id, card.domain, card.metadata, updateCard]
  );

  useEffect(() => {
    if (hasImage) return;
    if (!card.url || !embedRef.current) return;
    let active = true;
    setStatus('loading');
    const load = async () => {
      const persistedId = persistedPinterest?.id;
      if (persistedId) {
        const embedUrl = `https://assets.pinterest.com/ext/embed.html?id=${persistedId}`;
        if (active && isValidPinterestEmbedUrl(embedUrl)) {
          setIframeUrl(embedUrl);
        }
        return;
      }

      let resolvedUrl = persistedPinterest?.url || card.url!;
      const directId = extractPinterestPinId(card.url!);
      if (directId) {
        const embedUrl = `https://assets.pinterest.com/ext/embed.html?id=${directId}`;
        if (active && isValidPinterestEmbedUrl(embedUrl)) {
          setIframeUrl(embedUrl);
        }
        void persistPinterest({ id: directId, url: resolvedUrl });
        return;
      }

      try {
        const res = await fetch(buildConvexHttpUrl(`/api/pinterest?url=${encodeURIComponent(card.url!)}`));
        if (res.ok) {
          const data = await res.json();
          const resolvedId = data?.data?.id;
          const nextUrl = data?.data?.url;
          if (nextUrl) {
            resolvedUrl = nextUrl;
          }
          if (resolvedId) {
            const embedUrl = `https://assets.pinterest.com/ext/embed.html?id=${resolvedId}`;
            if (active && isValidPinterestEmbedUrl(embedUrl)) {
              setIframeUrl(embedUrl);
            }
            void persistPinterest({ id: resolvedId, url: resolvedUrl });
            return;
          }
        }
      } catch {
        // ignore
      }

      if (!active) return;
      setIframeUrl(null);
      const permalink = getPinterestEmbedUrl(resolvedUrl);
      // Validate permalink URL before using
      if (!permalink || !isValidPinterestPermalink(permalink)) {
        setStatus('error');
        return;
      }

      const container = embedRef.current;
      if (!container) return;
      container.innerHTML = '';

      const anchor = document.createElement('a');
      anchor.setAttribute('data-pin-do', 'embedPin');
      anchor.setAttribute('href', permalink);
      anchor.setAttribute('data-pin-width', 'large');
      anchor.setAttribute('data-pin-terse', 'true');
      container.appendChild(anchor);

      const buildPins = () => {
        const pinUtils = (window as any).PinUtils;
        if (pinUtils?.build) {
          pinUtils.build();
        }
      };

      const existing = document.querySelector('script[src="https://assets.pinterest.com/js/pinit.js"]');
      if (!existing) {
        const script = document.createElement('script');
        script.src = 'https://assets.pinterest.com/js/pinit.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (!active) return;
          buildPins();
        };
        document.body.appendChild(script);
      } else {
        buildPins();
      }

      void persistPinterest({ id: null, url: resolvedUrl });
    };

    void load();

    return () => {
      active = false;
      if (embedRef.current) {
        embedRef.current.innerHTML = '';
      }
    };
  }, [card.url, hasImage, persistPinterest, persistedPinterest]);

  useEffect(() => {
    if (hasImage) return;
    if (typeof window === 'undefined') return;
    const computeHeight = () => {
      const width = Math.min(window.innerWidth * 0.92, 560);
      const max = Math.min(window.innerHeight * 0.9, 820);
      const min = 360;
      const prefersTall = card.aspectRatio && card.aspectRatio < 0.8;
      return Math.min(max, Math.max(min, prefersTall ? max : max * 0.78));
    };
    const update = () => setIframeHeight(computeHeight());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [card.aspectRatio, hasImage]);

  return (
    <div className={cn('flex-1 overflow-y-auto', className)}>
      <div className="min-h-full w-full flex items-center justify-center px-6 py-8">
        <div className="pinterest-modal w-full max-w-[640px]">
          {hasImage ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center rounded-xl bg-[var(--color-bg-surface-2)] p-3">
                <Image
                  src={card.image!}
                  alt={card.title || 'Pinterest pin'}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '72vh',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    borderRadius: '12px',
                  }}
                />
              </div>
              {(card.title || card.description || card.domain) && (
                <div className="px-1">
                  {card.title && (
                    <div className="text-base font-semibold text-text-primary">
                      {card.title}
                    </div>
                  )}
                  {card.description && (
                    <div className="mt-1 text-sm text-text-muted line-clamp-3">
                      {card.description}
                    </div>
                  )}
                  {card.domain && (
                    <div className="mt-2 text-[11px] uppercase tracking-wide text-text-muted">
                      {card.domain}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : status === 'error' ? (
            <div className="h-56 w-full rounded-lg bg-[var(--color-bg-surface-2)] flex items-center justify-center text-xs text-text-muted">
              Unable to load Pinterest.
            </div>
          ) : iframeUrl ? (
            <iframe
              src={iframeUrl}
              title="Pinterest pin"
              sandbox="allow-scripts allow-same-origin allow-popups"
              allow="fullscreen"
              loading="lazy"
              style={iframeHeight ? { height: `${iframeHeight}px` } : undefined}
              onLoad={() => setStatus('loading')}
              onError={() => setStatus('error')}
            />
          ) : (
            <div ref={embedRef} />
          )}
        </div>
      </div>
    </div>
  );
}
