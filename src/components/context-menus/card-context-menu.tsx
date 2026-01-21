'use client';

import { type ReactNode, useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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
import {
  ExternalLink,
  Copy,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  FolderMinus,
  BookOpen,
  BookX,
  RefreshCw,
  ImagePlus,
  FileText,
  Download,
} from 'lucide-react';
import { useMutations } from '@/lib/contexts/convex-data-context';
import { useModalStore } from '@/lib/stores/modal-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { updateReadTag } from '@/lib/utils/system-tags';
import type { Card } from '@/lib/types/convex';
import { AddToPawkitSubmenu } from './add-to-pawkit-submenu';
import { ScheduleSubmenu } from './schedule-submenu';
import { copyHtmlAsMarkdown, downloadHtmlAsMarkdown } from '@/lib/utils/markdown-export';

interface CardContextMenuProps {
  card: Card;
  children: ReactNode;
  /** Current collection slug if viewing inside a collection */
  currentCollection?: string;
}

export function CardContextMenu({ card, children, currentCollection }: CardContextMenuProps) {
  const { updateCard, deleteCard } = useMutations();
  const openCardDetail = useModalStore((s) => s.openCardDetail);
  const openEditThumbnail = useModalStore((s) => s.openEditThumbnail);
  const toast = useToastStore((s) => s.toast);
  const triggerMuuriLayout = useUIStore((s) => s.triggerMuuriLayout);

  // State for re-extract confirmation dialog
  const [showReextractDialog, setShowReextractDialog] = useState(false);

  const isBookmark = card.type === 'url' && card.url;
  const isPinned = card.pinned;
  const isRead = card.isRead;
  const hasArticle = !!card.articleContent;
  const hasEditedArticle = !!card.articleContentEdited;
  const isNote = card.type === 'md-note' || card.type === 'text-note';
  // Card has exportable content if it has article content or note content
  const hasExportableContent = hasArticle || isNote || !!card.content;

  const handleOpenInNewTab = () => {
    if (card.url) {
      window.open(card.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyUrl = async () => {
    if (card.url) {
      await navigator.clipboard.writeText(card.url);
      toast({ type: 'success', message: 'URL copied to clipboard' });
    }
  };

  const handleRefetchMetadata = () => {
    // If user has edited article content, show confirmation dialog
    if (hasEditedArticle) {
      setShowReextractDialog(true);
      return;
    }
    // Otherwise proceed directly
    performRefetchMetadata();
  };

  const performRefetchMetadata = async () => {
    // Reset the articleContentEdited flag since we're getting fresh content
    // The card will be refetched by the grid-card's metadata re-fetch logic
    await updateCard(card._id, { articleContentEdited: false });
    toast({ type: 'info', message: 'Refreshing metadata...' });
    setShowReextractDialog(false);
  };

  const handleEditThumbnail = () => {
    openEditThumbnail(card._id);
  };

  const handleTogglePin = async () => {
    await updateCard(card._id, { pinned: !isPinned });
    toast({
      type: 'success',
      message: isPinned ? 'Unpinned' : 'Pinned'
    });
  };

  const handleEdit = () => {
    openCardDetail(card._id);
  };

  const handleToggleRead = async () => {
    const currentTags = card.tags || [];
    if (isRead) {
      // Mark as unread AND set sticky flag to prevent auto-marking
      // Also remove 'read' tag
      const newTags = updateReadTag(currentTags, false);
      await updateCard(card._id, { isRead: false, manuallyMarkedUnread: true, tags: newTags });
      toast({ type: 'success', message: 'Marked as unread (will not auto-mark)' });
    } else {
      // Mark as read and clear the sticky flag
      // Also add 'read' tag
      const newTags = updateReadTag(currentTags, true);
      await updateCard(card._id, { isRead: true, manuallyMarkedUnread: false, tags: newTags });
      toast({ type: 'success', message: 'Marked as read' });
    }
    // Trigger Muuri layout refresh after tag change
    setTimeout(() => triggerMuuriLayout(), 100);
  };

  const handleRemoveFromCollection = async () => {
    if (currentCollection) {
      // Remove collection slug from card tags
      const currentTags = card.tags || [];
      const newTags = currentTags.filter(t => t !== currentCollection);
      await updateCard(card._id, { tags: newTags });
      toast({ type: 'success', message: 'Removed from collection' });
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this card?')) {
      await deleteCard(card._id);
      toast({ type: 'success', message: 'Card deleted' });
    }
  };

  // Get the content to export (prefer article content for bookmarks, otherwise use card content)
  const getExportableContent = (): string => {
    if (hasArticle && card.articleContent) {
      return card.articleContent;
    }
    return card.content || '';
  };

  const handleCopyAsMarkdown = async () => {
    const content = getExportableContent();
    if (!content) {
      toast({ type: 'error', message: 'No content to copy' });
      return;
    }
    try {
      await copyHtmlAsMarkdown(content);
      toast({ type: 'success', message: 'Copied as Markdown' });
    } catch (error) {
      console.error('Failed to copy as Markdown:', error);
      toast({ type: 'error', message: 'Failed to copy' });
    }
  };

  const handleExportAsMarkdown = () => {
    const content = getExportableContent();
    if (!content) {
      toast({ type: 'error', message: 'No content to export' });
      return;
    }
    try {
      const filename = card.title || 'Untitled';
      downloadHtmlAsMarkdown(content, filename);
      toast({ type: 'success', message: 'Exported as Markdown' });
    } catch (error) {
      console.error('Failed to export as Markdown:', error);
      toast({ type: 'error', message: 'Failed to export' });
    }
  };

  // Keyboard shortcut handler for context menu
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't handle if modifier keys are pressed (except for Delete)
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const key = e.key.toLowerCase();

    switch (key) {
      case 'e':
        e.preventDefault();
        handleEdit();
        break;
      case 'o':
        if (isBookmark) {
          e.preventDefault();
          handleOpenInNewTab();
        }
        break;
      case 'c':
        if (isBookmark) {
          e.preventDefault();
          handleCopyUrl();
        }
        break;
      case 'p':
        e.preventDefault();
        handleTogglePin();
        break;
      case 'delete':
      case 'backspace':
        e.preventDefault();
        handleDelete();
        break;
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent onKeyDown={handleKeyDown}>
          {/* Edit */}
          <ContextMenuItem onClick={handleEdit}>
            <Pencil className="size-4" />
            Edit
            <ContextMenuShortcut>E</ContextMenuShortcut>
          </ContextMenuItem>

          {/* Bookmark-specific actions */}
          {isBookmark && (
            <>
              <ContextMenuItem onClick={handleOpenInNewTab}>
                <ExternalLink className="size-4" />
                Open in new tab
                <ContextMenuShortcut>O</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem onClick={handleCopyUrl}>
                <Copy className="size-4" />
                Copy URL
                <ContextMenuShortcut>C</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem onClick={handleRefetchMetadata}>
                <RefreshCw className="size-4" />
                Refetch Metadata
              </ContextMenuItem>
              <ContextMenuItem onClick={handleEditThumbnail}>
                <ImagePlus className="size-4" />
                Edit Thumbnail
              </ContextMenuItem>
            </>
          )}

          <ContextMenuSeparator />

          {/* Pin/Unpin */}
          <ContextMenuItem onClick={handleTogglePin}>
            {isPinned ? (
              <>
                <PinOff className="size-4" />
                Unpin
              </>
            ) : (
              <>
                <Pin className="size-4" />
                Pin
              </>
            )}
            <ContextMenuShortcut>P</ContextMenuShortcut>
          </ContextMenuItem>

          {/* Add to Pawkit submenu */}
          <AddToPawkitSubmenu cardId={card._id} cardCollections={card.tags || []} />

          {/* Schedule submenu - for bookmark cards */}
          {isBookmark && (
            <ScheduleSubmenu cardId={card._id} currentSchedule={card.scheduledDates?.[0]} />
          )}

          {/* Mark as Read/Unread - for bookmarks with extracted article content */}
          {isBookmark && hasArticle && (
            <ContextMenuItem onClick={handleToggleRead}>
              {isRead ? (
                <>
                  <BookX className="size-4" />
                  Mark as unread
                </>
              ) : (
                <>
                  <BookOpen className="size-4" />
                  Mark as read
                </>
              )}
            </ContextMenuItem>
          )}

          {/* Markdown export options - for cards with content */}
          {hasExportableContent && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handleCopyAsMarkdown}>
                <FileText className="size-4" />
                Copy as Markdown
              </ContextMenuItem>
              <ContextMenuItem onClick={handleExportAsMarkdown}>
                <Download className="size-4" />
                Export as Markdown
              </ContextMenuItem>
            </>
          )}

          {/* Remove from collection (only show when viewing a collection) */}
          {currentCollection && (
            <ContextMenuItem onClick={handleRemoveFromCollection}>
              <FolderMinus className="size-4" />
              Remove from this Pawkit
            </ContextMenuItem>
          )}

          <ContextMenuSeparator />

          {/* Delete */}
          <ContextMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 className="size-4" />
            Delete
            <ContextMenuShortcut>Del</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

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
            <AlertDialogAction onClick={performRefetchMetadata}>
              Re-extract Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
