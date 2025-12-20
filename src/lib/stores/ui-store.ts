/**
 * UI Store
 * Manages UI state like sidebars, modals, and layout preferences
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

type CardSize = 'small' | 'medium' | 'large';
type ModalType = 'card-detail' | 'create-card' | 'create-collection' | 'settings' | 'task' | null;

interface UIState {
  // Sidebar state
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftSidebarAnchored: boolean;
  rightSidebarAnchored: boolean;

  // Display preferences
  cardSize: CardSize;

  // Modal state
  activeModal: ModalType;
  modalData: Record<string, unknown> | null;

  // Command palette
  commandPaletteOpen: boolean;

  // Actions
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  toggleLeftSidebarAnchored: () => void;
  toggleRightSidebarAnchored: () => void;
  setCardSize: (size: CardSize) => void;
  openModal: (modal: ModalType, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  leftSidebarOpen: true,
  rightSidebarOpen: false,
  leftSidebarAnchored: true,
  rightSidebarAnchored: false,
  cardSize: 'medium',
  activeModal: null,
  modalData: null,
  commandPaletteOpen: false,

  // Sidebar actions
  toggleLeftSidebar: () =>
    set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),

  toggleRightSidebar: () =>
    set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),

  setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),

  setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),

  toggleLeftSidebarAnchored: () =>
    set((state) => ({ leftSidebarAnchored: !state.leftSidebarAnchored })),

  toggleRightSidebarAnchored: () =>
    set((state) => ({ rightSidebarAnchored: !state.rightSidebarAnchored })),

  // Display actions
  setCardSize: (size) => set({ cardSize: size }),

  // Modal actions
  openModal: (modal, data) => set({ activeModal: modal, modalData: data ?? null }),

  closeModal: () => set({ activeModal: null, modalData: null }),

  // Command palette actions
  toggleCommandPalette: () =>
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
}));

// =============================================================================
// SELECTORS
// =============================================================================

export const selectLeftSidebarOpen = (state: UIState) => state.leftSidebarOpen;
export const selectRightSidebarOpen = (state: UIState) => state.rightSidebarOpen;
export const selectLeftSidebarAnchored = (state: UIState) => state.leftSidebarAnchored;
export const selectRightSidebarAnchored = (state: UIState) => state.rightSidebarAnchored;
export const selectCardSize = (state: UIState) => state.cardSize;
export const selectActiveModal = (state: UIState) => state.activeModal;
export const selectModalData = (state: UIState) => state.modalData;
export const selectCommandPaletteOpen = (state: UIState) => state.commandPaletteOpen;

// =============================================================================
// HOOKS
// =============================================================================

export function useLeftSidebar() {
  return useUIStore(
    useShallow((state) => ({
      isOpen: state.leftSidebarOpen,
      isAnchored: state.leftSidebarAnchored,
      toggle: state.toggleLeftSidebar,
      setOpen: state.setLeftSidebarOpen,
      toggleAnchored: state.toggleLeftSidebarAnchored,
    }))
  );
}

export function useRightSidebar() {
  return useUIStore(
    useShallow((state) => ({
      isOpen: state.rightSidebarOpen,
      isAnchored: state.rightSidebarAnchored,
      toggle: state.toggleRightSidebar,
      setOpen: state.setRightSidebarOpen,
      toggleAnchored: state.toggleRightSidebarAnchored,
    }))
  );
}

export function useCardSize() {
  return useUIStore(
    useShallow((state) => ({
      size: state.cardSize,
      setSize: state.setCardSize,
    }))
  );
}

export function useModal() {
  return useUIStore(
    useShallow((state) => ({
      activeModal: state.activeModal,
      modalData: state.modalData,
      open: state.openModal,
      close: state.closeModal,
    }))
  );
}

export function useCommandPalette() {
  return useUIStore(
    useShallow((state) => ({
      isOpen: state.commandPaletteOpen,
      toggle: state.toggleCommandPalette,
      setOpen: state.setCommandPaletteOpen,
    }))
  );
}

// Hook for layout-level anchor state (used by dashboard-shell)
export function useLayoutAnchors() {
  return useUIStore(
    useShallow((state) => ({
      leftOpen: state.leftSidebarOpen,
      rightOpen: state.rightSidebarOpen,
      leftAnchored: state.leftSidebarAnchored,
      rightAnchored: state.rightSidebarAnchored,
    }))
  );
}
