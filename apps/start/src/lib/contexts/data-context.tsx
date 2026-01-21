'use client';

/**
 * Data Context Provider
 *
 * This module re-exports the Convex Data Context for backwards compatibility.
 * Components that import from '@/lib/contexts/data-context' will now get
 * the native Convex implementation.
 *
 * Migration note:
 * - Old code: import { useDataContext } from '@/lib/contexts/data-context'
 * - Still works and now uses Convex directly
 */

// Re-export everything from convex-data-context
export {
  ConvexDataProvider as DataProvider,
  DataContext,
  MutationsContext,
  useDataContext,
  useMutations,
  useIsInDataProvider,
  useCards,
  useCollections,
  useCalendarEvents,
  useCardById,
  useCollectionById,
  useCollectionBySlug,
} from './convex-data-context';

// Re-export types
export type {
  Card,
  Collection,
  CalendarEvent,
  CardUpdate,
  Id,
} from './convex-data-context';

// Legacy aliases for components using old names
export { useCards as useCardsFromContext } from './convex-data-context';
export { useCollections as useCollectionsFromContext } from './convex-data-context';
export { useCalendarEvents as useCalendarEventsFromContext } from './convex-data-context';
