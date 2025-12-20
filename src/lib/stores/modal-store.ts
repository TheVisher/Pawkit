/**
 * Modal Store
 * Manages modal visibility state
 */

import { create } from 'zustand';

interface ModalStore {
  // Add Card Modal
  isAddCardOpen: boolean;
  addCardDefaultTab: 'bookmark' | 'note';
  openAddCard: (tab?: 'bookmark' | 'note') => void;
  closeAddCard: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  isAddCardOpen: false,
  addCardDefaultTab: 'bookmark',

  openAddCard: (tab = 'bookmark') =>
    set({ isAddCardOpen: true, addCardDefaultTab: tab }),

  closeAddCard: () => set({ isAddCardOpen: false }),
}));
