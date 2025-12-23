'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import type { LocalCard } from '@/lib/db';
import { useModalStore } from '@/lib/stores/modal-store';
import { useDataStore } from '@/lib/stores/data-store';
import { useViewStore } from '@/lib/stores/view-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import {
  Bookmark,
  FileText,
  Image as ImageIcon,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Copy,
  Trash2,
  Edit3,
  GripVertical,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export type ColumnId = 'name' | 'type' | 'tags' | 'createdAt' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_COLUMN_ORDER: ColumnId[] = ['name', 'type', 'tags', 'createdAt', 'updatedAt'];

export const DEFAULT_COLUMN_WIDTHS: Record<ColumnId, number> = {
  name: 300,
  type: 100,
  tags: 150,
  createdAt: 120,
  updatedAt: 120,
};

export const COLUMN_LABELS: Record<ColumnId, string> = {
  name: 'Name',
  type: 'Type',
  tags: 'Tags',
  createdAt: 'Date Created',
  updatedAt: 'Date Modified',
};

const MIN_COLUMN_WIDTH = 60;

// =============================================================================
// HELPERS
// =============================================================================

function getCardType(card: LocalCard): string {
  if (card.type === 'note') return 'Note';
  if (card.type === 'image') return 'Image';
  return 'Bookmark';
}

function getCardIcon(card: LocalCard) {
  if (card.type === 'note') return FileText;
  if (card.type === 'image') return ImageIcon;
  return Bookmark;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ListRowIcon({ card }: { card: LocalCard }) {
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

function ListRowActions({ card, onEdit }: { card: LocalCard; onEdit: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const deleteCard = useDataStore((s) => s.deleteCard);

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
      await deleteCard(card.id);
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
          <div className="my-1 border-t border-white/5" />
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

function ResizableHeader({
  column,
  label,
  width,
  onResize,
  sortColumn,
  sortDirection,
  onSort,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: {
  column: ColumnId;
  label: string;
  width: number;
  onResize: (column: ColumnId, width: number) => void;
  sortColumn: ColumnId | null;
  sortDirection: SortDirection;
  onSort: (column: ColumnId) => void;
  onDragStart: (column: ColumnId) => void;
  onDragOver: (e: React.DragEvent, column: ColumnId) => void;
  onDrop: (column: ColumnId) => void;
  isDragOver: boolean;
}) {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
    },
    [width]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(MIN_COLUMN_WIDTH, startWidthRef.current + diff);
      onResize(column, newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, column, onResize]);

  const isSorted = sortColumn === column;

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', column);
    onDragStart(column);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver(e, column);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop(column);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        'group text-left py-3 px-4 font-medium relative select-none flex-shrink-0 transition-all',
        isDragging && 'opacity-50',
        isDragOver && 'bg-[var(--color-accent)]/20 border-l-2 border-[var(--color-accent)]'
      )}
      style={{ width, minWidth: MIN_COLUMN_WIDTH }}
    >
      <div className="flex items-center gap-1">
        <GripVertical className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
        <button
          onClick={() => onSort(column)}
          className="flex items-center gap-1 hover:text-text-primary transition-colors"
        >
          <span>{label}</span>
          {isSorted &&
            (sortDirection === 'asc' ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            ))}
        </button>
      </div>
      <div
        onMouseDown={handleResizeMouseDown}
        className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2 h-4 w-[3px] cursor-col-resize rounded-full transition-colors',
          isResizing ? 'bg-[var(--color-accent)]' : 'bg-white/10 hover:bg-[var(--color-accent)]'
        )}
      />
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface CardListViewProps {
  cards: LocalCard[];
}

export function CardListView({ cards }: CardListViewProps) {
  const openCardDetail = useModalStore((s) => s.openCardDetail);
  const workspace = useCurrentWorkspace();

  // Get column state from view store (persisted)
  const listColumnOrder = useViewStore((s) => s.listColumnOrder);
  const listColumnWidths = useViewStore((s) => s.listColumnWidths);
  const setListColumnOrder = useViewStore((s) => s.setListColumnOrder);
  const setListColumnWidth = useViewStore((s) => s.setListColumnWidth);
  const saveViewSettings = useViewStore((s) => s.saveViewSettings);

  // Use store values or defaults
  const columnOrder = listColumnOrder.length > 0 ? listColumnOrder as ColumnId[] : DEFAULT_COLUMN_ORDER;
  const columnWidths = { ...DEFAULT_COLUMN_WIDTHS, ...listColumnWidths } as Record<ColumnId, number>;

  // Local sort state (not persisted for now)
  const [sortColumn, setSortColumn] = useState<ColumnId | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Drag state for column reordering
  const [draggedColumn, setDraggedColumn] = useState<ColumnId | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);

  // Debounced save - triggers 500ms after last change
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerSave = useCallback(() => {
    if (!workspace) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveViewSettings(workspace.id);
    }, 500);
  }, [workspace, saveViewSettings]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Column drag handlers
  const handleColumnDragStart = useCallback((column: ColumnId) => {
    setDraggedColumn(column);
  }, []);

  const handleColumnDragOver = useCallback(
    (e: React.DragEvent, column: ColumnId) => {
      e.preventDefault();
      if (draggedColumn && draggedColumn !== column) {
        setDragOverColumn(column);
      }
    },
    [draggedColumn]
  );

  const handleColumnDrop = useCallback(
    (targetColumn: ColumnId) => {
      if (!draggedColumn || draggedColumn === targetColumn) {
        setDraggedColumn(null);
        setDragOverColumn(null);
        return;
      }

      const newOrder = [...columnOrder];
      const draggedIndex = newOrder.indexOf(draggedColumn);
      const targetIndex = newOrder.indexOf(targetColumn);

      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedColumn);

      setListColumnOrder(newOrder);
      setDraggedColumn(null);
      setDragOverColumn(null);
      triggerSave();
    },
    [draggedColumn, columnOrder, setListColumnOrder, triggerSave]
  );

  // Sort handler
  const handleSort = useCallback(
    (column: ColumnId) => {
      if (sortColumn === column) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    },
    [sortColumn]
  );

  // Resize handler - updates store and triggers save
  const handleResize = useCallback(
    (column: ColumnId, newWidth: number) => {
      const clampedWidth = Math.max(MIN_COLUMN_WIDTH, newWidth);
      setListColumnWidth(column, clampedWidth);
      triggerSave();
    },
    [setListColumnWidth, triggerSave]
  );

  // Sort cards
  const sortedCards = [...cards].sort((a, b) => {
    if (!sortColumn) return 0;

    let comparison = 0;
    switch (sortColumn) {
      case 'name':
        const nameA = (a.title || a.url || '').toLowerCase();
        const nameB = (b.title || b.url || '').toLowerCase();
        comparison = nameA.localeCompare(nameB);
        break;
      case 'type':
        comparison = getCardType(a).localeCompare(getCardType(b));
        break;
      case 'tags':
        const tagsA = (a.tags || []).join(',').toLowerCase();
        const tagsB = (b.tags || []).join(',').toLowerCase();
        comparison = tagsA.localeCompare(tagsB);
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        break;
      case 'updatedAt':
        comparison = new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Render cell content
  const renderCell = (card: LocalCard, column: ColumnId) => {
    const displayTitle = card.title || card.url || 'Untitled';
    const cardType = getCardType(card);
    const createdDate = card.createdAt ? format(new Date(card.createdAt), 'MM/dd/yyyy') : '-';
    const modifiedDate = card.updatedAt ? format(new Date(card.updatedAt), 'MM/dd/yyyy') : '-';
    const tags = card.tags || [];

    switch (column) {
      case 'name':
        return (
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-[var(--bg-surface-3)] flex-shrink-0">
              <ListRowIcon card={card} />
            </span>
            <span className="text-sm text-[var(--color-text-primary)] font-medium truncate min-w-0 flex-1">
              {displayTitle}
            </span>
          </div>
        );
      case 'type':
        return <span className="text-sm text-[var(--color-text-muted)]">{cardType}</span>;
      case 'tags':
        return (
          <div className="flex flex-wrap gap-1">
            {tags.length > 0 ? (
              tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-[var(--color-text-muted)] bg-[var(--bg-surface-3)] px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-sm text-[var(--color-text-muted)]">-</span>
            )}
          </div>
        );
      case 'createdAt':
        return <span className="text-sm text-[var(--color-text-muted)]">{createdDate}</span>;
      case 'updatedAt':
        return <span className="text-sm text-[var(--color-text-muted)]">{modifiedDate}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      {/* Header row */}
      <div
        className="flex border-b border-white/5 text-xs text-[var(--color-text-muted)]"
        style={{ minWidth: 'max-content' }}
      >
        {columnOrder.map((col) => (
          <ResizableHeader
            key={col}
            column={col}
            label={COLUMN_LABELS[col]}
            width={columnWidths[col]}
            onResize={handleResize}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            onDragStart={handleColumnDragStart}
            onDragOver={handleColumnDragOver}
            onDrop={handleColumnDrop}
            isDragOver={dragOverColumn === col}
          />
        ))}
        {/* Actions header */}
        <div className="py-3 px-4 flex-shrink-0 w-12" />
      </div>

      {/* Data rows */}
      <div>
        {sortedCards.map((card) => (
          <div
            key={card.id}
            onClick={() => openCardDetail(card.id)}
            className="flex border-b border-white/5 hover:bg-[var(--bg-surface-2)] cursor-pointer transition-colors"
            style={{ minWidth: 'max-content' }}
          >
            {columnOrder.map((col) => (
              <div
                key={col}
                className="py-3 px-4 flex-shrink-0 overflow-hidden"
                style={{ width: columnWidths[col] }}
              >
                {renderCell(card, col)}
              </div>
            ))}
            {/* Actions */}
            <div className="py-3 px-4 flex-shrink-0 w-12" onClick={(e) => e.stopPropagation()}>
              <ListRowActions card={card} onEdit={() => openCardDetail(card.id)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
