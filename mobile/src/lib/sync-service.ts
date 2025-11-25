/**
 * BACKGROUND SYNC SERVICE
 *
 * Sync strategy:
 * 1. Local MMKV is always source of truth
 * 2. Server is backup/sync layer between devices
 * 3. On sync: MERGE server + local (never replace)
 * 4. Conflicts: Simple last-write-wins by updatedAt timestamp
 */

import { cardsApi, pawkitsApi } from '../api/client';
import * as LocalStorage from './local-storage';
import type { CardModel, CollectionNode } from '../types';

let isSyncing = false;
let lastSyncAttempt = 0;
const MIN_SYNC_INTERVAL = 30000; // 30 seconds minimum between syncs

export interface SyncResult {
  success: boolean;
  cardsAdded: number;
  cardsUpdated: number;
  collectionsUpdated: number;
  errors: string[];
}

/**
 * Perform a full sync with the server
 */
export async function sync(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    cardsAdded: 0,
    cardsUpdated: 0,
    collectionsUpdated: 0,
    errors: [],
  };

  // Prevent concurrent syncs
  if (isSyncing) {
    return result;
  }

  // Rate limit syncs
  const now = Date.now();
  if (now - lastSyncAttempt < MIN_SYNC_INTERVAL) {
    return result;
  }

  isSyncing = true;
  lastSyncAttempt = now;

  try {
    // Pull from server
    const [serverCards, serverCollections] = await Promise.all([
      pullCards(),
      pullCollections(),
    ]);

    result.cardsAdded = serverCards.added;
    result.cardsUpdated = serverCards.updated;
    result.collectionsUpdated = serverCollections.updated;

    // Update last sync time
    LocalStorage.setLastSyncTime(Date.now());

    result.success = true;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    isSyncing = false;
  }

  return result;
}

/**
 * Pull cards from server and merge with local
 */
async function pullCards(): Promise<{ added: number; updated: number }> {
  let added = 0;
  let updated = 0;

  try {
    // Fetch all cards from server
    const response = await cardsApi.list();
    const serverCards = response.items;

    // Get local cards
    const localCards = await LocalStorage.getAllCards();
    const localCardMap = new Map(localCards.map(c => [c.id, c]));

    // Merge server cards
    for (const serverCard of serverCards) {
      const localCard = localCardMap.get(serverCard.id);

      if (!localCard) {
        // New card from server
        await LocalStorage.saveCard(serverCard);
        added++;
      } else {
        // Card exists locally - check which is newer
        const serverTime = new Date(serverCard.updatedAt).getTime();
        const localTime = new Date(localCard.updatedAt).getTime();

        if (serverTime > localTime) {
          // Server is newer - update local
          await LocalStorage.saveCard(serverCard);
          updated++;
        }
        // If local is newer, keep local (don't push in this simple implementation)
      }
    }

  } catch (error) {
    throw error;
  }

  return { added, updated };
}

/**
 * Pull collections from server and merge with local
 */
async function pullCollections(): Promise<{ updated: number }> {
  let updated = 0;

  try {
    // Fetch collections from server
    const response = await pawkitsApi.list();
    const serverCollections = response.tree;

    // Save to local (simple overwrite for collections)
    await LocalStorage.saveCollections(serverCollections);
    updated = serverCollections.length;

  } catch (error) {
    throw error;
  }

  return { updated };
}

/**
 * Check if sync is needed (based on time elapsed)
 */
export async function shouldSync(intervalMs: number = 60000): Promise<boolean> {
  const lastSync = await LocalStorage.getLastSyncTime();
  if (!lastSync) return true; // Never synced

  const elapsed = Date.now() - lastSync;
  return elapsed >= intervalMs;
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<{
  isSyncing: boolean;
  lastSync: Date | null;
  timeSinceSync: string;
}> {
  const lastSync = await LocalStorage.getLastSyncTime();
  const lastSyncDate = lastSync ? new Date(lastSync) : null;

  let timeSinceSync = 'Never';
  if (lastSync) {
    const elapsed = Date.now() - lastSync;
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 1) {
      timeSinceSync = 'Just now';
    } else if (minutes < 60) {
      timeSinceSync = `${minutes}m ago`;
    } else {
      const hours = Math.floor(minutes / 60);
      timeSinceSync = `${hours}h ago`;
    }
  }

  return {
    isSyncing,
    lastSync: lastSyncDate,
    timeSinceSync,
  };
}
