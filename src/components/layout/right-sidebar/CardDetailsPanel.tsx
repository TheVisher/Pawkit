'use client';

/**
 * Card Details Panel
 * Shown in the right sidebar when a card modal is open
 */

import { useState, useCallback, useMemo } from 'react';
import { Tag, FolderOpen, Link2, Paperclip, MessageSquare, Copy, Check, ExternalLink, Plus, LayoutTemplate, Undo2, Redo2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { TagInput } from '@/components/tags/tag-input';
import { useDataStore } from '@/lib/stores/data-store';
import { checkSupertagAddition, applyTemplate } from '@/lib/utils/template-applicator';
import { SupertagPanel } from './SupertagPanel';
import { SupertagSelector } from './SupertagSelector';
import { findSupertagsInTags, getSupertagDefinition, getAllSupertags, getSupertagTemplate } from '@/lib/tags/supertags';
import type { LocalCard, LocalCollection } from '@/lib/db';

interface CardDetailsPanelProps {
  card: LocalCard;
  collections: LocalCollection[];
  isTransitioning: boolean;
}

export function CardDetailsPanel({ card, collections, isTransitioning }: CardDetailsPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const updateCard = useDataStore((s) => s.updateCard);

  // Find supertags with sections (for template panel)
  const supertagWithSections = useMemo(() => {
    const supertags = findSupertagsInTags(card.tags || []);
    return supertags.find((st) => st.sections && Object.keys(st.sections).length > 0) || null;
  }, [card.tags]);

  // Check if card is a note type (has editor)
  const isNoteCard = useMemo(
    () => ['md-note', 'text-note', 'quick-note'].includes(card.type),
    [card.type]
  );

  // Handle content changes from template panel
  const handleContentChange = useCallback(
    (newContent: string) => {
      updateCard(card.id, { content: newContent });
    },
    [card.id, updateCard]
  );

  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    window.dispatchEvent(new CustomEvent('editor-undo'));
  }, []);

  const handleRedo = useCallback(() => {
    window.dispatchEvent(new CustomEvent('editor-redo'));
  }, []);

  // Handle tag changes with template auto-apply
  const handleTagsChange = useCallback((newTags: string[]) => {
    const oldTags = card.tags || [];

    // Update tags
    updateCard(card.id, { tags: newTags });

    // Check for supertag template application
    const result = checkSupertagAddition(oldTags, newTags, card.content);
    if (result.shouldApply && result.template) {
      // Auto-apply template to empty card
      const newContent = applyTemplate(card.content, result.template);
      updateCard(card.id, { content: newContent });
    } else if (result.needsPrompt && result.template) {
      // For cards with content, show a confirmation
      const confirmed = window.confirm(
        `Apply ${result.supertagName} template? This will replace your existing content.`
      );
      if (confirmed) {
        updateCard(card.id, { content: result.template });
      }
    }
  }, [card.id, card.tags, card.content, updateCard]);

  const handleCopyUrl = async () => {
    if (!card.url) return;
    try {
      await navigator.clipboard.writeText(card.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <div
      className={cn(
        'space-y-4 transition-all ease-out',
        isTransitioning
          ? 'opacity-0 translate-y-2'
          : 'opacity-100 translate-y-0'
      )}
      style={{ transitionDuration: '250ms' }}
    >
      {/* Quick Actions for URL cards */}
      {card.url && card.type === 'url' && (
        <>
          <div className="flex gap-2">
            <button
              onClick={handleCopyUrl}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-md transition-colors',
                copied
                  ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                  : 'bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary border border-border-subtle'
              )}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy URL
                </>
              )}
            </button>
            <a
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-md bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary border border-border-subtle transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Link
            </a>
          </div>
          <Separator className="bg-border-subtle" />
        </>
      )}

      {/* Undo/Redo for note cards */}
      {isNoteCard && (
        <>
          <div className="flex gap-2">
            <button
              onClick={handleUndo}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-md bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary border border-border-subtle transition-colors"
              title="Undo (Cmd+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </button>
            <button
              onClick={handleRedo}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-md bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary border border-border-subtle transition-colors"
              title="Redo (Cmd+Shift+Z)"
            >
              <Redo2 className="h-3.5 w-3.5" />
              Redo
            </button>
          </div>
          <Separator className="bg-border-subtle" />
        </>
      )}

      {/* Supertag Selector - for note cards */}
      {isNoteCard && (
        <>
          <div>
            <div className="text-xs font-medium uppercase text-text-muted mb-2">Quick Convert</div>
            <SupertagSelector
              currentTags={card.tags || []}
              onSelectSupertag={async (newSupertagTag) => {
                // Get all supertag names to filter out existing ones
                const allSupertagNames = new Set(getAllSupertags().map(st => st.tag));

                // Remove existing supertag tags, keep other tags
                const nonSupertagTags = (card.tags || []).filter(
                  t => !allSupertagNames.has(t.toLowerCase())
                );

                // Add the new supertag
                const newTags = [...nonSupertagTags, newSupertagTag];

                // Get the supertag definition and template
                const supertagDef = getSupertagDefinition(newSupertagTag);
                const newTitle = supertagDef ? `New ${supertagDef.displayName}` : card.title;
                const newContent = getSupertagTemplate(newSupertagTag) || '';

                // Update everything in one call - this is an explicit conversion action
                await updateCard(card.id, {
                  tags: newTags,
                  title: newTitle,
                  content: newContent,
                });
              }}
            />
          </div>
          <Separator className="bg-border-subtle" />
        </>
      )}

      {/* Tags Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-text-muted">
            <Tag className="h-5 w-5" />
            <span className="text-xs font-medium uppercase">Tags</span>
          </div>
          {!isEditingTags && (
            <button
              onClick={() => setIsEditingTags(true)}
              className="p-1 rounded hover:bg-bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
              title="Add tags"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
        {isEditingTags ? (
          <div className="space-y-2">
            <TagInput
              value={card.tags || []}
              onChange={handleTagsChange}
              placeholder="Add tags..."
              compact
              autoFocus
            />
            <button
              onClick={() => setIsEditingTags(false)}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              Done
            </button>
          </div>
        ) : card.tags && card.tags.length > 0 ? (
          <div
            className="flex flex-wrap gap-1.5 cursor-pointer"
            onClick={() => setIsEditingTags(true)}
            title="Click to edit tags"
          >
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 text-xs rounded-md bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <button
            onClick={() => setIsEditingTags(true)}
            className="text-xs text-text-muted italic hover:text-text-primary"
          >
            Click to add tags
          </button>
        )}
      </div>

      <Separator className="bg-border-subtle" />

      {/* Supertag Template Panel - for any supertag with sections */}
      {supertagWithSections && (
        <>
          <div>
            <div className="flex items-center gap-2 text-text-muted mb-3">
              <LayoutTemplate className="h-5 w-5" />
              <span className="text-xs font-medium uppercase">{supertagWithSections.displayName} Template</span>
            </div>
            <SupertagPanel
              supertag={supertagWithSections}
              content={card.content || ''}
              onContentChange={handleContentChange}
            />
          </div>
          <Separator className="bg-border-subtle" />
        </>
      )}

      {/* Pawkit (Collection) Section */}
      <div>
        <div className="flex items-center gap-2 text-text-muted mb-3">
          <FolderOpen className="h-5 w-5" />
          <span className="text-xs font-medium uppercase">Pawkits</span>
        </div>
        {/* Filter card.tags to only show Pawkit tags (tags that match a Pawkit slug) */}
        {(() => {
          const pawkitSlugs = new Set(collections.map(c => c.slug));
          const cardPawkitTags = (card.tags || []).filter(tag => pawkitSlugs.has(tag));
          return cardPawkitTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {cardPawkitTags.map((collectionSlug) => {
                const collection = collections.find(c => c.slug === collectionSlug);
                return (
                  <span
                    key={collectionSlug}
                    className="px-2.5 py-1 text-xs rounded-md bg-bg-surface-2 text-text-primary border border-border-subtle"
                  >
                    {collection?.name || collectionSlug}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-text-muted italic">Not in any Pawkit</p>
          );
        })()}
      </div>

      <Separator className="bg-border-subtle" />

      {/* Backlinks Section (placeholder for Phase 7.2) */}
      <div>
        <div className="flex items-center gap-2 text-text-muted mb-3">
          <Link2 className="h-5 w-5" />
          <span className="text-xs font-medium uppercase">Backlinks</span>
        </div>
        <p className="text-xs text-text-muted italic">No backlinks yet</p>
      </div>

      <Separator className="bg-border-subtle" />

      {/* Attachments Section (placeholder) */}
      <div>
        <div className="flex items-center gap-2 text-text-muted mb-3">
          <Paperclip className="h-5 w-5" />
          <span className="text-xs font-medium uppercase">Attachments</span>
        </div>
        <p className="text-xs text-text-muted italic">No attachments</p>
      </div>

      <Separator className="bg-border-subtle" />

      {/* Kit Chat Section (placeholder) */}
      <div>
        <div className="flex items-center gap-2 text-text-muted mb-3">
          <MessageSquare className="h-5 w-5" />
          <span className="text-xs font-medium uppercase">Kit Chat</span>
        </div>
        <div className="px-3 py-4 rounded-lg bg-bg-surface-2 border border-border-subtle text-center">
          <p className="text-xs text-text-muted">AI assistant coming soon</p>
        </div>
      </div>

      {/* Metadata */}
      <div className="pt-2 space-y-1 text-xs text-text-muted">
        <div className="flex justify-between">
          <span>Created</span>
          <span>{new Date(card.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Updated</span>
          <span>{new Date(card.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
