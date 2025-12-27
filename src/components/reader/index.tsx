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
  const [progress, setProgress] = useState(initialProgress);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fontSize = FONT_SIZES[fontSizeIndex];

  // Sanitize HTML content
  const sanitizedContent = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return DOMPurify.sanitize(content, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allowfullscreen', 'frameborder', 'src'],
    });
  }, [content]);

  // Handle scroll and calculate progress
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 0) {
      setProgress(100);
      return;
    }

    const newProgress = Math.min(100, Math.round((scrollTop / maxScroll) * 100));
    setProgress(newProgress);
    onProgressChange?.(newProgress, scrollTop);
  }, [onProgressChange]);

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
      <header className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Reading stats */}
          <div className="flex items-center gap-3 text-sm text-text-muted">
            {readingTime && (
              <span>{readingTime} min read</span>
            )}
            {wordCount && (
              <span>{wordCount.toLocaleString()} words</span>
            )}
            <span className="text-[var(--color-accent)]">{progress}%</span>
          </div>
        </div>

        {/* Font size controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={decreaseFontSize}
            disabled={fontSizeIndex === 0}
            className="h-8 w-8"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 text-sm text-text-muted w-16 justify-center">
            <Type className="h-4 w-4" />
            <span>{fontSize}px</span>
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
          className="h-full bg-[var(--color-accent)] transition-all duration-150"
          style={{ width: `${progress}%` }}
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
          className="max-w-[680px] mx-auto px-6 py-12"
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
