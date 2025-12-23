'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { CardItem, type CardDisplaySettings } from './card-item';
import { MasonryGrid } from './masonry-grid';
import type { LocalCard } from '@/lib/db';
import { useModalStore } from '@/lib/stores/modal-store';
import { useDataStore } from '@/lib/stores/data-store';
import { Bookmark, FileText, Image as ImageIcon, MoreVertical, ChevronUp, ChevronDown, ExternalLink, Copy, Trash2, Edit3, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type CardSize = 'small' | 'medium' | 'large' | 'xl';
type SortColumn = 'name' | 'type' | 'tags' | 'createdAt' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

// Card size to width mapping for grid
const CARD_SIZE_WIDTHS: Record<CardSize, number> = {
  small: 180,
  medium: 280,
  large: 400,
  xl: 520,
};

// Default column widths
const DEFAULT_COLUMN_WIDTHS = {
  name: 300,
  type: 100,
  tags: 150,
  createdAt: 120,
  updatedAt: 120,
  actions: 48,
};

// Default column order
const DEFAULT_COLUMN_ORDER: SortColumn[] = ['name', 'type', 'tags', 'createdAt', 'updatedAt'];

// Column labels
const COLUMN_LABELS: Record<SortColumn, string> = {
  name: 'Name',
  type: 'Type',
  tags: 'Tags',
  createdAt: 'Date Created',
  updatedAt: 'Date Modified',
};

interface CardGridProps {
  cards: LocalCard[];
  layout: string;
  onReorder?: (reorderedIds: string[]) => void;
  cardSize?: CardSize;
  cardSpacing?: number;
  displaySettings?: Partial<CardDisplaySettings>;
}

// Helper to get card type display name
function getCardType(card: LocalCard): string {
  if (card.type === 'note') return 'Note';
  if (card.type === 'image') return 'Image';
  return 'Bookmark';
}

// Helper to get card icon
function getCardIcon(card: LocalCard) {
  if (card.type === 'note') return FileText;
  if (card.type === 'image') return ImageIcon;
  return Bookmark;
}

// List row icon component
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

// 3-dot menu for list view with actual actions
function ListRowActions({ card, onEdit }: { card: LocalCard; onEdit: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const deleteCard = useDataStore((s) => s.deleteCard);

  // Close menu when clicking outside
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

      {/* Dropdown menu */}
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

// Draggable & Resizable column header component
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
  column: SortColumn;
  label: string;
  width: number;
  onResize: (column: SortColumn, width: number) => void;
  sortColumn: SortColumn | null;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  onDragStart: (column: SortColumn) => void;
  onDragOver: (e: React.DragEvent, column: SortColumn) => void;
  onDrop: (column: SortColumn) => void;
  isDragOver: boolean;
}) {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(60, startWidthRef.current + diff);
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
        "group text-left py-3 px-4 font-medium relative select-none flex-shrink-0 transition-all",
        isDragging && "opacity-50",
        isDragOver && "bg-[var(--color-accent)]/20 border-l-2 border-[var(--color-accent)]"
      )}
      style={{ width, minWidth: 60 }}
    >
      <div className="flex items-center gap-1">
        {/* Drag handle - visible on hover */}
        <GripVertical className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
        <button
          onClick={() => onSort(column)}
          className="flex items-center gap-1 hover:text-text-primary transition-colors"
        >
          <span>{label}</span>
          {isSorted && (
            sortDirection === 'asc'
              ? <ChevronUp className="h-3 w-3" />
              : <ChevronDown className="h-3 w-3" />
          )}
        </button>
      </div>
      {/* Resize handle with visible divider line */}
      <div
        onMouseDown={handleResizeMouseDown}
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 h-4 w-[3px] cursor-col-resize rounded-full transition-colors",
          isResizing
            ? "bg-[var(--color-accent)]"
            : "bg-white/10 hover:bg-[var(--color-accent)]"
        )}
      />
    </div>
  );
}

export function CardGrid({ cards, layout, onReorder, cardSize = 'medium', cardSpacing = 16, displaySettings }: CardGridProps) {
  const openCardDetail = useModalStore((s) => s.openCardDetail);

  // Sort state for list view
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Column widths for list view
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS);

  // Column order for drag and drop reordering
  const [columnOrder, setColumnOrder] = useState<SortColumn[]>(DEFAULT_COLUMN_ORDER);
  const [draggedColumn, setDraggedColumn] = useState<SortColumn | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<SortColumn | null>(null);

  // Drag and drop handlers
  const handleColumnDragStart = useCallback((column: SortColumn) => {
    setDraggedColumn(column);
  }, []);

  const handleColumnDragOver = useCallback((e: React.DragEvent, column: SortColumn) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== column) {
      setDragOverColumn(column);
    }
  }, [draggedColumn]);

  const handleColumnDrop = useCallback((targetColumn: SortColumn) => {
    if (!draggedColumn || draggedColumn === targetColumn) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    setColumnOrder(prev => {
      const newOrder = [...prev];
      const draggedIndex = newOrder.indexOf(draggedColumn);
      const targetIndex = newOrder.indexOf(targetColumn);

      // Remove dragged column and insert at target position
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedColumn);

      return newOrder;
    });

    setDraggedColumn(null);
    setDragOverColumn(null);
  }, [draggedColumn]);


  // Handle sort column click
  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, start with ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  // Simple column resize - Notion style
  // Each column is independent, no cascading, just resize the one column
  const MIN_COLUMN_WIDTH = 60;

  const handleResize = useCallback((column: SortColumn, newWidth: number) => {
    // Simply clamp to minimum and set - that's it
    const clampedWidth = Math.max(MIN_COLUMN_WIDTH, newWidth);
    setColumnWidths(prev => ({ ...prev, [column]: clampedWidth }));
  }, []);

  // Sort cards based on current sort state
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

  // Masonry layout with drag-and-drop
  if (layout === 'masonry') {
    return (
      <MasonryGrid
        cards={cards}
        onReorder={onReorder}
        cardSize={cardSize}
        cardSpacing={cardSpacing}
        displaySettings={displaySettings}
      />
    );
  }

  // Helper to render a data cell based on column type
  const renderCell = (card: LocalCard, column: SortColumn) => {
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

  // List view - Notion style: each column independent, horizontal scroll if needed
  if (layout === 'list') {
    return (
      <div className="w-full overflow-x-auto">
        {/* Header row - dynamically rendered based on columnOrder */}
        <div className="flex border-b border-white/5 text-xs text-[var(--color-text-muted)]" style={{ minWidth: 'max-content' }}>
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

        {/* Data rows - dynamically rendered based on columnOrder */}
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

  // Grid view - Uniform card sizes with fixed aspect ratio
  const minWidth = CARD_SIZE_WIDTHS[cardSize];

  return (
    <div
      className="grid"
      style={{
        gap: cardSpacing,
        gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
      }}
    >
      {cards.map((card) => (
        <div
          key={card.id}
          className="aspect-[4/3] overflow-hidden"
        >
          <CardItem
            card={card}
            variant="grid"
            onClick={() => openCardDetail(card.id)}
            displaySettings={displaySettings}
            uniformHeight
          />
        </div>
      ))}
    </div>
  );
}
