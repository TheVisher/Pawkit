/**
 * Database Migrations
 *
 * Run all pending migrations. Called once on app startup.
 */

import { migrateScheduledDates, hasMigrationRun as hasScheduledDatesMigrationRun } from './migrate-scheduled-dates';

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  console.log('[Migrations] Checking for pending migrations...');

  // Migration 1: scheduledDate -> scheduledDates
  if (!hasScheduledDatesMigrationRun()) {
    await migrateScheduledDates();
  }

  console.log('[Migrations] All migrations complete');
}

export { migrateScheduledDates, resetMigration } from './migrate-scheduled-dates';
