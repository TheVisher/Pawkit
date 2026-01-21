import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// =================================================================
// SCHEDULED CRON JOBS
// =================================================================

/**
 * Check for broken links weekly.
 * Runs every Sunday at 3 AM UTC.
 */
crons.weekly(
  "check-broken-links",
  { dayOfWeek: "sunday", hourUTC: 3, minuteUTC: 0 },
  internal.linkCheck.checkAllLinks
);

/**
 * Clean up old deleted items monthly.
 * Permanently deletes items that have been in trash for over 30 days.
 * Runs on the 1st of each month at 4 AM UTC.
 */
crons.monthly(
  "cleanup-old-deleted-items",
  { day: 1, hourUTC: 4, minuteUTC: 0 },
  internal.cleanup.purgeOldDeletedItems
);

/**
 * Refresh connected account tokens daily.
 * Checks for tokens expiring within 24 hours and refreshes them.
 * Runs daily at 2 AM UTC.
 */
crons.daily(
  "refresh-expiring-tokens",
  { hourUTC: 2, minuteUTC: 0 },
  internal.connectedAccountsInternal.refreshExpiringTokens
);

export default crons;
