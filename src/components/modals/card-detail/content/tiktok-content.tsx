'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  getTikTokEmbedData,
  seedTikTokCache,
  type TikTokOEmbed,
} from '@/components/cards/card-item/tiktok-preview';
import type { Card, CardUpdate } from '@/lib/types/convex';
import { useMutations } from '@/lib/contexts/convex-data-context';

interface TikTokContentProps {
  card: Card;
  className?: string;
}

/**
 * Validate that a URL is a TikTok embed URL.
 * Only allows https://www.tiktok.com/embed/v2/{videoId} format.
 */
function isValidTikTokEmbedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow HTTPS
    if (parsed.protocol !== 'https:') return false;
    // Only allow www.tiktok.com
    if (parsed.hostname !== 'www.tiktok.com') return false;
    // Only allow /embed/v2/{videoId} paths
    if (!/^\/embed\/v2\/\d+$/.test(parsed.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function TikTokContent({ card, className }: TikTokContentProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const persistedRef = useRef(false);
  const { updateCard } = useMutations();

  const extractTikTokId = (url: string) => {
    try {
      const parsed = new URL(url);
      const match = parsed.pathname.match(/\/video\/(\d+)/);
      if (match?.[1]) return match[1];
      const id = parsed.searchParams.get('item_id');
      return id || null;
    } catch {
      return null;
    }
  };

  const persistedTikTok = useMemo(() => {
    const metadata = card.metadata;
    if (!metadata || typeof metadata !== 'object') return null;
    const value = (metadata as Record<string, unknown>).tiktok;
    if (!value || typeof value !== 'object') return null;
    return value as TikTokOEmbed;
  }, [card.metadata]);

  useEffect(() => {
    persistedRef.current = false;
  }, [card._id, card.url]);

  useEffect(() => {
    if (!card.url || !persistedTikTok) return;
    seedTikTokCache(card.url, persistedTikTok);
  }, [card.url, persistedTikTok]);

  const persistTikTok = useCallback(
    async (data: TikTokOEmbed, resolvedVideoId: string | null) => {
      if (persistedRef.current) return;

      const needsTitle =
        !card.title || card.title === card.url || card.title.startsWith('http');
      const needsDomain = !card.domain;
      const needsImage = !card.image && !!data.thumbnail_url;
      const needsMetadata =
        !card.metadata ||
        typeof card.metadata !== 'object' ||
        !(card.metadata as Record<string, unknown>).tiktok;

      if (!needsTitle && !needsDomain && !needsImage && !needsMetadata) {
        persistedRef.current = true;
        return;
      }

      const updates: CardUpdate = {};

      if (needsTitle && data.title) {
        updates.title = data.title;
      }

      if (!card.description && data.author_name) {
        updates.description = `@${data.author_name}`;
      }

      if (needsDomain) {
        updates.domain = 'tiktok.com';
      }

      if (needsImage && data.thumbnail_url) {
        updates.image = data.thumbnail_url;
        updates.images = [data.thumbnail_url];
      }

      const existingMetadata =
        card.metadata && typeof card.metadata === 'object'
          ? (card.metadata as Record<string, unknown>)
          : {};

      updates.metadata = {
        ...existingMetadata,
        tiktok: data,
        ...(resolvedVideoId ? { tiktokVideoId: resolvedVideoId } : {}),
      };

      persistedRef.current = true;
      try {
        await updateCard(card._id, updates);
      } catch (error) {
        // Allow retry if persistence fails.
        persistedRef.current = false;
        console.warn('[TikTokContent] Failed to persist TikTok metadata:', card._id, error);
      }
    },
    [card._id, card.description, card.domain, card.image, card.metadata, card.title, card.url, updateCard]
  );

  useEffect(() => {
    if (!card.url) return;
    let active = true;
    const controller = new AbortController();

    setStatus('loading');
    const load = async () => {
      const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
      const theme = isDark ? 'dark' : 'light';

      // Check for persisted video ID first
      const persistedVideoId =
        (card.metadata &&
          typeof card.metadata === 'object' &&
          (card.metadata as Record<string, unknown>).tiktokVideoId) ||
        persistedTikTok?.embed_product_id ||
        null;
      const initialVideoId = typeof persistedVideoId === 'string' ? persistedVideoId : null;

      // If we have a persisted video ID, use it directly
      if (initialVideoId) {
        const url = `https://www.tiktok.com/embed/v2/${initialVideoId}?lang=en&theme=${theme}`;
        if (isValidTikTokEmbedUrl(url.split('?')[0])) {
          setEmbedUrl(url);
          setStatus('ready');
          return;
        }
      }

      // Fetch embed data from API
      const data = await getTikTokEmbedData(card.url!, controller.signal);
      if (!active) return;

      // Extract video ID from API response or URL
      const videoId = data?.embed_product_id || extractTikTokId(card.url!);

      if (videoId) {
        const url = `https://www.tiktok.com/embed/v2/${videoId}?lang=en&theme=${theme}`;
        if (isValidTikTokEmbedUrl(url.split('?')[0])) {
          setEmbedUrl(url);
          setStatus('ready');
          if (data) {
            seedTikTokCache(card.url!, data);
            void persistTikTok(data, videoId);
          }
          return;
        }
      }

      // No valid video ID found
      setEmbedUrl(null);
      setStatus('error');
    };

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [card.metadata, card.url, persistTikTok, persistedTikTok]);

  return (
    <div className={cn('flex-1 overflow-y-auto', className)}>
      <div className="min-h-full w-full flex items-center justify-center px-6 py-8">
        <div className="tiktok-modal">
          {status === 'ready' && embedUrl ? (
            <iframe
              src={embedUrl}
              sandbox="allow-scripts allow-same-origin allow-popups"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="TikTok video"
            />
          ) : (
            <div className="h-56 w-full rounded-lg bg-[var(--color-bg-surface-2)] flex items-center justify-center text-xs text-text-muted">
              {status === 'error' ? 'Unable to load TikTok.' : 'Loading TikTok...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
