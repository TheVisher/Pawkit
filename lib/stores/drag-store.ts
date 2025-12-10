import { create } from "zustand";

type DragState = {
  // The ID of the card currently being dragged
  draggedCardId: string | null;
  // Whether a card is currently being dragged
  isDragging: boolean;
  // Start dragging a card
  startDrag: (cardId: string) => void;
  // End dragging
  endDrag: () => void;
  // The slug of the pawkit currently being hovered over during drag
  hoveredPawkitSlug: string | null;
  // Set the hovered pawkit
  setHoveredPawkit: (slug: string | null) => void;
  // The ID of the note folder currently being hovered over during drag
  hoveredFolderId: string | null;
  // Set the hovered folder
  setHoveredFolder: (folderId: string | null) => void;
};

export const useDragStore = create<DragState>((set) => ({
  draggedCardId: null,
  isDragging: false,
  hoveredPawkitSlug: null,
  hoveredFolderId: null,

  startDrag: (cardId: string) => {
    set({ draggedCardId: cardId, isDragging: true });
  },

  endDrag: () => {
    set({ draggedCardId: null, isDragging: false, hoveredPawkitSlug: null, hoveredFolderId: null });
  },

  setHoveredPawkit: (slug: string | null) => {
    set({ hoveredPawkitSlug: slug });
  },

  setHoveredFolder: (folderId: string | null) => {
    set({ hoveredFolderId: folderId });
  },
}));
