// lib/hooks/use-kit-store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface KitState {
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

  // Actions
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveCardContext: (card: KitState['activeCardContext']) => void;

  // API call
  sendMessage: (message: string) => Promise<void>;
}

export const useKitStore = create<KitState>()(
  persist(
    (set, get) => ({
      messages: [],
      isLoading: false,
      error: null,
      activeCardContext: null,

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

      sendMessage: async (message: string) => {
        const { messages, activeCardContext, addMessage, setLoading, setError } = get();

        // Add user message immediately
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
          // Remove the user message if request failed
          set(state => ({
            messages: state.messages.slice(0, -1),
          }));
        } finally {
          setLoading(false);
        }
      },
    }),
    {
      name: 'kit-chat-storage',
      partialize: (state) => ({
        // Only persist messages (not loading/error state)
        messages: state.messages.slice(-20), // Keep last 20 messages
      }),
    }
  )
);
