'use client';

/**
 * Article Content Component
 * Clean reader-focused layout for URL/article cards
 * Shows either "Extract Article" button or article text
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import { useDataStore } from '@/lib/stores/data-store';
import { Button } from '@/components/ui/button';
import { Reader } from '@/components/reader';
import { calculateReadingTime } from '@/lib/db/schema';
import { getDomain, getContentStats } from '../types';
import type { LocalCard } from '@/lib/db';

interface ArticleContentProps {
  card: LocalCard;
  title: string;
  setTitle?: (title: string) => void;
  onTitleBlur?: () => void;
  onClose: () => void;
  showFullReader: boolean;
  setShowFullReader: (show: boolean) => void;
  className?: string;
}

export function ArticleContent({
  card,
  title,
  setTitle,
  onTitleBlur,
  onClose,
  showFullReader,
  setShowFullReader,
  className,
}: ArticleContentProps) {
  const updateCard = useDataStore((s) => s.updateCard);

  // Extraction state
  const [isExtractingArticle, setIsExtractingArticle] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Reading progress - use refs to avoid re-renders on scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(card.readProgress || 0);

  // Derived state
  const articleContent = card.articleContent || '';
  const hasArticleContent = !!articleContent;
  const wordCount = card.wordCount || getContentStats(articleContent).words;
  const readingTime = card.readingTime || (wordCount ? calculateReadingTime(wordCount) : 0);
  const domain = card.domain || getDomain(card.url || '');

  // Sanitize article content with DOMPurify before rendering
  const sanitizedContent = useMemo(() => {
    if (typeof window === 'undefined' || !articleContent) return '';
    let cleaned = DOMPurify.sanitize(articleContent, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allowfullscreen', 'frameborder', 'src', 'loading'],
    });
    cleaned = cleaned.replace(/<img\s/gi, '<img loading="lazy" ');

    // Convert quoted paragraphs to blockquotes
    // Match <p> tags, check if they start with quotes and are substantial
    const quoteChars = '"""\u201C\u201D\u2018\u2019\'';
    cleaned = cleaned.replace(/<p>([^]*?)<\/p>/gi, (match, content) => {
      const trimmed = content.trim();
      const firstChar = trimmed.charAt(0);
      const startsWithQuote = quoteChars.includes(firstChar);
      const hasClosingQuote = quoteChars.split('').some(q => trimmed.includes(q) && trimmed.indexOf(q) > 0);

      if (startsWithQuote && hasClosingQuote && trimmed.length > 80) {
        return `<blockquote><p>${content}</p></blockquote>`;
      }
      return match;
    });

    return cleaned;
  }, [articleContent]);

  // Extract article from URL
  const handleExtractArticle = useCallback(async () => {
    if (!card.url || isExtractingArticle) return;

    setIsExtractingArticle(true);
    setExtractionError(null);

    try {
      const response = await fetch('/api/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: card.url }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Failed to extract article (${response.status})`);
      }

      const data = await response.json();

      if (!data.success || !data.article) {
        throw new Error('Could not extract article content');
      }

      // Build metadata object with author if available
      const existingMetadata = card.metadata || {};
      const newMetadata = {
        ...existingMetadata,
        ...(data.article.byline && { author: data.article.byline }),
        ...(data.article.siteName && { siteName: data.article.siteName }),
        ...(data.article.publishedTime && { publishedTime: data.article.publishedTime }),
      };

      await updateCard(card.id, {
        articleContent: data.article.content || undefined,
        wordCount: data.article.wordCount,
        readingTime: data.article.readingTime,
        isRead: false,
        readProgress: 0,
        metadata: Object.keys(newMetadata).length > 0 ? newMetadata : undefined,
      });
    } catch (error) {
      console.error('[ArticleContent] Extraction failed:', error);
      setExtractionError(error instanceof Error ? error.message : 'Failed to extract article');
    } finally {
      setIsExtractingArticle(false);
    }
  }, [card.id, card.url, isExtractingArticle, updateCard]);

  // Handle reading progress
  const handleReadingProgress = useCallback((progress: number, scrollPosition: number) => {
    const updates: Record<string, unknown> = {
      readProgress: progress,
      lastScrollPosition: scrollPosition,
    };
    if (progress >= 95) {
      updates.isRead = true;
    }
    updateCard(card.id, updates);
  }, [card.id, updateCard]);

  // Track scroll progress in modal view - use direct DOM manipulation to avoid re-renders
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !hasArticleContent) return;

    let saveTimeout: ReturnType<typeof setTimeout>;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll <= 0) return;

      const progress = Math.min(100, Math.round((scrollTop / maxScroll) * 100));

      // Update ref and DOM directly - no state change = no re-render
      progressRef.current = progress;
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${progress}%`;
      }

      // Debounced save to DB
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        handleReadingProgress(progress, scrollTop);
      }, 500);
    };

    // Restore scroll position on mount
    if (card.lastScrollPosition) {
      container.scrollTop = card.lastScrollPosition;
    }

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(saveTimeout);
    };
  }, [hasArticleContent, card.lastScrollPosition, handleReadingProgress]);

  // Full viewport reader mode
  if (showFullReader && hasArticleContent) {
    return (
      <Reader
        title={title || 'Untitled'}
        content={articleContent}
        url={card.url}
        domain={domain}
        wordCount={wordCount}
        readingTime={readingTime}
        initialProgress={card.readProgress || 0}
        onProgressChange={handleReadingProgress}
        onClose={() => setShowFullReader(false)}
        onMinimize={() => setShowFullReader(false)}
      />
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className={cn('flex-1 overflow-y-auto', className)}
    >
      {hasArticleContent ? (
        // Article text only - metadata is in the header
        <div className="px-6 pb-8 pt-4">
          {/* Reading progress bar - uses ref for direct DOM updates to avoid re-renders */}
          <div className="sticky top-0 left-0 right-0 h-1 bg-[var(--border-subtle)] -mx-6 mb-4 z-10">
            <div
              ref={progressBarRef}
              className="h-full bg-[var(--color-accent)]"
              style={{ width: `${progressRef.current}%` }}
            />
          </div>

          <article className="article-reader-content max-w-none">
            <SanitizedArticleContent html={sanitizedContent} />
          </article>

          {/* End of article */}
          <div className="mt-12 pt-6 border-t border-[var(--border-subtle)] text-center">
            <p className="text-sm text-text-muted">End of article</p>
            {card.url && (
              <a
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-sm text-[var(--color-accent)] hover:underline"
              >
                View original →
              </a>
            )}
          </div>
        </div>
      ) : (
        // Reader mode button - centered, prominent
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-6">
          <div className="text-center max-w-md">
            <BookOpen className="h-16 w-16 mx-auto mb-6 text-text-muted opacity-50" />
            <h3 className="text-xl font-medium text-text-primary mb-2">
              Read this article
            </h3>
            <p className="text-text-muted mb-6">
              Extract the article content for a clean, distraction-free reading experience.
            </p>

            <Button
              size="lg"
              onClick={handleExtractArticle}
              disabled={isExtractingArticle}
              className="gap-2"
            >
              {isExtractingArticle ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <BookOpen className="h-5 w-5" />
                  Extract Article
                </>
              )}
            </Button>

            {extractionError && (
              <p className="mt-4 text-sm text-red-400">{extractionError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Renders pre-sanitized HTML content.
 * SECURITY: Content MUST be sanitized with DOMPurify before passing to this component.
 * The parent component sanitizes in the sanitizedContent useMemo hook.
 */
function SanitizedArticleContent({ html }: { html: string }) {
  // Content is pre-sanitized with DOMPurify in parent component
  // eslint-disable-next-line react/no-danger
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
