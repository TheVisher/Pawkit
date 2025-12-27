/**
 * Link Check Service (Client-side)
 * Queues and processes link checks for cards
 */

import { db } from '@/lib/db';
import { useDataStore } from '@/lib/stores/data-store';
import type { LinkStatus } from '@/lib/services/link-checker';

// Maximum concurrent link checks
const MAX_CONCURRENT = 5;

// Queue of pending card IDs
const checkQueue: string[] = [];

// Currently active checks
let activeCount = 0;

// Track processed cards
const processed = new Set<string>();

// Minimum time between checks for the same card (7 days)
const MIN_CHECK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

interface LinkCheckResponse {
  status: LinkStatus;
  statusCode?: number;
  redirectUrl?: string;
  error?: string;
}

/**
 * Queue a card for link checking
 */
export function queueLinkCheck(cardId: string): void {
  if (processed.has(cardId) || checkQueue.includes(cardId)) {
    return;
  }

  checkQueue.push(cardId);
  processQueue();
}

/**
 * Queue multiple cards for link checking
 */
export function queueLinkChecks(cardIds: string[]): void {
  for (const cardId of cardIds) {
    queueLinkCheck(cardId);
  }
}

/**
 * Process the queue with concurrency limit
 */
function processQueue(): void {
  while (activeCount < MAX_CONCURRENT && checkQueue.length > 0) {
    const cardId = checkQueue.shift();
    if (cardId && !processed.has(cardId)) {
      activeCount++;
      processed.add(cardId);
      checkLinkForCard(cardId).finally(() => {
        activeCount--;
        processQueue();
      });
    }
  }
}

/**
 * Check link for a single card
 */
async function checkLinkForCard(cardId: string): Promise<void> {
  try {
    const card = await db.cards.get(cardId);
    if (!card || !card.url || card.type !== 'url') {
      return;
    }

    // Skip if recently checked
    if (card.lastLinkCheck) {
      const lastCheck = new Date(card.lastLinkCheck).getTime();
      if (Date.now() - lastCheck < MIN_CHECK_INTERVAL_MS) {
        return;
      }
    }

    console.log('[LinkCheckService] Checking:', card.url);

    const response = await fetch('/api/link-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: card.url }),
    });

    if (!response.ok) {
      console.error('[LinkCheckService] API error:', response.status);
      return;
    }

    const result: LinkCheckResponse = await response.json();

    // Update card with link status
    const updates: Record<string, unknown> = {
      linkStatus: result.status,
      lastLinkCheck: new Date(),
    };

    if (result.redirectUrl) {
      updates.redirectUrl = result.redirectUrl;
    }

    await useDataStore.getState().updateCard(cardId, updates);

    console.log('[LinkCheckService] Updated:', cardId, result.status);
  } catch (error) {
    console.error('[LinkCheckService] Error:', error);
  }
}

/**
 * Check all cards that need checking
 * (Cards that haven't been checked recently)
 */
export async function checkStaleLinks(workspaceId: string): Promise<number> {
  const cutoff = new Date(Date.now() - MIN_CHECK_INTERVAL_MS);

  // Get cards that need checking
  const cards = await db.cards
    .where('workspaceId')
    .equals(workspaceId)
    .filter((card) => {
      if (card._deleted) return false;
      if (card.type !== 'url') return false;
      if (!card.url) return false;

      // Check if never checked or check is stale
      if (!card.lastLinkCheck) return true;
      return new Date(card.lastLinkCheck) < cutoff;
    })
    .toArray();

  console.log('[LinkCheckService] Found', cards.length, 'cards to check');

  // Queue all for checking
  queueLinkChecks(cards.map(c => c.id));

  return cards.length;
}

/**
 * Clear the processed set
 */
export function clearLinkCheckCache(): void {
  processed.clear();
}

/**
 * Force re-check all links in workspace (ignores MIN_CHECK_INTERVAL_MS)
 */
export async function forceRecheckAllLinks(workspaceId: string): Promise<number> {
  // Clear processed cache so all cards can be re-checked
  processed.clear();

  // Get all URL cards
  const cards = await db.cards
    .where('workspaceId')
    .equals(workspaceId)
    .filter((card) => {
      if (card._deleted) return false;
      if (card.type !== 'url') return false;
      if (!card.url) return false;
      return true;
    })
    .toArray();

  console.log('[LinkCheckService] Force re-checking', cards.length, 'links');

  // Queue all for checking
  queueLinkChecks(cards.map(c => c.id));

  return cards.length;
}

/**
 * Get queue status
 */
export function getLinkCheckQueueStatus() {
  return {
    queueLength: checkQueue.length,
    activeCount,
    processedCount: processed.size,
  };
}
