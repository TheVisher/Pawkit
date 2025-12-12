// lib/hooks/use-kit-store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SavedConversation {
  id: string;
  title: string;
  messages: Message[];
  cardId?: string;
  createdAt: string;
  updatedAt: string;
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

  // Conversation management
  savedConversations: SavedConversation[];
  activeConversationId: string | null;
  isConversationSelectorOpen: boolean;

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

  // Conversation actions
  saveConversation: () => void;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  newConversation: () => void;
  toggleConversationSelector: () => void;
  setConversationSelectorOpen: (open: boolean) => void;
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

      // Conversation defaults
      savedConversations: [],
      activeConversationId: null,
      isConversationSelectorOpen: false,

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

      // Conversation actions
      saveConversation: () => {
        const { messages, activeConversationId, activeCardContext, savedConversations } = get();

        // Don't save empty conversations
        if (messages.length === 0) return;

        const now = new Date().toISOString();

        // Generate title from first user message or card title
        const firstUserMessage = messages.find(m => m.role === 'user');
        let title = 'Untitled Chat';
        if (activeCardContext?.title) {
          title = `Chat about: ${activeCardContext.title}`.slice(0, 50);
        } else if (firstUserMessage) {
          title = firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
        }

        if (activeConversationId) {
          // Update existing conversation
          set(state => ({
            savedConversations: state.savedConversations.map(conv =>
              conv.id === activeConversationId
                ? { ...conv, messages: [...messages], updatedAt: now, title }
                : conv
            ),
          }));
        } else {
          // Create new conversation
          const newId = `conv-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const newConversation: SavedConversation = {
            id: newId,
            title,
            messages: [...messages],
            cardId: activeCardContext?.id,
            createdAt: now,
            updatedAt: now,
          };
          set({
            savedConversations: [newConversation, ...savedConversations],
            activeConversationId: newId,
          });
        }
      },

      loadConversation: (id: string) => {
        const { messages, saveConversation, savedConversations } = get();

        // Auto-save current conversation if it has messages
        if (messages.length > 0) {
          saveConversation();
        }

        const conversation = savedConversations.find(c => c.id === id);
        if (conversation) {
          set({
            messages: [...conversation.messages],
            activeConversationId: id,
            isConversationSelectorOpen: false,
          });
        }
      },

      deleteConversation: (id: string) => {
        set(state => ({
          savedConversations: state.savedConversations.filter(c => c.id !== id),
          // Clear active if deleting current conversation
          activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
        }));
      },

      newConversation: () => {
        const { messages, saveConversation } = get();

        // Auto-save current conversation if it has messages
        if (messages.length > 0) {
          saveConversation();
        }

        set({
          messages: [],
          activeConversationId: null,
          activeCardContext: null,
          isConversationSelectorOpen: false,
        });
      },

      toggleConversationSelector: () => set(state => ({
        isConversationSelectorOpen: !state.isConversationSelectorOpen
      })),

      setConversationSelectorOpen: (open: boolean) => set({ isConversationSelectorOpen: open }),
    }),
    {
      name: 'kit-store',
      partialize: (state) => ({
        // Persist window state, recent messages, and conversations
        isAnchored: state.isAnchored,
        position: state.position,
        size: state.size,
        messages: state.messages.slice(-20),
        savedConversations: state.savedConversations.slice(0, 50), // Keep last 50 conversations
        activeConversationId: state.activeConversationId,
      }),
    }
  )
);
