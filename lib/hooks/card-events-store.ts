import { create } from "zustand";
import { CardModel } from "@/lib/types";

type CardEventsState = {
  newCard: CardModel | null;
  addCard: (card: CardModel) => void;
  clearNewCard: () => void;
};

export const useCardEvents = create<CardEventsState>((set) => ({
  newCard: null,
  addCard: (card) => set({ newCard: card }),
  clearNewCard: () => set({ newCard: null }),
}));
