"use client";

import { create } from "zustand";
import { CardModel } from "@/lib/types";

export type RediscoverFilter = "uncategorized" | "all" | "untagged" | "never-opened";
export type RediscoverStyle = "serendipity" | "classic";

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
  style: RediscoverStyle;

  // Actions
  setActive: (active: boolean) => void;
  setQueue: (queue: CardModel[]) => void;
  setCurrentIndex: (index: number) => void;
  addKeptCard: (card: CardModel) => void;
  removeKeptCard: (cardId: string) => void;
  setFilter: (filter: RediscoverFilter) => void;
  updateStats: (stat: keyof SessionStats) => void;
  setStyle: (style: RediscoverStyle) => void;
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
  style: "serendipity", // Default to new serendipity mode

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

  removeKeptCard: (cardId) => set((state) => ({
    keptCards: state.keptCards.filter(card => card.id !== cardId)
  })),

  setFilter: (filter) => set({ filter }),

  updateStats: (stat) => set((state) => ({
    stats: {
      ...state.stats,
      [stat]: state.stats[stat] + 1,
    },
  })),

  setStyle: (style) => set({ style }),

  reset: () => set({
    isActive: false,
    queue: [],
    currentIndex: 0,
    keptCards: [],
    filter: "uncategorized",
    stats: initialStats,
    // Note: style is NOT reset - user preference persists
  }),
}));
