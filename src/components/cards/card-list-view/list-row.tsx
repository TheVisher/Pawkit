'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useSortable } from '@dnd-kit/sortable';
import { MoreVertical, ExternalLink, Copy, Trash2, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutations } from '@/lib/contexts/convex-data-context';
import type { Card } from '@/lib/types/convex';
import { getCardIcon } from './types';

// =============================================================================
// LIST ROW ICON
// =============================================================================

export function ListRowIcon({ card }: { card: Card }) {
  const [imageError, setImageError] = useState(false);

  if (card.favicon && !imageError) {
    return (
      <Image
        src={card.favicon}
        alt=""
        width={20}
        height={20}
        className="rounded"
        onError={() => setImageError(true)}
      />
    );
  }

  const Icon = getCardIcon(card);
  return <Icon className="h-5 w-5 text-[var(--color-text-muted)]" />;
}

// =============================================================================
// LIST ROW ACTIONS
// =============================================================================

interface ListRowActionsProps {
  card: Card;
  onEdit: () => void;
}

export function ListRowActions({ card, onEdit }: ListRowActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { deleteCard } = useMutations();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleOpenUrl = () => {
    if (card.url) {
      window.open(card.url, '_blank');
    }
    setIsOpen(false);
  };

  const handleCopyUrl = async () => {
    if (card.url) {
      await navigator.clipboard.writeText(card.url);
    }
    setIsOpen(false);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this card?')) {
      await deleteCard(card._id);
    }
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 rounded-md hover:bg-[var(--bg-surface-3)] transition-colors"
      >
        <MoreVertical className="h-4 w-4 text-[var(--color-text-muted)]" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 z-50 py-1 rounded-lg shadow-lg min-w-[140px]"
          style={{
            background: 'var(--color-bg-surface-2)',
            border: '1px solid var(--border-subtle)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onEdit();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit</span>
          </button>
          {card.url && (
            <>
              <button
                onClick={handleOpenUrl}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open URL</span>
              </button>
              <button
                onClick={handleCopyUrl}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy URL</span>
              </button>
            </>
          )}
          <div className="my-1 border-t border-[var(--color-text-muted)]/20" />
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SORTABLE LIST ROW
// =============================================================================

interface SortableListRowProps {
  card: Card;
  children: React.ReactNode;
  isDragging: boolean;
  isDropTarget: boolean;
}

export function SortableListRow({
  card,
  children,
  isDragging,
  isDropTarget,
}: SortableListRowProps) {
  const { attributes, listeners, setNodeRef } = useSortable({
    id: card._id,
    data: { type: 'Card', card },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex border-b border-[var(--color-text-muted)]/15 transition-colors group',
        isDragging && 'opacity-30',
        isDropTarget && 'bg-[var(--color-accent)]/20'
      )}
      style={{ minWidth: 'max-content' }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
