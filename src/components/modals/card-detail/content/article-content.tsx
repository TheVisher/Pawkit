'use client';

/**
 * Article Content Component
 * Clean reader-focused layout for URL/article cards
 * Shows either "Extract Article" button or editable article text via Plate
 *
 * Updated to use Plate editor with JSON content storage.
 * Uses native Convex action for article extraction.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

// Simple type for Plate content - avoid complex generics
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlateContent = any[];
import { Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAction } from 'convex/react';
import { api } from 'convex/_generated/api';
import { useMutations } from '@/lib/contexts/convex-data-context';
import { Reader } from '@/components/reader';
import { PawkitPlateEditor } from '@/components/editor';
import {
  stringifyPlateContent,
  isPlateJson,
  parseJsonContent,
  extractPlateText,
  htmlToPlateJson,
} from '@/lib/plate/html-to-plate';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getDomain, getContentStats } from '../types';
import { updateReadingTimeTag, updateReadTag } from '@/lib/utils/system-tags';
import { isYouTubeUrl } from '@/lib/utils/url-detection';
import type { Card } from '@/lib/types/convex';

// Inline calculateReadingTime function (from db/schema)
function calculateReadingTime(wordCount: number): number {
  const wordsPerMinute = 200;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

interface ArticleContentProps {
  card: Card;
  title: string;
  setTitle?: (title: string) => void;
  onTitleBlur?: () => void;
  onClose: () => void;
  showFullReader: boolean;
  setShowFullReader: (show: boolean) => void;
  onRequestExpandImage?: () => void;
  hasImage?: boolean;
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
  onRequestExpandImage,
  hasImage,
  className,
}: ArticleContentProps) {
  const { updateCard } = useMutations();
  const extractArticleAction = useAction(api.metadata.extractArticleAction);

  // Extraction state
  const [isExtractingArticle, setIsExtractingArticle] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [showReextractDialog, setShowReextractDialog] = useState(false);

  // Track if user has edited article content
  const hasEditedArticle = !!card.articleContentEdited;

  // Reading progress - use refs to avoid re-renders on scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(card.readProgress || 0);
  const scrollPositionRef = useRef(card.lastScrollPosition || 0);

  // Track if we've already auto-expanded to fullscreen image view
  // This prevents bouncing back after user manually collapses
  const hasAutoExpandedRef = useRef(false);

  // Reset auto-expand tracking when card changes (modal opened for different card)
  useEffect(() => {
    hasAutoExpandedRef.current = false;
  }, [card._id]);

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
  // Note: In the Convex model, extraction is handled server-side or via direct API calls
  // This effect is removed as queueArticleExtraction is no longer available

  // Auto-expand image as fallback when article extraction has failed
  // This provides a nicer UX than showing "Article not available" error
  // Only triggers ONCE on initial load - respects user's manual toggle after that
  useEffect(() => {
    // Only trigger if:
    // 1. No article content AND not a recent card that might still be extracting
    // 2. Card has an image to show
    // 3. We have a callback to expand the image
    // 4. Not currently manually extracting
    // 5. Haven't already auto-expanded (prevents bounce-back on user collapse)
    if (
      !hasArticleContent &&
      !mightBeExtracting &&
      !isExtractingArticle &&
      hasImage &&
      onRequestExpandImage &&
      !hasAutoExpandedRef.current
    ) {
      // Mark as auto-expanded BEFORE triggering to prevent race conditions
      hasAutoExpandedRef.current = true;
      // Small delay to let the modal render first
      const timer = setTimeout(() => {
        onRequestExpandImage();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [hasArticleContent, mightBeExtracting, isExtractingArticle, hasImage, onRequestExpandImage]);

  // Parse article content - could be HTML (legacy) or JSON string (new format)
  const parsedArticleContent = useMemo(() => {
    const raw = articleContent;
    if (isPlateJson(raw)) {
      return parseJsonContent(raw) || raw;
    }
    return raw;
  }, [articleContent]);

  // Handle article content changes from the editor
  const handleArticleContentChange = useCallback((value: PlateContent) => {
    const jsonString = stringifyPlateContent(value);
    const text = extractPlateText(value);
    const wordCount = text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;

    updateCard(card._id, {
      articleContent: jsonString,
      // Recalculate word count and reading time when content changes
      wordCount,
      readingTime: calculateReadingTime(wordCount),
    });
  }, [card._id, updateCard]);

  // Track when user makes any edit to the article content
  const handleArticleEdit = useCallback(() => {
    // Only update if not already marked as edited
    if (!card.articleContentEdited) {
      updateCard(card._id, { articleContentEdited: true });
    }
  }, [card._id, card.articleContentEdited, updateCard]);

  // Handle click on extract/try again button
  const handleExtractClick = useCallback(() => {
    if (!card.url || isExtractingArticle) return;

    // If user has edited article content, show confirmation dialog
    if (hasEditedArticle) {
      setShowReextractDialog(true);
      return;
    }
    // Otherwise proceed directly
    performExtractArticle();
  }, [card.url, isExtractingArticle, hasEditedArticle]);

  // Extract article from URL using native Convex action
  const performExtractArticle = useCallback(async () => {
    if (!card.url || isExtractingArticle) return;

    setShowReextractDialog(false);
    setIsExtractingArticle(true);
    setExtractionError(null);

    try {
      // Call the Convex action directly
      const data = await extractArticleAction({ url: card.url });

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

      // Convert HTML content to Plate JSON for consistent storage
      let articleContentJson: string | undefined;
      if (data.article.content) {
        try {
          const plateNodes = htmlToPlateJson(data.article.content);
          articleContentJson = stringifyPlateContent(plateNodes);
        } catch (err) {
          console.warn('[ArticleContent] Failed to convert to JSON, storing as HTML:', err);
          articleContentJson = data.article.content;
        }
      }

      await updateCard(card._id, {
        articleContent: articleContentJson,
        wordCount: data.article.wordCount,
        readingTime: data.article.readingTime,
        isRead: false,
        readProgress: 0,
        metadata: Object.keys(newMetadata).length > 0 ? newMetadata : undefined,
        tags: newTags,
        // Reset the articleContentEdited flag since this is fresh content
        articleContentEdited: false,
      });
    } catch (error) {
      console.error('[ArticleContent] Extraction failed:', error);
      setExtractionError(error instanceof Error ? error.message : 'Failed to extract article');
    } finally {
      setIsExtractingArticle(false);
    }
  }, [card._id, card.url, card.metadata, card.tags, isExtractingArticle, extractArticleAction, updateCard]);

  // Save scroll progress on close (not during scroll to avoid re-renders and scroll jumping)
  const saveScrollProgressOnClose = useCallback(() => {
    // Only save if there's meaningful progress
    if (progressRef.current > 0 || scrollPositionRef.current > 0) {
      updateCard(card._id, {
        readProgress: progressRef.current,
        lastScrollPosition: scrollPositionRef.current,
      });
    }
  }, [card._id, updateCard]);

  // Simple auto-read marking: 15 seconds with modal open = marked as read
  // Unless user has manually marked it as unread (sticky unread)
  useEffect(() => {
    // Only auto-mark if: has article content, not already read, not manually marked unread
    if (!hasArticleContent || card.isRead || card.manuallyMarkedUnread) return;

    const timer = setTimeout(() => {
      // Add 'read' tag to the card's tags
      const newTags = updateReadTag(card.tags || [], true);
      updateCard(card._id, { isRead: true, tags: newTags });
    }, 15000); // 15 seconds

    return () => clearTimeout(timer);
  }, [hasArticleContent, card._id, card.isRead, card.manuallyMarkedUnread, card.tags, updateCard]);

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
      className={cn('flex-1 overflow-y-auto pl-14 pr-6', className)}
    >
      {hasArticleContent || !mightBeExtracting ? (
        // Article editor - metadata is in the header
        <div className="pb-8 pt-4">
          {/* Reading progress bar - uses ref for direct DOM updates to avoid re-renders */}
          <div className="sticky top-0 left-0 right-0 h-1 bg-[var(--border-subtle)] -mx-6 mb-4 z-10">
            <div
              ref={progressBarRef}
              className="h-full bg-[var(--color-accent)]"
              style={{ width: `${progressRef.current}%` }}
            />
          </div>

          {/* Re-extract button when no content - subtle, inline with the editor */}
          {!hasArticleContent && card.url && (
            <div className="mb-4 text-sm text-text-muted">
              <div className="flex items-center gap-2">
                <span>{extractionError || 'Extraction failed or article not available.'}</span>
                <button
                  onClick={handleExtractClick}
                  disabled={isExtractingArticle}
                  className={cn(
                    'inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {isExtractingArticle ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3" />
                      Try again
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <article className="article-reader-content max-w-none">
            <PawkitPlateEditor
              content={parsedArticleContent}
              onChange={handleArticleContentChange}
              onEdit={handleArticleEdit}
              placeholder="No content extracted. You can add your own notes here..."
              workspaceId={card.workspaceId}
              cardId={card._id}
              className="content-panel-editor"
              variant="minimal"
            />
          </article>

          {/* End of article / View original link */}
          {hasArticleContent && (
            <div className="mt-12 pt-6 border-t border-[var(--border-subtle)] text-center">
              <p className="text-sm text-text-muted">End of article</p>
              {card.url && (
                <div className="flex items-center justify-center gap-4 mt-2">
                  <a
                    href={card.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--color-accent)] hover:underline"
                  >
                    View original →
                  </a>
                  <span className="text-text-muted">·</span>
                  <button
                    onClick={handleExtractClick}
                    disabled={isExtractingArticle}
                    className={cn(
                      'inline-flex items-center gap-1 text-sm text-text-muted hover:text-[var(--color-accent)]',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {isExtractingArticle ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Re-extracting...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3" />
                        Re-fetch article
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
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
      )}

      {/* Re-extract confirmation dialog */}
      <AlertDialog open={showReextractDialog} onOpenChange={setShowReextractDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-extract Article?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ve made edits to this article. Re-extracting will replace your changes with fresh content from the source.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performExtractArticle}>
              Re-extract Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
