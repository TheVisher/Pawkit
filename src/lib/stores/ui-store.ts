/**
 * UI Store
 * Manages UI state like sidebars, modals, and layout preferences
 * Persists layout preferences to localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

type CardSize = 'small' | 'medium' | 'large';
type ModalType = 'card-detail' | 'create-card' | 'create-collection' | 'settings' | 'task' | null;

// Right sidebar expansion modes (extensible for future features)
type RightSidebarExpandedMode = 'settings' | 'split-view' | 'calendar-schedule' | null;
type SettingsTab = 'appearance' | 'account' | 'data' | null;

// Width configuration for each expansion mode
export const SIDEBAR_WIDTHS: Record<string, number> = {
  default: 325,
  settings: 480,
  'split-view': 600,
  'calendar-schedule': 600,
};

// Helper to get current sidebar width based on mode
export function getRightSidebarWidth(mode: RightSidebarExpandedMode): number {
  if (!mode) return SIDEBAR_WIDTHS.default;
  return SIDEBAR_WIDTHS[mode] ?? SIDEBAR_WIDTHS.default;
}

interface UIState {
  // Sidebar state (persisted)
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftSidebarAnchored: boolean;
  rightSidebarAnchored: boolean;

  // Right sidebar expansion (persisted)
  rightSidebarExpandedMode: RightSidebarExpandedMode;
  settingsTab: SettingsTab;

  // Right sidebar section expanded states (persisted)
  // Section IDs: 'tags', 'sort-by', 'group-by', 'content-type', 'card-display', 'advanced-filters', 'quick-filter', 'reading-status'
  sidebarSectionStates: Record<string, boolean>;

  // Pawkit tree expanded states (persisted)
  expandedPawkitIds: string[];

  // Display preferences (persisted)
  cardSize: CardSize;

  // Modal state (not persisted)
  activeModal: ModalType;
  modalData: Record<string, unknown> | null;

  // Command palette (not persisted)
  commandPaletteOpen: boolean;

  // Actions
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  toggleLeftSidebarAnchored: () => void;
  toggleRightSidebarAnchored: () => void;
  setRightSidebarExpandedMode: (mode: RightSidebarExpandedMode) => void;
  toggleSettingsMode: () => void;
  setSettingsTab: (tab: SettingsTab) => void;
  setSidebarSectionExpanded: (sectionId: string, expanded: boolean) => void;
  toggleSidebarSection: (sectionId: string) => void;
  togglePawkitExpanded: (id: string) => void;
  setPawkitExpanded: (id: string, expanded: boolean) => void;
  setCardSize: (size: CardSize) => void;
  openModal: (modal: ModalType, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      leftSidebarOpen: true,
      rightSidebarOpen: false,
      leftSidebarAnchored: true,
      rightSidebarAnchored: false,
      rightSidebarExpandedMode: null,
      settingsTab: null,
      sidebarSectionStates: {},
      expandedPawkitIds: [],
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

      // Right sidebar expansion actions
      setRightSidebarExpandedMode: (mode) =>
        set({
          rightSidebarExpandedMode: mode,
          // Reset settings tab when closing
          settingsTab: mode === 'settings' ? 'appearance' : null,
        }),

      toggleSettingsMode: () =>
        set((state) => ({
          rightSidebarExpandedMode: state.rightSidebarExpandedMode === 'settings' ? null : 'settings',
          settingsTab: state.rightSidebarExpandedMode === 'settings' ? null : 'appearance',
          // Ensure sidebar is open when entering settings
          rightSidebarOpen: state.rightSidebarExpandedMode === 'settings' ? state.rightSidebarOpen : true,
        })),

      setSettingsTab: (tab) => set({ settingsTab: tab }),

      // Sidebar section actions
      setSidebarSectionExpanded: (sectionId, expanded) =>
        set((state) => ({
          sidebarSectionStates: {
            ...state.sidebarSectionStates,
            [sectionId]: expanded,
          },
        })),

      toggleSidebarSection: (sectionId) =>
        set((state) => ({
          sidebarSectionStates: {
            ...state.sidebarSectionStates,
            [sectionId]: !state.sidebarSectionStates[sectionId],
          },
        })),

      // Pawkit tree actions
      togglePawkitExpanded: (id) =>
        set((state) => ({
          expandedPawkitIds: state.expandedPawkitIds.includes(id)
            ? state.expandedPawkitIds.filter((i) => i !== id)
            : [...state.expandedPawkitIds, id],
        })),

      setPawkitExpanded: (id, expanded) =>
        set((state) => ({
          expandedPawkitIds: expanded
            ? state.expandedPawkitIds.includes(id)
              ? state.expandedPawkitIds
              : [...state.expandedPawkitIds, id]
            : state.expandedPawkitIds.filter((i) => i !== id),
        })),

      // Display actions
      setCardSize: (size) => set({ cardSize: size }),

      // Modal actions
      openModal: (modal, data) => set({ activeModal: modal, modalData: data ?? null }),

      closeModal: () => set({ activeModal: null, modalData: null }),

      // Command palette actions
      toggleCommandPalette: () =>
        set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    }),
    {
      name: 'pawkit-ui-preferences',
      // Only persist layout preferences, not transient state
      partialize: (state) => ({
        leftSidebarOpen: state.leftSidebarOpen,
        rightSidebarOpen: state.rightSidebarOpen,
        leftSidebarAnchored: state.leftSidebarAnchored,
        rightSidebarAnchored: state.rightSidebarAnchored,
        rightSidebarExpandedMode: state.rightSidebarExpandedMode,
        sidebarSectionStates: state.sidebarSectionStates,
        expandedPawkitIds: state.expandedPawkitIds,
        cardSize: state.cardSize,
      }),
    }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

export const selectLeftSidebarOpen = (state: UIState) => state.leftSidebarOpen;
export const selectRightSidebarOpen = (state: UIState) => state.rightSidebarOpen;
export const selectLeftSidebarAnchored = (state: UIState) => state.leftSidebarAnchored;
export const selectRightSidebarAnchored = (state: UIState) => state.rightSidebarAnchored;
export const selectRightSidebarExpandedMode = (state: UIState) => state.rightSidebarExpandedMode;
export const selectSettingsTab = (state: UIState) => state.settingsTab;
export const selectSidebarSectionStates = (state: UIState) => state.sidebarSectionStates;
export const selectExpandedPawkitIds = (state: UIState) => state.expandedPawkitIds;
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
      expandedMode: state.rightSidebarExpandedMode,
      toggle: state.toggleRightSidebar,
      setOpen: state.setRightSidebarOpen,
      toggleAnchored: state.toggleRightSidebarAnchored,
      setExpandedMode: state.setRightSidebarExpandedMode,
    }))
  );
}

export function useRightSidebarSettings() {
  return useUIStore(
    useShallow((state) => ({
      isSettingsMode: state.rightSidebarExpandedMode === 'settings',
      settingsTab: state.settingsTab,
      toggleSettings: state.toggleSettingsMode,
      setTab: state.setSettingsTab,
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
      rightExpandedMode: state.rightSidebarExpandedMode,
    }))
  );
}

// Hook for right sidebar section expanded states
export function useSidebarSections() {
  return useUIStore(
    useShallow((state) => ({
      sectionStates: state.sidebarSectionStates,
      setExpanded: state.setSidebarSectionExpanded,
      toggle: state.toggleSidebarSection,
    }))
  );
}

// Hook for Pawkit tree expanded states in left sidebar
export function usePawkitTreeExpanded() {
  return useUIStore(
    useShallow((state) => ({
      expandedIds: state.expandedPawkitIds,
      toggle: state.togglePawkitExpanded,
      setExpanded: state.setPawkitExpanded,
    }))
  );
}
