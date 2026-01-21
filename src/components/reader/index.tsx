'use client';

/**
 * Reader Mode Component
 * Clean, distraction-free reading experience for saved articles
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { X, Minus, Plus, Type, Minimize2, Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isPlateJson, parseJsonContent, plateToHtml } from '@/lib/plate/html-to-plate';

interface ReaderProps {
  title: string;
  content: string;
  url?: string;
  domain?: string;
  wordCount?: number;
  readingTime?: number;
  initialProgress?: number;
  onProgressSave?: () => void; // Called on close to save progress
  onClose: () => void;
  onMinimize?: () => void; // Go back to modal reader view
}

const FONT_SIZES = [14, 16, 18, 20, 22, 24] as const;
const DEFAULT_FONT_SIZE_INDEX = 2; // 18px

type ThemeMode = 'dark' | 'sepia' | 'light';

const THEME_STYLES: Record<ThemeMode, { bg: string; text: string; textMuted: string; accent: string; border: string }> = {
  dark: {
    bg: '#0d0d0d',
    text: '#e5e5e5',
    textMuted: '#888888',
    accent: 'var(--color-accent)',
    border: '#333333',
  },
  sepia: {
    bg: '#f4ecd8',
    text: '#5c4b37',
    textMuted: '#8b7355',
    accent: '#8b5a2b',
    border: '#d4c4a8',
  },
  light: {
    bg: '#ffffff',
    text: '#1a1a1a',
    textMuted: '#666666',
    accent: '#0066cc',
    border: '#e5e5e5',
  },
};

export function Reader({
  title,
  content,
  url,
  domain,
  wordCount,
  readingTime,
  initialProgress = 0,
  onProgressSave,
  onClose,
  onMinimize,
}: ReaderProps) {
  const [fontSizeIndex, setFontSizeIndex] = useState(DEFAULT_FONT_SIZE_INDEX);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef(initialProgress);

  const fontSize = FONT_SIZES[fontSizeIndex];
  const themeStyle = THEME_STYLES[theme];

  // Handle browser fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  // Listen for fullscreen changes (e.g., user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Sanitize HTML content and handle images
  // Supports both HTML and Plate JSON formats
  const sanitizedContent = useMemo(() => {
    if (typeof window === 'undefined') return '';

    // Convert Plate JSON to HTML if needed
    let htmlContent = '';
    if (isPlateJson(content)) {
      const parsed = parseJsonContent(content);
      if (parsed) {
        htmlContent = plateToHtml(parsed);
      }
    } else if (typeof content === 'string') {
      htmlContent = content;
    }

    if (!htmlContent) {
      return '';
    }

    // Sanitize
    let cleaned = DOMPurify.sanitize(htmlContent, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allowfullscreen', 'frameborder', 'src', 'loading'],
    });

    // Add lazy loading to images (onerror removed for security - handled via CSS)
    cleaned = cleaned.replace(
      /<img\s/gi,
      '<img loading="lazy" '
    );

    return cleaned;
  }, [content]);

  // Handle scroll - updates DOM directly via refs to avoid re-renders
  // Progress is saved only on close, not during scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const maxScroll = scrollHeight - clientHeight;

    const newProgress = maxScroll <= 0 ? 100 : Math.min(100, Math.round((scrollTop / maxScroll) * 100));

    // Update refs and DOM directly - no state change = no re-render, no DB save
    progressRef.current = newProgress;
    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${newProgress}%`;
    }
    if (progressTextRef.current) {
      progressTextRef.current.textContent = `${newProgress}%`;
    }
  }, []);

  // Handle close - save progress first
  const handleClose = useCallback(() => {
    onProgressSave?.();
    onClose();
  }, [onProgressSave, onClose]);

  // Handle minimize - save progress first
  const handleMinimize = useCallback(() => {
    onProgressSave?.();
    onMinimize?.();
  }, [onProgressSave, onMinimize]);

  // Restore scroll position on mount only (not when progress updates)
  const hasRestoredScroll = useRef(false);
  useEffect(() => {
    if (scrollRef.current && initialProgress > 0 && !hasRestoredScroll.current) {
      hasRestoredScroll.current = true;
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

  // Cycle through themes
  const cycleTheme = () => {
    setTheme((current) => {
      if (current === 'dark') return 'sepia';
      if (current === 'sepia') return 'light';
      return 'dark';
    });
  };

  return (
    <div
      ref={containerRef}
      data-reader-container
      className="fixed inset-0 flex flex-col transition-colors duration-300"
      style={{
        zIndex: 9999, // Ensure it's above everything including sidebars
        backgroundColor: themeStyle.bg,
        color: themeStyle.text,
      }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 md:px-6 py-4 border-b"
        style={{ borderColor: themeStyle.border }}
      >
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-9 w-9"
            style={{ color: themeStyle.text }}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Reading stats */}
          <div
            className="flex items-center gap-2 md:gap-3 text-xs md:text-sm whitespace-nowrap"
            style={{ color: themeStyle.textMuted }}
          >
            {readingTime && (
              <span>{readingTime} min read</span>
            )}
            {wordCount && (
              <span className="hidden md:inline">{wordCount.toLocaleString()} words</span>
            )}
            <span ref={progressTextRef} style={{ color: themeStyle.accent }}>{initialProgress}%</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={cycleTheme}
            className="h-8 w-8"
            style={{ color: themeStyle.text }}
            title={`Theme: ${theme}`}
          >
            {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>

          {/* Minimize to modal (if available) */}
          {onMinimize && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMinimize}
              className="h-8 w-8"
              style={{ color: themeStyle.text }}
              title="Minimize to modal"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          )}

          {/* Browser fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="h-8 w-8"
            style={{ color: themeStyle.text }}
            title={isFullscreen ? 'Exit fullscreen' : 'Browser fullscreen'}
          >
            <Monitor className="h-4 w-4" />
          </Button>

          {/* Divider */}
          <div className="w-px h-6 mx-1" style={{ backgroundColor: themeStyle.border }} />

          {/* Font size controls */}
          <Button
            variant="ghost"
            size="icon"
            onClick={decreaseFontSize}
            disabled={fontSizeIndex === 0}
            className="h-8 w-8"
            style={{ color: themeStyle.text }}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <div
            className="flex items-center gap-1 text-sm w-12 md:w-16 justify-center"
            style={{ color: themeStyle.textMuted }}
          >
            <Type className="h-4 w-4" />
            <span className="hidden md:inline">{fontSize}px</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={increaseFontSize}
            disabled={fontSizeIndex === FONT_SIZES.length - 1}
            className="h-8 w-8"
            style={{ color: themeStyle.text }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-0.5" style={{ backgroundColor: themeStyle.border }}>
        <div
          ref={progressBarRef}
          className="h-full transition-none"
          style={{ width: `${initialProgress}%`, backgroundColor: themeStyle.accent }}
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
          className={cn(
            'mx-auto px-4 md:px-8 py-8 md:py-12',
            isFullscreen ? 'max-w-[1000px]' : 'max-w-[800px]'
          )}
          style={{ fontSize: `${fontSize}px` }}
        >
          {/* Title */}
          <h1
            className="text-3xl font-bold mb-4 leading-tight"
            style={{ color: themeStyle.text }}
          >
            {title}
          </h1>

          {/* Source */}
          {(domain || url) && (
            <div className="mb-8">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm transition-colors hover:underline"
                style={{ color: themeStyle.textMuted }}
              >
                {domain || url}
              </a>
            </div>
          )}

          {/* Article content */}
          <div
            className="reader-content"
            style={{
              lineHeight: 1.8,
              color: themeStyle.text,
              ['--reader-text' as string]: themeStyle.text,
              ['--reader-text-muted' as string]: themeStyle.textMuted,
              ['--reader-accent' as string]: themeStyle.accent,
              ['--reader-border' as string]: themeStyle.border,
              ['--reader-bg' as string]: themeStyle.bg,
            }}
          >
            <ReaderContent html={sanitizedContent} />
          </div>

          {/* End marker */}
          <div
            className="mt-16 pt-8 border-t text-center"
            style={{ borderColor: themeStyle.border }}
          >
            <p className="text-sm" style={{ color: themeStyle.textMuted }}>End of article</p>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-sm hover:underline"
                style={{ color: themeStyle.accent }}
              >
                View original →
              </a>
            )}
          </div>
        </article>
      </div>

      {/* Global styles for reader content */}
      <style jsx global>{`
        .reader-content h1,
        .reader-content h2,
        .reader-content h3,
        .reader-content h4,
        .reader-content h5,
        .reader-content h6 {
          color: var(--reader-text);
          font-weight: 600;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        .reader-content h1 { font-size: 2em; }
        .reader-content h2 { font-size: 1.5em; }
        .reader-content h3 { font-size: 1.25em; }
        .reader-content p {
          color: var(--reader-text);
          margin-bottom: 1em;
        }
        .reader-content a {
          color: var(--reader-accent);
          text-decoration: none;
        }
        .reader-content a:hover {
          text-decoration: underline;
        }
        .reader-content strong {
          color: var(--reader-text);
          font-weight: 600;
        }
        .reader-content em {
          font-style: italic;
        }
        .reader-content blockquote {
          border-left: 3px solid var(--reader-accent);
          padding-left: 1em;
          margin: 1em 0;
          color: var(--reader-text-muted);
          font-style: italic;
        }
        .reader-content code {
          color: var(--reader-accent);
          background: rgba(128, 128, 128, 0.1);
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-size: 0.9em;
        }
        .reader-content pre {
          background: rgba(128, 128, 128, 0.1);
          border: 1px solid var(--reader-border);
          padding: 1em;
          border-radius: 6px;
          overflow-x: auto;
          margin: 1em 0;
        }
        .reader-content pre code {
          background: none;
          padding: 0;
        }
        .reader-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1em 0;
        }
        .reader-content img[src=""],
        .reader-content img:not([src]) {
          display: none;
        }
        .reader-content ul,
        .reader-content ol {
          color: var(--reader-text);
          margin: 1em 0;
          padding-left: 1.5em;
        }
        .reader-content li {
          margin-bottom: 0.5em;
        }
        .reader-content figure {
          margin: 1.5em 0;
        }
        .reader-content figcaption {
          color: var(--reader-text-muted);
          font-size: 0.9em;
          text-align: center;
          margin-top: 0.5em;
        }
        .reader-content hr {
          border: none;
          border-top: 1px solid var(--reader-border);
          margin: 2em 0;
        }
        .reader-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
        }
        .reader-content th,
        .reader-content td {
          border: 1px solid var(--reader-border);
          padding: 0.5em;
          text-align: left;
        }
        .reader-content th {
          background: rgba(128, 128, 128, 0.1);
        }
      `}</style>
    </div>
  );
}

// Separate component to prevent re-renders of the main Reader
function ReaderContent({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
