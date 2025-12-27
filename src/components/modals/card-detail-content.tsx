'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import {
  X,
  ExternalLink,
  Globe,
  FileText,
  StickyNote,
  BookOpen,
  Clock,
  CheckCircle2,
  Loader2,
  Maximize2,
  Monitor,
  ArrowLeft,
  Sun,
  Moon,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { useDataStore } from '@/lib/stores/data-store';
import { useTagStore } from '@/lib/stores/tag-store';
import { cn } from '@/lib/utils';
import { Editor } from '@/components/editor';
import { TagInput } from '@/components/tags/tag-input';
import { SchedulePicker } from '@/components/cards/schedule-picker';
import { Reader } from '@/components/reader';
import { Button } from '@/components/ui/button';
import { calculateReadingTime } from '@/lib/db/schema';

function getCardIcon(type: string) {
  switch (type) {
    case 'url':
      return Globe;
    case 'md-note':
    case 'text-note':
      return FileText;
    case 'quick-note':
      return StickyNote;
    default:
      return Globe;
  }
}

function getDomain(url: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function getContentStats(html: string): { words: number; chars: number; links: number } {
  if (!html) return { words: 0, chars: 0, links: 0 };

  // Strip HTML tags to get plain text
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
  const chars = text.length;

  // Count links
  const linkMatches = html.match(/<a\s/gi);
  const links = linkMatches ? linkMatches.length : 0;

  return { words, chars, links };
}

interface CardDetailContentProps {
  cardId: string;
  onClose: () => void;
  className?: string;
}

export function CardDetailContent({ cardId, onClose, className }: CardDetailContentProps) {
  const cards = useDataStore((s) => s.cards);
  const updateCard = useDataStore((s) => s.updateCard);

  // Find the active card
  const card = useMemo(() => cards.find((c) => c.id === cardId), [cards, cardId]);

  // Local state for editing - initialize from card
  const [title, setTitle] = useState(card?.title || '');
  const [notes, setNotes] = useState(card?.notes || '');
  const [content, setContent] = useState(card?.content || '');
  const [tags, setTags] = useState<string[]>(card?.tags || []);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    card?.scheduledDate ? new Date(card.scheduledDate) : undefined
  );
  const [imageError, setImageError] = useState(false);
  const [showInlineReader, setShowInlineReader] = useState(false);
  const [showFullReader, setShowFullReader] = useState(false);
  const [isExtractingArticle, setIsExtractingArticle] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [inlineTheme, setInlineTheme] = useState<'dark' | 'sepia' | 'light'>('dark');

  // Theme styles for inline reader
  const inlineThemeStyles = {
    dark: { bg: '#0d0d0d', text: '#e5e5e5', textMuted: '#888888', border: '#333333' },
    sepia: { bg: '#f4ecd8', text: '#5c4b37', textMuted: '#8b7355', border: '#d4c4a8' },
    light: { bg: '#ffffff', text: '#1a1a1a', textMuted: '#666666', border: '#e5e5e5' },
  };
  const currentTheme = inlineThemeStyles[inlineTheme];

  // Refs
  const titleRef = useRef<HTMLInputElement>(null);

  // Check if this is a note card (not a URL bookmark)
  const isNoteCard = card?.type === 'md-note' || card?.type === 'text-note' || card?.type === 'quick-note';

  // Check if card has article content for reader mode
  const hasArticleContent = !isNoteCard && (card?.articleContent || card?.content);
  const articleContent = card?.articleContent || card?.content || '';
  const wordCount = card?.wordCount || getContentStats(articleContent).words;
  const readingTime = card?.readingTime || (wordCount ? calculateReadingTime(wordCount) : 0);

  // Sync local state when card changes
  useEffect(() => {
    if (card) {
      setTitle(card.title || '');
      setNotes(card.notes || '');
      setContent(card.content || '');
      setTags(card.tags || []);
      setScheduledDate(card.scheduledDate ? new Date(card.scheduledDate) : undefined);
      setImageError(false);
    }
  }, [card?.id]);

  // Auto-save title on blur
  const handleTitleBlur = useCallback(() => {
    if (card && title !== card.title) {
      updateCard(card.id, { title });
    }
  }, [card, title, updateCard]);

  // Save content when editor changes (for note cards)
  // Note: Editor component handles debouncing, so we save immediately here
  const handleContentChange = useCallback((html: string) => {
    setContent(html);
    if (card) {
      updateCard(card.id, { content: html });
    }
  }, [card?.id, updateCard]);

  // Save notes when editor changes (for bookmark cards)
  // Note: Editor component handles debouncing, so we save immediately here
  const handleNotesChange = useCallback((html: string) => {
    setNotes(html);
    if (card) {
      updateCard(card.id, { notes: html });
    }
  }, [card?.id, updateCard]);

  // Handle tag changes - save immediately
  const handleTagsChange = useCallback((newTags: string[]) => {
    setTags(newTags);
    if (card) {
      updateCard(card.id, { tags: newTags });
    }
  }, [card, updateCard]);

  // Handle schedule changes - save immediately
  const handleScheduleChange = useCallback((date: Date | undefined) => {
    setScheduledDate(date);
    if (card) {
      updateCard(card.id, { scheduledDate: date });
    }
  }, [card, updateCard]);

  // Handle reading progress changes
  const handleReadingProgress = useCallback((progress: number, scrollPosition: number) => {
    if (card) {
      const updates: Record<string, unknown> = {
        readProgress: progress,
        lastScrollPosition: scrollPosition,
      };
      // Mark as read if completed
      if (progress >= 95) {
        updates.isRead = true;
      }
      updateCard(card.id, updates);
    }
  }, [card, updateCard]);

  // Toggle read status
  const handleToggleRead = useCallback(() => {
    if (card) {
      updateCard(card.id, { isRead: !card.isRead });
    }
  }, [card, updateCard]);

  // On-demand article extraction
  const handleExtractArticle = useCallback(async () => {
    if (!card?.url || isExtractingArticle) return;

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

      // Update card with article content
      await updateCard(card.id, {
        articleContent: data.article.content || undefined,
        wordCount: data.article.wordCount,
        readingTime: data.article.readingTime,
        isRead: false,
        readProgress: 0,
      });

      // Show inline reader after extraction
      setShowInlineReader(true);
    } catch (error) {
      console.error('[CardDetail] Article extraction failed:', error);
      setExtractionError(error instanceof Error ? error.message : 'Failed to extract article');
    } finally {
      setIsExtractingArticle(false);
    }
  }, [card?.id, card?.url, isExtractingArticle, updateCard]);

  // Handle reader button click - extract if needed, then show inline reader
  const handleReaderClick = useCallback(() => {
    if (card?.articleContent) {
      // Already have content, show inline reader
      setShowInlineReader(true);
    } else {
      // Need to extract first
      handleExtractArticle();
    }
  }, [card?.articleContent, handleExtractArticle]);

  // Sanitize article content for inline display
  const sanitizedArticleContent = useMemo(() => {
    if (typeof window === 'undefined' || !articleContent) return '';
    let cleaned = DOMPurify.sanitize(articleContent, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allowfullscreen', 'frameborder', 'src', 'loading'],
    });
    // Add lazy loading to images
    cleaned = cleaned.replace(/<img\s/gi, '<img loading="lazy" ');
    return cleaned;
  }, [articleContent]);

  if (!card) return null;

  // Show full viewport reader mode
  if (showFullReader && hasArticleContent) {
    return (
      <Reader
        title={card.title || 'Untitled'}
        content={articleContent}
        url={card.url}
        domain={card.domain || getDomain(card.url)}
        wordCount={wordCount}
        readingTime={readingTime}
        initialProgress={card.readProgress || 0}
        onProgressChange={handleReadingProgress}
        onClose={() => setShowFullReader(false)}
        onMinimize={() => {
          setShowFullReader(false);
          setShowInlineReader(true);
        }}
      />
    );
  }

  // Show inline reader in modal
  if (showInlineReader && hasArticleContent) {
    return (
      <div
        className={cn(
          'flex flex-col h-full transition-colors duration-200',
          className
        )}
        style={{ backgroundColor: currentTheme.bg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Inline reader header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: currentTheme.border }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowInlineReader(false)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: currentTheme.text }}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="text-sm" style={{ color: currentTheme.textMuted }}>
              {readingTime > 0 && <span>{readingTime} min read</span>}
              {wordCount > 0 && <span className="ml-2">{wordCount.toLocaleString()} words</span>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={() => setInlineTheme(t => t === 'dark' ? 'sepia' : t === 'sepia' ? 'light' : 'dark')}
              className="p-2 rounded-lg transition-colors hover:opacity-70"
              style={{ color: currentTheme.text }}
              title={`Theme: ${inlineTheme}`}
            >
              {inlineTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            {/* Expand to full Pawkit viewport */}
            <button
              onClick={() => {
                setShowInlineReader(false);
                setShowFullReader(true);
              }}
              className="p-2 rounded-lg transition-colors hover:opacity-70"
              style={{ color: currentTheme.text }}
              title="Expand to full window"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            {/* Browser fullscreen */}
            <button
              onClick={() => {
                setShowInlineReader(false);
                setShowFullReader(true);
                setTimeout(() => {
                  document.querySelector('[data-reader-container]')?.requestFullscreen?.();
                }, 100);
              }}
              className="p-2 rounded-lg transition-colors hover:opacity-70"
              style={{ color: currentTheme.text }}
              title="Browser fullscreen"
            >
              <Monitor className="h-4 w-4" />
            </button>
            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:opacity-70"
              style={{ color: currentTheme.text }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Article content - overscroll-none prevents text bounce */}
        <div
          className="flex-1 overflow-y-auto overscroll-none"
          style={{ WebkitOverflowScrolling: 'auto' }}
        >
          <article className="max-w-none px-6 py-8">
            <h1
              className="text-2xl font-bold mb-4 leading-tight"
              style={{ color: currentTheme.text }}
            >
              {card.title || 'Untitled'}
            </h1>
            {(card.domain || card.url) && (
              <a
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm mb-6 hover:underline"
                style={{ color: currentTheme.textMuted }}
              >
                {card.domain || getDomain(card.url)}
              </a>
            )}
            <div
              className="inline-reader-content"
              style={{
                fontSize: '16px',
                lineHeight: 1.8,
                color: currentTheme.text,
                ['--inline-text' as string]: currentTheme.text,
                ['--inline-muted' as string]: currentTheme.textMuted,
                ['--inline-border' as string]: currentTheme.border,
              }}
            >
              <InlineReaderContent html={sanitizedArticleContent} />
            </div>
            <div
              className="mt-12 pt-6 border-t text-center"
              style={{ borderColor: currentTheme.border }}
            >
              <p className="text-sm" style={{ color: currentTheme.textMuted }}>End of article</p>
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
          </article>
        </div>

        <style jsx global>{`
          .inline-reader-content h1,
          .inline-reader-content h2,
          .inline-reader-content h3 {
            color: var(--inline-text);
            font-weight: 600;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
          }
          .inline-reader-content h1 { font-size: 1.5em; }
          .inline-reader-content h2 { font-size: 1.25em; }
          .inline-reader-content h3 { font-size: 1.1em; }
          .inline-reader-content p {
            margin-bottom: 1em;
          }
          .inline-reader-content a {
            color: var(--color-accent);
          }
          .inline-reader-content a:hover {
            text-decoration: underline;
          }
          .inline-reader-content strong {
            color: var(--inline-text);
            font-weight: 600;
          }
          .inline-reader-content blockquote {
            border-left: 3px solid var(--color-accent);
            padding-left: 1em;
            margin: 1em 0;
            color: var(--inline-muted);
            font-style: italic;
          }
          .inline-reader-content img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 1em 0;
          }
          .inline-reader-content ul,
          .inline-reader-content ol {
            margin: 1em 0;
            padding-left: 1.5em;
          }
          .inline-reader-content li {
            margin-bottom: 0.5em;
          }
          .inline-reader-content figure {
            margin: 1.5em 0;
          }
          .inline-reader-content figcaption {
            color: var(--inline-muted);
            font-size: 0.9em;
            text-align: center;
            margin-top: 0.5em;
          }
        `}</style>
      </div>
    );
  }

  const Icon = getCardIcon(card.type);
  const domain = card.domain || getDomain(card.url);
  const hasImage = card.image && !imageError;

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-[var(--glass-panel-bg)]',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with thumbnail */}
      <div className="relative flex-shrink-0">
        {/* Thumbnail / Image Header */}
        {hasImage ? (
          <div className="relative h-48 overflow-hidden">
            <Image
              src={card.image!}
              alt={card.title || 'Card thumbnail'}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0_0%_12%/0.95)] to-transparent" />
          </div>
        ) : (
          <div
            className="h-32 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--bg-surface-2) 0%, var(--bg-surface-3) 100%)',
            }}
          >
            <Icon className="w-16 h-16" style={{ color: 'var(--text-muted)' }} />
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            'absolute top-4 right-4 p-2 rounded-full',
            'transition-all duration-200',
            'hover:scale-110'
          )}
          style={{
            background: 'hsla(0 0% 0% / 0.5)',
            backdropFilter: 'blur(8px)',
            color: 'var(--text-primary)',
          }}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto modal-scroll">
        <div className="p-6 space-y-6">
          {/* Title & Stats */}
          <div className="space-y-2">
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Untitled"
              className={cn(
                'w-full text-4xl font-semibold bg-transparent border-none outline-none',
                'placeholder:text-[var(--text-muted)]',
                'focus:ring-0'
              )}
              style={{ color: 'var(--text-primary)' }}
            />
            {/* Stats bar */}
            {isNoteCard && (() => {
              const stats = getContentStats(content);
              return (
                <div className="text-xs text-[var(--color-text-muted)]">
                  {stats.words.toLocaleString()} words · {stats.chars.toLocaleString()} chars{stats.links > 0 && ` · ${stats.links} links`}
                </div>
              );
            })()}
            {/* Divider */}
            <div className="h-px bg-[var(--glass-border)]" />
          </div>

          {/* URL and Reading Actions (for bookmarks) */}
          {card.url && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
                    'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-text-secondary',
                    'transition-all duration-200',
                    'hover:bg-[var(--glass-bg-hover)] hover:border-[var(--glass-border-hover)] hover:text-text-primary hover:scale-105'
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
                  <span className="truncate max-w-[300px]">{domain || card.url}</span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>

                {/* Reading time badge */}
                {readingTime > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-text-muted">
                    <Clock className="h-3 w-3" />
                    {readingTime} min
                  </span>
                )}

                {/* Read status badge */}
                {card.isRead && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-green-500">
                    <CheckCircle2 className="h-3 w-3" />
                    Read
                  </span>
                )}
              </div>

              {/* Reader mode and read toggle buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Reader mode button for URL cards */}
                {card.type === 'url' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReaderClick}
                    disabled={isExtractingArticle}
                    className="gap-2"
                  >
                    {isExtractingArticle ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                    {isExtractingArticle ? 'Extracting...' : card.articleContent ? 'Read Article' : 'Reader Mode'}
                    {!isExtractingArticle && card.readProgress && card.readProgress > 0 && card.readProgress < 100 && (
                      <span className="text-xs text-text-muted">({card.readProgress}%)</span>
                    )}
                  </Button>
                )}
                {extractionError && (
                  <span className="text-xs text-red-400">{extractionError}</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleRead}
                  className={cn(
                    'gap-2',
                    card.isRead && 'text-green-500'
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {card.isRead ? 'Mark Unread' : 'Mark Read'}
                </Button>
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              Tags
            </label>
            <TagInput
              value={tags}
              onChange={handleTagsChange}
              placeholder="Add tags..."
            />
          </div>

          {/* Schedule - for bookmark cards only */}
          {!isNoteCard && (
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                style={{ color: 'var(--text-muted)' }}
              >
                Schedule
              </label>
              <SchedulePicker
                value={scheduledDate}
                onChange={handleScheduleChange}
              />
            </div>
          )}

          {/* Content Editor for Note Cards */}
          {isNoteCard && (
            <div className="flex-1 min-h-[300px] px-6 py-4 -mx-6">
              <Editor
                content={content}
                onChange={handleContentChange}
                placeholder="Type '/' for commands or just start writing..."
                className="editor-large"
              />
            </div>
          )}

          {/* Notes Editor for Bookmark Cards */}
          {!isNoteCard && (
            <div className="flex-1 min-h-[200px] px-6 py-4 -mx-6">
              <Editor
                content={notes}
                onChange={handleNotesChange}
                placeholder="Add your notes here..."
                className="editor-large"
              />
            </div>
          )}

          {/* Metadata footer */}
          <div
            className="flex items-center justify-between pt-4 text-xs"
            style={{
              borderTop: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            <span>
              Created {new Date(card.createdAt).toLocaleDateString()}
            </span>
            <span>
              Updated {new Date(card.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        .editor-large .tiptap {
          font-size: 1.125rem;
          line-height: 1.6;
        }
        .modal-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .modal-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

// Separate component to prevent re-renders - content is sanitized with DOMPurify before passing
function InlineReaderContent({ html }: { html: string }) {
  // Note: html is pre-sanitized with DOMPurify in sanitizedArticleContent
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
