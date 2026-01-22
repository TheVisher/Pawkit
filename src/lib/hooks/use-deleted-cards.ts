'use client';

/**
 * Hook to fetch deleted (trashed) cards.
 * Returns cards with deleted=true from Convex.
 */

import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { useConvexAuthState } from '@/components/providers/convex-provider';
import { useDataContext } from '@/lib/contexts/convex-data-context';
import { type Card } from '@/lib/types/convex';

interface UseDeletedCardsResult {
  deletedCards: Card[];
  isLoading: boolean;
}

/**
 * Hook to fetch deleted cards from Convex.
 */
export function useDeletedCards(): UseDeletedCardsResult {
  const { isEnabled, isReady } = useConvexAuthState();
  const { workspaceId } = useDataContext();

  // Query deleted cards from Convex
  const deletedCards = useQuery(
    api.cards.listDeleted,
    isEnabled && isReady && workspaceId
      ? { workspaceId: workspaceId as Id<"workspaces"> }
      : "skip"
  );

  const isLoading = isEnabled && isReady && deletedCards === undefined;

  return {
    deletedCards: deletedCards ?? [],
    isLoading,
  };
}
