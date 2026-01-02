'use client';

/**
 * Card Detail Content
 * Main orchestrator - renders header and routes to type-specific content
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useDataStore } from '@/lib/stores/data-store';
import { cn } from '@/lib/utils';
import { CardDetailHeader } from './header';
import { ContentRouter } from './content/index';
import type { CardDetailContentProps } from './types';

export function CardDetailContent({ cardId, onClose, className }: CardDetailContentProps) {
  const cards = useDataStore((s) => s.cards);
  const updateCard = useDataStore((s) => s.updateCard);

  // Find the active card
  const card = useMemo(() => cards.find((c) => c.id === cardId), [cards, cardId]);

  // Title state (shared across all card types)
  const [title, setTitle] = useState(card?.title || '');
  const [imageError, setImageError] = useState(false);

  // Fullscreen reader state (for articles)
  const [showFullReader, setShowFullReader] = useState(false);

  // Expanded image state
  const [showExpandedImage, setShowExpandedImage] = useState(false);

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

  // Toggle expanded image
  const toggleExpandedImage = useCallback(() => {
    if (card?.image && !imageError) {
      setShowExpandedImage((prev) => !prev);
    }
  }, [card?.image, imageError]);

  if (!card) return null;

  return (
    <div
      className={cn(
        'relative flex flex-col h-full bg-[var(--glass-panel-bg)] overflow-hidden',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Expandable header section - grows to fill modal */}
      <div
        className={cn(
          "relative flex-shrink-0 transition-all duration-500 ease-out",
          showExpandedImage && "flex-1"
        )}
      >
        {/* Header component */}
        <CardDetailHeader
          card={card}
          title={title}
          setTitle={setTitle}
          onTitleBlur={handleTitleBlur}
          imageError={imageError}
          setImageError={setImageError}
          showFullscreen={hasArticleContent}
          onFullscreen={handleFullscreen}
          showArticleMetadata={hasArticleContent}
          onImageClick={toggleExpandedImage}
          isImageExpanded={showExpandedImage}
        />

        {/* Full image overlay - appears when expanded */}
        {card.image && !imageError && (
          <div
            className={cn(
              "absolute inset-0 bg-black cursor-pointer",
              "transition-opacity duration-500 ease-out",
              showExpandedImage
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            )}
            onClick={toggleExpandedImage}
          >
            <Image
              src={card.image}
              alt={card.title || 'Card image'}
              fill
              className="object-contain"
            />
          </div>
        )}
      </div>

      {/* Title bar - anchors at bottom when expanded */}
      <div
        className={cn(
          "flex-shrink-0 px-6 py-4 bg-gradient-to-t from-black/80 via-black/60 to-transparent",
          "transition-all duration-500 ease-out",
          showExpandedImage
            ? "opacity-100"
            : "opacity-0 h-0 overflow-hidden"
        )}
        onClick={showExpandedImage ? toggleExpandedImage : undefined}
      >
        <h2
          className="text-xl font-bold text-white cursor-pointer"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
        >
          {title || 'Untitled'}
        </h2>
        <p className="text-white/50 text-xs mt-1">Click to collapse</p>
      </div>

      {/* Type-specific content - collapses when expanded */}
      <div
        className={cn(
          "flex flex-col overflow-hidden",
          "transition-all duration-500 ease-out",
          showExpandedImage
            ? "flex-shrink-0 h-0 opacity-0"
            : "flex-1 opacity-100"
        )}
      >
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
    </div>
  );
}
