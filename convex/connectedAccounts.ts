import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./users";

// =================================================================
// CONNECTED ACCOUNTS QUERIES
// =================================================================

/**
 * List all connected accounts for the current user.
 * Note: Tokens are never returned in queries for security.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const accounts = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Strip sensitive data
    return accounts.map((account) => ({
      id: account._id,
      platform: account.platform,
      platformUserId: account.platformUserId,
      platformUsername: account.platformUsername,
      lastSync: account.lastSync,
      syncStatus: account.syncStatus,
      lastError: account.lastError,
      config: account.config,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }));
  },
});

/**
 * Get a specific connected account by platform.
 */
export const getByPlatform = query({
  args: { platform: v.string() },
  handler: async (ctx, { platform }) => {
    const user = await requireUser(ctx);

    const account = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", user._id).eq("platform", platform)
      )
      .unique();

    if (!account) return null;

    // Strip sensitive data
    return {
      id: account._id,
      platform: account.platform,
      platformUserId: account.platformUserId,
      platformUsername: account.platformUsername,
      lastSync: account.lastSync,
      syncStatus: account.syncStatus,
      lastError: account.lastError,
      config: account.config,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  },
});

/**
 * Check if a platform is connected.
 */
export const isConnected = query({
  args: { platform: v.string() },
  handler: async (ctx, { platform }) => {
    const user = await requireUser(ctx);

    const account = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", user._id).eq("platform", platform)
      )
      .unique();

    return !!account;
  },
});

// =================================================================
// CONNECTED ACCOUNTS MUTATIONS
// =================================================================

/**
 * Connect a new account.
 * Tokens should be encrypted before calling this mutation.
 */
export const connect = mutation({
  args: {
    platform: v.string(),
    platformUserId: v.optional(v.string()),
    platformUsername: v.optional(v.string()),
    encryptedAccessToken: v.optional(v.string()),
    encryptedRefreshToken: v.optional(v.string()),
    tokenExpiry: v.optional(v.number()),
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    // Check if already connected
    const existing = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", user._id).eq("platform", args.platform)
      )
      .unique();

    if (existing) {
      // Update existing connection
      await ctx.db.patch(existing._id, {
        platformUserId: args.platformUserId,
        platformUsername: args.platformUsername,
        encryptedAccessToken: args.encryptedAccessToken,
        encryptedRefreshToken: args.encryptedRefreshToken,
        tokenExpiry: args.tokenExpiry,
        config: args.config,
        syncStatus: "connected",
        lastError: undefined,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new connection
    const accountId = await ctx.db.insert("connectedAccounts", {
      userId: user._id,
      platform: args.platform,
      platformUserId: args.platformUserId,
      platformUsername: args.platformUsername,
      encryptedAccessToken: args.encryptedAccessToken,
      encryptedRefreshToken: args.encryptedRefreshToken,
      tokenExpiry: args.tokenExpiry,
      config: args.config,
      syncStatus: "connected",
      createdAt: now,
      updatedAt: now,
    });

    return accountId;
  },
});

/**
 * Disconnect an account.
 */
export const disconnect = mutation({
  args: { platform: v.string() },
  handler: async (ctx, { platform }) => {
    const user = await requireUser(ctx);

    const account = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", user._id).eq("platform", platform)
      )
      .unique();

    if (account) {
      await ctx.db.delete(account._id);
    }
  },
});

/**
 * Update account configuration.
 */
export const updateConfig = mutation({
  args: {
    platform: v.string(),
    config: v.any(),
  },
  handler: async (ctx, { platform, config }) => {
    const user = await requireUser(ctx);

    const account = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", user._id).eq("platform", platform)
      )
      .unique();

    if (!account) {
      throw new Error("Account not found");
    }

    await ctx.db.patch(account._id, {
      config,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update sync status (called after sync operations).
 */
export const updateSyncStatus = mutation({
  args: {
    platform: v.string(),
    syncStatus: v.string(),
    lastSync: v.optional(v.number()),
    syncCursor: v.optional(v.string()),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, { platform, syncStatus, lastSync, syncCursor, lastError }) => {
    const user = await requireUser(ctx);

    const account = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", user._id).eq("platform", platform)
      )
      .unique();

    if (!account) {
      throw new Error("Account not found");
    }

    const updates: Record<string, unknown> = {
      syncStatus,
      updatedAt: Date.now(),
    };

    if (lastSync !== undefined) updates.lastSync = lastSync;
    if (syncCursor !== undefined) updates.syncCursor = syncCursor;
    if (lastError !== undefined) updates.lastError = lastError;

    await ctx.db.patch(account._id, updates);
  },
});

/**
 * Refresh tokens (internal mutation for background jobs).
 */
export const refreshTokens = internalMutation({
  args: {
    accountId: v.id("connectedAccounts"),
    encryptedAccessToken: v.string(),
    encryptedRefreshToken: v.optional(v.string()),
    tokenExpiry: v.optional(v.number()),
  },
  handler: async (ctx, { accountId, encryptedAccessToken, encryptedRefreshToken, tokenExpiry }) => {
    const account = await ctx.db.get(accountId);
    if (!account) return;

    const updates: Record<string, unknown> = {
      encryptedAccessToken,
      updatedAt: Date.now(),
    };

    if (encryptedRefreshToken !== undefined) {
      updates.encryptedRefreshToken = encryptedRefreshToken;
    }
    if (tokenExpiry !== undefined) {
      updates.tokenExpiry = tokenExpiry;
    }

    await ctx.db.patch(accountId, updates);
  },
});

// =================================================================
// CLOUD CONNECTIONS (BYOS - Bring Your Own Storage)
// =================================================================

/**
 * List all cloud storage connections for the current user.
 */
export const listConnections = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const connections = await ctx.db
      .query("connections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Strip sensitive data
    return connections.map((conn) => ({
      id: conn._id,
      provider: conn.provider,
      status: conn.status,
      config: conn.config,
      lastSyncAt: conn.lastSyncAt,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
    }));
  },
});

/**
 * Get a specific cloud connection by provider.
 */
export const getConnection = query({
  args: { provider: v.string() },
  handler: async (ctx, { provider }) => {
    const user = await requireUser(ctx);

    const connection = await ctx.db
      .query("connections")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", user._id).eq("provider", provider)
      )
      .unique();

    if (!connection) return null;

    // Strip sensitive data
    return {
      id: connection._id,
      provider: connection.provider,
      status: connection.status,
      config: connection.config,
      lastSyncAt: connection.lastSyncAt,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  },
});

/**
 * Create or update a cloud storage connection.
 */
export const upsertConnection = mutation({
  args: {
    provider: v.string(),
    status: v.string(),
    config: v.optional(v.any()),
    encryptedApiToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    // Check if already exists
    const existing = await ctx.db
      .query("connections")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", user._id).eq("provider", args.provider)
      )
      .unique();

    if (existing) {
      // Update existing
      const updates: Record<string, unknown> = {
        status: args.status,
        updatedAt: now,
      };
      if (args.config !== undefined) updates.config = args.config;
      if (args.encryptedApiToken !== undefined) {
        updates.encryptedApiToken = args.encryptedApiToken;
      }

      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    // Create new
    const connectionId = await ctx.db.insert("connections", {
      userId: user._id,
      provider: args.provider,
      status: args.status,
      config: args.config,
      encryptedApiToken: args.encryptedApiToken,
      createdAt: now,
      updatedAt: now,
    });

    return connectionId;
  },
});

/**
 * Delete a cloud storage connection.
 */
export const deleteConnection = mutation({
  args: { provider: v.string() },
  handler: async (ctx, { provider }) => {
    const user = await requireUser(ctx);

    const connection = await ctx.db
      .query("connections")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", user._id).eq("provider", provider)
      )
      .unique();

    if (connection) {
      await ctx.db.delete(connection._id);
    }
  },
});

/**
 * Update connection sync timestamp.
 */
export const updateConnectionSyncTime = mutation({
  args: { provider: v.string() },
  handler: async (ctx, { provider }) => {
    const user = await requireUser(ctx);

    const connection = await ctx.db
      .query("connections")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", user._id).eq("provider", provider)
      )
      .unique();

    if (!connection) {
      throw new Error("Connection not found");
    }

    await ctx.db.patch(connection._id, {
      lastSyncAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
