'use client';

import { type ReactNode } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Link,
  FileText,
  ClipboardPaste,
} from 'lucide-react';
import { useModalStore } from '@/lib/stores/modal-store';
import { useDataStore } from '@/lib/stores/data-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { serializePlateContent } from '@/lib/plate/html-to-plate';

interface ContentAreaContextMenuProps {
  children: ReactNode;
}

export function ContentAreaContextMenu({ children }: ContentAreaContextMenuProps) {
  const openAddCard = useModalStore((s) => s.openAddCard);
  const createCard = useDataStore((s) => s.createCard);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const toast = useToastStore((s) => s.toast);

  const handleAddBookmark = () => {
    openAddCard('bookmark');
  };

  const handleAddNote = () => {
    openAddCard('note');
  };

  const handlePaste = async () => {
    if (!currentWorkspace) return;

    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();

      // Check if it looks like a URL
      if (trimmed.match(/^https?:\/\//i) || trimmed.match(/^www\./i)) {
        const url = trimmed.startsWith('www.') ? `https://${trimmed}` : trimmed;
        await createCard({
          workspaceId: currentWorkspace.id,
          type: 'url',
          url,
          title: url,
          status: 'PENDING',
          pinned: false,
          isFileCard: false,
          tags: [],
        });
        toast({ type: 'success', message: 'Bookmark created from clipboard' });
      } else if (trimmed) {
        // Create a note from clipboard text using Plate JSON format
        const plateContent = serializePlateContent([
          { type: 'p', children: [{ text: trimmed }] },
        ]);
        await createCard({
          workspaceId: currentWorkspace.id,
          type: 'md-note',
          title: '',
          url: '',
          content: plateContent,
          status: 'READY',
          pinned: false,
          isFileCard: false,
          tags: [],
        });
        toast({ type: 'success', message: 'Note created from clipboard' });
      }
    } catch {
      toast({ type: 'error', message: 'Could not read clipboard' });
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleAddBookmark}>
          <Link className="size-4" />
          Add bookmark
        </ContextMenuItem>
        <ContextMenuItem onClick={handleAddNote}>
          <FileText className="size-4" />
          Add note
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={handlePaste}>
          <ClipboardPaste className="size-4" />
          Paste
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
