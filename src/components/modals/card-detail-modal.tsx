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
} from 'lucide-react';
import { useModalStore } from '@/lib/stores/modal-store';
import { useDataStore } from '@/lib/stores/data-store';
import { cn } from '@/lib/utils';

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
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showReader, setShowReader] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Refs for auto-save
  const titleRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Initialize local state when card changes
  useEffect(() => {
    if (card) {
      setTitle(card.title || '');
      setNotes(card.notes || '');
      setTags(card.tags || []);
      setImageError(false);
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

  // Auto-save notes on blur
  const handleNotesBlur = useCallback(() => {
    if (card && notes !== card.notes) {
      updateCard(card.id, { notes });
    }
  }, [card, notes, updateCard]);

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

              {/* Notes */}
              <div className="space-y-2">
                <label
                  className="flex items-center gap-2 text-sm font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <FileText className="h-4 w-4" />
                  Notes
                </label>
                <textarea
                  ref={notesRef}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder="Add your notes here..."
                  rows={6}
                  className={cn(
                    'w-full p-4 rounded-xl resize-none',
                    'bg-[var(--glass-bg)] border border-[var(--glass-border)] outline-none',
                    'text-text-primary placeholder:text-text-muted',
                    'focus:ring-2 focus:ring-[var(--ds-accent)]/30 focus:border-[var(--glass-border-hover)]'
                  )}
                />
              </div>

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
