'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getTikTokEmbedData } from '@/components/cards/card-item/tiktok-preview';
import type { Card } from '@/lib/types/convex';

interface TikTokContentProps {
  card: Card;
  className?: string;
}

export function TikTokContent({ card, className }: TikTokContentProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const embedRef = useRef<HTMLDivElement | null>(null);
  const renderIdRef = useRef(0);

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

  useEffect(() => {
    if (!card.url) return;
    let active = true;
    const controller = new AbortController();

    setStatus('loading');
    const load = async () => {
      const data = await getTikTokEmbedData(card.url!, controller.signal);
      if (!active) return;
      const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
      const videoId = data?.embed_product_id || extractTikTokId(card.url!);
      if (videoId) {
        const theme = isDark ? 'dark' : 'light';
        setEmbedUrl(`https://www.tiktok.com/embed/v2/${videoId}?lang=en&theme=${theme}`);
        setHtml(null);
        setStatus('ready');
        return;
      }

      if (data?.html) {
        let themedHtml = data.html;
        themedHtml = themedHtml.replace(/<script[^>]*src="https:\/\/www\.tiktok\.com\/embed\.js"[^>]*><\/script>/i, '');
        if (isDark) {
          if (/data-theme=/i.test(themedHtml)) {
            themedHtml = themedHtml.replace(/data-theme="[^"]*"/i, 'data-theme="dark"');
          } else {
            themedHtml = themedHtml.replace(
              /<blockquote\s+class="tiktok-embed"/i,
              '<blockquote class="tiktok-embed" data-theme="dark" data-embed-theme="dark"'
            );
          }
          if (!/data-embed-theme=/i.test(themedHtml)) {
            themedHtml = themedHtml.replace(/<blockquote\s+class="tiktok-embed"/i, '<blockquote class="tiktok-embed" data-embed-theme="dark"');
          }
        }
        themedHtml = themedHtml.replace(/<blockquote([^>]*?)\sstyle="[^"]*"/i, '<blockquote$1');
        setHtml(themedHtml);
        setEmbedUrl(null);
        setStatus('ready');
      } else {
        setHtml(null);
        setEmbedUrl(null);
        setStatus('error');
      }
    };

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [card.url]);

  useEffect(() => {
    if (!html || !embedRef.current) return;
    const currentRenderId = ++renderIdRef.current;
    const container = embedRef.current;
    container.innerHTML = html;

    const applySizing = () => {
      const blockquote = container.querySelector<HTMLElement>('.tiktok-embed');
      if (blockquote) {
        blockquote.removeAttribute('style');
        blockquote.style.width = '100%';
        blockquote.style.height = '100%';
        blockquote.style.maxWidth = 'none';
        blockquote.style.minWidth = '0';
        blockquote.style.margin = '0';
        blockquote.style.background = '#0b0b0b';
        blockquote.style.borderRadius = '14px';
        blockquote.style.overflow = 'hidden';
      }

      const iframe = container.querySelector<HTMLIFrameElement>('iframe');
      if (iframe) {
        iframe.removeAttribute('style');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = '0';
        iframe.style.background = '#0b0b0b';
      }
    };

    const injectScript = () => {
      const existing = document.querySelector('script[src="https://www.tiktok.com/embed.js"]');
      if (existing) {
        existing.remove();
      }
      const script = document.createElement('script');
      script.src = 'https://www.tiktok.com/embed.js';
      script.async = true;
      script.onload = () => {
        if (renderIdRef.current !== currentRenderId) {
          container.innerHTML = '';
          return;
        }
        applySizing();
      };
      document.body.appendChild(script);
    };

    const observer = new MutationObserver(() => {
      applySizing();
    });

    observer.observe(container, { childList: true, subtree: true });
    applySizing();
    injectScript();

    return () => {
      renderIdRef.current++;
      observer.disconnect();
      container.innerHTML = '';
    };
  }, [html]);

  return (
    <div className={cn('flex-1 overflow-y-auto', className)}>
      <div className="min-h-full w-full flex items-center justify-center px-6 py-8">
        <div className="tiktok-modal">
          {status === 'ready' && embedUrl ? (
            <iframe
              src={embedUrl}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              title="TikTok video"
            />
          ) : status === 'ready' && html ? (
            <div ref={embedRef} />
          ) : (
            <div className="h-56 w-full rounded-lg bg-[var(--color-bg-surface-2)] flex items-center justify-center text-xs text-text-muted">
              {status === 'error' ? 'Unable to load TikTok.' : 'Loading TikTok…'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
