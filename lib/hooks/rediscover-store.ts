"use client";

import { create } from "zustand";
import { CardModel } from "@/lib/types";

export type RediscoverFilter = "uncategorized" | "all" | "untagged" | "never-opened";

export type SessionStats = {
  kept: number;
  deleted: number;
  snoozed: number;
  addedToPawkit: number;
  neverShow: number;
};

type RediscoverState = {
  isActive: boolean;
  queue: CardModel[];
  currentIndex: number;
  keptCards: CardModel[];
  filter: RediscoverFilter;
  stats: SessionStats;

  // Actions
  setActive: (active: boolean) => void;
  setQueue: (queue: CardModel[]) => void;
  setCurrentIndex: (index: number) => void;
  addKeptCard: (card: CardModel) => void;
  setFilter: (filter: RediscoverFilter) => void;
  updateStats: (stat: keyof SessionStats) => void;
  reset: () => void;
};

const initialStats: SessionStats = {
  kept: 0,
  deleted: 0,
  snoozed: 0,
  addedToPawkit: 0,
  neverShow: 0,
};

export const useRediscoverStore = create<RediscoverState>()((set) => ({
  isActive: false,
  queue: [],
  currentIndex: 0,
  keptCards: [],
  filter: "uncategorized",
  stats: initialStats,

  setActive: (active) => set({ isActive: active }),

  setQueue: (queue) => set({ queue }),

  setCurrentIndex: (index) => set({ currentIndex: index }),

  addKeptCard: (card) => set((state) => {
    // Check if card already exists in kept pile (prevent duplicates)
    const cardExists = state.keptCards.some(keptCard => keptCard.id === card.id);
    if (cardExists) {
      return state; // Don't add duplicate
    }
    return {
      keptCards: [...state.keptCards, card]
    };
  }),

  setFilter: (filter) => set({ filter }),

  updateStats: (stat) => set((state) => ({
    stats: {
      ...state.stats,
      [stat]: state.stats[stat] + 1,
    },
  })),

  reset: () => set({
    isActive: false,
    queue: [],
    currentIndex: 0,
    keptCards: [],
    filter: "uncategorized",
    stats: initialStats,
  }),
}));
