/**
 * Metadata Service
 * Client-side queue for fetching URL metadata with concurrency control
 */

import { db } from '@/lib/db';
import { useDataStore } from '@/lib/stores/data-store';

// Maximum concurrent metadata fetches
const MAX_CONCURRENT = 3;

// Queue of pending card IDs
const fetchQueue: string[] = [];

// Currently active fetches
let activeCount = 0;

// Track processed cards to avoid duplicates
const processed = new Set<string>();

interface MetadataResponse {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  domain: string;
}

/**
 * Queue a card for metadata fetching
 */
export function queueMetadataFetch(cardId: string): void {
  // Skip if already processed or queued
  if (processed.has(cardId) || fetchQueue.includes(cardId)) {
    return;
  }

  fetchQueue.push(cardId);
  processQueue();
}

/**
 * Process the queue with concurrency limit
 */
function processQueue(): void {
  while (activeCount < MAX_CONCURRENT && fetchQueue.length > 0) {
    const cardId = fetchQueue.shift();
    if (cardId && !processed.has(cardId)) {
      activeCount++;
      processed.add(cardId);
      fetchMetadataForCard(cardId).finally(() => {
        activeCount--;
        processQueue();
      });
    }
  }
}

/**
 * Fetch metadata for a single card
 */
async function fetchMetadataForCard(cardId: string): Promise<void> {
  try {
    // Get card from Dexie
    const card = await db.cards.get(cardId);
    if (!card || !card.url || card.type !== 'url') {
      return;
    }

    // Skip if already has metadata
    if (card.title && card.image && card.status === 'READY') {
      return;
    }

    console.log('[MetadataService] Fetching metadata for:', card.url);

    // Call API
    const response = await fetch('/api/metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: card.url }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const metadata: MetadataResponse = await response.json();

    // Update card with metadata
    const updates: Record<string, unknown> = {
      status: 'READY',
      updatedAt: new Date(),
    };

    // Only update fields if we got values
    if (metadata.title) {
      updates.title = metadata.title;
    }
    if (metadata.description) {
      updates.description = metadata.description;
    }
    if (metadata.image) {
      updates.image = metadata.image;
    }
    if (metadata.favicon) {
      updates.favicon = metadata.favicon;
    }
    if (metadata.domain) {
      updates.domain = metadata.domain;
    }

    // Update via data store (triggers sync)
    await useDataStore.getState().updateCard(cardId, updates);

    console.log('[MetadataService] Updated card:', cardId, {
      title: metadata.title?.substring(0, 30),
      hasImage: !!metadata.image,
    });
  } catch (error) {
    console.error('[MetadataService] Error fetching metadata:', error);

    // Mark as READY even on failure (stops UI spinner)
    try {
      await useDataStore.getState().updateCard(cardId, {
        status: 'READY',
      });
    } catch {
      // Ignore update errors
    }
  }
}

/**
 * Clear the processed set (useful for retrying)
 */
export function clearMetadataCache(): void {
  processed.clear();
}

/**
 * Get queue status for debugging
 */
export function getMetadataQueueStatus() {
  return {
    queueLength: fetchQueue.length,
    activeCount,
    processedCount: processed.size,
  };
}
