"use client";

import { create } from "zustand";
import { CardModel } from "@/lib/types";

export type SessionStats = {
  kept: number;
  deleted: number;
};

export const BATCH_SIZE = 25;

type RediscoverState = {
  isActive: boolean;
  allSortedCards: CardModel[];  // Full sorted list of all cards
  queue: CardModel[];           // Current batch (up to 25)
  currentIndex: number;         // Index within current batch
  batchNumber: number;          // Which batch we're on (1, 2, 3...)
  keptCards: CardModel[];       // Cards kept this session
  stats: SessionStats;

  // Computed
  hasMoreBatches: () => boolean;
  totalBatches: () => number;

  // Actions
  setActive: (active: boolean) => void;
  initializeQueue: (sortedCards: CardModel[]) => void;
  loadNextBatch: () => void;
  setCurrentIndex: (index: number) => void;
  addKeptCard: (card: CardModel) => void;
  removeKeptCard: (cardId: string) => void;
  updateStats: (stat: keyof SessionStats) => void;
  reset: () => void;
};

const initialStats: SessionStats = {
  kept: 0,
  deleted: 0,
};

export const useRediscoverStore = create<RediscoverState>()((set, get) => ({
  isActive: false,
  allSortedCards: [],
  queue: [],
  currentIndex: 0,
  batchNumber: 1,
  keptCards: [],
  stats: initialStats,

  // Computed helpers
  hasMoreBatches: () => {
    const state = get();
    const nextBatchStart = state.batchNumber * BATCH_SIZE;
    return nextBatchStart < state.allSortedCards.length;
  },

  totalBatches: () => {
    const state = get();
    return Math.ceil(state.allSortedCards.length / BATCH_SIZE);
  },

  setActive: (active) => set({ isActive: active }),

  // Initialize with full sorted list, load first batch
  initializeQueue: (sortedCards) => {
    const firstBatch = sortedCards.slice(0, BATCH_SIZE);
    set({
      allSortedCards: sortedCards,
      queue: firstBatch,
      currentIndex: 0,
      batchNumber: 1,
      keptCards: [],
      stats: initialStats,
    });
  },

  // Load next batch of 25
  loadNextBatch: () => {
    const state = get();
    const nextBatchNumber = state.batchNumber + 1;
    const startIndex = (nextBatchNumber - 1) * BATCH_SIZE;
    const nextBatch = state.allSortedCards.slice(startIndex, startIndex + BATCH_SIZE);

    set({
      queue: nextBatch,
      currentIndex: 0,
      batchNumber: nextBatchNumber,
      // Keep keptCards and stats across batches
    });
  },

  setCurrentIndex: (index) => set({ currentIndex: index }),

  addKeptCard: (card) => set((state) => {
    const cardExists = state.keptCards.some(keptCard => keptCard.id === card.id);
    if (cardExists) {
      return state;
    }
    return {
      keptCards: [...state.keptCards, card]
    };
  }),

  removeKeptCard: (cardId) => set((state) => ({
    keptCards: state.keptCards.filter(card => card.id !== cardId)
  })),

  updateStats: (stat) => set((state) => ({
    stats: {
      ...state.stats,
      [stat]: state.stats[stat] + 1,
    },
  })),

  reset: () => set({
    isActive: false,
    allSortedCards: [],
    queue: [],
    currentIndex: 0,
    batchNumber: 1,
    keptCards: [],
    stats: initialStats,
  }),
}));
