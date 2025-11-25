import { openDB } from 'idb';
import { localDb, DEFAULT_WORKSPACE_ID } from './local-storage';
import { syncQueue } from './sync-queue';
import { CardDTO } from '@/lib/server/cards';
import { CollectionNode } from '@/lib/types';

// Types for old database records with internal sync flags
interface OldCardRecord extends CardDTO {
  _locallyModified?: boolean;
  _locallyCreated?: boolean;
  _serverVersion?: number;
}

// Old collection records have optional children (may not be stored in flat DB)
interface OldCollectionRecord extends Omit<CollectionNode, 'children'> {
  _locallyModified?: boolean;
  _locallyCreated?: boolean;
  _serverVersion?: number;
  children?: CollectionNode[];
}

interface MetadataRecord {
  key: string;
  value: unknown;
}

/**
 * STORAGE MIGRATION - Migrate from global to user-specific databases
 *
 * This migration handles the transition from:
 *   OLD: pawkit-local-storage (global for all users)
 *   NEW: pawkit-${userId}-${workspaceId}-local-storage (per-user, per-workspace)
 *
 * CRITICAL FOR SECURITY: This prevents data bleeding between users
 */

const OLD_LOCAL_STORAGE_DB = 'pawkit-local-storage';
const OLD_SYNC_QUEUE_DB = 'pawkit-sync-queue';
const DB_VERSION = 4;

export interface MigrationResult {
  success: boolean;
  cardsMigrated: number;
  collectionsMigrated: number;
  metadataMigrated: number;
  errors: string[];
}

/**
 * Migrate user's data from old global database to user-specific database
 *
 * @param userId - User's ID
 * @param workspaceId - Workspace ID (defaults to "default")
 * @returns Migration result
 */
export async function migrateToUserSpecificStorage(
  userId: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    cardsMigrated: 0,
    collectionsMigrated: 0,
    metadataMigrated: 0,
    errors: []
  };


  try {
    // Check if old database exists
    const databases = await indexedDB.databases();
    const hasOldDb = databases.some(db => db.name === OLD_LOCAL_STORAGE_DB);

    if (!hasOldDb) {
      result.success = true;
      return result;
    }

    // Check if new database already exists
    const newDbName = `pawkit-${userId}-${workspaceId}-local-storage`;
    const hasNewDb = databases.some(db => db.name === newDbName);

    if (hasNewDb) {
      result.success = true;
      return result;
    }


    // Open old database
    let oldDb;
    try {
      oldDb = await openDB(OLD_LOCAL_STORAGE_DB, DB_VERSION);
    } catch (error) {
      result.errors.push(`Failed to open old database: ${error}`);
      return result;
    }

    // Get all data from old database

    let cards: unknown[] = [];
    let collections: unknown[] = [];
    let metadata: unknown[] = [];

    try {
      cards = await oldDb.getAll('cards');
      collections = await oldDb.getAll('collections');
      metadata = await oldDb.getAll('metadata');

      console.log('[Migration] Found data:', {
        cards: cards.length,
        collections: collections.length,
        metadata: metadata.length
      });
    } catch (error) {
      result.errors.push(`Error reading data: ${error}`);
      oldDb.close();
      return result;
    }

    // Filter data by userId (in case database has mixed user data)
    const userCards = (cards as OldCardRecord[]).filter(card => {
      return card.userId === userId;
    });

    const userCollections = (collections as OldCollectionRecord[]).filter(col => {
      return col.userId === userId;
    });

    console.log('[Migration] Filtered data for user:', {
      userCards: userCards.length,
      userCollections: userCollections.length
    });

    // Close old database
    oldDb.close();

    // Initialize new user-specific database
    await localDb.init(userId, workspaceId);
    await syncQueue.init(userId, workspaceId);

    // Migrate cards
    for (const card of userCards) {
      try {
        // Clean up internal flags before saving
        const { _locallyModified, _locallyCreated, _serverVersion, ...cleanCard } = card;

        await localDb.saveCard(cleanCard as CardDTO, {
          fromServer: true // Mark as synced
        });

        result.cardsMigrated++;
      } catch (error) {
        result.errors.push(`Card ${card.id}: ${error}`);
      }
    }

    // Migrate collections
    for (const collection of userCollections) {
      try {
        // Clean up internal flags
        const { _locallyModified, _locallyCreated, _serverVersion, children, ...cleanCollection } = collection;

        await localDb.saveCollection(cleanCollection as CollectionNode, {
          fromServer: true // Mark as synced
        });

        result.collectionsMigrated++;
      } catch (error) {
        result.errors.push(`Collection ${collection.id}: ${error}`);
      }
    }

    // Migrate metadata
    for (const meta of metadata as MetadataRecord[]) {
      try {
        await localDb.setMetadata(meta.key, meta.value);
        result.metadataMigrated++;
      } catch (error) {
        result.errors.push(`Metadata ${meta.key}: ${error}`);
      }
    }

    result.success = true;

    console.log('[Migration] Migration completed:', {
      cardsMigrated: result.cardsMigrated,
      collectionsMigrated: result.collectionsMigrated,
      metadataMigrated: result.metadataMigrated,
      errors: result.errors.length
    });

    // Delete old database ONLY if migration was successful and user has data
    if (result.success && (result.cardsMigrated > 0 || result.collectionsMigrated > 0)) {
      try {
        await indexedDB.deleteDatabase(OLD_LOCAL_STORAGE_DB);
        await indexedDB.deleteDatabase(OLD_SYNC_QUEUE_DB);
      } catch (error) {
        result.errors.push(`Error deleting old database: ${error}`);
        // Non-critical - migration already succeeded
      }
    } else if (result.success) {
    }

    return result;
  } catch (error) {
    result.errors.push(`Unexpected error: ${error}`);
    result.success = false;
    return result;
  }
}

/**
 * Check if a user needs migration
 * @param userId - User's ID
 * @param workspaceId - Workspace ID
 * @returns true if migration is needed
 */
export async function needsMigration(userId: string, workspaceId: string = DEFAULT_WORKSPACE_ID): Promise<boolean> {
  try {
    const databases = await indexedDB.databases();

    // Check if user-specific database exists
    const userDbName = `pawkit-${userId}-${workspaceId}-local-storage`;
    const hasUserDb = databases.some(db => db.name === userDbName);

    if (hasUserDb) {
      return false; // Already migrated
    }

    // Check if old database exists
    const hasOldDb = databases.some(db => db.name === OLD_LOCAL_STORAGE_DB);

    return hasOldDb; // Needs migration if old DB exists
  } catch (error) {
    return false;
  }
}
