'use client';

/**
 * Content Router
 * Routes to the correct content component based on card type
 */

import type { Card } from '@/lib/types/convex';
import { isFacebookUrl, isInstagramUrl, isPinterestUrl, isRedditUrl, isTikTokUrl, isYouTubeUrl, isTweetUrl } from '@/lib/utils/url-detection';
import { ArticleContent } from './article-content';
import { FacebookContent } from './facebook-content';
import { InstagramContent } from './instagram-content';
import { NoteContent } from './note-content';
import { PinterestContent } from './pinterest-content';
import { RedditContent } from './reddit-content';
import { TikTokContent } from './tiktok-content';
import { TweetContent } from './tweet-content';
import { VideoContent } from './video-content';

interface ContentRouterProps {
  card: Card;
  title: string;
  setTitle?: (title: string) => void;
  onTitleBlur?: () => void;
  onClose: () => void;
  showFullReader?: boolean;
  setShowFullReader?: (show: boolean) => void;
  onRequestExpandImage?: () => void;
  hasImage?: boolean;
  className?: string;
}

export function ContentRouter({
  card,
  title,
  setTitle,
  onTitleBlur,
  onClose,
  showFullReader,
  setShowFullReader,
  onRequestExpandImage,
  hasImage,
  className,
}: ContentRouterProps) {
  // Note cards - editor focused
  if (card.type === 'md-note' || card.type === 'text-note') {
    return (
      <NoteContent
        card={card}
        title={title}
        setTitle={setTitle}
        onTitleBlur={onTitleBlur}
        className={className}
      />
    );
  }

  // YouTube videos - embedded player
  if (card.type === 'url' && card.url && isYouTubeUrl(card.url)) {
    return <VideoContent card={card} className={className} />;
  }

  // X/Twitter posts - embedded tweet
  if (card.type === 'url' && card.url && isTweetUrl(card.url)) {
    return <TweetContent card={card} className={className} />;
  }

  // Reddit posts - custom render
  if (card.type === 'url' && card.url && isRedditUrl(card.url)) {
    return <RedditContent card={card} className={className} />;
  }

  // TikTok posts - embed modal
  if (card.type === 'url' && card.url && isTikTokUrl(card.url)) {
    return <TikTokContent card={card} className={className} />;
  }

  // Instagram posts - embed modal
  if (card.type === 'url' && card.url && isInstagramUrl(card.url)) {
    return <InstagramContent card={card} className={className} />;
  }

  // Pinterest pins - embed modal
  if (card.type === 'url' && card.url && isPinterestUrl(card.url)) {
    return <PinterestContent card={card} className={className} />;
  }

  // Facebook posts - embed modal
  if (card.type === 'url' && card.url && isFacebookUrl(card.url)) {
    return <FacebookContent card={card} className={className} />;
  }

  // URL/article cards - reader focused
  if (card.type === 'url') {
    return (
      <ArticleContent
        card={card}
        title={title}
        setTitle={setTitle}
        onTitleBlur={onTitleBlur}
        onClose={onClose}
        showFullReader={showFullReader || false}
        setShowFullReader={setShowFullReader || (() => {})}
        onRequestExpandImage={onRequestExpandImage}
        hasImage={hasImage}
        className={className}
      />
    );
  }

  // Fallback for unknown types - treat as article
  return (
    <ArticleContent
      card={card}
      title={title}
      setTitle={setTitle}
      onTitleBlur={onTitleBlur}
      onClose={onClose}
      showFullReader={showFullReader || false}
      setShowFullReader={setShowFullReader || (() => {})}
      onRequestExpandImage={onRequestExpandImage}
      hasImage={hasImage}
      className={className}
    />
  );
}

// Re-export content components
export { ArticleContent } from './article-content';
export { FacebookContent } from './facebook-content';
export { InstagramContent } from './instagram-content';
export { NoteContent } from './note-content';
export { PinterestContent } from './pinterest-content';
export { RedditContent } from './reddit-content';
export { TikTokContent } from './tiktok-content';
export { TweetContent } from './tweet-content';
export { VideoContent } from './video-content';
