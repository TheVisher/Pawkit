'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getInstagramEmbedUrl } from '@/lib/utils/url-detection';
import type { Card } from '@/lib/types/convex';

interface InstagramContentProps {
  card: Card;
  className?: string;
}

/**
 * Validate that a permalink URL is a valid Instagram URL.
 */
function isValidInstagramPermalink(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    return hostname === 'www.instagram.com' || hostname === 'instagram.com';
  } catch {
    return false;
  }
}

export function InstagramContent({ card, className }: InstagramContentProps) {
  const embedRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    if (!card.url || !embedRef.current) return;
    let active = true;
    setStatus('loading');
    const permalink = getInstagramEmbedUrl(card.url);
    // Validate permalink URL before using
    if (!permalink || !isValidInstagramPermalink(permalink)) {
      if (active) setStatus('error');
      return;
    }

    const container = embedRef.current;
    container.innerHTML = '';

    const blockquote = document.createElement('blockquote');
    blockquote.className = 'instagram-media';
    blockquote.setAttribute('data-instgrm-permalink', permalink);
    blockquote.setAttribute('data-instgrm-version', '14');
    blockquote.style.width = '100%';
    blockquote.style.margin = '0';
    container.appendChild(blockquote);

    const processEmbeds = () => {
      const instgrm = (window as any).instgrm;
      if (instgrm?.Embeds?.process) {
        instgrm.Embeds.process();
      }
    };

    const existing = document.querySelector('script[src="https://www.instagram.com/embed.js"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      script.onload = () => {
        if (!active) return;
        processEmbeds();
      };
      document.body.appendChild(script);
    } else {
      processEmbeds();
    }

    return () => {
      active = false;
      container.innerHTML = '';
    };
  }, [card.url]);

  return (
    <div className={cn('flex-1 overflow-y-auto', className)}>
      <div className="min-h-full w-full flex items-center justify-center px-6 py-8">
        <div className="instagram-modal w-full max-w-[560px]">
          {status === 'error' ? (
            <div className="h-56 w-full rounded-lg bg-[var(--color-bg-surface-2)] flex items-center justify-center text-xs text-text-muted">
              Unable to load Instagram.
            </div>
          ) : (
            <div ref={embedRef} />
          )}
        </div>
      </div>
    </div>
  );
}
