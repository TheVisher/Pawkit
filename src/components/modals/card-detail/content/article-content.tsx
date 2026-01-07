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
import { updateReadingTimeTag, updateReadTag } from '@/lib/utils/system-tags';
import { queueArticleExtraction } from '@/lib/services/metadata-service';
import { isYouTubeUrl } from '@/lib/utils/url-detection';
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
  const scrollPositionRef = useRef(card.lastScrollPosition || 0);

  // Derived state
  const articleContent = card.articleContent || '';
  const hasArticleContent = !!articleContent;
  const wordCount = card.wordCount || getContentStats(articleContent).words;
  const readingTime = card.readingTime || (wordCount ? calculateReadingTime(wordCount) : 0);
  const domain = card.domain || getDomain(card.url || '');

  // Check if extraction might be in progress (card created recently)
  // Automatic extraction runs ~500ms after metadata, give it 30 seconds to complete
  const cardAge = card.createdAt ? Date.now() - new Date(card.createdAt).getTime() : Infinity;
  const isRecentCard = cardAge < 30000; // 30 seconds
  const mightBeExtracting = !hasArticleContent && isRecentCard && card.status === 'READY';

  // Auto-trigger article extraction if card needs it
  // This handles cases where the portal created the card but didn't finish extraction
  // (e.g., portal window was hidden, different JS context, timing issues)
  useEffect(() => {
    if (
      !hasArticleContent &&
      card.url &&
      card.status === 'READY' &&
      !isYouTubeUrl(card.url)
    ) {
      // Queue extraction - the service will skip if already processed
      queueArticleExtraction(card.id);
    }
  }, [card.id, card.url, card.status, hasArticleContent]);

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

      // Add reading time tag if we have a reading time
      const currentTags = card.tags || [];
      const newTags = data.article.readingTime
        ? updateReadingTimeTag(currentTags, data.article.readingTime)
        : currentTags;

      await updateCard(card.id, {
        articleContent: data.article.content || undefined,
        wordCount: data.article.wordCount,
        readingTime: data.article.readingTime,
        isRead: false,
        readProgress: 0,
        metadata: Object.keys(newMetadata).length > 0 ? newMetadata : undefined,
        tags: newTags,
      });
    } catch (error) {
      console.error('[ArticleContent] Extraction failed:', error);
      setExtractionError(error instanceof Error ? error.message : 'Failed to extract article');
    } finally {
      setIsExtractingArticle(false);
    }
  }, [card.id, card.url, isExtractingArticle, updateCard]);

  // Save scroll progress on close (not during scroll to avoid re-renders and scroll jumping)
  const saveScrollProgressOnClose = useCallback(() => {
    // Only save if there's meaningful progress
    if (progressRef.current > 0 || scrollPositionRef.current > 0) {
      updateCard(card.id, {
        readProgress: progressRef.current,
        lastScrollPosition: scrollPositionRef.current,
      });
    }
  }, [card.id, updateCard]);

  // Simple auto-read marking: 15 seconds with modal open = marked as read
  // Unless user has manually marked it as unread (sticky unread)
  useEffect(() => {
    // Only auto-mark if: has article content, not already read, not manually marked unread
    if (!hasArticleContent || card.isRead || card.manuallyMarkedUnread) return;

    const timer = setTimeout(() => {
      // Add 'read' tag to the card's tags
      const newTags = updateReadTag(card.tags || [], true);
      updateCard(card.id, { isRead: true, tags: newTags });
    }, 15000); // 15 seconds

    return () => clearTimeout(timer);
  }, [hasArticleContent, card.id, card.isRead, card.manuallyMarkedUnread, card.tags, updateCard]);

  // Track scroll progress in modal view - use direct DOM manipulation to avoid re-renders
  // Progress is saved only on close, not during scroll (prevents scroll jumping and re-renders)
  const hasRestoredScrollRef = useRef(false);
  const initialScrollPositionRef = useRef(card.lastScrollPosition);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !hasArticleContent) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll <= 0) return;

      const progress = Math.min(100, Math.round((scrollTop / maxScroll) * 100));

      // Update refs and DOM directly - no state change = no re-render, no DB save
      progressRef.current = progress;
      scrollPositionRef.current = scrollTop;
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${progress}%`;
      }
    };

    // Restore scroll position on mount only
    if (initialScrollPositionRef.current && !hasRestoredScrollRef.current) {
      hasRestoredScrollRef.current = true;
      container.scrollTop = initialScrollPositionRef.current;
    }

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [hasArticleContent]);

  // Save progress when component unmounts (modal closes)
  useEffect(() => {
    return () => {
      saveScrollProgressOnClose();
    };
  }, [saveScrollProgressOnClose]);

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
        initialProgress={progressRef.current || card.readProgress || 0}
        onProgressSave={saveScrollProgressOnClose}
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
      ) : mightBeExtracting ? (
        // Auto-extraction in progress - show loading state
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-6">
          <div className="text-center max-w-md">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-[var(--color-accent)] animate-spin" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              Extracting article...
            </h3>
            <p className="text-text-muted text-sm">
              Preparing a clean reading experience
            </p>
          </div>
        </div>
      ) : (
        // Fallback - extraction failed or timed out
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-6">
          <div className="text-center max-w-md">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-text-muted opacity-50" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              Article not available
            </h3>
            <p className="text-text-muted text-sm mb-6">
              {extractionError || "Couldn't extract article content automatically. Try extracting manually."}
            </p>

            <Button
              size="default"
              variant="outline"
              onClick={handleExtractArticle}
              disabled={isExtractingArticle}
              className="gap-2"
            >
              {isExtractingArticle ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4" />
                  Try Again
                </>
              )}
            </Button>
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
