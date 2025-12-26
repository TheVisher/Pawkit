'use client';

import { create } from 'zustand';
import { useDataStore } from './data-store';

interface SelectionState {
  // Selected item IDs
  selectedIds: Set<string>;

  // Selection actions
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;

  // Bulk action handlers
  bulkDelete: () => Promise<void>;
  bulkAddTags: () => void;
  bulkAddToCollection: () => void;

  // Computed
  selectedCount: () => number;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedIds: new Set(),

  toggleSelect: (id: string) => {
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    });
  },

  selectAll: (ids: string[]) => {
    set((state) => {
      // If all are already selected, deselect all
      const allSelected = ids.every((id) => state.selectedIds.has(id));
      if (allSelected) {
        return { selectedIds: new Set() };
      }
      return { selectedIds: new Set(ids) };
    });
  },

  clearSelection: () => {
    set({ selectedIds: new Set() });
  },

  bulkDelete: async () => {
    const { selectedIds } = get();
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    if (confirm(`Are you sure you want to delete ${count} item${count === 1 ? '' : 's'}?`)) {
      const deleteCard = useDataStore.getState().deleteCard;
      for (const id of selectedIds) {
        await deleteCard(id);
      }
      set({ selectedIds: new Set() });
    }
  },

  bulkAddTags: () => {
    const { selectedIds } = get();
    console.log('Add tags to:', Array.from(selectedIds));
    alert('Tag picker coming soon! Selected IDs logged to console.');
  },

  bulkAddToCollection: () => {
    const { selectedIds } = get();
    console.log('Add to collection:', Array.from(selectedIds));
    alert('Collection picker coming soon! Selected IDs logged to console.');
  },

  selectedCount: () => get().selectedIds.size,
}));
