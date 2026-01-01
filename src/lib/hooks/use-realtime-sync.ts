'use client';

/**
 * Supabase Realtime Sync Hook
 *
 * Subscribes to card changes on Supabase and automatically syncs them
 * to the local database. This enables real-time sync across devices.
 */

import { useEffect } from 'react';
import { getClient } from '@/lib/supabase/client';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { db, type LocalCard } from '@/lib/db';
import { createModuleLogger } from '@/lib/utils/logger';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type RealtimeStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';

const log = createModuleLogger('RealtimeSync');

interface CardPayload {
  id: string;
  workspaceId: string;
  version: number;
  [key: string]: unknown;
}

/**
 * Hook to subscribe to Supabase Realtime for card changes
 * Automatically pulls changes when cards are modified on other devices
 */
// Module-level state to persist across React StrictMode remounts
let activeChannel: RealtimeChannel | null = null;
let activeWorkspaceId: string | null = null;

export function useRealtimeSync() {
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  useEffect(() => {
    if (!currentWorkspace) {
      return;
    }

    const supabase = getClient();
    const workspaceId = currentWorkspace.id;

    // If we already have an active subscription for this workspace, skip setup
    if (activeChannel && activeWorkspaceId === workspaceId) {
      log.info(`Reusing existing Realtime subscription for workspace ${workspaceId}`);
      return;
    }

    // Clean up any existing subscription for a different workspace
    if (activeChannel && activeWorkspaceId !== workspaceId) {
      log.info(`Switching workspace, cleaning up old subscription`);
      supabase.removeChannel(activeChannel);
      activeChannel = null;
      activeWorkspaceId = null;
    }

    log.info(`Setting up Realtime subscription for workspace ${workspaceId}`);

    // Get the current session and set up Realtime with auth
    async function setupRealtimeWithAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        log.warn('No session found, Realtime will be unauthenticated');
        return; // Don't try to subscribe without auth
      }

      // Set auth token on the realtime client
      await supabase.realtime.setAuth(session.access_token);

      // Check if another subscription was created while we were awaiting
      if (activeChannel) {
        log.debug('Channel already exists, skipping duplicate setup');
        return;
      }

      // Subscribe to card changes for this workspace
      const channel = supabase
        .channel(`cards:${workspaceId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'Card',
            filter: `workspaceId=eq.${workspaceId}`,
          },
          (payload: RealtimePostgresChangesPayload<CardPayload>) => {
            handleCardChange(payload);
          }
        )
        .subscribe((status: RealtimeStatus) => {
          log.info(`Realtime subscription status: ${status}`);
          if (status === 'SUBSCRIBED') {
            activeChannel = channel;
            activeWorkspaceId = workspaceId;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            if (activeChannel === channel) {
              activeChannel = null;
              activeWorkspaceId = null;
            }
          }
        });
    }

    setupRealtimeWithAuth();

    // Don't clean up on unmount - let the subscription persist across StrictMode remounts
    // Cleanup only happens when workspace changes (handled above) or when the app closes
  }, [currentWorkspace]);
}

/**
 * Handle a card change event from Supabase Realtime
 */
async function handleCardChange(
  payload: RealtimePostgresChangesPayload<CardPayload>
): Promise<void> {
  const { eventType, new: newRecord, old: oldRecord } = payload;
  // Cast to CardPayload since we know the structure from our subscription
  const record = (newRecord || oldRecord) as CardPayload | undefined;

  log.info(`Realtime: Received ${eventType} event`, {
    id: record?.id,
    workspaceId: record?.workspaceId,
  });

  // Filter by current workspace
  const currentWorkspace = useWorkspaceStore.getState().currentWorkspace;
  if (!currentWorkspace) {
    log.debug('No current workspace, ignoring event');
    return;
  }

  if (record?.workspaceId !== currentWorkspace.id) {
    log.debug(`Event for different workspace, ignoring`);
    return;
  }

  try {
    switch (eventType) {
      case 'INSERT':
        await handleInsert(newRecord as CardPayload);
        break;
      case 'UPDATE':
        await handleUpdate(newRecord as CardPayload);
        break;
      case 'DELETE':
        await handleDelete(oldRecord as CardPayload);
        break;
    }
  } catch (error) {
    log.error(`Error handling ${eventType} event:`, error);
  }
}

/**
 * Handle INSERT - a new card was created on another device
 */
async function handleInsert(serverCard: CardPayload): Promise<void> {
  if (!serverCard?.id) return;

  // Check if we already have this card locally
  const localCard = await db.cards.get(serverCard.id);
  if (localCard) {
    log.debug(`Card ${serverCard.id} already exists locally, skipping insert`);
    return;
  }

  log.info(`New card from server: ${serverCard.id}`);

  // Convert server card to local format
  const localVersion = serverToLocal(serverCard);

  // Add to local DB (useLiveQuery will auto-update any observing components)
  await db.cards.add(localVersion);
}

/**
 * Handle UPDATE - a card was updated on another device
 */
async function handleUpdate(serverCard: CardPayload): Promise<void> {
  if (!serverCard?.id) return;

  const localCard = await db.cards.get(serverCard.id);

  if (!localCard) {
    // Card doesn't exist locally, treat as insert
    await handleInsert(serverCard);
    return;
  }

  // Check if we have pending local changes
  const queueItem = await db.syncQueue
    .where('entityId')
    .equals(serverCard.id)
    .first();

  if (queueItem) {
    // We have pending local changes - don't overwrite
    // The sync queue will handle conflict detection when it pushes
    log.debug(`Card ${serverCard.id} has pending local changes, skipping realtime update`);
    return;
  }

  // Check version - only update if server is newer
  if (serverCard.version <= localCard.version) {
    log.debug(`Card ${serverCard.id} server version (${serverCard.version}) <= local (${localCard.version}), skipping`);
    return;
  }

  log.info(`Updating card from server: ${serverCard.id} (v${localCard.version} -> v${serverCard.version})`);

  // Update local DB
  const updates = serverToLocal(serverCard);
  await db.cards.update(serverCard.id, {
    ...updates,
    _synced: true,
    _lastModified: new Date(),
  });
  // useLiveQuery will auto-update any observing components
}

/**
 * Handle DELETE - a card was deleted on another device
 */
async function handleDelete(serverCard: CardPayload): Promise<void> {
  if (!serverCard?.id) return;

  const localCard = await db.cards.get(serverCard.id);
  if (!localCard) {
    return; // Already doesn't exist locally
  }

  // Check if we have pending local changes
  const queueItem = await db.syncQueue
    .where('entityId')
    .equals(serverCard.id)
    .first();

  if (queueItem) {
    // We have pending local changes - the user might have edited before delete synced
    // Let the sync queue handle this
    log.debug(`Card ${serverCard.id} has pending local changes, skipping realtime delete`);
    return;
  }

  log.info(`Deleting card from server: ${serverCard.id}`);

  // Soft delete locally
  await db.cards.update(serverCard.id, {
    _deleted: true,
    _deletedAt: new Date(),
  });
  // useLiveQuery will auto-update any observing components
}

/**
 * Convert server card format to local card format
 */
function serverToLocal(serverCard: CardPayload): LocalCard {
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
    collections: collections || [],
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
