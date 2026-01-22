'use client';

import { create } from 'zustand';

interface SelectionState {
  // Selected item IDs
  selectedIds: Set<string>;

  // Selection actions
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;

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

  selectedCount: () => get().selectedIds.size,
}));

// Bulk actions are now handled by components using useMutations() from convex-data-context
