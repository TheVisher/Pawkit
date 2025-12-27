'use client';

/**
 * Reader Mode Component
 * Clean, distraction-free reading experience for saved articles
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { X, Minus, Plus, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Debounce helper
function debounce<T extends (...args: Parameters<T>) => void>(fn: T, ms: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  }) as T;
}

interface ReaderProps {
  title: string;
  content: string;
  url?: string;
  domain?: string;
  wordCount?: number;
  readingTime?: number;
  initialProgress?: number;
  onProgressChange?: (progress: number, scrollPosition: number) => void;
  onClose: () => void;
}

const FONT_SIZES = [14, 16, 18, 20, 22, 24] as const;
const DEFAULT_FONT_SIZE_INDEX = 2; // 18px

export function Reader({
  title,
  content,
  url,
  domain,
  wordCount,
  readingTime,
  initialProgress = 0,
  onProgressChange,
  onClose,
}: ReaderProps) {
  const [fontSizeIndex, setFontSizeIndex] = useState(DEFAULT_FONT_SIZE_INDEX);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef(initialProgress);

  const fontSize = FONT_SIZES[fontSizeIndex];

  // Sanitize HTML content and handle images
  const sanitizedContent = useMemo(() => {
    if (typeof window === 'undefined') return '';

    // Sanitize first
    let cleaned = DOMPurify.sanitize(content, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allowfullscreen', 'frameborder', 'src', 'loading'],
    });

    // Add lazy loading to images and handle errors
    cleaned = cleaned.replace(
      /<img\s/gi,
      '<img loading="lazy" onerror="this.style.display=\'none\'" '
    );

    return cleaned;
  }, [content]);

  // Debounced progress save - only saves to DB every 500ms
  const debouncedProgressSave = useMemo(
    () => debounce((progress: number, scrollTop: number) => {
      onProgressChange?.(progress, scrollTop);
    }, 500),
    [onProgressChange]
  );

  // Handle scroll - updates DOM directly via refs to avoid re-renders
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const maxScroll = scrollHeight - clientHeight;

    const newProgress = maxScroll <= 0 ? 100 : Math.min(100, Math.round((scrollTop / maxScroll) * 100));

    // Update refs and DOM directly - no state change = no re-render
    progressRef.current = newProgress;
    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${newProgress}%`;
    }
    if (progressTextRef.current) {
      progressTextRef.current.textContent = `${newProgress}%`;
    }

    // Debounced save to DB
    debouncedProgressSave(newProgress, scrollTop);
  }, [debouncedProgressSave]);

  // Restore scroll position on mount
  useEffect(() => {
    if (scrollRef.current && initialProgress > 0) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      const maxScroll = scrollHeight - clientHeight;
      scrollRef.current.scrollTop = (initialProgress / 100) * maxScroll;
    }
  }, [initialProgress]);

  // Font size controls
  const decreaseFontSize = () => {
    setFontSizeIndex((i) => Math.max(0, i - 1));
  };

  const increaseFontSize = () => {
    setFontSizeIndex((i) => Math.min(FONT_SIZES.length - 1, i + 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Reading stats */}
          <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-text-muted whitespace-nowrap">
            {readingTime && (
              <span>{readingTime} min read</span>
            )}
            {wordCount && (
              <span className="hidden md:inline">{wordCount.toLocaleString()} words</span>
            )}
            <span ref={progressTextRef} className="text-[var(--color-accent)]">{initialProgress}%</span>
          </div>
        </div>

        {/* Font size controls */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={decreaseFontSize}
            disabled={fontSizeIndex === 0}
            className="h-8 w-8"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 text-sm text-text-muted w-12 md:w-16 justify-center">
            <Type className="h-4 w-4" />
            <span className="hidden md:inline">{fontSize}px</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={increaseFontSize}
            disabled={fontSizeIndex === FONT_SIZES.length - 1}
            className="h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-0.5 bg-bg-surface-2">
        <div
          ref={progressBarRef}
          className="h-full bg-[var(--color-accent)]"
          style={{ width: `${initialProgress}%` }}
        />
      </div>

      {/* Content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <article
          ref={contentRef}
          className="max-w-[680px] mx-auto px-4 md:px-6 py-8 md:py-12"
          style={{ fontSize: `${fontSize}px` }}
        >
          {/* Title */}
          <h1 className="text-3xl font-bold text-text-primary mb-4 leading-tight">
            {title}
          </h1>

          {/* Source */}
          {(domain || url) && (
            <div className="mb-8">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-muted hover:text-[var(--color-accent)] transition-colors"
              >
                {domain || url}
              </a>
            </div>
          )}

          {/* Article content - sanitized with DOMPurify */}
          <div
            className={cn(
              'prose prose-invert max-w-none',
              'prose-headings:text-text-primary prose-headings:font-semibold',
              'prose-p:text-text-secondary prose-p:leading-relaxed',
              'prose-a:text-[var(--color-accent)] prose-a:no-underline hover:prose-a:underline',
              'prose-strong:text-text-primary',
              'prose-blockquote:border-l-[var(--color-accent)] prose-blockquote:text-text-muted',
              'prose-code:text-[var(--color-accent)] prose-code:bg-bg-surface-2 prose-code:px-1 prose-code:rounded',
              'prose-pre:bg-bg-surface-2 prose-pre:border prose-pre:border-border-subtle',
              'prose-img:rounded-lg',
              'prose-li:text-text-secondary'
            )}
            style={{ lineHeight: 1.8 }}
          >
            <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
          </div>

          {/* End marker */}
          <div className="mt-16 pt-8 border-t border-border-subtle text-center">
            <p className="text-sm text-text-muted">End of article</p>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-sm text-[var(--color-accent)] hover:underline"
              >
                View original →
              </a>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
