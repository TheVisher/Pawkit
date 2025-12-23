'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import DOMPurify from 'dompurify';
import {
  X,
  ExternalLink,
  Globe,
  FileText,
  StickyNote,
  Tag,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
} from 'lucide-react';
import { useModalStore } from '@/lib/stores/modal-store';
import { useDataStore } from '@/lib/stores/data-store';
import { cn } from '@/lib/utils';
import { Editor } from '@/components/editor';

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

// Sanitized preview component for note content
function NotePreview({ content }: { content: string }) {
  const sanitizedHtml = useMemo(() => {
    if (!content) {
      return '<p style="color: var(--color-text-muted)">No content yet...</p>';
    }
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'hr', 'input', 'label', 'div', 'span'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel', 'type', 'checked', 'data-type', 'data-checked', 'style'],
    });
  }, [content]);

  return (
    <div className="p-4 min-h-[200px] note-preview">
      {/* Content is sanitized via DOMPurify above */}
      <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
      <style jsx>{`
        .note-preview {
          color: var(--color-text-primary);
          line-height: 1.7;
        }
        .note-preview :global(h1) {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: var(--color-text-primary);
        }
        .note-preview :global(h2) {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          color: var(--color-text-primary);
        }
        .note-preview :global(h3) {
          font-size: 1.1rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: var(--color-text-primary);
        }
        .note-preview :global(p) {
          margin-bottom: 0.75rem;
        }
        .note-preview :global(strong),
        .note-preview :global(b) {
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .note-preview :global(em),
        .note-preview :global(i) {
          font-style: italic;
        }
        .note-preview :global(a) {
          color: var(--color-accent);
          text-decoration: underline;
        }
        .note-preview :global(a:hover) {
          color: var(--color-accent-hover);
        }
        .note-preview :global(code) {
          background: var(--glass-bg);
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-family: var(--font-mono);
          font-size: 0.875em;
          color: var(--color-accent);
        }
        .note-preview :global(pre) {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          overflow-x: auto;
          margin: 1rem 0;
        }
        .note-preview :global(pre code) {
          background: none;
          padding: 0;
          color: var(--color-text-primary);
        }
        .note-preview :global(ul),
        .note-preview :global(ol) {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
        }
        .note-preview :global(ul) {
          list-style-type: disc;
        }
        .note-preview :global(ol) {
          list-style-type: decimal;
        }
        .note-preview :global(li) {
          margin-bottom: 0.25rem;
        }
        .note-preview :global(blockquote) {
          border-left: 3px solid var(--color-accent);
          padding-left: 1rem;
          margin: 1rem 0;
          color: var(--color-text-secondary);
          font-style: italic;
        }
        .note-preview :global(hr) {
          border: none;
          border-top: 1px solid var(--glass-border);
          margin: 1.5rem 0;
        }
        .note-preview :global(ul[data-type="taskList"]) {
          list-style: none;
          padding-left: 0;
        }
        .note-preview :global(ul[data-type="taskList"] li) {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }
        .note-preview :global(input[type="checkbox"]) {
          margin-top: 0.25rem;
          accent-color: var(--color-accent);
        }
      `}</style>
    </div>
  );
}

export function CardDetailModal() {
  const activeCardId = useModalStore((s) => s.activeCardId);
  const closeCardDetail = useModalStore((s) => s.closeCardDetail);
  const cards = useDataStore((s) => s.cards);
  const updateCard = useDataStore((s) => s.updateCard);

  // Find the active card
  const card = cards.find((c) => c.id === activeCardId);

  // Local state for editing
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showReader, setShowReader] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);

  // Refs
  const titleRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Check if this is a note card (not a URL bookmark)
  const isNoteCard = card?.type === 'md-note' || card?.type === 'text-note' || card?.type === 'quick-note';

  // Initialize local state when card changes
  useEffect(() => {
    if (card) {
      setTitle(card.title || '');
      setNotes(card.notes || '');
      setContent(card.content || '');
      setTags(card.tags || []);
      setImageError(false);
      setIsEditMode(true);
    }
  }, [card]);


  // Sanitize article content for safe rendering
  const sanitizedContent = useMemo(() => {
    if (!card) return '';
    const rawContent = card.articleContent || card.content || '';
    if (!rawContent) return '';
    return DOMPurify.sanitize(rawContent, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'img'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
    });
  }, [card]);

  // Auto-save title on blur
  const handleTitleBlur = useCallback(() => {
    if (card && title !== card.title) {
      updateCard(card.id, { title });
    }
  }, [card, title, updateCard]);

  // Save content when editor blurs (for note cards)
  const handleContentChange = useCallback((html: string) => {
    setContent(html);
    if (card && html !== card.content) {
      updateCard(card.id, { content: html });
    }
  }, [card, updateCard]);

  // Save notes when editor blurs (for bookmark cards)
  const handleNotesChange = useCallback((html: string) => {
    setNotes(html);
    if (card && html !== card.notes) {
      updateCard(card.id, { notes: html });
    }
  }, [card, updateCard]);

  // Add a new tag
  const handleAddTag = useCallback(() => {
    const trimmedTag = newTag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && card) {
      const newTags = [...tags, trimmedTag];
      setTags(newTags);
      setNewTag('');
      updateCard(card.id, { tags: newTags });
    }
  }, [newTag, tags, card, updateCard]);

  // Remove a tag
  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      if (card) {
        const newTags = tags.filter((t) => t !== tagToRemove);
        setTags(newTags);
        updateCard(card.id, { tags: newTags });
      }
    },
    [tags, card, updateCard]
  );

  // Handle tag input key press
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Backspace' && newTag === '' && tags.length > 0) {
      // Remove last tag on backspace when input is empty
      handleRemoveTag(tags[tags.length - 1]);
    }
  };

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCardDetail();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeCardDetail]);

  // Don't render if no card
  if (!activeCardId || !card) return null;

  const Icon = getCardIcon(card.type);
  const domain = card.domain || getDomain(card.url);
  const hasImage = card.image && !imageError;
  const hasArticleContent = Boolean(sanitizedContent);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={closeCardDetail}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-8 lg:inset-12 z-50 flex items-center justify-center pointer-events-none">
        <div
          className={cn(
            'pointer-events-auto w-full max-w-4xl max-h-full overflow-hidden',
            'flex flex-col',
            'rounded-2xl',
            'bg-[var(--glass-panel-bg)]',
            'backdrop-blur-[var(--glass-blur)] backdrop-saturate-[var(--glass-saturate)]',
            'border border-[var(--glass-border)]',
            'shadow-[var(--glass-shadow)]'
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
              onClick={closeCardDetail}
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
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  placeholder="Untitled"
                  className={cn(
                    'w-full text-2xl font-semibold bg-transparent border-none outline-none',
                    'placeholder:text-[var(--text-muted)]',
                    'focus:ring-0'
                  )}
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>

              {/* URL (for bookmarks) */}
              {card.url && (
                <div className="flex items-center gap-2">
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
                </div>
              )}

              {/* Tags */}
              <div className="space-y-2">
                <label
                  className="flex items-center gap-2 text-sm font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Tag className="h-4 w-4" />
                  Tags
                </label>
                <div
                  className="flex flex-wrap items-center gap-2 p-3 rounded-xl min-h-[48px] bg-[var(--glass-bg)] border border-[var(--glass-border)]"
                  onClick={() => tagInputRef.current?.focus()}
                >
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm',
                        'group cursor-pointer transition-all duration-200'
                      )}
                      style={{
                        background: 'hsla(var(--accent-h) var(--accent-s) 50% / 0.2)',
                        border: '1px solid hsla(var(--accent-h) var(--accent-s) 50% / 0.3)',
                        color: 'var(--ds-accent)',
                      }}
                    >
                      {tag}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTag(tag);
                        }}
                        className="opacity-60 hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={() => {
                      if (newTag.trim()) handleAddTag();
                    }}
                    placeholder={tags.length === 0 ? 'Add tags...' : ''}
                    className={cn(
                      'flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm',
                      'placeholder:text-[var(--text-muted)]'
                    )}
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* Content Editor for Note Cards */}
              {isNoteCard && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      className="flex items-center gap-2 text-sm font-medium"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <FileText className="h-4 w-4" />
                      Content
                    </label>
                    {/* Edit/Preview Toggle */}
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                      <button
                        onClick={() => setIsEditMode(true)}
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all',
                          isEditMode
                            ? 'bg-[var(--color-accent)] text-white'
                            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                        )}
                      >
                        <Edit3 className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => setIsEditMode(false)}
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all',
                          !isEditMode
                            ? 'bg-[var(--color-accent)] text-white'
                            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                        )}
                      >
                        <Eye className="h-3 w-3" />
                        Preview
                      </button>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'rounded-xl overflow-hidden',
                      'bg-[var(--glass-bg)] border border-[var(--glass-border)]',
                      'focus-within:ring-2 focus-within:ring-[var(--color-accent)]/30 focus-within:border-[var(--glass-border-hover)]'
                    )}
                  >
                    {isEditMode ? (
                      <div className="p-4">
                        <Editor
                          content={content}
                          onChange={handleContentChange}
                          placeholder="Type '/' for commands or just start writing..."
                        />
                      </div>
                    ) : (
                      <NotePreview content={content} />
                    )}
                  </div>
                </div>
              )}

              {/* Notes Editor for Bookmark Cards */}
              {!isNoteCard && (
                <div className="space-y-2">
                  <label
                    className="flex items-center gap-2 text-sm font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <FileText className="h-4 w-4" />
                    Notes
                  </label>
                  <div
                    className={cn(
                      'rounded-xl overflow-hidden',
                      'bg-[var(--glass-bg)] border border-[var(--glass-border)]',
                      'focus-within:ring-2 focus-within:ring-[var(--color-accent)]/30 focus-within:border-[var(--glass-border-hover)]'
                    )}
                  >
                    <div className="p-4">
                      <Editor
                        content={notes}
                        onChange={handleNotesChange}
                        placeholder="Add your notes here..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Reader Mode (if article content exists) */}
              {hasArticleContent && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowReader(!showReader)}
                    className={cn(
                      'flex items-center gap-2 text-sm font-medium w-full',
                      'p-3 rounded-xl transition-all duration-200',
                      showReader
                        ? 'bg-[var(--ds-accent)]/15 border border-[var(--ds-accent)]/40 text-[var(--ds-accent)]'
                        : 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-text-secondary hover:bg-[var(--glass-bg-hover)] hover:text-text-primary'
                    )}
                  >
                    <BookOpen className="h-4 w-4" />
                    <span className="flex-1 text-left">Reader Mode</span>
                    {showReader ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {showReader && (
                    <div className="p-6 rounded-xl prose prose-invert prose-sm max-w-none overflow-auto max-h-[400px] bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                      {/* Content is sanitized via DOMPurify in useMemo above */}
                      <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
                    </div>
                  )}
                </div>
              )}

              {/* Description (if exists) */}
              {card.description && (
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Description
                  </label>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {card.description}
                  </p>
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
        </div>
      </div>
    </>
  );
}
