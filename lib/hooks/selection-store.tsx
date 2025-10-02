"use client";

import { ReactNode, createContext, useContext, useRef } from "react";
import { StoreApi, createStore } from "zustand";
import { useStore } from "zustand";

export type SelectionState = {
  selectedIds: string[];
  lastSelectedId?: string;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  replace: (ids: string[]) => void;
  selectExclusive: (id: string) => void;
  selectRange: (id: string, orderedIds: string[]) => void;
  clear: () => void;
};

function createSelectionStore() {
  return createStore<SelectionState>((set, get) => ({
    selectedIds: [],
    lastSelectedId: undefined,
    isSelected(id) {
      return get().selectedIds.includes(id);
    },
    toggle(id) {
      set((state) => {
        const exists = state.selectedIds.includes(id);
        const next = exists
          ? state.selectedIds.filter((item) => item !== id)
          : [...state.selectedIds, id];
        return {
          selectedIds: next,
          lastSelectedId: id
        };
      });
    },
    replace(ids) {
      set({ selectedIds: Array.from(new Set(ids)), lastSelectedId: ids.at(-1) });
    },
    selectExclusive(id) {
      set({ selectedIds: [id], lastSelectedId: id });
    },
    selectRange(id, orderedIds) {
      const { lastSelectedId, selectedIds } = get();
      if (!orderedIds.length) {
        set({ selectedIds: [id], lastSelectedId: id });
        return;
      }
      const startId = lastSelectedId && orderedIds.includes(lastSelectedId) ? lastSelectedId : id;
      const startIndex = orderedIds.indexOf(startId);
      const endIndex = orderedIds.indexOf(id);
      if (startIndex === -1 || endIndex === -1) {
        set({ selectedIds: [id], lastSelectedId: id });
        return;
      }
      const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
      const range = orderedIds.slice(from, to + 1);
      const merged = new Set(selectedIds);
      range.forEach((item) => merged.add(item));
      set({ selectedIds: Array.from(merged), lastSelectedId: id });
    },
    clear() {
      set({ selectedIds: [], lastSelectedId: undefined });
    }
  }));
}

const SelectionStoreContext = createContext<StoreApi<SelectionState> | null>(null);

export function SelectionStoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<StoreApi<SelectionState>>();
  if (!storeRef.current) {
    storeRef.current = createSelectionStore();
  }

  return <SelectionStoreContext.Provider value={storeRef.current}>{children}</SelectionStoreContext.Provider>;
}

export function useSelection<T>(selector: (state: SelectionState) => T) {
  const store = useContext(SelectionStoreContext);
  if (!store) {
    throw new Error("SelectionStoreProvider is missing");
  }
  return useStore(store, selector);
}
