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

  // State and refs for two-phase loading
  const [shouldLoadAll, setShouldLoadAll] = useState(false);
  const lastAllCardsRef = useRef<LocalCard[] | undefined>(undefined);

  // Phase 1: Initial fast query - get 50 most recent by updatedAt
  // Uses orderBy + limit for speed, filters deleted client-side (rare in recent 50)
  // NOTE: We avoid .reverse() here due to Dexie reactivity issues with reverse()
  // See: https://github.com/dexie/Dexie.js/issues/2034
  // NOTE: This query is disabled once allCards is loaded to avoid dual subscriptions
  const initialCards = useLiveQuery(
    async () => {
      // Don't run this query if allCards is loaded (shouldLoadAll = true)
      if (!workspaceId || shouldLoadAll) return undefined;
      const recent = await db.cards
        .orderBy('updatedAt')
        .limit(60) // Fetch 60 to account for potential deleted cards
        .toArray();
      // Sort client-side (reverse order) to avoid Dexie .reverse() reactivity issues
      const sorted = recent
        .filter((c) => c.workspaceId === workspaceId && !c._deleted)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return sorted.slice(0, 50);
    },
    [workspaceId, shouldLoadAll]
  );

  // Transition from Phase 1 to Phase 2 after initial render
  useEffect(() => {
    if (initialCards !== undefined && !shouldLoadAll) {
      // Delay full load to let initial render complete and LCP happen
      const timer = setTimeout(() => setShouldLoadAll(true), 100);
      return () => clearTimeout(timer);
    }
  }, [initialCards, shouldLoadAll]);

  // Reset shouldLoadAll and cache when workspace changes
  useEffect(() => {
    setShouldLoadAll(false);
    lastAllCardsRef.current = undefined;
  }, [workspaceId]);

  // Phase 2: Full query - uses where() for proper Dexie reactivity
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

  // Update cache when allCards has data
  // This ensures that once we have the full dataset, we never show partial data again
  if (allCards !== undefined) {
    lastAllCardsRef.current = allCards;
  }

  // Combine: use allCards when available, fall back to cached allCards, then initialCards
  // This prevents the UI from flickering when allCards temporarily becomes undefined
  const cards = allCards ?? lastAllCardsRef.current ?? initialCards;

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
  // After Phase 2, use allCards for loading check; before that, use initialCards
  const cardsLoading = shouldLoadAll
    ? allCards === undefined && lastAllCardsRef.current === undefined
    : initialCards === undefined;
  const isLoading = !workspaceId || cardsLoading || collections === undefined || calendarEvents === undefined;

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
