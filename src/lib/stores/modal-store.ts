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

  // Card Detail / Content Panel
  activeCardId: string | null;
  cardOriginRect: DOMRect | null;
  isAnimating: boolean;
  isClosingPanel: boolean; // True during close animation
  openCardDetail: (id: string) => void;
  openCardDetailWithRect: (id: string, rect: DOMRect) => void;
  closeCardDetail: () => void;
  setIsAnimating: (animating: boolean) => void;
  setIsClosingPanel: (closing: boolean) => void;

  // Create Pawkit Modal
  isCreatePawkitOpen: boolean;
  openCreatePawkitModal: () => void;
  closeCreatePawkitModal: () => void;

  // Cover Image Picker Modal
  isCoverImagePickerOpen: boolean;
  coverImageCollectionId: string | null;
  openCoverImagePicker: (collectionId: string) => void;
  closeCoverImagePicker: () => void;

  // Universal Image Picker Modal (for contact photos, thumbnails, and new image cards)
  isImagePickerOpen: boolean;
  imagePickerCardId: string | null;
  imagePickerMode: 'thumbnail' | 'contact' | 'new-card';
  openImagePicker: (cardId: string | null, mode: 'thumbnail' | 'contact' | 'new-card') => void;
  closeImagePicker: () => void;

  // Legacy aliases for backward compatibility
  isCardPhotoPickerOpen: boolean;
  cardPhotoCardId: string | null;
  openCardPhotoPicker: (cardId: string) => void;
  closeCardPhotoPicker: () => void;

  isEditThumbnailOpen: boolean;
  editThumbnailCardId: string | null;
  openEditThumbnail: (cardId: string) => void;
  closeEditThumbnail: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  // Add Card Modal
  isAddCardOpen: false,
  addCardDefaultTab: 'bookmark',

  openAddCard: (tab = 'bookmark') =>
    set({ isAddCardOpen: true, addCardDefaultTab: tab }),

  closeAddCard: () => set({ isAddCardOpen: false }),

  // Card Detail / Content Panel
  activeCardId: null,
  cardOriginRect: null,
  isAnimating: false,
  isClosingPanel: false,

  openCardDetail: (id) => set({ activeCardId: id, cardOriginRect: null, isClosingPanel: false }),

  openCardDetailWithRect: (id, rect) => set({
    activeCardId: id,
    cardOriginRect: rect,
    isAnimating: true,
    isClosingPanel: false
  }),

  closeCardDetail: () => set({ activeCardId: null, cardOriginRect: null, isAnimating: false, isClosingPanel: false }),

  setIsAnimating: (animating) => set({ isAnimating: animating }),

  setIsClosingPanel: (closing) => set({ isClosingPanel: closing }),

  // Create Pawkit Modal
  isCreatePawkitOpen: false,
  openCreatePawkitModal: () => set({ isCreatePawkitOpen: true }),
  closeCreatePawkitModal: () => set({ isCreatePawkitOpen: false }),

  // Cover Image Picker Modal
  isCoverImagePickerOpen: false,
  coverImageCollectionId: null,
  openCoverImagePicker: (collectionId) => set({ isCoverImagePickerOpen: true, coverImageCollectionId: collectionId }),
  closeCoverImagePicker: () => set({ isCoverImagePickerOpen: false, coverImageCollectionId: null }),

  // Universal Image Picker Modal
  isImagePickerOpen: false,
  imagePickerCardId: null,
  imagePickerMode: 'thumbnail',
  openImagePicker: (cardId, mode) => set({
    isImagePickerOpen: true,
    imagePickerCardId: cardId,
    imagePickerMode: mode
  }),
  closeImagePicker: () => set({
    isImagePickerOpen: false,
    imagePickerCardId: null
  }),

  // Legacy aliases - delegate to universal image picker
  isCardPhotoPickerOpen: false,
  cardPhotoCardId: null,
  openCardPhotoPicker: (cardId) => set({
    isImagePickerOpen: true,
    imagePickerCardId: cardId,
    imagePickerMode: 'contact'
  }),
  closeCardPhotoPicker: () => set({
    isImagePickerOpen: false,
    imagePickerCardId: null
  }),

  isEditThumbnailOpen: false,
  editThumbnailCardId: null,
  openEditThumbnail: (cardId) => set({
    isImagePickerOpen: true,
    imagePickerCardId: cardId,
    imagePickerMode: 'thumbnail'
  }),
  closeEditThumbnail: () => set({
    isImagePickerOpen: false,
    imagePickerCardId: null
  }),
}));
