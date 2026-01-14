'use client';

/**
 * Supabase Realtime Sync Hook
 *
 * Subscribes to card changes on Supabase and automatically syncs them
 * to the local database. This enables real-time sync across devices.
 */

import { useEffect, useRef } from 'react';
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
export function useRealtimeSync() {
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  // Use refs to track channel state across renders and StrictMode remounts
  const channelRef = useRef<RealtimeChannel | null>(null);
  const workspaceIdRef = useRef<string | null>(null);
  const isSettingUpRef = useRef(false);

  useEffect(() => {
    if (!currentWorkspace) {
      return;
    }

    const supabase = getClient();
    const workspaceId = currentWorkspace.id;

    // If we already have an active subscription for this workspace, skip setup
    if (channelRef.current && workspaceIdRef.current === workspaceId) {
      log.info(`Reusing existing Realtime subscription for workspace ${workspaceId}`);
      return;
    }

    // Clean up any existing subscription for a different workspace
    if (channelRef.current && workspaceIdRef.current !== workspaceId) {
      log.info(`Switching workspace, cleaning up old subscription`);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      workspaceIdRef.current = null;
    }

    // Prevent concurrent setup attempts
    if (isSettingUpRef.current) {
      log.debug('Setup already in progress, skipping');
      return;
    }

    console.log(`[RealtimeSync] Setting up for workspace ${workspaceId}`); // Debug
    log.info(`Setting up Realtime subscription for workspace ${workspaceId}`);
    isSettingUpRef.current = true;

    // Get the current session and set up Realtime with auth
    async function setupRealtimeWithAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log(`[RealtimeSync] Session found: ${!!session?.access_token}`); // Debug

        if (!session?.access_token) {
          console.warn('[RealtimeSync] No session - skipping subscription'); // Debug
          log.warn('No session found, Realtime will be unauthenticated');
          isSettingUpRef.current = false;
          return; // Don't try to subscribe without auth
        }

        // Set auth token on the realtime client
        await supabase.realtime.setAuth(session.access_token);

        // Check if another subscription was created while we were awaiting
        if (channelRef.current) {
          log.debug('Channel already exists, skipping duplicate setup');
          isSettingUpRef.current = false;
          return;
        }

        // Subscribe to card changes for this workspace
        // NOTE: We don't use a filter here because Supabase Realtime only sends
        // the primary key (id) in DELETE events by default (replica identity = DEFAULT).
        // A workspaceId filter would cause DELETE events to be filtered out.
        // Instead, we check workspaceId in the handler for INSERT/UPDATE, and for
        // DELETE events we check if the card exists locally.
        const channel = supabase
          .channel(`cards:${workspaceId}`)
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to INSERT, UPDATE, DELETE
              schema: 'public',
              table: 'Card',
              // No filter - handle workspace filtering in the handler
            },
            (payload: RealtimePostgresChangesPayload<CardPayload>) => {
              handleCardChange(payload);
            }
          )
          .subscribe((status: RealtimeStatus) => {
            console.log(`[RealtimeSync] Subscription status: ${status}`); // Debug - shows in prod
            log.info(`Realtime subscription status: ${status}`);
            if (status === 'SUBSCRIBED') {
              channelRef.current = channel;
              workspaceIdRef.current = workspaceId;
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              if (channelRef.current === channel) {
                channelRef.current = null;
                workspaceIdRef.current = null;
              }
            }
            isSettingUpRef.current = false;
          });
      } catch (error) {
        log.error('Error setting up realtime:', error);
        isSettingUpRef.current = false;
      }
    }

    setupRealtimeWithAuth();

    // Cleanup function for component unmount
    return () => {
      if (channelRef.current) {
        log.info('Component unmounting, cleaning up Realtime subscription');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        workspaceIdRef.current = null;
      }
      isSettingUpRef.current = false;
    };
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

  // For DELETE events, Supabase only sends the primary key (id) by default,
  // so workspaceId won't be available. We handle this in handleDelete by
  // checking if the card exists locally (which means it's for our workspace).
  if (eventType !== 'DELETE' && record?.workspaceId !== currentWorkspace.id) {
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
        // For DELETE, we pass the old record which may only have the id
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
    // We have pending local changes - don't overwrite the content
    // BUT we MUST update the version so the queue can detect conflicts properly
    // Otherwise the queue will send a stale expectedVersion and get a 409
    if (serverCard.version && serverCard.version > localCard.version) {
      log.debug(`Card ${serverCard.id} has pending changes, updating version only (${localCard.version} -> ${serverCard.version})`);
      await db.cards.update(serverCard.id, {
        version: serverCard.version,
      });
    }
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
 * Handle DELETE - a card was permanently deleted on another device
 * Note: A DELETE event from Postgres means the row was actually removed,
 * not just soft-deleted. For soft deletes, we receive UPDATE events.
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

  log.info(`Permanently deleting card from server: ${serverCard.id}`);

  // Hard delete from local IndexedDB since the server row is actually gone
  await db.cards.delete(serverCard.id);
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
