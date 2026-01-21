/**
 * Migration: scheduledDate -> scheduledDates
 *
 * Migrates cards from single scheduledDate to scheduledDates array.
 * Also creates date references for existing scheduled cards.
 *
 * This migration runs once on app startup and marks completion in localStorage.
 */

import { db } from '@/lib/db';
import { format } from 'date-fns';

const MIGRATION_KEY = 'pawkit_migration_scheduled_dates_v1';

/**
 * Check if migration has already been run
 */
export function hasMigrationRun(): boolean {
  if (typeof window === 'undefined') return true; // Skip on server
  return localStorage.getItem(MIGRATION_KEY) === 'completed';
}

/**
 * Mark migration as completed
 */
function markMigrationComplete(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MIGRATION_KEY, 'completed');
}

/**
 * Run the migration
 *
 * For each card with scheduledDate but no scheduledDates:
 * 1. Convert scheduledDate to scheduledDates array
 * 2. Create a date reference
 */
export async function migrateScheduledDates(): Promise<{
  migratedCards: number;
  createdReferences: number;
}> {
  if (hasMigrationRun()) {
    return { migratedCards: 0, createdReferences: 0 };
  }

  console.log('[Migration] Starting scheduledDate -> scheduledDates migration');

  let migratedCards = 0;
  let createdReferences = 0;

  try {
    // Get all cards with scheduledDate but no scheduledDates
    const cardsToMigrate = await db.cards
      .filter((card) => {
        return (
          card.scheduledDate != null &&
          (!card.scheduledDates || card.scheduledDates.length === 0) &&
          !card._deleted
        );
      })
      .toArray();

    console.log(`[Migration] Found ${cardsToMigrate.length} cards to migrate`);

    // Process each card
    for (const card of cardsToMigrate) {
      try {
        const dateStr = format(new Date(card.scheduledDate!), 'yyyy-MM-dd');
        const dateLabel = format(new Date(card.scheduledDate!), 'MMMM d, yyyy');

        // Update card with scheduledDates array
        await db.cards.update(card.id, {
          scheduledDates: [dateStr],
          _synced: false,
          _lastModified: new Date(),
        });
        migratedCards++;

        // Create a date reference (only if not a daily note - daily notes don't need references)
        if (!card.isDailyNote) {
          const existingRef = await db.references
            .where('[sourceId+targetType]')
            .equals([card.id, 'date'])
            .filter((r) => r.targetId === dateStr && !r._deleted)
            .first();

          if (!existingRef) {
            await db.references.add({
              id: crypto.randomUUID(),
              workspaceId: card.workspaceId,
              sourceId: card.id,
              targetId: dateStr,
              targetType: 'date',
              linkText: dateLabel,
              createdAt: new Date(),
              updatedAt: new Date(),
              _synced: false,
              _lastModified: new Date(),
              _deleted: false,
            });
            createdReferences++;
          }
        }
      } catch (err) {
        console.error(`[Migration] Error migrating card ${card.id}:`, err);
      }
    }

    markMigrationComplete();
    console.log(
      `[Migration] Complete: migrated ${migratedCards} cards, created ${createdReferences} references`
    );
  } catch (err) {
    console.error('[Migration] Failed:', err);
  }

  return { migratedCards, createdReferences };
}

/**
 * Reset migration (for testing)
 */
export function resetMigration(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MIGRATION_KEY);
}

export default migrateScheduledDates;
