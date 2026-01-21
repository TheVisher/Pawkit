/**
 * Convex File Storage Functions
 *
 * Handles image uploads using Convex's native file storage.
 * Replaces Supabase Storage for card images.
 *
 * Two patterns supported:
 *
 * 1. Client-side upload (for user-selected images):
 *    - Client calls generateUploadUrl() to get a signed URL
 *    - Client uploads file directly to Convex storage
 *    - Client calls saveImageToCard() with the returned storageId
 *
 * 2. Server-side persistence (for expiring URLs):
 *    - Client calls persistImageFromUrl() action
 *    - Convex downloads the image and stores it
 *    - Card is updated with the permanent URL
 */

import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

/**
 * Generate a URL for uploading a file to Convex storage.
 * Returns a signed URL that the client can POST the file to.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Require authentication
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

async function requireCardOwner(ctx: any, cardId: Id<"cards">, userId: Id<"users">) {
  const card = await ctx.db.get(cardId);
  if (!card) {
    throw new Error("Card not found");
  }

  const workspace = await ctx.db.get(card.workspaceId);
  if (!workspace || workspace.userId !== userId) {
    throw new Error("Not authorized");
  }

  return card;
}

/**
 * Save an uploaded image to a card.
 * Called after the client uploads to the URL from generateUploadUrl().
 */
export const saveImageToCard = mutation({
  args: {
    cardId: v.id("cards"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { cardId, storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    await requireCardOwner(ctx, cardId, userId);

    // Get the URL for the stored file
    const imageUrl = await ctx.storage.getUrl(storageId);
    if (!imageUrl) {
      throw new Error("Failed to get storage URL");
    }

    // Update the card with the new image
    await ctx.db.patch(cardId, {
      storageId,
      image: imageUrl,
      updatedAt: Date.now(),
    });

    return { success: true, imageUrl };
  },
});

/**
 * Get the URL for a stored file by its storage ID.
 */
export const getUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.storage.getUrl(storageId);
  },
});

/**
 * Delete a stored file.
 * Typically called when a card is permanently deleted.
 */
export const deleteFile = mutation({
  args: {
    cardId: v.id("cards"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { cardId, storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const card = await requireCardOwner(ctx, cardId, userId);
    if (card.storageId !== storageId) {
      throw new Error("Storage ID does not match card");
    }

    await ctx.storage.delete(storageId);
    return { success: true };
  },
});

// =============================================================================
// SERVER-SIDE IMAGE PERSISTENCE
// =============================================================================

const DOWNLOAD_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Persist an image from an expiring URL to Convex storage.
 * This action downloads the image and stores it permanently.
 *
 * Used for TikTok, Instagram, etc. images that have expiring URLs.
 */
export const persistImageFromUrl = action({
  args: {
    cardId: v.id("cards"),
    imageUrl: v.string(),
  },
  handler: async (ctx, { cardId, imageUrl }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    await requireCardOwner(ctx, cardId, userId);

    console.log("[Storage] Persisting image for card:", cardId);

    try {
      const parsedUrl = new URL(imageUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return { success: false, error: "Unsupported URL protocol" };
      }
      const host = parsedUrl.hostname.toLowerCase();
      if (host === "localhost" || host === "::1") {
        return { success: false, error: "Local URLs are not allowed" };
      }
      if (isPrivateHost(host)) {
        return { success: false, error: "Private network URLs are not allowed" };
      }

      // Download the image with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

      const response = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn("[Storage] Download failed with status:", response.status);
        return { success: false, error: "Download failed" };
      }

      const blob = await response.blob();
      const contentType = response.headers.get("content-type") || "image/jpeg";

      // Store in Convex storage
      const storageId = await ctx.storage.store(blob);

      // Get the permanent URL
      const permanentUrl = await ctx.storage.getUrl(storageId);
      if (!permanentUrl) {
        return { success: false, error: "Failed to get storage URL" };
      }

      // Update the card with the internal mutation
      await ctx.runMutation(internal.storage.updateCardWithStoredImage, {
        cardId,
        storageId,
        imageUrl: permanentUrl,
      });

      console.log("[Storage] Successfully persisted image:", cardId);
      return { success: true, imageUrl: permanentUrl };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.warn("[Storage] Download timed out");
        return { success: false, error: "Download timed out" };
      }
      console.error("[Storage] Persistence error:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Internal mutation to update a card with a stored image.
 * Called by the persistImageFromUrl action.
 */
export const updateCardWithStoredImage = internalMutation({
  args: {
    cardId: v.id("cards"),
    storageId: v.id("_storage"),
    imageUrl: v.string(),
  },
  handler: async (ctx, { cardId, storageId, imageUrl }) => {
    await ctx.db.patch(cardId, {
      storageId,
      image: imageUrl,
      updatedAt: Date.now(),
    });
  },
});

function isPrivateHost(host: string): boolean {
  // IPv4 checks
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split(".").map((p) => Number(p));
    if (parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true;

    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }

  // IPv6 unique-local, link-local
  if (host.startsWith("fc") || host.startsWith("fd")) return true;
  if (host.startsWith("fe80")) return true;

  return false;
}
