"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ControlPanelMode } from "@/components/control-panel/control-panel";

export type PanelContentType =
  | "home-controls"
  | "library-controls"
  | "card-details"
  | "notes-controls"
  | "pawkits-controls"
  | "calendar-controls"
  | "day-details"
  | "bulk-operations"
  | "closed";

export type PanelState = {
  // Right panel (context panel)
  isOpen: boolean;
  mode: ControlPanelMode;
  contentType: PanelContentType;

  // Active card ID (when showing card details)
  activeCardId: string | null;

  // Collapsed sections (persisted)
  collapsedSections: Record<string, boolean>;

  // Previous content type (for restoring after card closes)
  previousContentType: PanelContentType;

  // Track if panel was auto-opened by card modal
  wasAutoOpened: boolean;

  // Left panel (navigation panel)
  isLeftOpen: boolean;
  leftMode: ControlPanelMode;

  // Actions
  open: (contentType?: PanelContentType) => void;
  close: () => void;
  toggle: () => void;
  setMode: (mode: ControlPanelMode) => void;
  setContentType: (contentType: PanelContentType) => void;
  setActiveCardId: (cardId: string | null) => void;
  toggleSection: (sectionId: string) => void;

  // Left panel actions
  openLeft: () => void;
  closeLeft: () => void;
  toggleLeft: () => void;
  setLeftMode: (mode: ControlPanelMode) => void;

  // Open specific content types
  openHomeControls: () => void;
  openLibraryControls: () => void;
  openCardDetails: (cardId: string) => void;
  openNotesControls: () => void;
  openCalendarControls: () => void;
  openDayDetails: () => void;
  openBulkOperations: () => void;
  restorePreviousContent: () => void;
};

export const usePanelStore = create<PanelState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      mode: "floating",
      contentType: "closed",
      activeCardId: null,
      collapsedSections: {},
      previousContentType: "closed",
      wasAutoOpened: false,
      isLeftOpen: true, // Default to open
      leftMode: "anchored", // Default to anchored

      open: (contentType = "library-controls") => {
        set({ isOpen: true, contentType, wasAutoOpened: false });
      },

      close: () => {
        const currentState = get();
        // Store current content type as previous (unless it's already closed or a temporary overlay)
        const shouldStorePrevious =
          currentState.contentType !== "closed" &&
          currentState.contentType !== "card-details" &&
          currentState.contentType !== "day-details" &&
          currentState.contentType !== "bulk-operations";

        const previousContentType = shouldStorePrevious
          ? currentState.contentType
          : currentState.previousContentType;

        set({
          isOpen: false,
          contentType: "closed",
          activeCardId: null,
          previousContentType
        });
      },

      toggle: () => {
        const { isOpen, previousContentType } = get();
        if (isOpen) {
          get().close();
        } else {
          // Manual toggle should restore previous content or default to library-controls
          const contentToRestore =
            previousContentType !== "closed" ? previousContentType : "library-controls";
          set({ isOpen: true, contentType: contentToRestore, wasAutoOpened: false });
        }
      },

      setMode: (mode) => {
        set({ mode });
      },

      setContentType: (contentType) => {
        set({ contentType });
      },

      setActiveCardId: (cardId) => {
        set({ activeCardId: cardId });
      },

      toggleSection: (sectionId) => {
        set((state) => ({
          collapsedSections: {
            ...state.collapsedSections,
            [sectionId]: !state.collapsedSections[sectionId],
          },
        }));
      },

      // Left panel actions
      openLeft: () => {
        set({ isLeftOpen: true });
      },

      closeLeft: () => {
        set({ isLeftOpen: false });
      },

      toggleLeft: () => {
        set((state) => ({ isLeftOpen: !state.isLeftOpen }));
      },

      setLeftMode: (leftMode) => {
        set({ leftMode });
      },

      openHomeControls: () => {
        set({ isOpen: true, contentType: "home-controls", activeCardId: null, wasAutoOpened: false });
      },

      openLibraryControls: () => {
        set({ isOpen: true, contentType: "library-controls", activeCardId: null, wasAutoOpened: false });
      },

      openCardDetails: (cardId) => {
        const currentState = get();
        // Store current content type as previous (if it's not already card-details)
        const previousContentType = currentState.contentType !== "card-details"
          ? currentState.contentType
          : currentState.previousContentType;

        // Track if we're auto-opening a closed panel
        const wasAutoOpened = !currentState.isOpen;

        set({
          isOpen: true,
          contentType: "card-details",
          activeCardId: cardId,
          previousContentType,
          wasAutoOpened,
        });
      },

      openNotesControls: () => {
        set({ isOpen: true, contentType: "notes-controls", activeCardId: null, wasAutoOpened: false });
      },

      openCalendarControls: () => {
        set({ isOpen: true, contentType: "calendar-controls", activeCardId: null, wasAutoOpened: false });
      },

      openDayDetails: () => {
        const currentState = get();
        // Store current content type as previous (if it's not already day-details)
        const previousContentType = currentState.contentType !== "day-details"
          ? currentState.contentType
          : currentState.previousContentType;

        set({
          isOpen: true,
          contentType: "day-details",
          activeCardId: null,
          previousContentType,
          wasAutoOpened: false,
        });
      },

      openBulkOperations: () => {
        const currentState = get();
        // Store current content type as previous (if it's not already bulk-operations)
        const previousContentType = currentState.contentType !== "bulk-operations"
          ? currentState.contentType
          : currentState.previousContentType;

        set({
          isOpen: true,
          contentType: "bulk-operations",
          activeCardId: null,
          previousContentType,
          wasAutoOpened: false
        });
      },

      restorePreviousContent: () => {
        const { previousContentType, isOpen, wasAutoOpened } = get();

        // If panel was auto-opened by a card, close it when card is dismissed
        if (wasAutoOpened) {
          set({ isOpen: false, contentType: "closed", activeCardId: null, wasAutoOpened: false });
          return;
        }

        // Otherwise, restore previous content if panel was open
        if (isOpen && previousContentType !== "closed") {
          // Don't clear activeCardId here - let the layout handle it after transition
          set({ contentType: previousContentType, activeCardId: null });
        }
      },

      // USER SWITCHING: Reset panel state for new user/workspace
      _switchUser: async (userId: string, workspaceId: string) => {

        // Reset to defaults (UI state, doesn't need server sync)
        // Default to anchored mode so new users see the full 3-panel layout
        set({
          mode: "anchored",
          isOpen: false,
          contentType: "library-controls",
          previousContentType: "closed",
          activeCardId: null,
          collapsedSections: {},
          wasAutoOpened: false,
          leftMode: "anchored",
          isLeftOpen: true,
        });

        // Try to load from user-specific localStorage
        const key = `control-panel-state-${userId}-${workspaceId}`;
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.state) {
              // Only restore persisted fields
              set({
                mode: parsed.state.mode ?? "anchored",
                isOpen: parsed.state.isOpen ?? false,
                contentType: parsed.state.contentType ?? "library-controls",
                collapsedSections: parsed.state.collapsedSections ?? {},
                leftMode: parsed.state.leftMode ?? "anchored",
                isLeftOpen: parsed.state.isLeftOpen ?? true,
              });
            }
          }
        } catch (error) {
        }
      },
    }),
    {
      name: "control-panel-state",
      partialize: (state) => ({
        mode: state.mode,
        isOpen: state.isOpen, // Persist right panel open state
        // Only persist contentType if it's not card-details (card-details requires activeCardId)
        contentType: state.contentType === "card-details" ? "library-controls" : state.contentType,
        collapsedSections: state.collapsedSections, // Persist collapsed state
        leftMode: state.leftMode, // Persist left panel mode
        isLeftOpen: state.isLeftOpen, // Persist left panel open state
      }),
      onRehydrateStorage: () => (state) => {
        // Fix any stale "card-details" contentType that might be in localStorage from before the fix
        if (state && state.contentType === "card-details") {
          state.contentType = "library-controls";
          state.activeCardId = null;
        }
      },
    }
  )
);
