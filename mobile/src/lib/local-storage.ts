/**
 * LOCAL-FIRST STORAGE LAYER FOR MOBILE
 *
 * Architecture (matches web app):
 * - AsyncStorage is the PRIMARY source of truth
 * - Server is only for syncing/backup
 * - User data never lost even if server is wiped
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CardModel, CollectionNode } from '../types';

let currentUserId: string | null = null;

/**
 * Initialize storage for a user
 */
export function initStorage(userId: string): void {
  currentUserId = userId;
  console.log('[LocalStorage] Initialized for user:', userId);
}

/**
 * Get storage key with user prefix
 */
function getKey(key: string): string {
  if (!currentUserId) {
    throw new Error('Storage not initialized. Call initStorage(userId) first.');
  }
  return `pawkit_${currentUserId}_${key}`;
}

// ============================================================================
// CARDS
// ============================================================================

const CARDS_KEY = 'cards';
const CARDS_INDEX_KEY = 'cards_index'; // Fast lookup map

/**
 * Get all cards from local storage
 */
export async function getAllCards(): Promise<CardModel[]> {
  try {
    const cardsJson = await AsyncStorage.getItem(getKey(CARDS_KEY));
    if (!cardsJson) return [];

    const cards = JSON.parse(cardsJson) as CardModel[];
    return cards.filter(c => !c.deleted); // Filter soft-deleted
  } catch (error) {
    console.error('[LocalStorage] Error getting cards:', error);
    return [];
  }
}

/**
 * Get a single card by ID
 */
export async function getCard(id: string): Promise<CardModel | null> {
  try {
    const cards = await getAllCards();
    return cards.find(c => c.id === id) || null;
  } catch (error) {
    console.error('[LocalStorage] Error getting card:', error);
    return null;
  }
}

/**
 * Save a card to local storage
 */
export async function saveCard(card: CardModel): Promise<void> {
  try {
    const cards = await getAllCards();

    // Find existing card index
    const existingIndex = cards.findIndex(c => c.id === card.id);

    if (existingIndex >= 0) {
      // Update existing
      cards[existingIndex] = card;
    } else {
      // Add new
      cards.unshift(card); // Add to front (most recent first)
    }

    await AsyncStorage.setItem(getKey(CARDS_KEY), JSON.stringify(cards));
    console.log('[LocalStorage] Saved card:', card.id);
  } catch (error) {
    console.error('[LocalStorage] Error saving card:', error);
  }
}

/**
 * Save multiple cards (bulk operation for sync)
 */
export async function saveCards(newCards: CardModel[]): Promise<void> {
  try {
    const existing = await getAllCards();
    const cardMap = new Map(existing.map(c => [c.id, c]));

    // Merge new cards
    for (const card of newCards) {
      cardMap.set(card.id, card);
    }

    const merged = Array.from(cardMap.values())
      .filter(c => !c.deleted)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    await AsyncStorage.setItem(getKey(CARDS_KEY), JSON.stringify(merged));
    console.log('[LocalStorage] Saved cards:', newCards.length);
  } catch (error) {
    console.error('[LocalStorage] Error saving cards:', error);
  }
}

/**
 * Delete a card (soft delete)
 */
export async function deleteCard(id: string): Promise<void> {
  try {
    const card = await getCard(id);
    if (card) {
      card.deleted = true;
      await saveCard(card);
    }
  } catch (error) {
    console.error('[LocalStorage] Error deleting card:', error);
  }
}

/**
 * Permanently delete a card (remove from storage)
 */
export async function permanentlyDeleteCard(id: string): Promise<void> {
  try {
    const cards = await getAllCards();
    const filtered = cards.filter(c => c.id !== id);
    await AsyncStorage.setItem(getKey(CARDS_KEY), JSON.stringify(filtered));
    console.log('[LocalStorage] Permanently deleted card:', id);
  } catch (error) {
    console.error('[LocalStorage] Error permanently deleting card:', error);
  }
}

// ============================================================================
// COLLECTIONS
// ============================================================================

const COLLECTIONS_KEY = 'collections';

/**
 * Get all collections from local storage
 */
export async function getAllCollections(): Promise<CollectionNode[]> {
  try {
    const collectionsJson = await AsyncStorage.getItem(getKey(COLLECTIONS_KEY));
    if (!collectionsJson) return [];

    return JSON.parse(collectionsJson) as CollectionNode[];
  } catch (error) {
    console.error('[LocalStorage] Error getting collections:', error);
    return [];
  }
}

/**
 * Save collections to local storage
 */
export async function saveCollections(collections: CollectionNode[]): Promise<void> {
  try {
    await AsyncStorage.setItem(getKey(COLLECTIONS_KEY), JSON.stringify(collections));
    console.log('[LocalStorage] Saved collections:', collections.length);
  } catch (error) {
    console.error('[LocalStorage] Error saving collections:', error);
  }
}

// ============================================================================
// METADATA & SYNC
// ============================================================================

const LAST_SYNC_KEY = 'last_sync';

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime(): Promise<number | null> {
  try {
    const timestamp = await AsyncStorage.getItem(getKey(LAST_SYNC_KEY));
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    console.error('[LocalStorage] Error getting last sync time:', error);
    return null;
  }
}

/**
 * Set last sync timestamp
 */
export async function setLastSyncTime(timestamp: number): Promise<void> {
  try {
    await AsyncStorage.setItem(getKey(LAST_SYNC_KEY), timestamp.toString());
    console.log('[LocalStorage] Updated last sync time:', new Date(timestamp).toISOString());
  } catch (error) {
    console.error('[LocalStorage] Error setting last sync time:', error);
  }
}

/**
 * Clear all local data (for logout/reset)
 */
export async function clearAll(): Promise<void> {
  try {
    if (!currentUserId) return;

    const keys = [
      getKey(CARDS_KEY),
      getKey(COLLECTIONS_KEY),
      getKey(LAST_SYNC_KEY),
    ];

    await AsyncStorage.multiRemove(keys);
    console.log('[LocalStorage] Cleared all data');
  } catch (error) {
    console.error('[LocalStorage] Error clearing data:', error);
  }
}

/**
 * Get storage size (for debugging)
 */
export async function getStorageSize(): Promise<{ cards: number; collections: number; total: string }> {
  try {
    const cardsJson = await AsyncStorage.getItem(getKey(CARDS_KEY)) || '[]';
    const collectionsJson = await AsyncStorage.getItem(getKey(COLLECTIONS_KEY)) || '[]';

    const cardsSize = new Blob([cardsJson]).size;
    const collectionsSize = new Blob([collectionsJson]).size;
    const totalSize = cardsSize + collectionsSize;

    return {
      cards: cardsSize,
      collections: collectionsSize,
      total: `${(totalSize / 1024).toFixed(2)} KB`,
    };
  } catch (error) {
    console.error('[LocalStorage] Error getting storage size:', error);
    return { cards: 0, collections: 0, total: '0 KB' };
  }
}
