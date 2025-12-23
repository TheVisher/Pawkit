'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { DragOverlay, useDndMonitor, type Modifier } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CardItem } from './card-item';
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
  Pin,
  Check,
  X,
  Calendar,
  Link,
  Plus,
  Tag,
  FolderPlus,
  Minus,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// =============================================================================
// CUSTOM MODIFIER
// =============================================================================

// Custom modifier that centers the overlay on cursor based on overlay size (not original element)
const centerOverlayOnCursor: Modifier = ({ transform, draggingNodeRect }) => {
  if (draggingNodeRect) {
    return {
      ...transform,
      x: transform.x - draggingNodeRect.width / 2,
      y: transform.y - draggingNodeRect.height / 2,
    };
  }
  return transform;
};

// =============================================================================
// TYPES
// =============================================================================

export type ColumnId =
  | 'name'
  | 'type'
  | 'tags'
  | 'createdAt'
  | 'updatedAt'
  | 'url'
  | 'domain'
  | 'description'
  | 'collections'
  | 'status'
  | 'pinned'
  | 'scheduledDate'
  | 'thumbnail'
  | 'notes';

type SortDirection = 'asc' | 'desc';

// =============================================================================
// CONSTANTS
// =============================================================================

// Default visible columns
export const DEFAULT_COLUMN_ORDER: ColumnId[] = ['name', 'type', 'tags', 'createdAt', 'updatedAt'];

// All available columns (for column picker)
export const ALL_COLUMNS: ColumnId[] = [
  'name',
  'type',
  'tags',
  'createdAt',
  'updatedAt',
  'url',
  'domain',
  'description',
  'collections',
  'status',
  'pinned',
  'scheduledDate',
  'thumbnail',
  'notes',
];

export const DEFAULT_COLUMN_WIDTHS: Record<ColumnId, number> = {
  name: 300,
  type: 100,
  tags: 150,
  createdAt: 120,
  updatedAt: 120,
  url: 200,
  domain: 120,
  description: 200,
  collections: 150,
  status: 80,
  pinned: 60,
  scheduledDate: 120,
  thumbnail: 80,
  notes: 200,
};

export const COLUMN_LABELS: Record<ColumnId, string> = {
  name: 'Name',
  type: 'Type',
  tags: 'Tags',
  createdAt: 'Created',
  updatedAt: 'Modified',
  url: 'URL',
  domain: 'Domain',
  description: 'Description',
  collections: 'Collections',
  status: 'Status',
  pinned: 'Pinned',
  scheduledDate: 'Scheduled',
  thumbnail: 'Thumbnail',
  notes: 'Notes',
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

// Column picker dropdown - shows/hides columns
function ColumnPicker({
  visibleColumns,
  onToggleColumn,
}: {
  visibleColumns: ColumnId[];
  onToggleColumn: (columnId: ColumnId) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={menuRef} className="relative flex-shrink-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-md hover:bg-[var(--bg-surface-3)] transition-colors"
        title="Add/remove columns"
      >
        <Plus className="h-4 w-4 text-[var(--color-text-muted)]" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 z-50 py-2 rounded-lg shadow-lg min-w-[180px] max-h-[400px] overflow-y-auto"
          style={{
            background: 'var(--color-bg-surface-2)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="px-3 py-1.5 text-xs font-medium text-text-secondary border-b border-white/5 mb-1">
            Toggle Columns
          </div>
          {ALL_COLUMNS.map((col) => {
            const isVisible = visibleColumns.includes(col);
            const isName = col === 'name'; // Name column can't be hidden
            return (
              <button
                key={col}
                onClick={() => {
                  if (!isName) {
                    onToggleColumn(col);
                  }
                }}
                disabled={isName}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors',
                  isName
                    ? 'text-text-muted cursor-not-allowed'
                    : 'text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center',
                    isVisible
                      ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                      : 'border-white/20'
                  )}
                >
                  {isVisible && <Check className="h-3 w-3 text-white" />}
                </div>
                <span>{COLUMN_LABELS[col]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Editable cell wrapper - handles inline editing
function EditableCell({
  value,
  cardId,
  field,
  onSave,
  isEditing,
  onStartEdit,
  onCancelEdit,
  placeholder = '-',
  multiline = false,
}: {
  value: string;
  cardId: string;
  field: string;
  onSave: (cardId: string, field: string, value: string) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue !== value) {
      onSave(cardId, field, editValue);
    }
    onCancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditValue(value);
      onCancelEdit();
    }
  };

  if (isEditing) {
    const inputClasses = 'w-full bg-transparent border border-[var(--color-accent)] rounded px-2 py-1 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]';

    return multiline ? (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn(inputClasses, 'resize-none h-16')}
        onClick={(e) => e.stopPropagation()}
      />
    ) : (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={inputClasses}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartEdit();
      }}
      className="text-sm text-[var(--color-text-muted)] truncate block cursor-text hover:text-[var(--color-text-secondary)]"
      title="Double-click to edit"
    >
      {value || placeholder}
    </span>
  );
}

// Editable tags cell - special handling for array
function EditableTagsCell({
  tags,
  cardId,
  onSave,
  isEditing,
  onStartEdit,
  onCancelEdit,
}: {
  tags: string[];
  cardId: string;
  onSave: (cardId: string, field: string, value: string[]) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}) {
  const [editValue, setEditValue] = useState(tags.join(', '));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(tags.join(', '));
  }, [tags]);

  const handleSave = () => {
    const newTags = editValue
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    onSave(cardId, 'tags', newTags);
    onCancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditValue(tags.join(', '));
      onCancelEdit();
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder="tag1, tag2, tag3"
        className="w-full bg-transparent border border-[var(--color-accent)] rounded px-2 py-1 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartEdit();
      }}
      className="flex flex-wrap gap-1 cursor-text"
      title="Double-click to edit"
    >
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
      {tags.length > 2 && (
        <span className="text-xs text-[var(--color-text-muted)]">+{tags.length - 2}</span>
      )}
    </div>
  );
}

// Bulk action bar - appears when rows are selected
function BulkActionBar({
  selectedCount,
  onDelete,
  onAddTags,
  onAddToCollection,
  onClear,
}: {
  selectedCount: number;
  onDelete: () => void;
  onAddTags: () => void;
  onAddToCollection: () => void;
  onClear: () => void;
}) {
  return (
    <div
      className="sticky bottom-0 z-30 flex items-center gap-3 px-4 py-3 border-t border-white/10"
      style={{
        background: 'var(--color-bg-surface-2)',
      }}
    >
      <span className="text-sm text-[var(--color-text-primary)] font-medium">
        {selectedCount} selected
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onAddTags}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-surface-3 rounded-md transition-colors"
        >
          <Tag className="h-3.5 w-3.5" />
          <span>Add Tags</span>
        </button>
        <button
          onClick={onAddToCollection}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-surface-3 rounded-md transition-colors"
        >
          <FolderPlus className="h-3.5 w-3.5" />
          <span>Add to Pawkit</span>
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete</span>
        </button>
      </div>
      <div className="flex-1" />
      <button
        onClick={onClear}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary rounded-md transition-colors"
      >
        <X className="h-3.5 w-3.5" />
        <span>Clear selection</span>
      </button>
    </div>
  );
}

// Sortable row wrapper for DnD - entire row is draggable
function SortableListRow({
  card,
  children,
  isDragging,
  isDropTarget,
}: {
  card: LocalCard;
  children: React.ReactNode;
  isDragging: boolean;
  isDropTarget: boolean;
}) {
  const { attributes, listeners, setNodeRef } = useSortable({
    id: card.id,
    data: { type: 'Card', card },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex border-b border-white/5 transition-colors group',
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
  onReorder?: (reorderedIds: string[]) => void;
}

export function CardListView({ cards, onReorder }: CardListViewProps) {
  const openCardDetail = useModalStore((s) => s.openCardDetail);
  const workspace = useCurrentWorkspace();
  const deleteCard = useDataStore((s) => s.deleteCard);
  const updateCard = useDataStore((s) => s.updateCard);

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

  // DnD state for row reordering
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [overRowId, setOverRowId] = useState<string | null>(null);
  const [activeDragCard, setActiveDragCard] = useState<LocalCard | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ cardId: string; column: ColumnId } | null>(null);

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

  // Toggle column visibility - add or remove from order
  const handleToggleColumn = useCallback(
    (columnId: ColumnId) => {
      const isVisible = columnOrder.includes(columnId);
      let newOrder: ColumnId[];

      if (isVisible) {
        // Remove column
        newOrder = columnOrder.filter((c) => c !== columnId);
      } else {
        // Add column - insert at end
        newOrder = [...columnOrder, columnId];
      }

      setListColumnOrder(newOrder);
      triggerSave();
    },
    [columnOrder, setListColumnOrder, triggerSave]
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

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === cards.length) {
      // All selected, deselect all
      setSelectedIds(new Set());
    } else {
      // Select all
      setSelectedIds(new Set(cards.map((c) => c.id)));
    }
  }, [cards, selectedIds.size]);

  const handleToggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Bulk action handlers
  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (confirm(`Are you sure you want to delete ${count} item${count === 1 ? '' : 's'}?`)) {
      for (const id of selectedIds) {
        await deleteCard(id);
      }
      setSelectedIds(new Set());
    }
  }, [selectedIds, deleteCard]);

  const handleBulkAddTags = useCallback(() => {
    // TODO: Open tag picker modal
    console.log('Add tags to:', Array.from(selectedIds));
    alert('Tag picker coming soon! Selected IDs logged to console.');
  }, [selectedIds]);

  const handleBulkAddToCollection = useCallback(() => {
    // TODO: Open collection picker modal
    console.log('Add to collection:', Array.from(selectedIds));
    alert('Collection picker coming soon! Selected IDs logged to console.');
  }, [selectedIds]);

  // Computed selection state
  const allSelected = cards.length > 0 && selectedIds.size === cards.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < cards.length;

  // Inline editing handlers
  const handleStartEdit = useCallback((cardId: string, column: ColumnId) => {
    setEditingCell({ cardId, column });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleSaveCell = useCallback(
    async (cardId: string, field: string, value: string | string[]) => {
      await updateCard(cardId, { [field]: value });
    },
    [updateCard]
  );

  // Check if a cell is currently being edited
  const isEditing = useCallback(
    (cardId: string, column: ColumnId) => {
      return editingCell?.cardId === cardId && editingCell?.column === column;
    },
    [editingCell]
  );

  // DnD monitor for row reordering
  useDndMonitor({
    onDragStart: (event) => {
      const id = event.active.id as string;
      // Only handle if this is one of our cards
      const card = cards.find((c) => c.id === id);
      if (!card) return;
      setActiveRowId(id);
      setOverRowId(null);
      setActiveDragCard(card);
    },
    onDragOver: (event) => {
      if (!activeRowId) return;
      setOverRowId(event.over?.id as string | null);
    },
    onDragEnd: (event) => {
      if (!activeRowId) return;

      const { active, over } = event;
      setActiveRowId(null);
      setOverRowId(null);
      setActiveDragCard(null);

      if (over && active.id !== over.id && onReorder) {
        const oldIndex = cards.findIndex((c) => c.id === active.id);
        const newIndex = cards.findIndex((c) => c.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = [...cards];
          const [removed] = newOrder.splice(oldIndex, 1);
          newOrder.splice(newIndex, 0, removed);
          onReorder(newOrder.map((c) => c.id));
        }
      }
    },
    onDragCancel: () => {
      setActiveRowId(null);
      setOverRowId(null);
      setActiveDragCard(null);
    },
  });

  // Card IDs for sortable context
  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);

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
    const scheduledDateFormatted = card.scheduledDate ? format(new Date(card.scheduledDate), 'MM/dd/yyyy') : '-';
    const tags = card.tags || [];
    const collections = card.collections || [];

    switch (column) {
      case 'name':
        // Name column - clicking opens modal (title can be edited in modal)
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
        // Tags are editable
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <EditableTagsCell
              tags={tags}
              cardId={card.id}
              onSave={handleSaveCell}
              isEditing={isEditing(card.id, 'tags')}
              onStartEdit={() => handleStartEdit(card.id, 'tags')}
              onCancelEdit={handleCancelEdit}
            />
          </div>
        );
      case 'createdAt':
        return <span className="text-sm text-[var(--color-text-muted)]">{createdDate}</span>;
      case 'updatedAt':
        return <span className="text-sm text-[var(--color-text-muted)]">{modifiedDate}</span>;
      case 'url':
        return card.url ? (
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-[var(--color-accent)] hover:underline truncate block"
          >
            {card.url}
          </a>
        ) : (
          <span className="text-sm text-[var(--color-text-muted)]">-</span>
        );
      case 'domain':
        return (
          <span className="text-sm text-[var(--color-text-muted)] truncate block">
            {card.domain || '-'}
          </span>
        );
      case 'description':
        // Description is editable
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <EditableCell
              value={card.description || ''}
              cardId={card.id}
              field="description"
              onSave={handleSaveCell}
              isEditing={isEditing(card.id, 'description')}
              onStartEdit={() => handleStartEdit(card.id, 'description')}
              onCancelEdit={handleCancelEdit}
            />
          </div>
        );
      case 'collections':
        return (
          <div className="flex flex-wrap gap-1">
            {collections.length > 0 ? (
              collections.slice(0, 2).map((col) => (
                <span
                  key={col}
                  className="text-xs text-[var(--color-text-muted)] bg-[var(--bg-surface-3)] px-2 py-0.5 rounded"
                >
                  {col}
                </span>
              ))
            ) : (
              <span className="text-sm text-[var(--color-text-muted)]">-</span>
            )}
          </div>
        );
      case 'status':
        const statusColors: Record<string, string> = {
          READY: 'text-green-400',
          PENDING: 'text-yellow-400',
          ERROR: 'text-red-400',
        };
        return (
          <span className={cn('text-xs font-medium', statusColors[card.status] || 'text-[var(--color-text-muted)]')}>
            {card.status}
          </span>
        );
      case 'pinned':
        return card.pinned ? (
          <Pin className="h-4 w-4 text-[var(--color-accent)]" />
        ) : (
          <span className="text-sm text-[var(--color-text-muted)]">-</span>
        );
      case 'scheduledDate':
        return (
          <span className="text-sm text-[var(--color-text-muted)]">{scheduledDateFormatted}</span>
        );
      case 'thumbnail':
        return card.image ? (
          <Image
            src={card.image}
            alt=""
            width={40}
            height={30}
            className="rounded object-cover"
          />
        ) : (
          <span className="text-sm text-[var(--color-text-muted)]">-</span>
        );
      case 'notes':
        // Notes are editable (multiline)
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <EditableCell
              value={card.notes || ''}
              cardId={card.id}
              field="notes"
              onSave={handleSaveCell}
              isEditing={isEditing(card.id, 'notes')}
              onStartEdit={() => handleStartEdit(card.id, 'notes')}
              onCancelEdit={handleCancelEdit}
              multiline
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="w-full overflow-x-auto relative">
        {/* Sticky header row */}
        <div
          className="sticky top-0 z-20 flex border-b border-white/5 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-surface)]/95 backdrop-blur-sm"
          style={{
            minWidth: 'max-content',
          }}
        >
          {/* Checkbox column header */}
          <div className="w-12 py-3 px-4 flex-shrink-0 flex items-center">
            <button
              onClick={handleSelectAll}
              className={cn(
                'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                allSelected
                  ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                  : someSelected
                    ? 'bg-[var(--color-accent)]/50 border-[var(--color-accent)]'
                    : 'border-white/20 hover:border-white/40'
              )}
            >
              {allSelected && <Check className="h-3 w-3 text-white" />}
              {someSelected && <Minus className="h-3 w-3 text-white" />}
            </button>
          </div>
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
          {/* Column picker + Actions header */}
          <div className="py-2 px-2 flex-shrink-0 flex items-center gap-1">
            <ColumnPicker visibleColumns={columnOrder} onToggleColumn={handleToggleColumn} />
          </div>
        </div>

        {/* Data rows with DnD */}
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          <div>
            {sortedCards.map((card) => {
              const isSelected = selectedIds.has(card.id);
              const isDragging = activeRowId === card.id;
              const isDropTarget = overRowId === card.id && activeRowId !== card.id;

              return (
                <SortableListRow
                  key={card.id}
                  card={card}
                  isDragging={isDragging}
                  isDropTarget={isDropTarget}
                >
                  {/* Row content - clicking opens modal */}
                  <div
                    onClick={() => openCardDetail(card.id)}
                    className={cn(
                      'flex flex-1 cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/15'
                        : 'hover:bg-[var(--bg-surface-2)]'
                    )}
                  >
                    {/* Checkbox column */}
                    <div className="w-12 py-3 px-4 flex-shrink-0 flex items-center">
                      <button
                        onClick={(e) => handleToggleSelect(card.id, e)}
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                          isSelected
                            ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                            : 'border-white/20 hover:border-white/40'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </button>
                    </div>
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
                </SortableListRow>
              );
            })}
          </div>
        </SortableContext>

        {/* Bulk action bar - shown when rows are selected */}
        {selectedIds.size > 0 && (
          <BulkActionBar
            selectedCount={selectedIds.size}
            onDelete={handleBulkDelete}
            onAddTags={handleBulkAddTags}
            onAddToCollection={handleBulkAddToCollection}
            onClear={handleClearSelection}
          />
        )}
      </div>

      {/* Drag overlay - shows thumbnail card like masonry view */}
      {typeof document !== 'undefined' &&
        createPortal(
          <DragOverlay
            adjustScale={false}
            dropAnimation={null}
            modifiers={[centerOverlayOnCursor]}
            style={{ zIndex: 9999 }}
          >
            {activeDragCard && (
              <div
                style={{
                  width: 200,
                  opacity: 0.85,
                  transform: 'rotate(-2deg)',
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4))',
                }}
              >
                <CardItem card={activeDragCard} variant="grid" />
              </div>
            )}
          </DragOverlay>,
          document.body
        )}
    </>
  );
}
