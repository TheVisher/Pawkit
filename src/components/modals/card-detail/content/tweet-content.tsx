'use client';

/**
 * Tweet Content Component
 * Renders an embedded X/Twitter post using the official widgets.js embed.
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { extractTweetId } from '@/lib/utils/url-detection';
import type { Card } from '@/lib/types/convex';

interface TweetContentProps {
  card: Card;
  className?: string;
}

export function TweetContent({ card, className }: TweetContentProps) {
  const tweetId = card.url ? extractTweetId(card.url) : null;
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const embedRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const resolveTheme = () =>
      document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')
        ? 'dark'
        : 'light';

    setTheme(resolveTheme());

    const observer = new MutationObserver(() => {
      setTheme(resolveTheme());
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!tweetId || !embedRef.current) return;
    if (import.meta.env.DEV && !initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    const container = embedRef.current;
    const embedKey = `${tweetId}:${theme}`;
    if (container.dataset.tweetKey === embedKey && container.childElementCount > 0) return;
    container.dataset.tweetKey = embedKey;
    container.innerHTML = '';

    const load = async () => {
      if (!document.querySelector('script[src="https://platform.twitter.com/widgets.js"]')) {
        await new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://platform.twitter.com/widgets.js';
          script.async = true;
          script.onload = () => resolve();
          document.body.appendChild(script);
        });
      }

      const twttr = (window as { twttr?: { widgets?: { createTweet: (id: string, el: HTMLElement, opts?: Record<string, unknown>) => Promise<unknown> } } }).twttr;
      if (!twttr?.widgets?.createTweet || !embedRef.current) return;

      await twttr.widgets.createTweet(tweetId, container, {
        theme,
        dnt: true,
        align: 'center',
      });
    };

    load();
  }, [tweetId, theme]);

  return (
    <div className={cn('flex-1 overflow-y-auto', className)}>
      {tweetId ? (
        <div className="min-h-full w-full flex items-center justify-center px-6 py-8">
          <div
            ref={embedRef}
            className="tweet-modal w-full max-w-[560px]"
            style={{ minHeight: '200px' }}
          />
        </div>
      ) : (
        <div className="px-6 py-6 text-sm text-text-muted">Unable to load tweet.</div>
      )}
    </div>
  );
}
