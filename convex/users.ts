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
