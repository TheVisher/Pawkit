'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, GripVertical, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ColumnId, type SortDirection, ALL_COLUMNS, COLUMN_LABELS, MIN_COLUMN_WIDTH } from './types';

// =============================================================================
// RESIZABLE HEADER
// =============================================================================

interface ResizableHeaderProps {
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
}

export function ResizableHeader({
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
}: ResizableHeaderProps) {
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
          isResizing ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-text-muted)]/30 hover:bg-[var(--color-accent)]'
        )}
      />
    </div>
  );
}

// =============================================================================
// COLUMN PICKER
// =============================================================================

interface ColumnPickerProps {
  visibleColumns: ColumnId[];
  onToggleColumn: (columnId: ColumnId) => void;
}

export function ColumnPicker({ visibleColumns, onToggleColumn }: ColumnPickerProps) {
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
          <div className="px-3 py-1.5 text-xs font-medium text-text-secondary border-b border-[var(--color-text-muted)]/20 mb-1">
            Toggle Columns
          </div>
          {ALL_COLUMNS.map((col) => {
            const isVisible = visibleColumns.includes(col);
            const isName = col === 'name';
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
                      : 'border-[var(--color-text-muted)]/40'
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
