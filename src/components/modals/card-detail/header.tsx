'use client';

/**
 * Card Detail Header Component
 * Hero header with image, gradient fade, and overlaid title
 * Top-right corner: URL pill + fullscreen button (for articles)
 */

import Image from 'next/image';
import { Globe, ExternalLink, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCardIcon } from './types';

interface CardDetailHeaderProps {
  card: {
    title?: string;
    image?: string;
    type: string;
    url?: string;
    favicon?: string;
    domain?: string;
    metadata?: Record<string, unknown>;
    readingTime?: number;
  };
  title: string;
  setTitle: (title: string) => void;
  onTitleBlur: () => void;
  imageError: boolean;
  setImageError: (error: boolean) => void;
  // Optional article-specific actions
  showFullscreen?: boolean;
  onFullscreen?: () => void;
  // Show article metadata header (domain, title with accent border, date, author)
  showArticleMetadata?: boolean;
}

/**
 * Format a published date string for display
 */
function formatPublishedDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function CardDetailHeader({
  card,
  title,
  setTitle,
  onTitleBlur,
  imageError,
  setImageError,
  showFullscreen,
  onFullscreen,
  showArticleMetadata,
}: CardDetailHeaderProps) {
  const Icon = getCardIcon(card.type);
  const hasImage = card.image && !imageError;
  const isArticle = card.type === 'url';

  return (
    <div className="relative flex-shrink-0">
      {hasImage ? (
        // Image header with gradient fade
        <div className="relative">
          {/* Image with mask fade - same technique as Pawkit headers */}
          <div
            className="relative w-full h-80"
            style={{
              maskImage: 'linear-gradient(to bottom, black 0%, black 35%, rgba(0,0,0,0.8) 55%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.15) 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 35%, rgba(0,0,0,0.8) 55%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.15) 85%, transparent 100%)',
            }}
          >
            <Image
              src={card.image!}
              alt={card.title || 'Card thumbnail'}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          </div>

          {/* Overlaid content - either simple title or full metadata */}
          <div className="absolute bottom-4 left-0 right-0 px-6">
            {showArticleMetadata ? (
              // Article metadata header - CNN style with accent border
              <div>
                {/* Domain + Read time */}
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/70 mb-2">
                  <span>{card.domain || 'Article'}</span>
                  {card.readingTime && card.readingTime > 0 && (
                    <>
                      <span>•</span>
                      <span>{card.readingTime} min read</span>
                    </>
                  )}
                </div>

                {/* Title with accent border */}
                <div
                  className="pl-4"
                  style={{ borderLeft: '4px solid var(--color-accent)' }}
                >
                  <textarea
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={onTitleBlur}
                    placeholder="Untitled"
                    rows={2}
                    className={cn(
                      'w-full text-2xl sm:text-3xl font-bold bg-transparent border-none outline-none resize-none',
                      'placeholder:text-white/50',
                      'focus:ring-0',
                      'leading-tight'
                    )}
                    style={{
                      color: 'white',
                      textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      overflow: 'hidden',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                  />
                </div>

                {/* Date and author */}
                {(card.metadata?.author || card.metadata?.publishedTime) ? (
                  <div className="mt-2 pl-4 space-y-0.5 text-sm text-white/70">
                    {card.metadata?.publishedTime ? (
                      <div className="uppercase tracking-wide text-xs">
                        Updated {formatPublishedDate(card.metadata.publishedTime as string)}
                      </div>
                    ) : null}
                    {card.metadata?.author ? (
                      <div>By {card.metadata.author as string}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              // Simple centered title
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={onTitleBlur}
                placeholder="Untitled"
                rows={2}
                className={cn(
                  'w-full text-3xl font-semibold bg-transparent border-none outline-none resize-none text-center',
                  'placeholder:text-white/50',
                  'focus:ring-0',
                  'leading-tight'
                )}
                style={{
                  color: 'white',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  overflow: 'hidden',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
              />
            )}
          </div>
        </div>
      ) : (
        // Fallback header without image
        <div
          className="h-48 flex flex-col justify-end p-6"
          style={{
            background: 'linear-gradient(135deg, var(--bg-surface-2) 0%, var(--bg-surface-3) 100%)',
          }}
        >
          <Icon
            className="w-12 h-12 mb-4 opacity-30"
            style={{ color: 'var(--text-muted)' }}
          />
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={onTitleBlur}
            placeholder="Untitled"
            rows={2}
            className={cn(
              'w-full text-3xl font-semibold bg-transparent border-none outline-none resize-none',
              'placeholder:text-[var(--text-muted)]',
              'focus:ring-0',
              'leading-tight'
            )}
            style={{ color: 'var(--text-primary)', overflow: 'hidden' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
          />
        </div>
      )}

      {/* Top-right corner: URL pill + Fullscreen (for articles) */}
      {isArticle && card.url && (
        <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
          {/* URL pill */}
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
              'bg-black/50 backdrop-blur-md border border-white/10 text-white/90',
              'transition-all duration-200',
              'hover:bg-black/70 hover:text-white hover:scale-105'
            )}
          >
            {card.favicon ? (
              <Image
                src={card.favicon}
                alt=""
                width={14}
                height={14}
                className="rounded-sm"
              />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
            <span className="truncate max-w-[150px]">{card.domain || 'Link'}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
          </a>

          {/* Fullscreen button */}
          {showFullscreen && onFullscreen && (
            <button
              onClick={onFullscreen}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
                'bg-black/50 backdrop-blur-md border border-white/10 text-white/90',
                'transition-all duration-200',
                'hover:bg-black/70 hover:text-white hover:scale-105'
              )}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Fullscreen</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
