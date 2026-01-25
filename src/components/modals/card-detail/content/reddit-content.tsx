'use client';

import { cn } from '@/lib/utils';
import { extractRedditPostId } from '@/lib/utils/url-detection';
import type { Card } from '@/lib/types/convex';
import { RedditPreview } from '@/components/cards/card-item/reddit-preview';

interface RedditContentProps {
  card: Card;
  className?: string;
}

export function RedditContent({ card, className }: RedditContentProps) {
  const postId = card.url ? extractRedditPostId(card.url) : null;

  return (
    <div className={cn('flex-1 overflow-y-auto', className)}>
      {postId ? (
        <div className="min-h-full w-full flex items-center justify-center px-6 py-8">
          <div className="reddit-modal w-full max-w-[640px]">
            <RedditPreview postId={postId} playVideo />
          </div>
        </div>
      ) : (
        <div className="px-6 py-6 text-sm text-text-muted">Unable to load Reddit post.</div>
      )}
    </div>
  );
}
