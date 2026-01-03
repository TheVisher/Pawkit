'use client';

/**
 * Card Detail Content
 * Main orchestrator - renders header and routes to type-specific content
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDataStore } from '@/lib/stores/data-store';
import { useCard } from '@/lib/hooks/use-live-data';
import { cn } from '@/lib/utils';
import { CardDetailHeader } from './header';
import { ContentRouter } from './content/index';
import { isSupertag } from '@/lib/tags/supertags';
import type { CardDetailContentProps } from './types';

export function CardDetailContent({ cardId, onClose, className }: CardDetailContentProps) {
  const card = useCard(cardId);
  const updateCard = useDataStore((s) => s.updateCard);

  // Title state (shared across all card types)
  const [title, setTitle] = useState(card?.title || '');
  const [imageError, setImageError] = useState(false);

  // Fullscreen reader state (for articles)
  const [showFullReader, setShowFullReader] = useState(false);

  // Expanded image state
  const [showExpandedImage, setShowExpandedImage] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Gallery images (use images array if available, otherwise just primary image)
  const galleryImages = useMemo(() => {
    if (!card) return [];
    if (card.images && card.images.length > 1) {
      return card.images;
    }
    return card.image ? [card.image] : [];
  }, [card?.images, card?.image]);

  const hasMultipleImages = galleryImages.length > 1;
  const currentImage = galleryImages[currentImageIndex] || card?.image;

  // Derived state
  const isArticle = card?.type === 'url';
  const hasArticleContent = isArticle && !!card?.articleContent;

  // Check if this is a contact card (has custom header in NoteContent)
  const isContactCard = useMemo(() => {
    return card?.tags?.some(tag => isSupertag(tag) && tag.toLowerCase().replace(/^#/, '') === 'contact');
  }, [card?.tags]);

  // Sync title when card changes (including external updates like Quick Convert)
  useEffect(() => {
    if (card) {
      setTitle(card.title || '');
    }
  }, [card?.id, card?.title]);

  // Reset image state when switching cards
  useEffect(() => {
    if (card) {
      setImageError(false);
      setCurrentImageIndex(0); // Reset gallery to first image
    }
  }, [card?.id]);

  // Gallery navigation
  const nextImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((i) => (i + 1) % galleryImages.length);
  }, [galleryImages.length]);

  const prevImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length);
  }, [galleryImages.length]);

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
      {/* Contact cards have their own header in NoteContent, skip the default header */}
      {!isContactCard && (
      <>
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
        {currentImage && !imageError && (
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
              src={currentImage}
              alt={card.title || 'Card image'}
              fill
              className="object-contain"
            />

            {/* Gallery navigation - only show when multiple images */}
            {hasMultipleImages && showExpandedImage && (
              <>
                {/* Previous button */}
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                {/* Next button */}
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>

                {/* Image counter */}
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/50 text-white text-sm font-medium">
                  {currentImageIndex + 1} / {galleryImages.length}
                </div>

                {/* Dot indicators */}
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2">
                  {galleryImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(i);
                      }}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        i === currentImageIndex
                          ? "bg-white w-4"
                          : "bg-white/50 hover:bg-white/70"
                      )}
                      aria-label={`Go to image ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
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
      </>
      )}

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
