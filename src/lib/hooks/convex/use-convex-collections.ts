"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { type CollectionUpdate } from "@/lib/types/convex";

/**
 * Hook for collection operations with Convex
 * Returns native Convex documents
 * @param includePrivate - If true, includes private collections (for owner views like sidebar)
 */
export function useConvexCollections(
  workspaceId: Id<"workspaces"> | undefined,
  includePrivate: boolean = true  // Default true for backward compatibility - owner can see their private collections
) {
  // Queries
  const collections = useQuery(
    api.collections.list,
    workspaceId ? { workspaceId, includePrivate } : "skip"
  );

  const rootCollections = useQuery(
    api.collections.listRoot,
    workspaceId ? { workspaceId, includePrivate } : "skip"
  );

  // Mutations
  const createCollectionMutation = useMutation(api.collections.create);
  const updateCollectionMutation = useMutation(api.collections.update);
  const deleteCollectionMutation = useMutation(api.collections.remove);
  const restoreCollectionMutation = useMutation(api.collections.restore);
  const permanentDeleteCollectionMutation = useMutation(api.collections.permanentDelete);
  const addCardToCollectionMutation = useMutation(api.collections.addCard);
  const removeCardFromCollectionMutation = useMutation(api.collections.removeCard);
  const reorderCardsMutation = useMutation(api.collections.reorderCards);
  const moveCollectionMutation = useMutation(api.collections.move);
  const reorderCollectionsMutation = useMutation(api.collections.reorder);

  // Wrapper functions
  const updateCollection = async (id: Id<"collections">, updates: CollectionUpdate) => {
    return updateCollectionMutation({ id, ...updates });
  };

  const deleteCollection = async (id: Id<"collections">) => {
    return deleteCollectionMutation({ id });
  };

  const restoreCollection = async (id: Id<"collections">) => {
    return restoreCollectionMutation({ id });
  };

  const permanentDeleteCollection = async (id: Id<"collections">) => {
    return permanentDeleteCollectionMutation({ id });
  };

  const addCardToCollection = async (collectionId: Id<"collections">, cardId: Id<"cards">) => {
    return addCardToCollectionMutation({ collectionId, cardId });
  };

  const removeCardFromCollection = async (collectionId: Id<"collections">, cardId: Id<"cards">) => {
    return removeCardFromCollectionMutation({ collectionId, cardId });
  };

  const moveCollection = async (id: Id<"collections">, parentId: Id<"collections"> | null) => {
    return moveCollectionMutation({
      id,
      newParentId: parentId ?? undefined,
    });
  };

  return {
    // Data (raw Convex docs)
    collections: collections ?? [],
    rootCollections: rootCollections ?? [],
    isLoading: collections === undefined,

    // Mutations
    createCollection: createCollectionMutation,
    updateCollection,
    deleteCollection,
    restoreCollection,
    permanentDeleteCollection,
    addCardToCollection,
    removeCardFromCollection,
    reorderCards: reorderCardsMutation,
    moveCollection,
    reorderCollections: reorderCollectionsMutation,
  };
}

/**
 * Hook for a specific collection by ID
 */
export function useConvexCollectionById(id: Id<"collections"> | undefined) {
  const collection = useQuery(
    api.collections.get,
    id ? { id } : "skip"
  );

  const updateCollectionMutation = useMutation(api.collections.update);
  const deleteCollectionMutation = useMutation(api.collections.remove);

  const updateCollection = async (updates: CollectionUpdate) => {
    if (!id) throw new Error("No collection ID");
    return updateCollectionMutation({ id, ...updates });
  };

  const deleteCollection = async () => {
    if (!id) throw new Error("No collection ID");
    return deleteCollectionMutation({ id });
  };

  return {
    collection: collection ?? null,
    isLoading: collection === undefined,
    updateCollection,
    deleteCollection,
  };
}

/**
 * Hook for collection by slug
 */
export function useConvexCollectionBySlug(
  workspaceId: Id<"workspaces"> | undefined,
  slug: string
) {
  const collection = useQuery(
    api.collections.getBySlug,
    workspaceId && slug ? { workspaceId, slug } : "skip"
  );

  return {
    collection: collection ?? null,
    isLoading: collection === undefined,
  };
}

/**
 * Hook for child collections
 * @param includePrivate - If true, includes private collections (for owner views like sidebar)
 */
export function useConvexChildCollections(
  workspaceId: Id<"workspaces"> | undefined,
  parentId: Id<"collections"> | undefined,
  includePrivate: boolean = true  // Default true for backward compatibility
) {
  const children = useQuery(
    api.collections.listChildren,
    workspaceId && parentId ? { workspaceId, parentId, includePrivate } : "skip"
  );

  return {
    children: children ?? [],
    isLoading: children === undefined,
  };
}

/**
 * Hook to get cards in a collection
 */
export function useConvexCollectionCards(collectionId: Id<"collections"> | undefined) {
  const cards = useQuery(
    api.collections.getCards,
    collectionId ? { collectionId } : "skip"
  );

  return {
    cards: cards ?? [],
    isLoading: cards === undefined,
  };
}
