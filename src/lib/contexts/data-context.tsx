'use client';

/**
 * Data Context Provider
 *
 * Provides cached data to all consumers via React Context, eliminating
 * duplicate Dexie queries across components. Each data type (cards,
 * collections, calendarEvents) is queried ONCE via useLiveQuery,
 * then shared with all consumers.
 *
 * Performance benefit: Reduces 7+ duplicate queries per page to 1 each.
 *
 * @see Phase 2 of performance optimization plan
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { LocalCard, LocalCollection, LocalCalendarEvent } from '@/lib/db/types';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';

// =============================================================================
// CONTEXT TYPES
// =============================================================================

interface DataContextValue {
  cards: LocalCard[];
  collections: LocalCollection[];
  calendarEvents: LocalCalendarEvent[];
  isLoading: boolean;
  workspaceId: string | undefined;
}

const DataContext = createContext<DataContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const workspaceId = currentWorkspace?.id;

  // Single query for all cards - shared by all consumers
  const cards = useLiveQuery(
    async () => {
      if (!workspaceId) return [];
      return db.cards
        .where('workspaceId')
        .equals(workspaceId)
        .filter((c) => !c._deleted)
        .toArray();
    },
    [workspaceId],
    [] as LocalCard[]
  );

  // Single query for all collections - shared by all consumers
  const collections = useLiveQuery(
    async () => {
      if (!workspaceId) return [];
      return db.collections
        .where('workspaceId')
        .equals(workspaceId)
        .filter((c) => !c._deleted)
        .toArray();
    },
    [workspaceId],
    [] as LocalCollection[]
  );

  // Single query for all calendar events - shared by all consumers
  const calendarEvents = useLiveQuery(
    async () => {
      if (!workspaceId) return [];
      return db.calendarEvents
        .where('workspaceId')
        .equals(workspaceId)
        .filter((e) => !e._deleted)
        .toArray();
    },
    [workspaceId],
    [] as LocalCalendarEvent[]
  );

  // Determine loading state (useLiveQuery returns undefined while loading)
  const isLoading = cards === undefined || collections === undefined || calendarEvents === undefined;

  const value = useMemo(
    () => ({
      cards: cards ?? [],
      collections: collections ?? [],
      calendarEvents: calendarEvents ?? [],
      isLoading,
      workspaceId,
    }),
    [cards, collections, calendarEvents, isLoading, workspaceId]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
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
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
}

/**
 * Check if we're inside a DataProvider
 */
export function useIsInDataProvider(): boolean {
  return useContext(DataContext) !== null;
}

// =============================================================================
// CONVENIENCE HOOKS (read from context)
// =============================================================================

/**
 * Get all cards for the current workspace (from context)
 * Falls back to empty array if context not available
 */
export function useCardsFromContext(): LocalCard[] {
  const context = useContext(DataContext);
  return context?.cards ?? [];
}

/**
 * Get all collections for the current workspace (from context)
 */
export function useCollectionsFromContext(): LocalCollection[] {
  const context = useContext(DataContext);
  return context?.collections ?? [];
}

/**
 * Get all calendar events for the current workspace (from context)
 */
export function useCalendarEventsFromContext(): LocalCalendarEvent[] {
  const context = useContext(DataContext);
  return context?.calendarEvents ?? [];
}
