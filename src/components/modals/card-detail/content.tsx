'use client';

/**
 * Card Detail Content
 * Main orchestrator - renders header and routes to type-specific content
 */

import { useState, useEffect, useCallback } from 'react';
import { useDataStore } from '@/lib/stores/data-store';
import { useCard } from '@/lib/hooks/use-live-data';
import { cn } from '@/lib/utils';
import { CardDetailHeader } from './header';
import { ContentRouter } from './content/index';
import type { CardDetailContentProps } from './types';

export function CardDetailContent({ cardId, onClose, className }: CardDetailContentProps) {
  const card = useCard(cardId);
  const updateCard = useDataStore((s) => s.updateCard);

  // Title state (shared across all card types)
  const [title, setTitle] = useState(card?.title || '');
  const [imageError, setImageError] = useState(false);

  // Fullscreen reader state (for articles)
  const [showFullReader, setShowFullReader] = useState(false);

  // Derived state
  const isArticle = card?.type === 'url';
  const hasArticleContent = isArticle && !!card?.articleContent;

  // Sync title when card changes
  useEffect(() => {
    if (card) {
      setTitle(card.title || '');
      setImageError(false);
    }
  }, [card?.id]);

  // Save title on blur
  const handleTitleBlur = useCallback(() => {
    if (card && title !== card.title) {
      updateCard(card.id, { title });
    }
  }, [card, title, updateCard]);

  // Fullscreen handler
  const handleFullscreen = useCallback(() => {
    setShowFullReader(true);
  }, []);

  if (!card) return null;

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-[var(--glass-panel-bg)]',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Shared header component */}
      <CardDetailHeader
        card={card}
        title={title}
        setTitle={setTitle}
        onTitleBlur={handleTitleBlur}
        imageError={imageError}
        setImageError={setImageError}
        showFullscreen={hasArticleContent}
        onFullscreen={handleFullscreen}
        showArticleMetadata={hasArticleContent} // Show CNN-style metadata when article content exists
      />

      {/* Type-specific content */}
      <ContentRouter
        card={card}
        title={title}
        setTitle={setTitle}
        onTitleBlur={handleTitleBlur}
        onClose={onClose}
        showFullReader={showFullReader}
        setShowFullReader={setShowFullReader}
      />
    </div>
  );
}
