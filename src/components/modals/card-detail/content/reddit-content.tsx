'use client';

import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { extractRedditPostId } from '@/lib/utils/url-detection';
import type { CardUpdate, Card } from '@/lib/types/convex';
import { RedditPreview } from '@/components/cards/card-item/reddit-preview';
import { useMutations } from '@/lib/contexts/convex-data-context';

interface RedditContentProps {
  card: Card;
  className?: string;
}

export function RedditContent({ card, className }: RedditContentProps) {
  const postId = card.url ? extractRedditPostId(card.url) : null;
  const { updateCard } = useMutations();
  const subreddit =
    card.url && card.url.includes('/r/')
      ? (() => {
          try {
            const parsed = new URL(card.url);
            const match = parsed.pathname.match(/\/r\/([^/]+)/i);
            return match?.[1] || null;
          } catch {
            return null;
          }
        })()
      : null;

  const persistedRef = useRef(false);
  useEffect(() => {
    persistedRef.current = false;
  }, [card._id, postId]);

  const handlePersist = useCallback(
    async (post: {
      title?: string;
      selftext?: string;
      domain?: string;
      media?: Array<{ type: string; url: string }>;
    }) => {
      if (!postId || persistedRef.current) return;

      const imageUrls = (post.media || [])
        .filter((item) => item.type === 'image' && item.url)
        .map((item) => item.url);

      const needsTitle = !card.title || card.title === card.url || card.title.startsWith('http');
      const needsImage = !card.image && imageUrls.length > 0;
      const needsDomain = !card.domain && post.domain;

      if (!needsTitle && !needsImage && !needsDomain) {
        persistedRef.current = true;
        return;
      }

      const updates: CardUpdate = {};

      if (needsTitle && post.title) {
        updates.title = post.title;
      }

      if (!card.description && post.selftext) {
        updates.description = post.selftext.trim().slice(0, 280);
      }

      if (needsDomain && post.domain) {
        updates.domain = post.domain;
      }

      if (needsImage && imageUrls[0]) {
        updates.image = imageUrls[0];
        updates.images = imageUrls;
      }

      const existingMetadata =
        card.metadata && typeof card.metadata === 'object'
          ? (card.metadata as Record<string, unknown>)
          : {};
      updates.metadata = {
        ...existingMetadata,
        reddit: post,
      };

      if (Object.keys(updates).length === 0) {
        persistedRef.current = true;
        return;
      }

      persistedRef.current = true;
      try {
        await updateCard(card._id, updates);
      } catch (error) {
        persistedRef.current = false;
        console.warn('[RedditContent] Failed to persist reddit metadata:', card._id, error);
      }
    },
    [card._id, card.description, card.domain, card.image, card.metadata, card.title, card.url, postId, updateCard]
  );

  return (
    <div className={cn('flex-1 overflow-y-auto', className)}>
      {postId ? (
        <div className="min-h-full w-full flex items-center justify-center px-6 py-8">
          <div className="reddit-modal w-full max-w-[640px]">
            <RedditPreview
              postId={postId}
              playVideo
              url={card.url}
              onPersist={handlePersist}
              fallback={{
                id: postId,
                title: card.title || (subreddit ? `r/${subreddit}` : 'Reddit post'),
                selftext: card.description,
                permalink: card.url,
                url: card.url,
                domain: card.domain || 'reddit.com',
                subreddit: subreddit || undefined,
                subreddit_name_prefixed: subreddit ? `r/${subreddit}` : undefined,
                media: (card.images?.length ? card.images : card.image ? [card.image] : []).map((url) => ({
                  type: 'image',
                  url,
                })),
              }}
            />
          </div>
        </div>
      ) : (
        <div className="px-6 py-6 text-sm text-text-muted">Unable to load Reddit post.</div>
      )}
    </div>
  );
}
