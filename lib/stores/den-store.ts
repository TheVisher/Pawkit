import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CardDTO } from '@/lib/server/cards';

type DenStore = {
  // State
  isUnlocked: boolean;
  unlockExpiry: number | null;
  denCards: CardDTO[];

  // Actions
  unlock: () => void;
  lock: () => void;
  checkExpiry: () => void;
  loadDenCards: () => Promise<void>;
  refreshDenCards: () => Promise<void>;
};

const UNLOCK_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

export const useDenStore = create<DenStore>()(
  persist(
    (set, get) => ({
      isUnlocked: false,
      unlockExpiry: null,
      denCards: [],

      unlock: () => {
        const expiry = Date.now() + UNLOCK_DURATION;
        set({ isUnlocked: true, unlockExpiry: expiry });
      },

      lock: () => {
        set({ isUnlocked: false, unlockExpiry: null });
      },

      checkExpiry: () => {
        const { unlockExpiry, isUnlocked } = get();
        if (isUnlocked && unlockExpiry && Date.now() > unlockExpiry) {
          get().lock();
        }
      },

      loadDenCards: async () => {
        try {
          const response = await fetch('/api/den/cards');
          if (response.ok) {
            const data = await response.json();
            // Ensure all cards have collections as an array
            const cards = (data.items || []).map((card: any) => ({
              ...card,
              collections: Array.isArray(card.collections) ? card.collections : []
            }));
            set({ denCards: cards });
          }
        } catch (error) {
          console.error('Failed to load Den cards:', error);
        }
      },

      refreshDenCards: async () => {
        await get().loadDenCards();
      }
    }),
    {
      name: 'pawkit-den-store',
      // Only persist unlock state, not the cards themselves
      partialize: (state) => ({
        isUnlocked: state.isUnlocked,
        unlockExpiry: state.unlockExpiry
      })
    }
  )
);
