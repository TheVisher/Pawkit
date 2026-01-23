'use client';

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Link,
  FileText,
  ClipboardPaste,
} from 'lucide-react';
import { useModalStore } from '@/lib/stores/modal-store';
import { useMutations } from '@/lib/contexts/convex-data-context';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { serializePlateContent } from '@/lib/plate/html-to-plate';
import { cn } from '@/lib/utils';

interface ContentAreaContextMenuProps {
  children: ReactNode;
}

export function ContentAreaContextMenu({ children }: ContentAreaContextMenuProps) {
  const openAddCard = useModalStore((s) => s.openAddCard);
  const { createCard } = useMutations();
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const toast = useToastStore((s) => s.toast);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 });
  const [menuPoint, setMenuPoint] = useState({ x: 0, y: 0 });

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
          workspaceId: currentWorkspace._id,
          type: 'url',
          url,
          title: url,
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
          workspaceId: currentWorkspace._id,
          type: 'md-note',
          title: '',
          url: '',
          content: plateContent,
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

  useLayoutEffect(() => {
    if (!isOpen) return;
    const menu = menuRef.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    const padding = 8;
    const nextX = Math.max(padding, Math.min(anchorPoint.x, window.innerWidth - rect.width - padding));
    const nextY = Math.max(padding, Math.min(anchorPoint.y, window.innerHeight - rect.height - padding));
    if (nextX !== menuPoint.x || nextY !== menuPoint.y) {
      setMenuPoint({ x: nextX, y: nextY });
    }
  }, [isOpen, anchorPoint.x, anchorPoint.y, menuPoint.x, menuPoint.y]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    const handleScroll = () => {
      setIsOpen(false);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const handleContextMenu = (event: React.MouseEvent) => {
    if (event.defaultPrevented) return;
    event.preventDefault();
    const point = { x: event.clientX, y: event.clientY };
    setAnchorPoint(point);
    setMenuPoint(point);
    setIsOpen(true);
  };

  const itemClass = cn(
    'focus:bg-accent focus:text-accent-foreground',
    'relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none'
  );

  return (
    <div onContextMenu={handleContextMenu} className="h-full">
      {children}
      {isOpen && (
        <div
          ref={menuRef}
          style={{ left: menuPoint.x, top: menuPoint.y }}
          className={cn(
            'fixed z-[100] min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md',
            'bg-popover text-popover-foreground'
          )}
        >
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              setIsOpen(false);
              handleAddBookmark();
            }}
          >
            <Link className="size-4" />
            Add bookmark
          </button>
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              setIsOpen(false);
              handleAddNote();
            }}
          >
            <FileText className="size-4" />
            Add note
          </button>

          <div className="bg-border -mx-1 my-1 h-px" />

          <button
            type="button"
            className={itemClass}
            onClick={() => {
              setIsOpen(false);
              void handlePaste();
            }}
          >
            <ClipboardPaste className="size-4" />
            Paste
          </button>
        </div>
      )}
    </div>
  );
}
