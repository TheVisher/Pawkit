import { internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// =================================================================
// CONNECTED ACCOUNTS INTERNAL FUNCTIONS
// =================================================================

/**
 * Refresh tokens that are expiring within 24 hours.
 * This is called by the daily cron job.
 */
export const refreshExpiringTokens = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get accounts with tokens expiring in the next 24 hours
    const accounts = await ctx.runQuery(
      internal.connectedAccountsInternal.getExpiringAccounts,
      { hoursUntilExpiry: 24 }
    );

    console.log("Found", accounts.length, "accounts with expiring tokens");

    let refreshed = 0;
    let failed = 0;

    for (const account of accounts) {
      try {
        // Each platform has its own refresh logic
        // This is a placeholder - implement platform-specific refresh
        switch (account.platform) {
          case "youtube":
          case "google":
            // await refreshGoogleToken(ctx, account);
            break;
          case "reddit":
            // await refreshRedditToken(ctx, account);
            break;
          case "twitter":
            // await refreshTwitterToken(ctx, account);
            break;
          default:
            console.log("No refresh logic for platform:", account.platform);
        }

        refreshed++;
      } catch (error) {
        console.error(
          "Failed to refresh token for account:",
          account._id,
          error
        );
        failed++;
      }
    }

    console.log("Token refresh complete:", { refreshed, failed });
  },
});

/**
 * Get accounts with tokens expiring soon.
 */
export const getExpiringAccounts = internalQuery({
  args: { hoursUntilExpiry: v.number() },
  handler: async (ctx, { hoursUntilExpiry }) => {
    const cutoff = Date.now() + hoursUntilExpiry * 60 * 60 * 1000;

    const allAccounts = await ctx.db.query("connectedAccounts").collect();

    return allAccounts.filter((account) => {
      // Only check accounts with token expiry set
      if (!account.tokenExpiry) return false;

      // Check if expiring within the timeframe
      return account.tokenExpiry < cutoff;
    });
  },
});

// =================================================================
// PLATFORM-SPECIFIC REFRESH FUNCTIONS (Placeholders)
// =================================================================

// These would be implemented based on each platform's OAuth refresh flow
// Example structure for Google/YouTube:

/*
async function refreshGoogleToken(ctx: ActionCtx, account: Doc<"connectedAccounts">) {
  // Decrypt the refresh token
  const refreshToken = await decryptToken(account.encryptedRefreshToken);

  // Call Google's token refresh endpoint
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Google token');
  }

  const data = await response.json();

  // Encrypt the new access token
  const encryptedAccessToken = await encryptToken(data.access_token);

  // Update the account
  await ctx.runMutation(internal.connectedAccounts.refreshTokens, {
    accountId: account._id,
    encryptedAccessToken,
    tokenExpiry: Date.now() + data.expires_in * 1000,
  });
}
*/
