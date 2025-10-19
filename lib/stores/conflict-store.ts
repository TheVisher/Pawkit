import { create } from 'zustand';

export type ConflictNotification = {
  id: string;
  message: string;
  cardId: string;
  timestamp: number;
  type: 'sync' | 'edit' | 'delete' | 'metadata';
};

type ConflictStore = {
  conflicts: ConflictNotification[];
  addConflict: (cardId: string, message: string, type?: 'sync' | 'edit' | 'delete' | 'metadata') => void;
  removeConflict: (id: string) => void;
  clearAll: () => void;
};

// Track active timeouts for cleanup
const activeTimeouts = new Map<string, NodeJS.Timeout>();

export const useConflictStore = create<ConflictStore>((set) => ({
  conflicts: [],

  addConflict: (cardId: string, message: string, type: 'sync' | 'edit' | 'delete' | 'metadata' = 'sync') => {
    const conflict: ConflictNotification = {
      id: `conflict_${Date.now()}_${Math.random()}`,
      message,
      cardId,
      timestamp: Date.now(),
      type
    };

    set((state) => ({
      conflicts: [...state.conflicts, conflict]
    }));

    // Auto-remove after 10 seconds with cleanup tracking
    const timeoutId = setTimeout(() => {
      set((state) => ({
        conflicts: state.conflicts.filter((c) => c.id !== conflict.id)
      }));
      activeTimeouts.delete(conflict.id);
    }, 10000);

    // Store timeout ID for potential cleanup
    activeTimeouts.set(conflict.id, timeoutId);
  },

  removeConflict: (id: string) => {
    // Clear any pending timeout
    const timeoutId = activeTimeouts.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      activeTimeouts.delete(id);
    }

    set((state) => ({
      conflicts: state.conflicts.filter((c) => c.id !== id)
    }));
  },

  clearAll: () => {
    // Clear all pending timeouts
    activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    activeTimeouts.clear();

    set({ conflicts: [] });
  }
}));
