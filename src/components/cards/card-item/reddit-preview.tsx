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
  eager?: boolean;
  fallback?: Partial<RedditPost>;
  url?: string;
  onPersist?: (post: RedditPost) => void;
  className?: string;
}

const redditPostCache = new Map<string, RedditPost>();
const redditPostInFlight = new Map<string, Promise<RedditPost | null>>();

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

async function fetchRedditPostServer(
  postId: string,
  url?: string,
  signal?: AbortSignal
): Promise<RedditPost | null> {
  try {
    const params = new URLSearchParams({ id: postId });
    if (url) {
      params.set('url', url);
    }
    const res = await fetch(buildConvexHttpUrl(`/api/reddit?${params.toString()}`), { signal });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.data as RedditPost) || null;
  } catch {
    return null;
  }
}

// Client-side fallback - browsers can fetch from Reddit directly
async function fetchRedditPostClient(
  postId: string,
  url?: string,
  signal?: AbortSignal
): Promise<RedditPost | null> {
  // Try JSON endpoint first
  const jsonUrls = [
    `https://www.reddit.com/comments/${postId}.json?raw_json=1`,
    url ? `${url.replace(/\/$/, '')}.json?raw_json=1` : null,
  ].filter(Boolean) as string[];

  for (const jsonUrl of jsonUrls) {
    try {
      const res = await fetch(jsonUrl, { signal });
      if (!res.ok) continue;

      const data = await res.json();
      const post = data?.[0]?.data?.children?.[0]?.data;
      if (!post) continue;

      // Extract media from preview images
      const media: RedditMedia[] = [];
      const preview = post.preview?.images?.[0];
      if (preview?.source?.url) {
        media.push({
          type: 'image',
          url: preview.source.url.replace(/&amp;/g, '&'),
          width: preview.source.width,
          height: preview.source.height,
        });
      }

      // Check for gallery images
      if (post.gallery_data?.items && post.media_metadata) {
        for (const item of post.gallery_data.items) {
          const meta = post.media_metadata[item.media_id];
          if (meta?.s?.u) {
            media.push({
              type: 'image',
              url: meta.s.u.replace(/&amp;/g, '&'),
              width: meta.s.x,
              height: meta.s.y,
            });
          }
        }
      }

      // Check for video
      if (post.is_video && post.media?.reddit_video) {
        const video = post.media.reddit_video;
        media.unshift({
          type: 'video',
          url: video.fallback_url || preview?.source?.url?.replace(/&amp;/g, '&') || '',
          width: video.width,
          height: video.height,
          videoUrl: video.fallback_url,
          hlsUrl: video.hls_url,
        });
      }

      // Fallback to thumbnail
      if (media.length === 0 && post.thumbnail && post.thumbnail.startsWith('http')) {
        media.push({ type: 'image', url: post.thumbnail });
      }

      return {
        id: post.id || postId,
        title: post.title,
        selftext: post.selftext,
        author: post.author,
        subreddit: post.subreddit,
        subreddit_name_prefixed: post.subreddit_name_prefixed,
        score: post.score,
        num_comments: post.num_comments,
        created_utc: post.created_utc,
        permalink: post.permalink ? `https://www.reddit.com${post.permalink}` : undefined,
        url: post.url,
        domain: post.domain,
        media,
      };
    } catch {
      continue;
    }
  }
  return null;
}

async function getRedditPost(
  postId: string,
  url?: string,
  signal?: AbortSignal
): Promise<RedditPost | null> {
  const cached = redditPostCache.get(postId);
  if (cached) return cached;

  const inFlight = redditPostInFlight.get(postId);
  if (inFlight) return inFlight;

  const promise = (async () => {
    // Try server first
    const serverResult = await fetchRedditPostServer(postId, url, signal);

    // If server returned data with media, use it
    if (serverResult?.media?.length) {
      return serverResult;
    }

    // Otherwise try client-side fetch (browsers can access Reddit directly)
    const clientResult = await fetchRedditPostClient(postId, url, signal);
    if (clientResult?.media?.length) {
      // Merge with server data if available
      return serverResult ? { ...serverResult, media: clientResult.media } : clientResult;
    }

    // Return whatever we got
    return clientResult || serverResult;
  })();

  redditPostInFlight.set(postId, promise);
  const result = await promise;
  redditPostInFlight.delete(postId);
  if (result) {
    redditPostCache.set(postId, result);
  }
  return result;
}

export function prefetchRedditPost(postId: string, url?: string) {
  void fetchRedditPostServer(postId, url);
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

export function RedditPreview({
  postId,
  playVideo = false,
  eager = true,
  fallback,
  url,
  onPersist,
  className,
}: RedditPreviewProps) {
  const [post, setPost] = useState<RedditPost | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const persistedRef = useRef(false);

  const fallbackPost = useMemo<RedditPost | null>(() => {
    if (!fallback) return null;
    return {
      id: fallback.id || postId,
      title: fallback.title,
      selftext: fallback.selftext,
      author: fallback.author,
      subreddit: fallback.subreddit,
      subreddit_name_prefixed: fallback.subreddit_name_prefixed,
      created_utc: fallback.created_utc,
      score: fallback.score,
      num_comments: fallback.num_comments,
      permalink: fallback.permalink,
      url: fallback.url,
      domain: fallback.domain,
      media: fallback.media || [],
    };
  }, [fallback, postId]);

  const resolvedUrl = url || fallbackPost?.permalink || fallbackPost?.url;

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const cached = redditPostCache.get(postId);
    if (cached) {
      setPost(cached);
      setStatus('ready');
      return;
    }

    if (!eager) {
      setPost(fallbackPost);
      setStatus(fallbackPost ? 'ready' : 'error');
      return () => {
        active = false;
        controller.abort();
      };
    }

    setStatus('loading');
    const load = async () => {
      const next = await getRedditPost(postId, resolvedUrl, controller.signal);
      if (!active) return;
      setPost(next);
      setStatus(next ? 'ready' : fallbackPost ? 'ready' : 'error');
      if (next && onPersist && !persistedRef.current) {
        persistedRef.current = true;
        onPersist(next);
      }
    };

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [eager, fallbackPost, onPersist, postId, resolvedUrl]);

  const resolvedPost = post || fallbackPost;

  const media = resolvedPost?.media || [];
  const score = formatCount(resolvedPost?.score);
  const comments = formatCount(resolvedPost?.num_comments);
  const subredditLabel =
    resolvedPost?.subreddit_name_prefixed || (resolvedPost?.subreddit ? `r/${resolvedPost.subreddit}` : null);
  const authorLabel = resolvedPost?.author ? `u/${resolvedPost.author}` : null;
  const showDomain = resolvedPost?.domain && !resolvedPost.domain.startsWith('self.');

  const bodyText = useMemo(() => {
    if (!resolvedPost?.selftext) return '';
    return resolvedPost.selftext.trim();
  }, [resolvedPost?.selftext]);

  if (!resolvedPost || status !== 'ready') {
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

      {resolvedPost.title && (
        <div className="text-sm font-semibold text-text-primary">
          {resolvedPost.title}
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
          {showDomain && <span className="uppercase tracking-wide">{resolvedPost?.domain}</span>}
        </div>
      )}
    </div>
  );
}
