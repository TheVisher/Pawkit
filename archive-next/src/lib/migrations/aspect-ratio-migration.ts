/**
 * Aspect Ratio Backfill Migration
 *
 * This migration queues aspect ratio extraction for existing cards that have
 * images but no aspectRatio stored. This is a one-time backfill to handle
 * cards created before aspectRatio extraction was added to the metadata flow.
 *
 * The extraction runs async in the background using a Web Worker, so it won't
 * block the UI or slow down app initialization.
 */

import { db } from '@/lib/db/schema';
import { queueAspectRatioExtraction } from '@/lib/services/metadata-service';

// =============================================================================
// MIGRATION STATUS
// =============================================================================

const MIGRATION_KEY = 'aspect-ratio-backfill-v1';

async function hasMigrationRun(): Promise<boolean> {
  const entry = await db.metadata.get(MIGRATION_KEY);
  return entry?.value === true;
}

async function markMigrationComplete(): Promise<void> {
  await db.metadata.put({ key: MIGRATION_KEY, value: true });
}

// =============================================================================
// BACKFILL MIGRATION
// =============================================================================

/**
 * Queue aspect ratio extraction for existing cards without aspectRatio
 *
 * @param workspaceId - Workspace to backfill (required)
 * @returns Object with count of cards queued for extraction
 */
export async function runAspectRatioBackfill(
  workspaceId: string
): Promise<{ cardsQueued: number }> {
  // Check if already run
  if (await hasMigrationRun()) {
    console.log('[AspectRatioMigration] Already completed. Skipping.');
    return { cardsQueued: 0 };
  }

  // Find cards with images but no aspectRatio
  const cards = await db.cards
    .where('workspaceId')
    .equals(workspaceId)
    .filter(card =>
      !card._deleted &&
      Boolean(card.image) &&
      !card.aspectRatio
    )
    .toArray();

  if (cards.length === 0) {
    console.log('[AspectRatioMigration] No cards need backfill.');
    await markMigrationComplete();
    return { cardsQueued: 0 };
  }

  console.log(`[AspectRatioMigration] Queuing ${cards.length} cards for extraction...`);

  // Queue extraction for each card
  // The queue is rate-limited (MAX_CONCURRENT_ASPECT_RATIO = 2) so this won't
  // overwhelm the browser
  for (const card of cards) {
    if (card.image) {
      queueAspectRatioExtraction(card.id, card.image);
    }
  }

  // Mark migration as complete
  await markMigrationComplete();

  console.log(`[AspectRatioMigration] Complete. Queued ${cards.length} cards.`);
  return { cardsQueued: cards.length };
}
