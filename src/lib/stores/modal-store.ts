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

  // Create Pawkit Modal
  isCreatePawkitOpen: boolean;
  openCreatePawkitModal: () => void;
  closeCreatePawkitModal: () => void;

  // Cover Image Picker Modal
  isCoverImagePickerOpen: boolean;
  coverImageCollectionId: string | null;
  openCoverImagePicker: (collectionId: string) => void;
  closeCoverImagePicker: () => void;

  // Card Photo Picker Modal (for contact photos)
  isCardPhotoPickerOpen: boolean;
  cardPhotoCardId: string | null;
  openCardPhotoPicker: (cardId: string) => void;
  closeCardPhotoPicker: () => void;
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

  // Create Pawkit Modal
  isCreatePawkitOpen: false,
  openCreatePawkitModal: () => set({ isCreatePawkitOpen: true }),
  closeCreatePawkitModal: () => set({ isCreatePawkitOpen: false }),

  // Cover Image Picker Modal
  isCoverImagePickerOpen: false,
  coverImageCollectionId: null,
  openCoverImagePicker: (collectionId) => set({ isCoverImagePickerOpen: true, coverImageCollectionId: collectionId }),
  closeCoverImagePicker: () => set({ isCoverImagePickerOpen: false, coverImageCollectionId: null }),

  // Card Photo Picker Modal
  isCardPhotoPickerOpen: false,
  cardPhotoCardId: null,
  openCardPhotoPicker: (cardId) => set({ isCardPhotoPickerOpen: true, cardPhotoCardId: cardId }),
  closeCardPhotoPicker: () => set({ isCardPhotoPickerOpen: false, cardPhotoCardId: null }),
}));
