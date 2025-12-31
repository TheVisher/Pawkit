'use client';

/**
 * Content Router
 * Routes to the correct content component based on card type
 */

import type { LocalCard } from '@/lib/db';
import { ArticleContent } from './article-content';
import { NoteContent } from './note-content';

interface ContentRouterProps {
  card: LocalCard;
  title: string;
  setTitle?: (title: string) => void;
  onTitleBlur?: () => void;
  onClose: () => void;
  showFullReader?: boolean;
  setShowFullReader?: (show: boolean) => void;
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
  className,
}: ContentRouterProps) {
  // Note cards - editor focused
  if (card.type === 'md-note' || card.type === 'text-note' || card.type === 'quick-note') {
    return <NoteContent card={card} className={className} />;
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
      className={className}
    />
  );
}

// Re-export content components
export { ArticleContent } from './article-content';
export { NoteContent } from './note-content';
