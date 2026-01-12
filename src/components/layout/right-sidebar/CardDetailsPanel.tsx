'use client';

/**
 * Card Details Panel
 * Shown in the right sidebar when a card modal is open
 * Features tabbed interface for Details, Notes, and Kit Chat
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Tag, FolderOpen, Paperclip, MessageSquare, Copy, Check, ExternalLink, Plus, LayoutTemplate, Undo2, Redo2, FileText, Info, Sparkles, NotebookPen, RefreshCw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { TagInput } from '@/components/tags/tag-input';
import { useDataStore } from '@/lib/stores/data-store';
import { useCardDetailSidebar, usePendingNoteText } from '@/lib/stores/ui-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { checkSupertagAddition, applyTemplate } from '@/lib/utils/template-applicator';
import { SupertagPanel } from './SupertagPanel';
import { SupertagSelector } from './SupertagSelector';
import { ReferencesSection } from './sections/ReferencesSection';
import { BacklinksSection } from './sections/BacklinksSection';
import { findSupertagsInTags, getSupertagDefinition, getAllSupertags, getSupertagTemplate } from '@/lib/tags/supertags';
import { NotesEditor } from '@/components/editor';
import type { LocalCard, LocalCollection } from '@/lib/db';
import { useToastStore } from '@/lib/stores/toast-store';
import { useCard } from '@/lib/hooks/use-live-data';

type CardDetailTab = 'details' | 'notes' | 'chat';

const TABS: { id: CardDetailTab; label: string; icon: typeof Info }[] = [
  { id: 'details', label: 'Details', icon: Info },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'chat', label: 'Kit Chat', icon: MessageSquare },
];

interface CardDetailsPanelProps {
  card: LocalCard;
  collections: LocalCollection[];
  isTransitioning: boolean;
}

export function CardDetailsPanel({ card, collections, isTransitioning }: CardDetailsPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const updateCard = useDataStore((s) => s.updateCard);
  const { cardDetailTab, setTab } = useCardDetailSidebar();
  const visualStyle = useSettingsStore((s) => s.visualStyle);
  const isHighContrast = visualStyle === 'highContrast';

  // Find supertags with sections (for template panel)
  const supertagWithSections = useMemo(() => {
    const supertags = findSupertagsInTags(card.tags || []);
    return supertags.find((st) => st.sections && Object.keys(st.sections).length > 0) || null;
  }, [card.tags]);

  // Check if card is a note type (has editor)
  const isNoteCard = useMemo(
    () => ['md-note', 'text-note'].includes(card.type),
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
        'flex flex-col h-full -mx-4 transition-all ease-out',
        isTransitioning
          ? 'opacity-0 translate-y-2'
          : 'opacity-100 translate-y-0'
      )}
      style={{ transitionDuration: '250ms' }}
    >
      {/* Tab Pills */}
      <div className="flex gap-1.5 px-3 pt-3 flex-shrink-0">
        {TABS.map((tab) => {
          const isActive = cardDetailTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all duration-200 relative",
                // Fully rounded squircle pills
                "rounded-xl",
                // High contrast mode styles
                isHighContrast
                  ? isActive
                    ? "text-[var(--color-accent)] bg-bg-surface-3 border-2 border-[var(--color-accent)] font-bold"
                    : "text-text-primary border border-border-subtle hover:border-text-muted hover:bg-bg-surface-2"
                  // Default glass styles
                  : isActive
                    ? "text-text-primary bg-black/5 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.6)]"
                    : "text-text-muted hover:text-text-secondary hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              <Icon className={cn(
                "h-4 w-4 transition-colors",
                isActive ? "text-[var(--color-accent)]" : ""
              )} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {cardDetailTab === 'details' && (
          <DetailsTabContent
            card={card}
            collections={collections}
            copied={copied}
            isEditingTags={isEditingTags}
            setIsEditingTags={setIsEditingTags}
            isNoteCard={isNoteCard}
            supertagWithSections={supertagWithSections}
            handleCopyUrl={handleCopyUrl}
            handleUndo={handleUndo}
            handleRedo={handleRedo}
            handleTagsChange={handleTagsChange}
            handleContentChange={handleContentChange}
            updateCard={updateCard}
          />
        )}
        {cardDetailTab === 'notes' && <NotesTabContent card={card} />}
        {cardDetailTab === 'chat' && <ChatTabContent />}
      </div>
    </div>
  );
}

// Details Tab - Contains all the existing card detail content
interface DetailsTabContentProps {
  card: LocalCard;
  collections: LocalCollection[];
  copied: boolean;
  isEditingTags: boolean;
  setIsEditingTags: (editing: boolean) => void;
  isNoteCard: boolean;
  supertagWithSections: ReturnType<typeof findSupertagsInTags>[0] | null;
  handleCopyUrl: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleTagsChange: (tags: string[]) => void;
  handleContentChange: (content: string) => void;
  updateCard: (id: string, updates: Partial<LocalCard>) => Promise<void>;
}

function DetailsTabContent({
  card,
  collections,
  copied,
  isEditingTags,
  setIsEditingTags,
  isNoteCard,
  supertagWithSections,
  handleCopyUrl,
  handleUndo,
  handleRedo,
  handleTagsChange,
  handleContentChange,
  updateCard,
}: DetailsTabContentProps) {
  return (
    <div className="space-y-4">
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

      {/* References Section - outgoing @ mentions */}
      <ReferencesSection cardId={card.id} workspaceId={card.workspaceId} />

      <Separator className="bg-border-subtle" />

      {/* Backlinks Section - incoming @ mentions */}
      <BacklinksSection card={card} workspaceId={card.workspaceId} />

      <Separator className="bg-border-subtle" />

      {/* Attachments Section (placeholder) */}
      <div>
        <div className="flex items-center gap-2 text-text-muted mb-3">
          <Paperclip className="h-5 w-5" />
          <span className="text-xs font-medium uppercase">Attachments</span>
        </div>
        <p className="text-xs text-text-muted italic">No attachments</p>
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

// Notes Tab - Dedicated notes editor for user annotations
interface NotesTabContentProps {
  card: LocalCard;
}

function NotesTabContent({ card: cardProp }: NotesTabContentProps) {
  const updateCard = useDataStore((s) => s.updateCard);
  const createCard = useDataStore((s) => s.createCard);
  const toast = useToastStore((s) => s.toast);
  const { pendingNoteText, clearPendingNoteText } = usePendingNoteText();
  const [isExporting, setIsExporting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Use live card data so exportedNoteId updates reactively
  const card = useCard(cardProp.id) ?? cardProp;

  // Check if the exported note still exists
  const exportedNote = useCard(card.exportedNoteId);
  const noteExists = !!exportedNote && !exportedNote._deleted;

  // Handle pending note text from article selection
  useEffect(() => {
    if (pendingNoteText) {
      // Append the pending note text to existing notes
      const currentNotes = card.notes || '';

      // If there's existing content, add the new content after it
      // Otherwise just use the new content
      let newNotes: string;
      if (currentNotes && currentNotes !== '<p></p>') {
        // Remove trailing empty paragraph if present, then add the new content
        const trimmedNotes = currentNotes.replace(/<p><\/p>$/, '');
        newNotes = `${trimmedNotes}${pendingNoteText}`;
      } else {
        newNotes = pendingNoteText;
      }

      updateCard(card.id, { notes: newNotes });
      clearPendingNoteText();
    }
  }, [pendingNoteText, card.id, card.notes, updateCard, clearPendingNoteText]);

  const handleNotesChange = useCallback((html: string) => {
    // Don't save empty paragraph as notes
    const isEmpty = html === '<p></p>' || html === '';
    updateCard(card.id, { notes: isEmpty ? undefined : html });
  }, [card.id, updateCard]);

  // Export notes to a new standalone note card
  const handleExportToNote = useCallback(async () => {
    const notesContent = card.notes;
    if (!notesContent || notesContent === '<p></p>') {
      toast({
        type: 'warning',
        message: 'No notes to export',
      });
      return;
    }

    setIsExporting(true);
    try {
      const newNote = await createCard({
        type: 'md-note',
        title: `Notes on: ${card.title}`,
        content: notesContent,
        workspaceId: card.workspaceId,
        tags: [],
        url: '',
        status: 'READY',
        pinned: false,
        isFileCard: false,
      });

      // Store the exported note ID and snapshot of what was exported
      await updateCard(card.id, {
        exportedNoteId: newNote.id,
        lastExportedNotes: notesContent,
      });

      toast({
        type: 'success',
        message: 'Note created',
      });
    } catch (error) {
      console.error('Failed to export notes:', error);
      toast({
        type: 'error',
        message: 'Failed to create note',
      });
    } finally {
      setIsExporting(false);
    }
  }, [card.notes, card.title, card.workspaceId, card.id, createCard, updateCard, toast]);

  // Update existing exported note by appending new content
  const handleUpdateNote = useCallback(async () => {
    const notesContent = card.notes;
    if (!notesContent || notesContent === '<p></p>') {
      toast({
        type: 'warning',
        message: 'No notes to export',
      });
      return;
    }

    if (!card.exportedNoteId) {
      toast({
        type: 'warning',
        message: 'No exported note found, use New Note instead',
      });
      return;
    }

    // Check if the note still exists
    if (!noteExists) {
      toast({
        type: 'warning',
        message: 'Original note not found, use New Note',
      });
      // Clear the invalid exportedNoteId
      await updateCard(card.id, { exportedNoteId: undefined });
      return;
    }

    setIsUpdating(true);
    try {
      // Calculate delta - only content that's new since last export
      let deltaContent = notesContent;
      const lastExported = card.lastExportedNotes;

      if (lastExported && notesContent.startsWith(lastExported)) {
        // Notes were appended - extract just the new part
        deltaContent = notesContent.slice(lastExported.length).trim();

        // If no new content after the delta extraction
        if (!deltaContent || deltaContent === '<p></p>') {
          toast({
            type: 'info',
            message: 'No new notes to add',
          });
          setIsUpdating(false);
          return;
        }
      }

      // Append delta to the exported note
      const existingContent = exportedNote.content || '';
      const separator = existingContent && existingContent !== '<p></p>' ? '<p></p>' : '';
      const newContent = existingContent ? `${existingContent}${separator}${deltaContent}` : deltaContent;

      await updateCard(card.exportedNoteId, { content: newContent });

      // Update the snapshot of what's been exported
      await updateCard(card.id, { lastExportedNotes: notesContent });

      toast({
        type: 'success',
        message: 'Note updated',
      });
    } catch (error) {
      console.error('Failed to update note:', error);
      toast({
        type: 'error',
        message: 'Failed to update note',
      });
    } finally {
      setIsUpdating(false);
    }
  }, [card.notes, card.exportedNoteId, card.id, card.lastExportedNotes, noteExists, exportedNote, updateCard, toast]);

  const hasNotes = card.notes && card.notes !== '<p></p>';
  // Can update if: has notes, has exported note, note exists, AND there's new content
  const hasNewContent = hasNotes && (!card.lastExportedNotes || card.notes !== card.lastExportedNotes);
  const canUpdate = hasNotes && card.exportedNoteId && noteExists && hasNewContent;

  return (
    <div className="flex flex-col h-full">
      {/* Header with tip */}
      <div className="flex items-center gap-2 mb-3 text-text-muted">
        <Sparkles className="h-4 w-4" />
        <span className="text-xs">Your personal notes while reading</span>
      </div>

      {/* Notes Editor - fills available space */}
      <div className="flex-1 rounded-lg bg-bg-surface-1/50 border border-border-subtle p-3">
        <NotesEditor
          content={card.notes || ''}
          onChange={handleNotesChange}
          placeholder="Jot down your thoughts, key takeaways, or to-dos..."
          className="h-full"
        />
      </div>

      {/* Footer with auto-save hint and export buttons */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
        <p className="text-[10px] text-text-muted">
          Auto-saves as you type
        </p>
        <div className="flex gap-2">
          {/* New Note button - always creates a new note */}
          <button
            onClick={handleExportToNote}
            disabled={isExporting || !hasNotes}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all',
              'bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30',
              'hover:bg-[var(--color-accent)]/30 hover:border-[var(--color-accent)]/50',
              'text-[var(--color-accent)]',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-accent)]/20 disabled:hover:border-[var(--color-accent)]/30'
            )}
            title="Create a new standalone note from these annotations"
          >
            <NotebookPen className="h-3.5 w-3.5" />
            <span>{isExporting ? 'Creating...' : 'New Note'}</span>
          </button>

          {/* Update Note button - appends to existing note */}
          <button
            onClick={handleUpdateNote}
            disabled={isUpdating || !canUpdate}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all',
              'bg-bg-surface-2 border border-border-subtle',
              'hover:bg-bg-surface-3 hover:border-[var(--color-accent)]/30 hover:text-[var(--color-accent)]',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-bg-surface-2 disabled:hover:border-border-subtle disabled:hover:text-text-muted',
              'text-text-secondary'
            )}
            title={canUpdate ? "Append notes to the existing exported note" : "No existing note to update - use New Note first"}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{isUpdating ? 'Updating...' : 'Update Note'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Chat Tab - Kit Chat AI assistant
function ChatTabContent() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <MessageSquare className="h-12 w-12 text-text-muted mb-4 opacity-50" />
      <h3 className="text-sm font-medium text-text-secondary mb-2">Kit Chat</h3>
      <p className="text-xs text-text-muted max-w-[200px]">
        AI assistant for this card coming soon.
      </p>
      <div className="mt-6 px-4 py-3 rounded-lg bg-bg-surface-2 border border-border-subtle">
        <p className="text-xs text-text-muted">
          Ask questions about this card, get summaries, or request related content.
        </p>
      </div>
    </div>
  );
}
