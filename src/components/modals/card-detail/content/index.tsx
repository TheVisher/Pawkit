'use client';

/**
 * Content Router
 * Routes to the correct content component based on card type
 */

import type { Card } from '@/lib/types/convex';
import { isYouTubeUrl, isTweetUrl } from '@/lib/utils/url-detection';
import { ArticleContent } from './article-content';
import { NoteContent } from './note-content';
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
export { NoteContent } from './note-content';
export { TweetContent } from './tweet-content';
export { VideoContent } from './video-content';
