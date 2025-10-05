import { create } from 'zustand';

export type ConflictNotification = {
  id: string;
  message: string;
  cardId: string;
  timestamp: number;
};

type ConflictStore = {
  conflicts: ConflictNotification[];
  addConflict: (cardId: string, message: string) => void;
  removeConflict: (id: string) => void;
  clearAll: () => void;
};

export const useConflictStore = create<ConflictStore>((set) => ({
  conflicts: [],

  addConflict: (cardId: string, message: string) => {
    const conflict: ConflictNotification = {
      id: `conflict_${Date.now()}_${Math.random()}`,
      message,
      cardId,
      timestamp: Date.now()
    };

    set((state) => ({
      conflicts: [...state.conflicts, conflict]
    }));

    // Auto-remove after 10 seconds
    setTimeout(() => {
      set((state) => ({
        conflicts: state.conflicts.filter((c) => c.id !== conflict.id)
      }));
    }, 10000);
  },

  removeConflict: (id: string) => {
    set((state) => ({
      conflicts: state.conflicts.filter((c) => c.id !== id)
    }));
  },

  clearAll: () => {
    set({ conflicts: [] });
  }
}));
