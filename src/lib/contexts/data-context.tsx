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

import React, { createContext, useContext, useMemo, useState, useEffect, useRef, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { runMigrations } from '@/lib/db/migrations';
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
  /** True when all cards have been loaded (not just initial batch) */
  isFullyLoaded: boolean;
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
  const migrationRun = useRef(false);

  // Run database migrations on first mount
  useEffect(() => {
    if (!migrationRun.current) {
      migrationRun.current = true;
      runMigrations().catch(console.error);
    }
  }, []);

  // ==========================================================================
  // TWO-PHASE CARD LOADING (for faster LCP)
  // Phase 1: Load 50 most recent cards quickly for initial render
  // Phase 2: Load ALL cards in background after UI paints
  // ==========================================================================

  // Phase 1: Initial fast query - get 50 most recent by updatedAt
  // Uses orderBy + limit for speed, filters deleted client-side (rare in recent 50)
  const initialCards = useLiveQuery(
    async () => {
      if (!workspaceId) return undefined;
      const recent = await db.cards
        .orderBy('updatedAt')
        .reverse()
        .limit(60) // Fetch 60 to account for potential deleted cards
        .toArray();
      return recent
        .filter((c) => c.workspaceId === workspaceId && !c._deleted)
        .slice(0, 50);
    },
    [workspaceId]
  );

  // Phase 2: Full query - runs after a short delay to let UI paint
  const [shouldLoadAll, setShouldLoadAll] = useState(false);

  useEffect(() => {
    if (initialCards !== undefined && !shouldLoadAll) {
      // Delay full load to let initial render complete and LCP happen
      const timer = setTimeout(() => setShouldLoadAll(true), 100);
      return () => clearTimeout(timer);
    }
  }, [initialCards, shouldLoadAll]);

  // Reset shouldLoadAll when workspace changes
  useEffect(() => {
    setShouldLoadAll(false);
  }, [workspaceId]);

  const allCards = useLiveQuery(
    async () => {
      if (!workspaceId || !shouldLoadAll) return undefined;
      return db.cards
        .where('workspaceId')
        .equals(workspaceId)
        .filter((c) => !c._deleted)
        .toArray();
    },
    [workspaceId, shouldLoadAll]
  );

  // Combine: use allCards when available, otherwise initialCards
  const cards = allCards ?? initialCards;

  // Single query for all collections - shared by all consumers
  const collections = useLiveQuery(
    async () => {
      if (!workspaceId) return undefined;
      return db.collections
        .where('workspaceId')
        .equals(workspaceId)
        .filter((c) => !c._deleted)
        .toArray();
    },
    [workspaceId]
  );

  // Single query for all calendar events - shared by all consumers
  const calendarEvents = useLiveQuery(
    async () => {
      if (!workspaceId) return undefined;
      return db.calendarEvents
        .where('workspaceId')
        .equals(workspaceId)
        .filter((e) => !e._deleted)
        .toArray();
    },
    [workspaceId]
  );

  // Determine loading state - useLiveQuery returns undefined while loading
  // Also consider loading if no workspace is selected yet
  // Use initialCards for isLoading (fast initial load), not allCards
  const isLoading = !workspaceId || initialCards === undefined || collections === undefined || calendarEvents === undefined;

  // isFullyLoaded indicates all cards are loaded, not just the initial batch
  const isFullyLoaded = allCards !== undefined;

  const value = useMemo(
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
