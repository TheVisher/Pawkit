import { query, mutation, QueryCtx, MutationCtx, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUserId, getAuthSessionId } from "@convex-dev/auth/server";

// =================================================================
// SHARED AUTH HELPERS (exported for use in all queries/mutations)
// =================================================================

/**
 * Get authenticated user from the users table.
 * Uses @convex-dev/auth for authentication.
 * Throws if not authenticated or user not found.
 */
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthenticated");
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

/**
 * Get authenticated user, returns null if not authenticated.
 */
export async function getUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }

  return await ctx.db.get(userId);
}

/**
 * Verify user owns workspace.
 * REQUIRED FOR EVERY WORKSPACE OPERATION.
 */
export async function requireWorkspaceAccess(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">
) {
  const user = await requireUser(ctx);

  const workspace = await ctx.db.get(workspaceId);
  if (!workspace || workspace.userId !== user._id) {
    throw new Error("Unauthorized: workspace access denied");
  }

  return { user, workspace };
}

// =================================================================
// USER QUERIES
// =================================================================

/**
 * Get the current user's profile.
 * Returns null if not authenticated or user not found.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return null;

    return {
      id: user._id,
      email: user.email,
      displayName: user.displayName || user.name,
      serverSync: user.serverSync ?? true,
      createdAt: user.createdAt,
    };
  },
});

/**
 * Get current session ID
 */
export const currentSession = query({
  args: {},
  handler: async (ctx) => {
    const sessionId = await getAuthSessionId(ctx);
    if (!sessionId) return null;
    return await ctx.db.get(sessionId);
  },
});

// =================================================================
// USER MUTATIONS
// =================================================================

/**
 * Ensure user has a default workspace.
 * Called after sign-in to set up the user's environment.
 */
export const ensureDefaultWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    // Check if user already has a default workspace
    const existingWorkspace = await ctx.db
      .query("workspaces")
      .withIndex("by_user_default", (q) =>
        q.eq("userId", user._id).eq("isDefault", true)
      )
      .unique();

    if (existingWorkspace) {
      return existingWorkspace;
    }

    // Create default workspace for new user
    const workspaceId = await ctx.db.insert("workspaces", {
      name: "My Pawkit",
      userId: user._id,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(workspaceId);
  },
});

/**
 * Update user profile settings.
 */
export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    serverSync: v.optional(v.boolean()),
  },
  handler: async (ctx, { displayName, serverSync }) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    const updates: Record<string, unknown> = { updatedAt: now };
    if (displayName !== undefined) updates.displayName = displayName;
    if (serverSync !== undefined) updates.serverSync = serverSync;

    await ctx.db.patch(user._id, updates);
    return await ctx.db.get(user._id);
  },
});

/**
 * Compute SHA-256 hash of a string.
 * Uses Web Crypto API (available in Convex runtime).
 */
async function sha256Hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generate/regenerate extension token.
 * Token is shown to user ONCE - only hash and prefix are stored.
 */
export const generateExtensionToken = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    // Generate a random token (user sees this once)
    const token = `pawkit_ext_${crypto.randomUUID().replace(/-/g, "")}`;

    // Store hash for validation (never the actual token)
    const tokenHash = await sha256Hash(token);

    // Store prefix for indexed lookup (first 8 chars after the prefix)
    // Token format: pawkit_ext_<32chars>
    // Prefix for lookup: first 8 chars of the random part
    const tokenPrefix = token.substring(11, 19); // Skip "pawkit_ext_"

    await ctx.db.patch(user._id, {
      extensionTokenHash: tokenHash,
      extensionTokenPrefix: tokenPrefix,
      extensionTokenCreatedAt: now,
      updatedAt: now,
    });

    // Return the token to the user (only time it's visible)
    return { token };
  },
});

/**
 * Validate extension token for API access.
 * Lookup by prefix, then compare hash securely.
 * Returns user if valid, null if invalid.
 *
 * Internal query - only callable from HTTP actions.
 */
export const validateExtensionToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    // Validate token format
    if (!token.startsWith("pawkit_ext_") || token.length < 19) {
      return null;
    }

    // Extract prefix for lookup
    const tokenPrefix = token.substring(11, 19);

    // Lookup by prefix (fast indexed query)
    const candidates = await ctx.db
      .query("users")
      .withIndex("by_extension_token_prefix", (q) =>
        q.eq("extensionTokenPrefix", tokenPrefix)
      )
      .collect();

    if (candidates.length === 0) return null;

    // Compute hash of provided token
    const providedHash = await sha256Hash(token);

    // Find user with matching hash (constant-time comparison)
    for (const user of candidates) {
      if (user.extensionTokenHash && constantTimeCompare(user.extensionTokenHash, providedHash)) {
        return {
          id: user._id,
          email: user.email,
          serverSync: user.serverSync ?? true,
        };
      }
    }

    return null;
  },
});

// =================================================================
// ACCOUNT DELETION
// =================================================================

/**
 * Delete user account and all associated data.
 * This is IRREVERSIBLE and immediately deletes:
 * - All storage files
 * - All cards, collections, events, todos
 * - All workspaces
 * - All auth sessions and accounts
 * - The user record itself
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const userId = user._id;

    // Get all workspaces for this user
    const workspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // For each workspace, delete all associated data
    for (const workspace of workspaces) {
      const workspaceId = workspace._id;

      // 1. Delete storage files from cards
      const cards = await ctx.db
        .query("cards")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();

      for (const card of cards) {
        if (card.storageId) {
          try {
            await ctx.storage.delete(card.storageId);
          } catch {
            // Ignore storage deletion errors (file may already be gone)
          }
        }
      }

      // 2. Delete collection notes (junction table)
      const collections = await ctx.db
        .query("collections")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();

      for (const collection of collections) {
        const collectionNotes = await ctx.db
          .query("collectionNotes")
          .withIndex("by_collection", (q) => q.eq("collectionId", collection._id))
          .collect();

        for (const note of collectionNotes) {
          await ctx.db.delete(note._id);
        }
      }

      // 3. Delete cards
      for (const card of cards) {
        // Delete card references first
        const outgoingRefs = await ctx.db
          .query("references")
          .withIndex("by_source", (q) => q.eq("sourceId", card._id))
          .collect();
        for (const ref of outgoingRefs) {
          await ctx.db.delete(ref._id);
        }

        const incomingRefs = await ctx.db
          .query("references")
          .withIndex("by_target", (q) => q.eq("targetId", card._id).eq("targetType", "card"))
          .collect();
        for (const ref of incomingRefs) {
          await ctx.db.delete(ref._id);
        }

        // Delete citations
        const citations = await ctx.db
          .query("citations")
          .withIndex("by_note", (q) => q.eq("noteId", card._id))
          .collect();
        for (const citation of citations) {
          await ctx.db.delete(citation._id);
        }

        await ctx.db.delete(card._id);
      }

      // 4. Delete collections
      for (const collection of collections) {
        await ctx.db.delete(collection._id);
      }

      // 5. Delete calendar events
      const events = await ctx.db
        .query("calendarEvents")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();

      for (const event of events) {
        await ctx.db.delete(event._id);
      }

      // 6. Delete todos
      const todos = await ctx.db
        .query("todos")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();

      for (const todo of todos) {
        await ctx.db.delete(todo._id);
      }

      // 7. Delete view settings
      const viewSettings = await ctx.db
        .query("viewSettings")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();

      for (const setting of viewSettings) {
        await ctx.db.delete(setting._id);
      }

      // 8. Delete remaining references for this workspace
      const workspaceRefs = await ctx.db
        .query("references")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();

      for (const ref of workspaceRefs) {
        await ctx.db.delete(ref._id);
      }

      // 9. Delete import jobs
      const importJobs = await ctx.db
        .query("importJobs")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();

      for (const job of importJobs) {
        await ctx.db.delete(job._id);
      }

      // 10. Delete the workspace
      await ctx.db.delete(workspaceId);
    }

    // Delete connected accounts (OAuth)
    const connectedAccounts = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const account of connectedAccounts) {
      await ctx.db.delete(account._id);
    }

    // Delete cloud connections (BYOS)
    const connections = await ctx.db
      .query("connections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const connection of connections) {
      await ctx.db.delete(connection._id);
    }

    // Delete auth-related data
    // Auth sessions
    const authSessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();

    for (const session of authSessions) {
      // Delete refresh tokens for this session
      const refreshTokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();

      for (const token of refreshTokens) {
        await ctx.db.delete(token._id);
      }

      await ctx.db.delete(session._id);
    }

    // Auth accounts (password, oauth providers)
    const authAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();

    for (const account of authAccounts) {
      // Delete verification codes for this account
      const verificationCodes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .collect();

      for (const code of verificationCodes) {
        await ctx.db.delete(code._id);
      }

      await ctx.db.delete(account._id);
    }

    // Finally, delete the user
    await ctx.db.delete(userId);

    return { success: true };
  },
});

// =================================================================
// DATA MANAGEMENT
// =================================================================

/**
 * Trash all user data (soft delete).
 * Moves ALL user content to trash with 30-day recovery period.
 * Does NOT delete the user account.
 * Use case: "I want to start fresh but might regret it"
 */
export const trashAllUserData = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const userId = user._id;
    const now = Date.now();

    // Get all workspaces for this user
    const workspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let trashedCount = {
      cards: 0,
      collections: 0,
      events: 0,
      todos: 0,
    };

    for (const workspace of workspaces) {
      const workspaceId = workspace._id;

      // Soft delete all cards
      const cards = await ctx.db
        .query("cards")
        .withIndex("by_workspace_deleted", (q) =>
          q.eq("workspaceId", workspaceId).eq("deleted", false)
        )
        .collect();

      for (const card of cards) {
        await ctx.db.patch(card._id, {
          deleted: true,
          deletedAt: now,
          updatedAt: now,
        });
        trashedCount.cards++;
      }

      // Soft delete all collections
      const collections = await ctx.db
        .query("collections")
        .withIndex("by_workspace_deleted", (q) =>
          q.eq("workspaceId", workspaceId).eq("deleted", false)
        )
        .collect();

      for (const collection of collections) {
        await ctx.db.patch(collection._id, {
          deleted: true,
          deletedAt: now,
          updatedAt: now,
        });
        trashedCount.collections++;
      }

      // Soft delete all calendar events
      const events = await ctx.db
        .query("calendarEvents")
        .withIndex("by_workspace_deleted", (q) =>
          q.eq("workspaceId", workspaceId).eq("deleted", false)
        )
        .collect();

      for (const event of events) {
        await ctx.db.patch(event._id, {
          deleted: true,
          deletedAt: now,
          updatedAt: now,
        });
        trashedCount.events++;
      }

      // Soft delete all todos
      const todos = await ctx.db
        .query("todos")
        .withIndex("by_workspace_deleted", (q) =>
          q.eq("workspaceId", workspaceId).eq("deleted", false)
        )
        .collect();

      for (const todo of todos) {
        await ctx.db.patch(todo._id, {
          deleted: true,
          deletedAt: now,
          updatedAt: now,
        });
        trashedCount.todos++;
      }

      // Soft delete references
      const references = await ctx.db
        .query("references")
        .withIndex("by_workspace_deleted", (q) =>
          q.eq("workspaceId", workspaceId).eq("deleted", false)
        )
        .collect();

      for (const ref of references) {
        await ctx.db.patch(ref._id, {
          deleted: true,
          deletedAt: now,
          updatedAt: now,
        });
      }
    }

    return { success: true, ...trashedCount };
  },
});

/**
 * Purge all user data (hard delete for GDPR).
 * IMMEDIATELY and PERMANENTLY deletes all user data.
 * Does NOT delete the user account.
 * Use case: "Delete my data" GDPR request
 */
export const purgeAllUserData = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const userId = user._id;

    // Get all workspaces for this user
    const workspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let deletedCount = {
      cards: 0,
      collections: 0,
      events: 0,
      todos: 0,
      files: 0,
    };

    for (const workspace of workspaces) {
      const workspaceId = workspace._id;

      // Get ALL cards (including already deleted ones)
      const cards = await ctx.db
        .query("cards")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();

      // Delete storage files first
      for (const card of cards) {
        if (card.storageId) {
          try {
            await ctx.storage.delete(card.storageId);
            deletedCount.files++;
          } catch {
            // Ignore storage deletion errors
          }
        }
      }

      // Delete collection notes (junction table)
      const collections = await ctx.db
        .query("collections")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();

      for (const collection of collections) {
        const collectionNotes = await ctx.db
          .query("collectionNotes")
          .withIndex("by_collection", (q) => q.eq("collectionId", collection._id))
          .collect();

        for (const note of collectionNotes) {
          await ctx.db.delete(note._id);
        }
      }

      // Delete cards and their references
      for (const card of cards) {
        const outgoingRefs = await ctx.db
          .query("references")
          .withIndex("by_source", (q) => q.eq("sourceId", card._id))
          .collect();
        for (const ref of outgoingRefs) {
          await ctx.db.delete(ref._id);
        }

        const incomingRefs = await ctx.db
          .query("references")
          .withIndex("by_target", (q) => q.eq("targetId", card._id).eq("targetType", "card"))
          .collect();
        for (const ref of incomingRefs) {
          await ctx.db.delete(ref._id);
        }

        const citations = await ctx.db
          .query("citations")
          .withIndex("by_note", (q) => q.eq("noteId", card._id))
          .collect();
        for (const citation of citations) {
          await ctx.db.delete(citation._id);
        }

        await ctx.db.delete(card._id);
        deletedCount.cards++;
      }

      // Delete collections
      for (const collection of collections) {
        await ctx.db.delete(collection._id);
        deletedCount.collections++;
      }

      // Delete calendar events
      const events = await ctx.db
        .query("calendarEvents")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();

      for (const event of events) {
        await ctx.db.delete(event._id);
        deletedCount.events++;
      }

      // Delete todos
      const todos = await ctx.db
        .query("todos")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();

      for (const todo of todos) {
        await ctx.db.delete(todo._id);
        deletedCount.todos++;
      }

      // Delete view settings
      const viewSettings = await ctx.db
        .query("viewSettings")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();

      for (const setting of viewSettings) {
        await ctx.db.delete(setting._id);
      }

      // Delete remaining references
      const workspaceRefs = await ctx.db
        .query("references")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();

      for (const ref of workspaceRefs) {
        await ctx.db.delete(ref._id);
      }

      // Delete import jobs
      const importJobs = await ctx.db
        .query("importJobs")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();

      for (const job of importJobs) {
        await ctx.db.delete(job._id);
      }

      // Keep the workspace but clear its preferences
      await ctx.db.patch(workspaceId, {
        preferences: undefined,
        updatedAt: Date.now(),
      });
    }

    // Delete connected accounts (OAuth tokens - GDPR sensitive)
    const connectedAccounts = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const account of connectedAccounts) {
      await ctx.db.delete(account._id);
    }

    // Delete cloud connections (BYOS tokens - GDPR sensitive)
    const connections = await ctx.db
      .query("connections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const connection of connections) {
      await ctx.db.delete(connection._id);
    }

    // Clear user's extension token (contains identifying prefix)
    await ctx.db.patch(userId, {
      extensionTokenHash: undefined,
      extensionTokenPrefix: undefined,
      extensionTokenCreatedAt: undefined,
      updatedAt: Date.now(),
    });

    return { success: true, ...deletedCount };
  },
});
