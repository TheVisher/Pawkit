/**
 * Native Convex Hooks
 *
 * These hooks provide direct access to Convex queries and mutations
 * without the compatibility layer. They return data with `id` aliases
 * for seamless migration from LocalCard/LocalCollection types.
 *
 * Usage:
 *   import { useConvexCards, type Card } from '@/lib/hooks/convex';
 */

export {
  useConvexWorkspace,
  useConvexWorkspaceById,
} from "./use-convex-workspace";

export {
  useConvexCards,
  useConvexCardById,
  useConvexCardSearch,
  useConvexCardsByType,
  useConvexCardsByDate,
  useConvexDailyNote,
} from "./use-convex-cards";

export {
  useConvexCollections,
  useConvexCollectionById,
  useConvexCollectionBySlug,
  useConvexChildCollections,
  useConvexCollectionCards,
} from "./use-convex-collections";

// Re-export types for convenience
export type {
  Card,
  CardInput,
  CardUpdate,
  Collection,
  CollectionInput,
  CollectionUpdate,
  CalendarEvent,
  Workspace,
  Todo,
  Id,
} from "@/lib/types/convex";
