'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from '@/components/ui/image';
import { buildConvexHttpUrl } from '@/lib/convex-site-url';
import { cn } from '@/lib/utils';
import Hls from 'hls.js';

type RedditMedia = {
  type: 'image' | 'video';
  url: string;
  width?: number;
  height?: number;
  videoUrl?: string;
  hlsUrl?: string;
};

type RedditPost = {
  id: string;
  title?: string;
  selftext?: string;
  author?: string;
  subreddit?: string;
  subreddit_name_prefixed?: string;
  score?: number;
  num_comments?: number;
  created_utc?: number;
  permalink?: string;
  url?: string;
  domain?: string;
  media?: RedditMedia[];
};

interface RedditPreviewProps {
  postId: string;
  playVideo?: boolean;
  className?: string;
}

function formatCount(value?: number): string | null {
  if (value === undefined || value === null) return null;
  if (value >= 1_000_000) {
    const formatted = (value / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}m`;
  }
  if (value >= 1_000) {
    const formatted = (value / 1_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}k`;
  }
  return `${value}`;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ');
}

function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(url);
}

function extractMedia(post: any): RedditMedia[] {
  const media: RedditMedia[] = [];
  const videoUrl =
    post?.media?.reddit_video?.fallback_url ||
    post?.preview?.reddit_video_preview?.fallback_url ||
    null;
  const hlsUrl =
    post?.media?.reddit_video?.hls_url ||
    post?.preview?.reddit_video_preview?.hls_url ||
    null;

  if (post?.is_gallery && post?.media_metadata) {
    const order =
      post?.gallery_data?.items?.map((item: { media_id: string }) => item.media_id) ||
      Object.keys(post.media_metadata);

    for (const mediaId of order) {
      const item = post.media_metadata?.[mediaId];
      const url = item?.s?.u ? decodeHtmlEntities(item.s.u) : null;
      if (url) {
        media.push({
          type: 'image',
          url,
          width: item?.s?.x,
          height: item?.s?.y,
        });
      }
    }
  }

  if (media.length === 0) {
    const preview = post?.preview?.images?.[0]?.source;
    if (preview?.url) {
      media.push({
        type: post?.is_video ? 'video' : 'image',
        url: decodeHtmlEntities(preview.url),
        width: preview.width,
        height: preview.height,
        videoUrl: post?.is_video ? videoUrl || undefined : undefined,
        hlsUrl: post?.is_video ? hlsUrl || undefined : undefined,
      });
    }
  }

  if (media.length === 0 && typeof post?.url === 'string' && isImageUrl(post.url)) {
    media.push({
      type: 'image',
      url: post.url,
    });
  }

  if (
    media.length === 0 &&
    post?.is_video &&
    typeof post?.thumbnail === 'string' &&
    post.thumbnail.startsWith('http')
  ) {
    media.push({
      type: 'video',
      url: post.thumbnail,
      videoUrl: videoUrl || undefined,
      hlsUrl: hlsUrl || undefined,
    });
  }

  return media;
}

function normalizePost(post: any): RedditPost | null {
  if (!post) return null;
  const media = extractMedia(post);
  const permalink = post?.permalink ? `https://www.reddit.com${post.permalink}` : undefined;

  return {
    id: post?.id,
    title: post?.title,
    selftext: post?.selftext,
    author: post?.author,
    subreddit: post?.subreddit,
    subreddit_name_prefixed: post?.subreddit_name_prefixed,
    created_utc: post?.created_utc,
    score: post?.score,
    num_comments: post?.num_comments,
    permalink,
    url: post?.url,
    domain: post?.domain,
    media,
  };
}

async function fetchRedditPostClient(postId: string): Promise<RedditPost | null> {
  const tryFetch = async (url: string, selector: (data: any) => any) => {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      const data = await res.json();
      return selector(data);
    } catch {
      return null;
    }
  };

  const post =
    (await tryFetch(
      `https://www.reddit.com/comments/${postId}.json?raw_json=1`,
      (data) => data?.[0]?.data?.children?.[0]?.data
    )) ||
    (await tryFetch(
      `https://www.reddit.com/by_id/t3_${postId}.json?raw_json=1`,
      (data) => data?.data?.children?.[0]?.data
    )) ||
    (await tryFetch(
      `https://api.reddit.com/api/info/?id=t3_${postId}`,
      (data) => data?.data?.children?.[0]?.data
    ));

  return normalizePost(post);
}

function RedditVideo({
  poster,
  videoUrl,
  hlsUrl,
}: {
  poster: string;
  videoUrl?: string;
  hlsUrl?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls: Hls | null = null;

    if (hlsUrl) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = hlsUrl;
      } else if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true });
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
      } else if (videoUrl) {
        video.src = videoUrl;
      }
    } else if (videoUrl) {
      video.src = videoUrl;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [hlsUrl, videoUrl]);

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      preload="metadata"
      poster={poster}
      className="h-full w-full object-cover"
    />
  );
}

export function RedditPreview({ postId, playVideo = false, className }: RedditPreviewProps) {
  const [post, setPost] = useState<RedditPost | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setStatus('loading');
    const load = async () => {
      try {
        const res = await fetch(buildConvexHttpUrl(`/api/reddit?id=${postId}`), {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          const next = (data?.data as RedditPost) || null;
          if (active) {
            setPost(next);
            setStatus(next ? 'ready' : 'error');
          }
          return;
        }
      } catch {
        // Fall through to client fetch
      }

      const next = await fetchRedditPostClient(postId);
      if (!active) return;
      setPost(next);
      setStatus(next ? 'ready' : 'error');
    };

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [postId]);

  const media = post?.media || [];
  const score = formatCount(post?.score);
  const comments = formatCount(post?.num_comments);
  const subredditLabel = post?.subreddit_name_prefixed || (post?.subreddit ? `r/${post.subreddit}` : null);
  const authorLabel = post?.author ? `u/${post.author}` : null;
  const showDomain = post?.domain && !post.domain.startsWith('self.');

  const bodyText = useMemo(() => {
    if (!post?.selftext) return '';
    return post.selftext.trim();
  }, [post?.selftext]);

  if (!post || status !== 'ready') {
    return (
      <div
        className={cn(
          'h-full w-full min-h-[160px] rounded-lg bg-[var(--color-bg-surface-2)]',
          'flex items-center justify-center text-xs text-text-muted',
          className
        )}
      >
        {status === 'error' ? 'Reddit post unavailable' : 'Loading reddit…'}
      </div>
    );
  }

  return (
    <div className={cn('flex h-full w-full flex-col gap-3', className)}>
      <div className="flex items-center gap-2 text-xs text-text-muted">
        {subredditLabel && <span className="font-semibold text-text-primary">{subredditLabel}</span>}
        {subredditLabel && authorLabel && <span>•</span>}
        {authorLabel && <span>{authorLabel}</span>}
      </div>

      {post.title && (
        <div className="text-sm font-semibold text-text-primary">
          {post.title}
        </div>
      )}

      {bodyText && (
        <div className="text-sm text-text-primary" style={{ whiteSpace: 'pre-wrap' }}>
          {bodyText}
        </div>
      )}

      {media.length > 0 && (
        <div
          className={cn(
            'grid gap-1 overflow-hidden rounded-lg',
            media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
          )}
        >
          {media.slice(0, 4).map((item, index) => {
            const ratio = item.width && item.height ? item.width / item.height : 1.6;
            const isVideo = item.type === 'video';

            return (
              <div
                key={`${item.url}-${index}`}
                className="relative w-full overflow-hidden"
                style={{ aspectRatio: ratio }}
              >
                {isVideo && playVideo ? (
                  <RedditVideo
                    poster={item.url}
                    videoUrl={item.videoUrl}
                    hlsUrl={item.hlsUrl}
                  />
                ) : (
                  <>
                    <Image
                      src={item.url}
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
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(score || comments || showDomain) && (
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
          {score && <span>{score} upvotes</span>}
          {comments && <span>{comments} comments</span>}
          {showDomain && <span className="uppercase tracking-wide">{post?.domain}</span>}
        </div>
      )}
    </div>
  );
}
