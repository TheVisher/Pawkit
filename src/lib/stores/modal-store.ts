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

  // Card Detail Modal
  activeCardId: string | null;
  openCardDetail: (id: string) => void;
  closeCardDetail: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  // Add Card Modal
  isAddCardOpen: false,
  addCardDefaultTab: 'bookmark',

  openAddCard: (tab = 'bookmark') =>
    set({ isAddCardOpen: true, addCardDefaultTab: tab }),

  closeAddCard: () => set({ isAddCardOpen: false }),

  // Card Detail Modal
  activeCardId: null,

  openCardDetail: (id) => set({ activeCardId: id }),

  closeCardDetail: () => set({ activeCardId: null }),
}));
