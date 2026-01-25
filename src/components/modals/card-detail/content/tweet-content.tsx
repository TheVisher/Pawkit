'use client';

/**
 * Tweet Content Component
 * Renders an embedded X/Twitter post using react-tweet.
 */

import { useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const embedUrl = useMemo(() => {
    if (!tweetId) return null;
    const url = new URL('https://platform.twitter.com/embed/Tweet.html');
    url.searchParams.set('id', tweetId);
    url.searchParams.set('theme', theme);
    url.searchParams.set('dnt', 'true');
    return url.toString();
  }, [tweetId, theme]);

  return (
    <div className={cn('flex-1 overflow-y-auto px-6 py-4', className)}>
      {embedUrl ? (
        <div
          className="mx-auto w-full max-w-[520px]"
          style={{
            border: '1px solid var(--glass-border)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <iframe
            title="Tweet"
            src={embedUrl}
            className="w-full"
            style={{ height: '560px', border: 0 }}
            allow="clipboard-write; fullscreen; picture-in-picture; autoplay"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="text-sm text-text-muted">Unable to load tweet.</div>
      )}
    </div>
  );
}
