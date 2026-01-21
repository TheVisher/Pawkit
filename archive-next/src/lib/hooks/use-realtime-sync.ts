'use client';

/**
 * Realtime Sync Hook (Polling-based)
 *
 * Polls for card changes from the server and syncs them to the local database.
 * This enables cross-device sync with a small delay (~10 seconds).
 *
 * Note: We use polling instead of Supabase Realtime because Supabase's
 * postgres_changes feature doesn't work with PascalCase table names (like "Card")
 * due to a bug in their internal apply_rls function.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { db, type LocalCard } from '@/lib/db';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('RealtimeSync');

// Poll every 10 seconds for changes
const POLL_INTERVAL_MS = 10000;

interface ServerCard {
  id: string;
  workspaceId: string;
  version: number;
  deleted?: boolean;
  [key: string]: unknown;
}

interface PollResponse {
  cards: ServerCard[];
  meta?: {
    count: number;
  };
}

/**
 * Hook to poll for card changes from the server
 * Automatically syncs changes to local IndexedDB
 */
export function useRealtimeSync() {
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  // Track the last sync time to only fetch deltas
  const lastSyncRef = useRef<Date | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  /**
   * Fetch changes from server and apply to local DB
   */
  const pollForChanges = useCallback(async (workspaceId: string) => {
    // Prevent concurrent polls
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      // Build URL with optional since parameter for delta sync
      const url = new URL('/api/cards', window.location.origin);
      url.searchParams.set('workspaceId', workspaceId);
      url.searchParams.set('deleted', 'true'); // Include soft-deleted cards

      if (lastSyncRef.current) {
        url.searchParams.set('since', lastSyncRef.current.toISOString());
      }

      const response = await fetch(url.toString(), {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          log.warn('Polling: Not authenticated');
        } else {
          log.error(`Polling: Server error ${response.status}`);
        }
        return;
      }

      const data: PollResponse = await response.json();
      const serverCards = data.cards || [];

      if (serverCards.length > 0) {
        log.info(`Polling: Received ${serverCards.length} card(s)`);

        // Process each card
        for (const serverCard of serverCards) {
          await processServerCard(serverCard);
        }
      }

      // Update last sync time
      lastSyncRef.current = new Date();
    } catch (error) {
      log.error('Polling: Error fetching changes', error);
    } finally {
      isPollingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!currentWorkspace) {
      return;
    }

    const workspaceId = currentWorkspace.id;
    log.info(`Starting polling sync for workspace ${workspaceId}`);

    // Do an initial poll immediately
    pollForChanges(workspaceId);

    // Set up polling interval
    pollingRef.current = setInterval(() => {
      pollForChanges(workspaceId);
    }, POLL_INTERVAL_MS);

    // Cleanup on unmount or workspace change
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      // Reset last sync time when workspace changes
      lastSyncRef.current = null;
    };
  }, [currentWorkspace, pollForChanges]);
}

/**
 * Process a card from the server and sync to local DB
 */
async function processServerCard(serverCard: ServerCard): Promise<void> {
  if (!serverCard?.id) return;

  const currentWorkspace = useWorkspaceStore.getState().currentWorkspace;
  if (!currentWorkspace || serverCard.workspaceId !== currentWorkspace.id) {
    return;
  }

  const localCard = await db.cards.get(serverCard.id);

  // Check if we have pending local changes - don't overwrite
  const queueItem = await db.syncQueue
    .where('entityId')
    .equals(serverCard.id)
    .first();

  if (queueItem) {
    // We have pending local changes - only update version to prevent conflicts
    if (localCard && serverCard.version > localCard.version) {
      log.debug(`Card ${serverCard.id} has pending changes, updating version only`);
      await db.cards.update(serverCard.id, {
        version: serverCard.version,
      });
    }
    return;
  }

  if (!localCard) {
    // New card - insert
    if (!serverCard.deleted) {
      log.info(`Polling: New card from server: ${serverCard.id}`);
      const localVersion = serverToLocal(serverCard);
      await db.cards.add(localVersion);
    }
    return;
  }

  // Existing card - check version
  if (serverCard.version <= localCard.version) {
    return; // Local is same or newer
  }

  log.info(`Polling: Updating card from server: ${serverCard.id} (v${localCard.version} -> v${serverCard.version})`);

  // Update local card
  const updates = serverToLocal(serverCard);
  await db.cards.update(serverCard.id, {
    ...updates,
    _synced: true,
    _lastModified: new Date(),
  });
}

/**
 * Convert server card format to local card format
 */
function serverToLocal(serverCard: ServerCard): LocalCard {
  const {
    id,
    workspaceId,
    type,
    url,
    title,
    description,
    content,
    notes,
    domain,
    image,
    favicon,
    metadata,
    status,
    tags,
    collections,
    pinned,
    scheduledDate,
    scheduledStartTime,
    scheduledEndTime,
    articleContent,
    summary,
    summaryType,
    version,
    conflictWithId,
    deleted,
    createdAt,
    updatedAt,
    ...rest
  } = serverCard;

  return {
    id,
    workspaceId,
    type: type || 'url',
    url: url || '',
    title,
    description,
    content,
    notes,
    domain,
    image,
    favicon,
    metadata,
    status: status || 'READY',
    tags: tags || [],
    // collections field removed - Pawkit membership now uses tags
    pinned: pinned || false,
    scheduledDate: scheduledDate ? new Date(scheduledDate as string) : undefined,
    scheduledStartTime,
    scheduledEndTime,
    articleContent,
    summary,
    summaryType,
    version: version || 1,
    conflictWithId,
    isFileCard: false,
    _synced: true,
    _deleted: deleted || false,
    _lastModified: new Date(),
    _localOnly: false,
    createdAt: createdAt ? new Date(createdAt as string) : new Date(),
    updatedAt: updatedAt ? new Date(updatedAt as string) : new Date(),
  } as LocalCard;
}

export default useRealtimeSync;
