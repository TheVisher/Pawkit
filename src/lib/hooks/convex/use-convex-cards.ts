"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { type Card, type CardUpdate } from "@/lib/types/convex";

/**
 * Hook for card operations with Convex
 * Returns native Convex documents
 */
export function useConvexCards(workspaceId: Id<"workspaces"> | undefined) {
  // Queries
  const cards = useQuery(
    api.cards.list,
    workspaceId ? { workspaceId } : "skip"
  );

  const pinnedCards = useQuery(
    api.cards.listPinned,
    workspaceId ? { workspaceId } : "skip"
  );

  const deletedCards = useQuery(
    api.cards.listDeleted,
    workspaceId ? { workspaceId } : "skip"
  );

  // Mutations
  const createCardMutation = useMutation(api.cards.create);
  const updateCardMutation = useMutation(api.cards.update);
  const deleteCardMutation = useMutation(api.cards.remove);
  const restoreCardMutation = useMutation(api.cards.restore);
  const permanentDeleteCardMutation = useMutation(api.cards.permanentDelete);
  const emptyTrashMutation = useMutation(api.cards.emptyTrash);
  const bulkUpdateTagsMutation = useMutation(api.cards.bulkUpdateTags);
  const bulkDeleteMutation = useMutation(api.cards.bulkDelete);

  // Wrapper functions
  const updateCard = async (id: Id<"cards">, updates: CardUpdate) => {
    return updateCardMutation({ id, ...updates });
  };

  const deleteCard = async (id: Id<"cards">) => {
    return deleteCardMutation({ id });
  };

  const restoreCard = async (id: Id<"cards">) => {
    return restoreCardMutation({ id });
  };

  const permanentDeleteCard = async (id: Id<"cards">) => {
    return permanentDeleteCardMutation({ id });
  };

  return {
    // Data (raw Convex docs)
    cards: cards ?? [],
    pinnedCards: pinnedCards ?? [],
    deletedCards: deletedCards ?? [],
    isLoading: cards === undefined,

    // Mutations
    createCard: createCardMutation,
    updateCard,
    deleteCard,
    restoreCard,
    permanentDeleteCard,
    emptyTrash: emptyTrashMutation,
    bulkUpdateTags: bulkUpdateTagsMutation,
    bulkDelete: bulkDeleteMutation,
  };
}

/**
 * Hook for a specific card by ID
 */
export function useConvexCardById(id: Id<"cards"> | undefined) {
  const card = useQuery(
    api.cards.get,
    id ? { id } : "skip"
  );

  const updateCardMutation = useMutation(api.cards.update);
  const deleteCardMutation = useMutation(api.cards.remove);

  const updateCard = async (updates: CardUpdate) => {
    if (!id) throw new Error("No card ID");
    return updateCardMutation({ id, ...updates });
  };

  const deleteCard = async () => {
    if (!id) throw new Error("No card ID");
    return deleteCardMutation({ id });
  };

  return {
    card: card ?? null,
    isLoading: card === undefined,
    updateCard,
    deleteCard,
  };
}

/**
 * Hook for searching cards
 */
export function useConvexCardSearch(
  workspaceId: Id<"workspaces"> | undefined,
  query: string
) {
  const results = useQuery(
    api.cards.search,
    workspaceId && query.length > 0
      ? { workspaceId, query, limit: 20 }
      : "skip"
  );

  return {
    results: results ?? [],
    isLoading: results === undefined,
  };
}

/**
 * Hook for cards by type
 */
export function useConvexCardsByType(
  workspaceId: Id<"workspaces"> | undefined,
  type: string
) {
  const cards = useQuery(
    api.cards.listByType,
    workspaceId ? { workspaceId, type } : "skip"
  );

  return {
    cards: cards ?? [],
    isLoading: cards === undefined,
  };
}

/**
 * Hook for cards scheduled on a date
 */
export function useConvexCardsByDate(
  workspaceId: Id<"workspaces"> | undefined,
  date: string
) {
  const cards = useQuery(
    api.cards.listByScheduledDate,
    workspaceId && date ? { workspaceId, date } : "skip"
  );

  return {
    cards: cards ?? [],
    isLoading: cards === undefined,
  };
}

/**
 * Hook for daily note
 */
export function useConvexDailyNote(
  workspaceId: Id<"workspaces"> | undefined,
  date: string
) {
  const dailyNote = useQuery(
    api.cards.getDailyNote,
    workspaceId && date ? { workspaceId, date } : "skip"
  );

  const createCardMutation = useMutation(api.cards.create);

  return {
    dailyNote: dailyNote ?? null,
    isLoading: dailyNote === undefined,
    createDailyNote: async (title: string) => {
      if (!workspaceId) throw new Error("No workspace");
      return createCardMutation({
        workspaceId,
        type: "md-note",
        title,
        isDailyNote: true,
        tags: [],
      });
    },
  };
}
