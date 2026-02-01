'use client';

/**
 * Recent Cards Widget
 * Shows recently added cards in a responsive vertical scroll grid
 * Uses CSS auto-fill for immediate responsive columns without JS measurement
 */

import { useMemo, useState, useEffect, type MouseEvent } from 'react';
import { Layers, Facebook, Instagram } from 'lucide-react';

import { Card as UICard, CardContent } from '@/components/ui/card';
import { useNonPrivateCards } from '@/lib/contexts/convex-data-context';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { cn } from '@/lib/utils';
import type { Card } from '@/lib/types/convex';
import { formatDistanceToNow } from 'date-fns';
import {
  extractTweetId,
  isTikTokUrl,
  isInstagramUrl,
  isPinterestUrl,
  isFacebookUrl,
  extractRedditPostId,
} from '@/lib/utils/url-detection';

// Card sizing constants - CSS handles the responsive columns
const MIN_CARD_WIDTH = 280; // Minimum card width before wrapping to fewer columns
const MAX_CARD_WIDTH = 400; // Maximum card width to prevent overly large cards

// Social media icons as inline SVGs
function RedditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
  );
}

// Helper to extract subreddit from Reddit URL
function extractSubreddit(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/r\/([^/]+)/i);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

// Social media fallback placeholder component
function SocialMediaPlaceholder({
  platform,
  label,
}: {
  platform: 'reddit' | 'twitter' | 'tiktok' | 'instagram' | 'facebook' | 'pinterest';
  label: string;
}) {
  const Icon = {
    reddit: RedditIcon,
    twitter: XIcon,
    tiktok: TikTokIcon,
    instagram: Instagram,
    facebook: Facebook,
    pinterest: PinterestIcon,
  }[platform];

  return (
    <div className="aspect-video w-full bg-bg-surface-3 flex flex-col items-center justify-center gap-2 text-xs text-text-muted">
      <Icon className="h-6 w-6" />
      <span>{label}</span>
    </div>
  );
}

interface RecentCardItemProps {
  card: Card;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

function RecentCardItem({ card, onClick }: RecentCardItemProps) {
  const isUrl = card.type === 'url';
  const [timeAgo, setTimeAgo] = useState<string>('');

  // Calculate time on client only to avoid hydration mismatch
  useEffect(() => {
    setTimeAgo(formatDistanceToNow(new Date(card.createdAt), { addSuffix: true }));
  }, [card.createdAt]);

  // Detect social media platforms
  const isReddit = useMemo(() => card.url ? extractRedditPostId(card.url) !== null : false, [card.url]);
  const isTweet = useMemo(() => card.url ? extractTweetId(card.url) !== null : false, [card.url]);
  const isTikTok = useMemo(() => card.url ? isTikTokUrl(card.url) : false, [card.url]);
  const isInstagram = useMemo(() => card.url ? isInstagramUrl(card.url) : false, [card.url]);
  const isFacebook = useMemo(() => card.url ? isFacebookUrl(card.url) : false, [card.url]);
  const isPinterest = useMemo(() => card.url ? isPinterestUrl(card.url) : false, [card.url]);

  // Extract Reddit subreddit
  const redditSubreddit = useMemo(() => {
    if (!isReddit) return null;
    return extractSubreddit(card.url);
  }, [card.url, isReddit]);

  // Determine display title - use subreddit name as fallback for Reddit
  const displayTitle = useMemo(() => {
    // If we have a proper title, use it
    if (card.title && card.title !== 'Untitled' && !card.title.startsWith('http')) {
      return card.title;
    }
    // Fallback for Reddit: show subreddit name
    if (isReddit && redditSubreddit) {
      return `r/${redditSubreddit}`;
    }
    // Default fallback
    return card.title || 'Untitled';
  }, [card.title, isReddit, redditSubreddit]);

  // Check if this is a social media card without an image
  const socialMediaType = useMemo(() => {
    if (card.image) return null;
    if (isReddit) return 'reddit' as const;
    if (isTweet) return 'twitter' as const;
    if (isTikTok) return 'tiktok' as const;
    if (isInstagram) return 'instagram' as const;
    if (isFacebook) return 'facebook' as const;
    if (isPinterest) return 'pinterest' as const;
    return null;
  }, [card.image, isReddit, isTweet, isTikTok, isInstagram, isFacebook, isPinterest]);

  // Get the label for social media placeholder
  const socialMediaLabel = useMemo(() => {
    if (socialMediaType === 'reddit' && redditSubreddit) return `r/${redditSubreddit}`;
    if (socialMediaType === 'reddit') return 'Reddit';
    if (socialMediaType === 'twitter') return 'X';
    if (socialMediaType === 'tiktok') return 'TikTok';
    if (socialMediaType === 'instagram') return 'Instagram';
    if (socialMediaType === 'facebook') return 'Facebook';
    if (socialMediaType === 'pinterest') return 'Pinterest';
    return '';
  }, [socialMediaType, redditSubreddit]);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl transition-all',
        'bg-bg-surface-3/50 hover:bg-bg-surface-3',
        'border border-transparent hover:border-[var(--color-accent)]/30',
        'overflow-hidden group'
      )}
    >
      {/* Thumbnail - larger for better visibility */}
      {card.image ? (
        <div className="aspect-video w-full overflow-hidden bg-bg-surface-3">
          <img
            src={card.image}
            alt=""
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        </div>
      ) : socialMediaType ? (
        /* Social media placeholder */
        <SocialMediaPlaceholder platform={socialMediaType} label={socialMediaLabel} />
      ) : (
        /* Generic placeholder for cards without images */
        <div className="aspect-video w-full bg-bg-surface-3 flex items-center justify-center">
          {card.favicon ? (
            <img
              src={card.favicon}
              alt=""
              className="w-12 h-12 rounded"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <Layers className="w-8 h-8 text-text-muted/30" />
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <p className="text-sm text-text-primary font-medium line-clamp-2 leading-snug">
          {displayTitle}
        </p>
        <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
          {isUrl && card.domain && (
            <>
              <span className="truncate max-w-[120px]">{card.domain}</span>
              <span>•</span>
            </>
          )}
          <span className="shrink-0">{timeAgo}</span>
        </div>
      </div>
    </button>
  );
}

export function RecentCardsWidget() {
  const workspace = useCurrentWorkspace();
  const cards = useNonPrivateCards();
  const openCardDetailWithRect = useModalStore((s) => s.openCardDetailWithRect);

  const recentCards = useMemo(() => {
    return cards
      .filter((c) => {
        if (c.deleted) return false;
        if (c.isDailyNote) return false; // Exclude daily notes
        return true;
      })
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 30); // Show up to 30 recent cards
  }, [cards]);

  return (
    <UICard className="border-border-subtle bg-bg-surface-2 py-0 h-full">
      <CardContent className="p-3 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Layers className="h-4 w-4 text-purple-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-text-primary text-sm">Recently Added</h3>
            <p className="text-xs text-text-muted">Your latest saves</p>
          </div>
        </div>

        {recentCards.length > 0 ? (
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-bg-surface-3 scrollbar-track-transparent pr-1">
            {/* CSS auto-fill handles responsive columns without JS measurement */}
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${MIN_CARD_WIDTH}px, ${MAX_CARD_WIDTH}px))`,
              }}
            >
              {recentCards.map((card) => (
                <RecentCardItem
                  key={card._id}
                  card={card}
                  onClick={(event) => {
                    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                    openCardDetailWithRect(card._id, rect);
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center flex-1">
            <Layers className="h-8 w-8 text-text-muted/50 mb-2" />
            <p className="text-sm text-text-muted">No cards yet</p>
            <p className="text-xs text-text-muted/70 mt-1">
              Add your first bookmark or note to get started
            </p>
          </div>
        )}
      </CardContent>
    </UICard>
  );
}
