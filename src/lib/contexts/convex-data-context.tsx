'use client';

/**
 * Convex Data Context Provider
 *
 * Native Convex data provider that gives components direct access to Convex documents.
 * Uses native Convex conventions: _id for IDs, deleted for soft-delete flag.
 *
 * Features:
 * - Real-time subscriptions via Convex useQuery
 * - Native Convex types (Doc<'cards'>, etc.)
 * - No compatibility shims
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import {
  type Card,
  type Collection,
  type CalendarEvent,
  type CardUpdate,
} from '@/lib/types/convex';

// =============================================================================
// CONTEXT TYPES
// =============================================================================

interface DataContextValue {
  cards: Card[];
  collections: Collection[];
  calendarEvents: CalendarEvent[];
  isLoading: boolean;
  /** True when all cards have been loaded */
  isFullyLoaded: boolean;
  workspaceId: Id<'workspaces'> | undefined;
}

interface MutationsContextValue {
  // Card mutations
  createCard: (args: {
    workspaceId: Id<'workspaces'>;
    type: string;
    title?: string;
    description?: string;
    url?: string;
    content?: unknown;
    tags?: string[];
    pinned?: boolean;
    image?: string;
    images?: string[];
    favicon?: string;
    domain?: string;
    isDailyNote?: boolean;
    scheduledDates?: string[];
    isFileCard?: boolean;
    storageId?: Id<'_storage'>;
  }) => Promise<Id<'cards'>>;
  updateCard: (id: Id<'cards'>, updates: CardUpdate) => Promise<void>;
  deleteCard: (id: Id<'cards'>) => Promise<void>;
  restoreCard: (id: Id<'cards'>) => Promise<void>;
  permanentDeleteCard: (id: Id<'cards'>) => Promise<void>;
  emptyTrash: (workspaceId: Id<'workspaces'>) => Promise<void>;
  bulkDelete: (ids: Id<'cards'>[]) => Promise<void>;
  bulkUpdateTags: (ids: Id<'cards'>[], addTags: string[], removeTags: string[]) => Promise<void>;

  // Collection mutations
  createCollection: (args: {
    workspaceId: Id<'workspaces'>;
    name: string;
    slug: string;
    parentId?: Id<'collections'>;
    icon?: string;
    isPrivate?: boolean;
  }) => Promise<Id<'collections'>>;
  updateCollection: (id: Id<'collections'>, updates: Partial<{
    name: string;
    slug: string;
    icon: string;
    coverImage: string;
    coverImagePosition: number;
    coverImageHeight: number;
    coverContentOffset: number;
    isPrivate: boolean;
    hidePreview: boolean;
    useCoverAsBackground: boolean;
    pinned: boolean;
  }>) => Promise<void>;
  deleteCollection: (id: Id<'collections'>) => Promise<void>;
  addCardToCollection: (collectionId: Id<'collections'>, cardId: Id<'cards'>) => Promise<void>;
  removeCardFromCollection: (collectionId: Id<'collections'>, cardId: Id<'cards'>) => Promise<void>;

  // Calendar event mutations
  createEvent: (args: {
    workspaceId: Id<'workspaces'>;
    title: string;
    date: string;
    isAllDay?: boolean;
    startTime?: string;
    endTime?: string;
  }) => Promise<Id<'calendarEvents'>>;
  updateEvent: (id: Id<'calendarEvents'>, updates: Partial<{
    title: string;
    date: string;
    endDate: string;
    startTime: string;
    endTime: string;
    isAllDay: boolean;
    description: string;
    location: string;
    url: string;
    color: string;
  }>) => Promise<void>;
  deleteEvent: (id: Id<'calendarEvents'>) => Promise<void>;
}

export const DataContext = createContext<DataContextValue | null>(null);
export const MutationsContext = createContext<MutationsContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface ConvexDataProviderProps {
  children: ReactNode;
}

/**
 * Convex Data Provider
 *
 * Provides real-time data from Convex to all consumers.
 * Must be used inside a ConvexProvider and after workspace is loaded.
 */
export function ConvexDataProvider({ children }: ConvexDataProviderProps) {
  const workspace = useCurrentWorkspace();
  // Native Convex Workspace uses '_id'
  const workspaceId = workspace?._id;

  // ==========================================================================
  // QUERIES - Real-time subscriptions via Convex
  // ==========================================================================

  const cards = useQuery(
    api.cards.list,
    workspaceId ? { workspaceId } : 'skip'
  );

  const collections = useQuery(
    api.collections.list,
    workspaceId ? { workspaceId } : 'skip'
  );

  const calendarEvents = useQuery(
    api.events.list,
    workspaceId ? { workspaceId } : 'skip'
  );

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  const createCardMutation = useMutation(api.cards.create);
  const updateCardMutation = useMutation(api.cards.update);
  const deleteCardMutation = useMutation(api.cards.remove);
  const restoreCardMutation = useMutation(api.cards.restore);
  const permanentDeleteCardMutation = useMutation(api.cards.permanentDelete);
  const emptyTrashMutation = useMutation(api.cards.emptyTrash);
  const bulkDeleteMutation = useMutation(api.cards.bulkDelete);
  const bulkUpdateTagsMutation = useMutation(api.cards.bulkUpdateTags);

  const createCollectionMutation = useMutation(api.collections.create);
  const updateCollectionMutation = useMutation(api.collections.update);
  const deleteCollectionMutation = useMutation(api.collections.remove);
  const addCardToCollectionMutation = useMutation(api.collections.addCard);
  const removeCardFromCollectionMutation = useMutation(api.collections.removeCard);

  const createEventMutation = useMutation(api.events.create);
  const updateEventMutation = useMutation(api.events.update);
  const deleteEventMutation = useMutation(api.events.remove);

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  const isLoading = !workspaceId || cards === undefined || collections === undefined;
  const isFullyLoaded = cards !== undefined;

  // ==========================================================================
  // MUTATION WRAPPERS
  // ==========================================================================

  const mutations = useMemo<MutationsContextValue>(() => ({
    // Card mutations
    createCard: async (args) => {
      return createCardMutation(args);
    },
    updateCard: async (id, updates) => {
      await updateCardMutation({ id, ...updates });
    },
    deleteCard: async (id) => {
      await deleteCardMutation({ id });
    },
    restoreCard: async (id) => {
      await restoreCardMutation({ id });
    },
    permanentDeleteCard: async (id) => {
      await permanentDeleteCardMutation({ id });
    },
    emptyTrash: async (wsId) => {
      await emptyTrashMutation({ workspaceId: wsId });
    },
    bulkDelete: async (ids) => {
      await bulkDeleteMutation({ cardIds: ids });
    },
    bulkUpdateTags: async (ids, addTags, removeTags) => {
      await bulkUpdateTagsMutation({ cardIds: ids, addTags, removeTags });
    },

    // Collection mutations
    createCollection: async (args) => {
      return createCollectionMutation(args);
    },
    updateCollection: async (id, updates) => {
      await updateCollectionMutation({ id, ...updates });
    },
    deleteCollection: async (id) => {
      await deleteCollectionMutation({ id });
    },
    addCardToCollection: async (collectionId, cardId) => {
      await addCardToCollectionMutation({ collectionId, cardId });
    },
    removeCardFromCollection: async (collectionId, cardId) => {
      await removeCardFromCollectionMutation({ collectionId, cardId });
    },

    // Calendar event mutations
    createEvent: async (args) => {
      return createEventMutation({
        ...args,
        isAllDay: args.isAllDay ?? true,
      });
    },
    updateEvent: async (id, updates) => {
      await updateEventMutation({ id, ...updates });
    },
    deleteEvent: async (id) => {
      await deleteEventMutation({ id });
    },
  }), [
    createCardMutation,
    updateCardMutation,
    deleteCardMutation,
    restoreCardMutation,
    permanentDeleteCardMutation,
    emptyTrashMutation,
    bulkDeleteMutation,
    bulkUpdateTagsMutation,
    createCollectionMutation,
    updateCollectionMutation,
    deleteCollectionMutation,
    addCardToCollectionMutation,
    removeCardFromCollectionMutation,
    createEventMutation,
    updateEventMutation,
    deleteEventMutation,
  ]);

  // ==========================================================================
  // CONTEXT VALUE
  // ==========================================================================

  const dataValue = useMemo<DataContextValue>(
    () => ({
      cards: cards ?? [],
      collections: collections ?? [],
      calendarEvents: calendarEvents ?? [],
      isLoading,
      isFullyLoaded,
      workspaceId,
    }),
    [cards, collections, calendarEvents, isLoading, isFullyLoaded, workspaceId]
  );

  return (
    <DataContext.Provider value={dataValue}>
      <MutationsContext.Provider value={mutations}>
        {children}
      </MutationsContext.Provider>
    </DataContext.Provider>
  );
}

// =============================================================================
// CONTEXT HOOKS
// =============================================================================

/**
 * Get the full data context (for components that need multiple data types)
 */
export function useDataContext(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a ConvexDataProvider');
  }
  return context;
}

/**
 * Get the mutations context
 */
export function useMutations(): MutationsContextValue {
  const context = useContext(MutationsContext);
  if (!context) {
    throw new Error('useMutations must be used within a ConvexDataProvider');
  }
  return context;
}

/**
 * Check if we're inside a ConvexDataProvider
 */
export function useIsInDataProvider(): boolean {
  return useContext(DataContext) !== null;
}

// =============================================================================
// CONVENIENCE HOOKS (read from context)
// =============================================================================

/**
 * Get all cards for the current workspace (from context)
 */
export function useCards(): Card[] {
  const context = useContext(DataContext);
  return context?.cards ?? [];
}

/**
 * Get all collections for the current workspace (from context)
 */
export function useCollections(): Collection[] {
  const context = useContext(DataContext);
  return context?.collections ?? [];
}

/**
 * Get all calendar events for the current workspace (from context)
 */
export function useCalendarEvents(): CalendarEvent[] {
  const context = useContext(DataContext);
  return context?.calendarEvents ?? [];
}

/**
 * Get a single card by ID
 */
export function useCardById(id: Id<'cards'> | undefined): Card | undefined {
  const cards = useCards();
  return useMemo(() => {
    if (!id) return undefined;
    return cards.find((c) => c._id === id);
  }, [cards, id]);
}

/**
 * Get a single collection by ID
 */
export function useCollectionById(id: Id<'collections'> | undefined): Collection | undefined {
  const collections = useCollections();
  return useMemo(() => {
    if (!id) return undefined;
    return collections.find((c) => c._id === id);
  }, [collections, id]);
}

/**
 * Get a collection by slug
 */
export function useCollectionBySlug(slug: string | undefined): Collection | undefined {
  const collections = useCollections();
  return useMemo(() => {
    if (!slug) return undefined;
    return collections.find((c) => c.slug === slug);
  }, [collections, slug]);
}

// =============================================================================
// COLLECTION CARDS HOOK
// =============================================================================

/**
 * Get cards in a collection using Convex query
 */
export function useCardsInCollection(collectionId: Id<'collections'> | undefined): Card[] {
  const result = useQuery(
    api.collections.getCards,
    collectionId ? { collectionId } : 'skip'
  );
  return result ?? [];
}

// =============================================================================
// REFERENCES HOOKS
// =============================================================================

/** Reference type from Convex */
export interface Reference {
  _id: Id<'references'>;
  workspaceId: Id<'workspaces'>;
  sourceId: string;
  targetId: string;
  targetType: string;
  linkText: string;
  deleted: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Get outgoing references from a card (@ mentions)
 */
export function useReferences(sourceId: string | undefined): Reference[] {
  const workspace = useCurrentWorkspace();
  const workspaceId = workspace?._id;

  const result = useQuery(
    api.references.getBySource,
    workspaceId && sourceId ? { workspaceId, sourceId } : 'skip'
  );

  return (result ?? []) as Reference[];
}

/**
 * Get incoming references to a target (backlinks)
 */
export function useBacklinks(targetId: string | undefined, targetType: 'card' | 'date'): Reference[] {
  const result = useQuery(
    api.references.getByTarget,
    targetId ? { targetId, targetType } : 'skip'
  );

  return (result ?? []) as Reference[];
}

// =============================================================================
// RE-EXPORTS FOR COMPATIBILITY
// =============================================================================

// Re-export types for components that import from here
export type { Card, Collection, CalendarEvent, CardUpdate, Id } from '@/lib/types/convex';
