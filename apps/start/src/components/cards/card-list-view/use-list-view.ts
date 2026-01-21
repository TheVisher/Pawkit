'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useDndMonitor } from '@dnd-kit/core';
import { useModalStore } from '@/lib/stores/modal-store';
import { useMutations } from '@/lib/contexts/convex-data-context';
import { useViewStore } from '@/lib/stores/view-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useSelectionStore } from '@/lib/stores/selection-store';
import type { Card } from '@/lib/types/convex';
import { type ColumnId, type SortDirection, DEFAULT_COLUMN_ORDER, DEFAULT_COLUMN_WIDTHS, MIN_COLUMN_WIDTH, getCardType } from './types';

export function useListView(cards: Card[], onReorder?: (reorderedIds: string[]) => void) {
  const openCardDetail = useModalStore((s) => s.openCardDetail);
  const workspace = useCurrentWorkspace();
  const { updateCard } = useMutations();

  // Get column state from view store (persisted)
  const listColumnOrder = useViewStore((s) => s.listColumnOrder);
  const listColumnWidths = useViewStore((s) => s.listColumnWidths);
  const setListColumnOrder = useViewStore((s) => s.setListColumnOrder);
  const setListColumnWidth = useViewStore((s) => s.setListColumnWidth);
  const saveViewSettings = useViewStore((s) => s.saveViewSettings);

  // Use store values or defaults
  const columnOrder = listColumnOrder.length > 0 ? listColumnOrder as ColumnId[] : DEFAULT_COLUMN_ORDER;
  const columnWidths = { ...DEFAULT_COLUMN_WIDTHS, ...listColumnWidths } as Record<ColumnId, number>;

  // Local sort state
  const [sortColumn, setSortColumn] = useState<ColumnId | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Drag state for column reordering
  const [draggedColumn, setDraggedColumn] = useState<ColumnId | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);

  // DnD state for row reordering
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [overRowId, setOverRowId] = useState<string | null>(null);
  const [activeDragCard, setActiveDragCard] = useState<Card | null>(null);

  // Multi-select state (global store for omnibar integration)
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const toggleSelect = useSelectionStore((s) => s.toggleSelect);
  const selectAllCards = useSelectionStore((s) => s.selectAll);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const bulkDelete = useSelectionStore((s) => s.bulkDelete);
  const bulkAddTags = useSelectionStore((s) => s.bulkAddTags);
  const bulkAddToCollection = useSelectionStore((s) => s.bulkAddToCollection);

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ cardId: string; column: ColumnId } | null>(null);

  // Debounced save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerSave = useCallback(() => {
    if (!workspace) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveViewSettings(workspace._id);
    }, 500);
  }, [workspace, saveViewSettings]);

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

  const handleToggleColumn = useCallback(
    (columnId: ColumnId) => {
      const isVisible = columnOrder.includes(columnId);
      let newOrder: ColumnId[];

      if (isVisible) {
        newOrder = columnOrder.filter((c) => c !== columnId);
      } else {
        newOrder = [...columnOrder, columnId];
      }

      setListColumnOrder(newOrder);
      triggerSave();
    },
    [columnOrder, setListColumnOrder, triggerSave]
  );

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

  const handleResize = useCallback(
    (column: ColumnId, newWidth: number) => {
      const clampedWidth = Math.max(MIN_COLUMN_WIDTH, newWidth);
      setListColumnWidth(column, clampedWidth);
      triggerSave();
    },
    [setListColumnWidth, triggerSave]
  );

  // Selection handlers (using global store)
  const handleSelectAll = useCallback(() => {
    selectAllCards(cards.map((c) => c._id));
  }, [cards, selectAllCards]);

  const handleToggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSelect(id);
  }, [toggleSelect]);

  const handleClearSelection = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Bulk action handlers (delegated to global store)
  const handleBulkDelete = bulkDelete;
  const handleBulkAddTags = bulkAddTags;
  const handleBulkAddToCollection = bulkAddToCollection;

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

  const isEditing = useCallback(
    (cardId: string, column: ColumnId) => {
      return editingCell?.cardId === cardId && editingCell?.column === column;
    },
    [editingCell]
  );

  const handleRowClick = useCallback(
    (card: Card) => {
      openCardDetail(card._id);
    },
    [openCardDetail]
  );

  // DnD monitor for row reordering
  useDndMonitor({
    onDragStart: (event) => {
      const id = event.active.id as string;
      const card = cards.find((c) => c._id === id);
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
        const oldIndex = cards.findIndex((c) => c._id === active.id);
        const newIndex = cards.findIndex((c) => c._id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = [...cards];
          const [removed] = newOrder.splice(oldIndex, 1);
          newOrder.splice(newIndex, 0, removed);
          onReorder(newOrder.map((c) => c._id));
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
  const cardIds = useMemo(() => cards.map((c) => c._id), [cards]);

  // Sort cards
  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
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
  }, [cards, sortColumn, sortDirection]);

  return {
    // Column state
    columnOrder,
    columnWidths,
    sortColumn,
    sortDirection,
    dragOverColumn,

    // Row state
    activeRowId,
    overRowId,
    activeDragCard,
    cardIds,
    sortedCards,

    // Selection state
    selectedIds,
    allSelected,
    someSelected,

    // Editing state
    isEditing,

    // Column handlers
    handleColumnDragStart,
    handleColumnDragOver,
    handleColumnDrop,
    handleToggleColumn,
    handleSort,
    handleResize,

    // Selection handlers
    handleSelectAll,
    handleToggleSelect,
    handleClearSelection,

    // Bulk action handlers
    handleBulkDelete,
    handleBulkAddTags,
    handleBulkAddToCollection,

    // Edit handlers
    handleStartEdit,
    handleCancelEdit,
    handleSaveCell,
    handleRowClick,

    // Modal
    openCardDetail,
  };
}
