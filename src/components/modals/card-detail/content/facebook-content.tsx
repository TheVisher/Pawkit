'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from '@/components/ui/image';
import { cn } from '@/lib/utils';
import { getFacebookEmbedUrl } from '@/lib/utils/url-detection';
import { buildConvexHttpUrl } from '@/lib/convex-site-url';
import type { Card, CardUpdate } from '@/lib/types/convex';
import { useMutations } from '@/lib/contexts/convex-data-context';

interface FacebookContentProps {
  card: Card;
  className?: string;
}

export function FacebookContent({ card, className }: FacebookContentProps) {
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const hasImage = !!card.image;
  const persistedRef = useRef(false);
  const { updateCard } = useMutations();

  const persistedFacebook = useMemo(() => {
    const metadata = card.metadata;
    if (!metadata || typeof metadata !== 'object') return null;
    const value = (metadata as Record<string, unknown>).facebook;
    if (!value || typeof value !== 'object') return null;
    return value as { resolvedUrl?: string; embedUrl?: string };
  }, [card.metadata]);

  useEffect(() => {
    persistedRef.current = false;
  }, [card._id, card.url]);

  const persistFacebook = useCallback(
    async (resolvedUrl: string, nextEmbedUrl: string | null) => {
      if (persistedRef.current) return;

      const needsDomain = !card.domain;
      const existingMetadata =
        card.metadata && typeof card.metadata === 'object'
          ? (card.metadata as Record<string, unknown>)
          : {};
      const existingFacebook = existingMetadata.facebook;
      const needsMetadata =
        !existingFacebook ||
        typeof existingFacebook !== 'object' ||
        (nextEmbedUrl && (existingFacebook as { embedUrl?: string }).embedUrl !== nextEmbedUrl) ||
        (resolvedUrl && (existingFacebook as { resolvedUrl?: string }).resolvedUrl !== resolvedUrl);

      if (!needsDomain && !needsMetadata) {
        persistedRef.current = true;
        return;
      }

      const updates: CardUpdate = {};
      if (needsDomain) {
        updates.domain = 'facebook.com';
      }
      updates.metadata = {
        ...existingMetadata,
        facebook: {
          ...(typeof existingFacebook === 'object' ? existingFacebook : {}),
          resolvedUrl,
          embedUrl: nextEmbedUrl || undefined,
        },
      };

      persistedRef.current = true;
      try {
        await updateCard(card._id, updates);
      } catch (error) {
        persistedRef.current = false;
        console.warn('[FacebookContent] Failed to persist Facebook metadata:', card._id, error);
      }
    },
    [card._id, card.domain, card.metadata, updateCard]
  );

  useEffect(() => {
    if (hasImage) return;
    if (!card.url) return;
    let active = true;
    setStatus('loading');
    const load = async () => {
      if (persistedFacebook?.embedUrl) {
        if (active) {
          setEmbedUrl(persistedFacebook.embedUrl);
          setStatus('loading');
        }
        return;
      }

      let resolvedUrl = persistedFacebook?.resolvedUrl || card.url!;
      try {
        const res = await fetch(buildConvexHttpUrl(`/api/facebook?url=${encodeURIComponent(card.url!)}`));
        if (res.ok) {
          const data = await res.json();
          if (data?.data?.url) {
            resolvedUrl = data.data.url;
          }
        }
      } catch {
        // ignore
      }

      if (!active) return;
      const url = getFacebookEmbedUrl(resolvedUrl);
      setEmbedUrl(url);
      setStatus(url ? 'loading' : 'error');
      void persistFacebook(resolvedUrl, url);
    };

    void load();
    return () => {
      active = false;
    };
  }, [card.url, hasImage, persistFacebook, persistedFacebook]);

  return (
    <div className={cn('flex-1 overflow-y-auto', className)}>
      <div className="min-h-full w-full flex items-center justify-center px-6 py-8">
        <div className="facebook-modal w-full max-w-[640px]">
          {hasImage ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center rounded-xl bg-[var(--color-bg-surface-2)] p-3">
                <Image
                  src={card.image!}
                  alt={card.title || 'Facebook post'}
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
          ) : status === 'error' || !embedUrl ? (
            <div className="h-56 w-full rounded-lg bg-[var(--color-bg-surface-2)] flex items-center justify-center text-xs text-text-muted">
              Unable to load Facebook.
            </div>
          ) : (
            <iframe
              src={embedUrl}
              title="Facebook post"
              sandbox="allow-scripts allow-same-origin allow-popups"
              allow="autoplay; encrypted-media"
              loading="lazy"
              onLoad={() => setStatus('loading')}
              onError={() => setStatus('error')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
