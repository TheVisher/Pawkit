'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from '@/components/ui/image';
import { buildConvexHttpUrl } from '@/lib/convex-site-url';
import { cn } from '@/lib/utils';

// X (Twitter) icon as inline SVG
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

type TweetMedia = {
  type: 'photo' | 'video' | 'animated_gif';
  media_url_https: string;
  original_info?: { width: number; height: number };
};

type TweetUser = {
  name: string;
  screen_name: string;
  profile_image_url_https?: string;
};

type TweetEntities = {
  hashtags?: Array<{ text: string; indices: [number, number] }>;
  user_mentions?: Array<{ screen_name: string; indices: [number, number] }>;
  urls?: Array<{ display_url: string; expanded_url: string; indices: [number, number] }>;
  symbols?: Array<{ text: string; indices: [number, number] }>;
  media?: Array<{ display_url: string; expanded_url: string; indices: [number, number] }>;
};

type TweetData = {
  id_str: string;
  text: string;
  display_text_range?: [number, number];
  user: TweetUser;
  mediaDetails?: TweetMedia[];
  entities?: TweetEntities;
};

interface TweetPreviewProps {
  tweetId: string;
  className?: string;
}

export function TweetPreview({ tweetId, className }: TweetPreviewProps) {
  const [tweet, setTweet] = useState<TweetData | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    fetch(buildConvexHttpUrl(`/api/tweet?id=${tweetId}`), {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        setTweet((data?.data as TweetData) || null);
      })
      .catch(() => {
        if (!active) return;
        setTweet(null);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [tweetId]);

  const textSegments = useMemo(() => {
    if (!tweet) return [];
    const textMap = Array.from(tweet.text || '');
    const displayRange = tweet.display_text_range || [0, textMap.length];

    type Entity = { indices: [number, number]; type: 'text' | 'hashtag' | 'mention' | 'url' | 'symbol' | 'media' } & Record<string, unknown>;
    const result: Entity[] = [{ indices: displayRange, type: 'text' }];

    const addEntities = (type: Entity['type'], entities: Array<Record<string, unknown> & { indices: [number, number] }> = []) => {
      for (const entity of entities) {
        for (const [i, item] of result.entries()) {
          if (item.indices[0] > entity.indices[0] || item.indices[1] < entity.indices[1]) continue;
          const items: Entity[] = [{ ...entity, type }];
          if (item.indices[0] < entity.indices[0]) {
            items.unshift({
              indices: [item.indices[0], entity.indices[0]],
              type: 'text',
            });
          }
          if (item.indices[1] > entity.indices[1]) {
            items.push({
              indices: [entity.indices[1], item.indices[1]],
              type: 'text',
            });
          }
          result.splice(i, 1, ...items);
          break;
        }
      }
    };

    addEntities('hashtag', tweet.entities?.hashtags || []);
    addEntities('mention', tweet.entities?.user_mentions || []);
    addEntities('url', tweet.entities?.urls || []);
    addEntities('symbol', tweet.entities?.symbols || []);
    addEntities('media', tweet.entities?.media || []);

    const lastEntity = result.at(-1);
    if (lastEntity && lastEntity.indices[1] > displayRange[1]) {
      lastEntity.indices[1] = displayRange[1];
    }

    return result.map((entity, index) => {
      const text = textMap.slice(entity.indices[0], entity.indices[1]).join('');
      if (entity.type === 'text' || !text) {
        return { key: `${entity.type}-${index}`, text, accent: false };
      }
      if (entity.type === 'hashtag' || entity.type === 'mention' || entity.type === 'symbol' || entity.type === 'url') {
        return { key: `${entity.type}-${index}`, text, accent: true };
      }
      return { key: `${entity.type}-${index}`, text, accent: false };
    });
  }, [tweet]);

  const text = useMemo(() => {
    if (!tweet) return '';
    const textMap = Array.from(tweet.text || '');
    const [start, end] = tweet.display_text_range || [0, textMap.length];
    return textMap.slice(start, end).join('').trim();
  }, [tweet]);

  const media = tweet?.mediaDetails || [];

  if (!tweet) {
    return (
      <div
        className={cn(
          'h-full w-full min-h-[160px] rounded-lg bg-[var(--color-bg-surface-2)]',
          'flex flex-col items-center justify-center gap-2 text-xs text-text-muted',
          className
        )}
      >
        <XIcon className="h-6 w-6" />
        <span>X</span>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full w-full flex-col gap-3', className)}>
      <div className="flex items-start gap-2">
        {tweet.user.profile_image_url_https ? (
          <Image
            src={tweet.user.profile_image_url_https}
            alt={tweet.user.name}
            width={28}
            height={28}
            className="rounded-full"
          />
        ) : (
          <div className="h-7 w-7 rounded-full bg-[var(--color-bg-surface-3)]" />
        )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-text-primary">{tweet.user.name}</span>
              <span className="text-xs text-text-muted">@{tweet.user.screen_name}</span>
            </div>
            {text && (
              <div
                className="mt-1 text-sm text-text-primary"
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {textSegments.length > 0
                  ? textSegments.map((segment) => (
                    <span
                      key={segment.key}
                      className={segment.accent ? 'text-[var(--color-accent)]' : undefined}
                    >
                      {segment.text}
                    </span>
                  ))
                  : text}
              </div>
            )}
        </div>
      </div>

      {media.length > 0 && (
        <div
          className={cn(
            'grid gap-1 overflow-hidden rounded-lg',
            media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
          )}
        >
          {media.slice(0, 4).map((item, index) => {
            const ratio = item.original_info
              ? item.original_info.width / item.original_info.height
              : 1.6;
            const isVideo = item.type === 'video' || item.type === 'animated_gif';

            return (
              <div
                key={`${item.media_url_https}-${index}`}
                className="relative w-full overflow-hidden"
                style={{ aspectRatio: ratio }}
              >
                <Image
                  src={item.media_url_https}
                  alt=""
                  fill
                  className="object-cover"
                />
                {isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60">
                      <div className="ml-0.5 h-0 w-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-white" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
