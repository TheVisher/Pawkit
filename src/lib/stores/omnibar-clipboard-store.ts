import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const STORAGE_KEY = 'pawkit_omnibar_clipboard';
const MAX_ITEMS = 10;

export interface OmnibarClipboardItem {
  id: string;
  text: string;
  createdAt: number;
}

interface OmnibarClipboardState {
  items: OmnibarClipboardItem[];
  isOpen: boolean;
  addDraft: (text: string) => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  clear: () => void;
}

export const useOmnibarClipboardStore = create<OmnibarClipboardState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      addDraft: (text) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        set((state) => {
          const filtered = state.items.filter((item) => item.text !== trimmed);
          const next = [
            { id: crypto.randomUUID(), text: trimmed, createdAt: Date.now() },
            ...filtered,
          ].slice(0, MAX_ITEMS);
          return { items: next };
        });
      },
      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      setOpen: (open) => set({ isOpen: open }),
      clear: () => set({ items: [] }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        items: state.items,
        isOpen: state.isOpen,
      }),
    }
  )
);
