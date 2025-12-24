'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  X,
  ExternalLink,
  Globe,
  FileText,
  StickyNote,
} from 'lucide-react';
import { useModalStore } from '@/lib/stores/modal-store';
import { useDataStore } from '@/lib/stores/data-store';
import { useUIStore } from '@/lib/stores/ui-store';
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

export function CardDetailModal() {
  const activeCardId = useModalStore((s) => s.activeCardId);
  const closeCardDetail = useModalStore((s) => s.closeCardDetail);
  const cards = useDataStore((s) => s.cards);
  const updateCard = useDataStore((s) => s.updateCard);
  const rightSidebarOpen = useUIStore((s) => s.rightSidebarOpen);

  // Find the active card
  const card = cards.find((c) => c.id === activeCardId);

  // Local state for editing - initialize from card
  const [title, setTitle] = useState(card?.title || '');
  const [notes, setNotes] = useState(card?.notes || '');
  const [content, setContent] = useState(card?.content || '');
  const [imageError, setImageError] = useState(false);

  // Refs
  const titleRef = useRef<HTMLInputElement>(null);

  // Check if this is a note card (not a URL bookmark)
  const isNoteCard = card?.type === 'md-note' || card?.type === 'text-note' || card?.type === 'quick-note';

  // Sync local state when card changes (e.g., opening a different card)
  useEffect(() => {
    if (card) {
      setTitle(card.title || '');
      setNotes(card.notes || '');
      setContent(card.content || '');
      setImageError(false);
    }
  }, [card?.id]); // Only trigger when card ID changes, not on every card update



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

  return (
    <>
      {/* Backdrop - sidebar stays above this via higher z-index */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={closeCardDetail}
      />

      {/* Modal - full height, doesn't cover right sidebar */}
      <div
        className={cn(
          'fixed z-50 flex items-stretch pointer-events-none',
          'top-4 bottom-4 left-4 right-4',
          'md:top-6 md:bottom-6 md:left-8 md:right-8',
          'lg:top-4 lg:bottom-4 lg:left-12',
          // Don't cover right sidebar when open
          rightSidebarOpen ? 'lg:right-[336px]' : 'lg:right-12'
        )}
      >
        <div
          className={cn(
            'pointer-events-auto w-full max-w-5xl mx-auto overflow-hidden',
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

      {/* Editor large styling */}
      <style jsx global>{`
        .editor-large .tiptap {
          font-size: 1.125rem;
          line-height: 1.6;
        }
        .editor-large .tiptap p {
          margin-bottom: 0.25em;
        }
        .editor-large .tiptap h1 {
          font-size: 2.25rem;
          line-height: 1.2;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .editor-large .tiptap h2 {
          font-size: 1.75rem;
          line-height: 1.3;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .editor-large .tiptap h3 {
          font-size: 1.375rem;
          line-height: 1.4;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        /* Hide scrollbar */
        .modal-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .modal-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}
