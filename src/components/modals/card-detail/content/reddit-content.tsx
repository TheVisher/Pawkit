'use client';

import { useMemo } from 'react';
import Image from '@/components/ui/image';
import { cn } from '@/lib/utils';
import { extractRedditPostId } from '@/lib/utils/url-detection';
import type { Card } from '@/lib/types/convex';

interface RedditContentProps {
  card: Card;
  className?: string;
}

// Reddit embed component using direct iframe - more reliable for switching between posts
function RedditEmbed({ permalink, className }: { permalink: string; className?: string }) {
  // Build the embed URL - Reddit's embed format with dark theme
  const embedUrl = `https://www.redditmedia.com${permalink}?ref_source=embed&ref=share&embed=true&showmedia=true&theme=dark`;

  return (
    <div className={cn('w-full flex justify-center', className)}>
      {/* Key prop on iframe forces React to create a new iframe when URL changes */}
      <iframe
        key={permalink}
        src={embedUrl}
        sandbox="allow-scripts allow-same-origin allow-popups"
        className="w-full max-w-[550px] rounded-xl"
        style={{
          height: 'calc(100vh - 180px)',
          maxHeight: '800px',
          minHeight: '400px',
          border: 'none',
          background: '#1a1a1b',
        }}
        title="Reddit post"
      />
    </div>
  );
}

export function RedditContent({ card, className }: RedditContentProps) {
  const postId = card.url ? extractRedditPostId(card.url) : null;
  const hasImage = !!card.image;

  // Extract subreddit from URL
  const subreddit = useMemo(() => {
    if (!card.url) return null;
    try {
      const parsed = new URL(card.url);
      const match = parsed.pathname.match(/\/r\/([^/]+)/i);
      return match?.[1] || null;
    } catch {
      return null;
    }
  }, [card.url]);

  // Build permalink for iframe embed
  const embedPermalink = useMemo(() => {
    if (!card.url) return null;
    try {
      const urlObj = new URL(card.url);
      if (urlObj.hostname.includes('reddit.com')) {
        return urlObj.pathname;
      }
    } catch {
      // Invalid URL
    }
    return null;
  }, [card.url]);

  // Show image-based content if we have an image, otherwise show iframe embed
  return (
    <div className={cn('flex-1 overflow-y-auto', className)}>
      <div className="min-h-full w-full flex items-center justify-center px-6 py-8">
        <div className="reddit-modal w-full max-w-[640px]">
          {hasImage ? (
            // Show image with metadata (similar to FacebookContent)
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center rounded-xl bg-[var(--color-bg-surface-2)] p-3">
                <Image
                  src={card.image!}
                  alt={card.title || 'Reddit post'}
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
              {(card.title || card.description || subreddit) && (
                <div className="px-1">
                  {subreddit && (
                    <div className="text-xs font-medium text-text-muted mb-1">
                      r/{subreddit}
                    </div>
                  )}
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
                </div>
              )}
            </div>
          ) : embedPermalink ? (
            // No image - show iframe embed
            <RedditEmbed permalink={embedPermalink} />
          ) : (
            // Fallback error state
            <div className="h-56 w-full rounded-lg bg-[var(--color-bg-surface-2)] flex items-center justify-center text-xs text-text-muted">
              Unable to load Reddit post.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
