'use client';

import { type ReactNode } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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
} from 'lucide-react';
import { useDataStore } from '@/lib/stores/data-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { updateReadTag } from '@/lib/utils/system-tags';
import type { LocalCard } from '@/lib/db';
import { AddToPawkitSubmenu } from './add-to-pawkit-submenu';
import { ScheduleSubmenu } from './schedule-submenu';

interface CardContextMenuProps {
  card: LocalCard;
  children: ReactNode;
  /** Current collection slug if viewing inside a collection */
  currentCollection?: string;
}

export function CardContextMenu({ card, children, currentCollection }: CardContextMenuProps) {
  const updateCard = useDataStore((s) => s.updateCard);
  const deleteCard = useDataStore((s) => s.deleteCard);
  const removeCardFromCollection = useDataStore((s) => s.removeCardFromCollection);
  const openCardDetail = useModalStore((s) => s.openCardDetail);
  const toast = useToastStore((s) => s.toast);

  const isBookmark = card.type === 'url' && card.url;
  const isQuickNote = card.type === 'quick-note';
  const isPinned = card.pinned;
  const isRead = card.isRead;
  const hasArticle = !!card.articleContent;

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

  const handleTogglePin = async () => {
    await updateCard(card.id, { pinned: !isPinned });
    toast({
      type: 'success',
      message: isPinned ? 'Unpinned' : 'Pinned'
    });
  };

  const handleEdit = () => {
    openCardDetail(card.id);
  };

  const handleToggleRead = async () => {
    const currentTags = card.tags || [];
    if (isRead) {
      // Mark as unread AND set sticky flag to prevent auto-marking
      // Also remove 'read' tag
      const newTags = updateReadTag(currentTags, false);
      await updateCard(card.id, { isRead: false, manuallyMarkedUnread: true, tags: newTags });
      toast({ type: 'success', message: 'Marked as unread (will not auto-mark)' });
    } else {
      // Mark as read and clear the sticky flag
      // Also add 'read' tag
      const newTags = updateReadTag(currentTags, true);
      await updateCard(card.id, { isRead: true, manuallyMarkedUnread: false, tags: newTags });
      toast({ type: 'success', message: 'Marked as read' });
    }
  };

  const handleRemoveFromCollection = async () => {
    if (currentCollection) {
      await removeCardFromCollection(card.id, currentCollection);
      toast({ type: 'success', message: 'Removed from collection' });
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this card?')) {
      await deleteCard(card.id);
      toast({ type: 'success', message: 'Card deleted' });
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        {/* Edit - not shown for quick notes (they edit inline by clicking) */}
        {!isQuickNote && (
          <ContextMenuItem onClick={handleEdit}>
            <Pencil className="size-4" />
            Edit
            <ContextMenuShortcut>E</ContextMenuShortcut>
          </ContextMenuItem>
        )}

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
          </>
        )}

        {/* Separator only if there were items above */}
        {(!isQuickNote || isBookmark) && <ContextMenuSeparator />}

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
        <AddToPawkitSubmenu cardId={card.id} cardCollections={card.collections || []} />

        {/* Schedule submenu - for bookmark cards */}
        {isBookmark && (
          <ScheduleSubmenu cardId={card.id} currentSchedule={card.scheduledDate} />
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
  );
}
