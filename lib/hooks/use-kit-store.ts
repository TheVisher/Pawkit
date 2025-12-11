// lib/hooks/use-kit-store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface KitState {
  // Window state
  isOpen: boolean;
  isMinimized: boolean;
  isAnchored: boolean;
  position: Position;
  size: Size;

  // Track if sidebar was open before Kit anchored (for restoration)
  sidebarWasOpenBeforeAnchor: boolean;

  // Track if Kit is embedded in sidebar (when card is open)
  isEmbeddedInSidebar: boolean;

  // Chat state
  messages: Message[];
  isLoading: boolean;
  error: string | null;

  // Current context (card being discussed)
  activeCardContext: {
    id: string;
    title: string;
    content?: string;
  } | null;

  // Window actions
  open: () => void;
  close: () => void;
  toggleOpen: () => void;
  toggleMinimized: () => void;
  toggleAnchored: () => void;
  setPosition: (position: Position) => void;
  setSize: (size: Size) => void;
  setSidebarWasOpen: (wasOpen: boolean) => void;
  setEmbeddedInSidebar: (embedded: boolean) => void;

  // Chat actions
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveCardContext: (card: KitState['activeCardContext']) => void;
  sendMessage: (message: string, context?: string, pawkitSlug?: string) => Promise<void>;
}

const DEFAULT_POSITION = { x: 0, y: 0 }; // Will be calculated on mount
const DEFAULT_SIZE = { width: 400, height: 500 };

export const useKitStore = create<KitState>()(
  persist(
    (set, get) => ({
      // Window defaults
      isOpen: false,
      isMinimized: false,
      isAnchored: false,
      position: DEFAULT_POSITION,
      size: DEFAULT_SIZE,
      sidebarWasOpenBeforeAnchor: false,
      isEmbeddedInSidebar: false,

      // Chat defaults
      messages: [],
      isLoading: false,
      error: null,
      activeCardContext: null,

      // Window actions
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggleOpen: () => set(state => ({ isOpen: !state.isOpen })),
      toggleMinimized: () => set(state => ({ isMinimized: !state.isMinimized })),
      toggleAnchored: () => set(state => ({
        isAnchored: !state.isAnchored,
        isMinimized: false // Expand when anchoring
      })),
      setPosition: (position) => set({ position }),
      setSize: (size) => set({ size }),
      setSidebarWasOpen: (wasOpen) => set({ sidebarWasOpenBeforeAnchor: wasOpen }),
      setEmbeddedInSidebar: (embedded) => set({ isEmbeddedInSidebar: embedded }),

      // Chat actions
      addMessage: (role, content) => {
        const message: Message = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          role,
          content,
          timestamp: new Date(),
        };
        set(state => ({
          messages: [...state.messages, message],
          error: null,
        }));
      },

      clearMessages: () => set({ messages: [], error: null }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setActiveCardContext: (card) => set({ activeCardContext: card }),

      sendMessage: async (message: string, context?: string, pawkitSlug?: string) => {
        const { messages, activeCardContext, addMessage, setLoading, setError } = get();

        addMessage('user', message);
        setLoading(true);
        setError(null);

        try {
          const response = await fetch('/api/kit/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message,
              conversationHistory: messages.slice(-10).map(m => ({
                role: m.role,
                content: m.content,
              })),
              cardContext: activeCardContext,
              viewContext: context,
              pawkitSlug: pawkitSlug,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to send message');
          }

          addMessage('assistant', data.message);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Something went wrong';
          setError(errorMessage);
          set(state => ({
            messages: state.messages.slice(0, -1),
          }));
        } finally {
          setLoading(false);
        }
      },
    }),
    {
      name: 'kit-store',
      partialize: (state) => ({
        // Persist window state and recent messages
        isAnchored: state.isAnchored,
        position: state.position,
        size: state.size,
        messages: state.messages.slice(-20),
      }),
    }
  )
);
