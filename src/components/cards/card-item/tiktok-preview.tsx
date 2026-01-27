'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from '@/components/ui/image';
import { buildConvexHttpUrl } from '@/lib/convex-site-url';
import { cn } from '@/lib/utils';

// TikTok icon as inline SVG
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

export type TikTokOEmbed = {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  html?: string;
  provider_name?: string;
  embed_product_id?: string;
};

interface TikTokPreviewProps {
  url: string;
  className?: string;
  initialData?: TikTokOEmbed | null;
}

const tiktokCache = new Map<string, TikTokOEmbed>();
const tiktokInFlight = new Map<string, Promise<TikTokOEmbed | null>>();
let tiktokServerUnavailable = false;

export function seedTikTokCache(url: string, data: TikTokOEmbed | null | undefined) {
  if (!data) return;
  tiktokCache.set(url, data);
}

async function fetchTikTokServer(url: string, signal?: AbortSignal): Promise<TikTokOEmbed | null> {
  if (tiktokServerUnavailable) return null;
  try {
    const res = await fetch(buildConvexHttpUrl(`/api/tiktok?url=${encodeURIComponent(url)}`), { signal });
    if (!res.ok) {
      if (res.status === 403 || res.status === 404) {
        tiktokServerUnavailable = true;
      }
      return null;
    }
    const data = await res.json();
    return (data?.data as TikTokOEmbed) || null;
  } catch {
    return null;
  }
}

async function getTikTokData(url: string, signal?: AbortSignal): Promise<TikTokOEmbed | null> {
  const cached = tiktokCache.get(url);
  if (cached) return cached;

  const inFlight = tiktokInFlight.get(url);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const server = await fetchTikTokServer(url, signal);
    if (server) return server;
    return null;
  })();

  tiktokInFlight.set(url, promise);
  const result = await promise;
  tiktokInFlight.delete(url);
  if (result) {
    tiktokCache.set(url, result);
  }
  return result;
}

export function prefetchTikTokData(url: string) {
  void getTikTokData(url);
}

export function TikTokPreview({ url, className, initialData }: TikTokPreviewProps) {
  const [data, setData] = useState<TikTokOEmbed | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const cached = tiktokCache.get(url) || initialData || null;
    if (cached) {
      // Seed the shared cache when we have persisted data.
      seedTikTokCache(url, cached);
      setData(cached);
      setStatus('ready');
      return;
    }

    setStatus('loading');
    const load = async () => {
      const next = await getTikTokData(url, controller.signal);
      if (!active) return;
      setData(next);
      setStatus(next ? 'ready' : 'error');
    };

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [initialData, url]);

  const title = useMemo(() => data?.title?.trim() || '', [data?.title]);
  const author = data?.author_name?.trim() || '';
  const thumbnail = data?.thumbnail_url || '';

  if (!data || status !== 'ready') {
    return (
      <div
        className={cn(
          'h-full w-full min-h-[160px] rounded-lg bg-[var(--color-bg-surface-2)]',
          'flex flex-col items-center justify-center gap-2 text-xs text-text-muted',
          className
        )}
      >
        <TikTokIcon className="h-6 w-6" />
        <span>{status === 'error' ? 'TikTok' : 'Loading…'}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full w-full flex-col gap-3', className)}>
      {author && (
        <div className="text-xs text-text-muted">
          @{author}
        </div>
      )}

      {title && (
        <div className="text-sm font-semibold text-text-primary">
          {title}
        </div>
      )}

      {thumbnail && (
        <div className="relative w-full overflow-hidden rounded-lg" style={{ aspectRatio: 9 / 16 }}>
          <Image
            src={thumbnail}
            alt=""
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60">
              <div className="ml-0.5 h-0 w-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-white" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export async function getTikTokEmbedData(url: string, signal?: AbortSignal) {
  return getTikTokData(url, signal);
}
