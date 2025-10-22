"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ControlPanelMode } from "@/components/control-panel/control-panel";

export type PanelContentType =
  | "library-controls"
  | "card-details"
  | "notes-controls"
  | "calendar-controls"
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
  openLibraryControls: () => void;
  openCardDetails: (cardId: string) => void;
  openNotesControls: () => void;
  openCalendarControls: () => void;
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
      isLeftOpen: true, // Default to open
      leftMode: "anchored", // Default to anchored

      open: (contentType = "library-controls") => {
        set({ isOpen: true, contentType });
      },

      close: () => {
        set({ isOpen: false, contentType: "closed", activeCardId: null });
      },

      toggle: () => {
        const { isOpen } = get();
        if (isOpen) {
          get().close();
        } else {
          get().open();
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

      openLibraryControls: () => {
        set({ isOpen: true, contentType: "library-controls", activeCardId: null });
      },

      openCardDetails: (cardId) => {
        const currentState = get();
        // Store current content type as previous (if it's not already card-details)
        const previousContentType = currentState.contentType !== "card-details"
          ? currentState.contentType
          : currentState.previousContentType;

        set({
          isOpen: true,
          contentType: "card-details",
          activeCardId: cardId,
          previousContentType,
        });
      },

      openNotesControls: () => {
        set({ isOpen: true, contentType: "notes-controls", activeCardId: null });
      },

      openCalendarControls: () => {
        set({ isOpen: true, contentType: "calendar-controls", activeCardId: null });
      },

      restorePreviousContent: () => {
        const { previousContentType, isOpen } = get();
        // Only restore if panel was open
        if (isOpen && previousContentType !== "closed") {
          // Don't clear activeCardId here - let the layout handle it after transition
          set({ contentType: previousContentType });
        }
      },
    }),
    {
      name: "control-panel-state",
      partialize: (state) => ({
        mode: state.mode,
        collapsedSections: state.collapsedSections, // Persist collapsed state
        leftMode: state.leftMode, // Persist left panel mode
        isLeftOpen: state.isLeftOpen, // Persist left panel open state
      }),
    }
  )
);
