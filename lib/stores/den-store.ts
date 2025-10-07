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
  updateDenCard: (id: string, updates: Partial<CardDTO>) => Promise<void>;
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
      },

      updateDenCard: async (id: string, updates: Partial<CardDTO>) => {
        // Optimistic update
        set((state) => ({
          denCards: state.denCards.map((card) =>
            card.id === id ? { ...card, ...updates } : card
          )
        }));

        try {
          const response = await fetch(`/api/cards/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });

          if (!response.ok) {
            // Rollback on error - refresh from server
            await get().refreshDenCards();
            throw new Error('Failed to update Den card');
          }

          // Update with server response
          const updatedCard = await response.json();
          // Ensure collections is always an array
          const safeCard = {
            ...updatedCard,
            collections: Array.isArray(updatedCard.collections) ? updatedCard.collections : []
          };
          set((state) => ({
            denCards: state.denCards.map((card) =>
              card.id === id ? safeCard : card
            )
          }));
        } catch (error) {
          console.error('Failed to update Den card:', error);
          throw error;
        }
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
