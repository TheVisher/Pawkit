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
import { mutation, query, action, internalMutation, internalAction } from "./_generated/server";
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
const MAX_DOWNLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit for fetched images

/**
 * Check if a blob is likely an image by examining its magic bytes.
 * Only used when content-type is ambiguous (empty or octet-stream).
 * Supports JPEG, PNG, GIF, and WebP formats.
 */
async function isLikelyImage(blob: Blob): Promise<boolean> {
  // Guard: need at least 12 bytes for WebP check
  if (blob.size < 12) return false;

  const header = await blob.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(header);

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true;
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return true;

  return false;
}

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

      // Validate file size before storing
      if (blob.size > MAX_DOWNLOAD_SIZE_BYTES) {
        console.warn("[Storage] Image too large:", blob.size, "bytes");
        return { success: false, error: "Image exceeds 5MB size limit" };
      }

      // Store in Convex storage
      const storageId = await ctx.storage.store(blob);

      // Get the permanent URL
      const permanentUrl = await ctx.storage.getUrl(storageId);
      if (!permanentUrl) {
        return { success: false, error: "Failed to get storage URL" };
      }

      // Update the card with the internal mutation
      // Pass originalImageUrl so we can check if user edited it since scheduling
      const result: { updated: boolean; reason?: string } = await ctx.runMutation(
        internal.storage.updateCardWithStoredImage,
        {
          cardId,
          storageId,
          imageUrl: permanentUrl,
          originalImageUrl: imageUrl,
        }
      );

      // Check if update was skipped (expected behavior, not an error)
      if (!result.updated) {
        console.log("[Storage] Update skipped:", result.reason);
        return { success: true, skipped: true, reason: result.reason };
      }

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
 *
 * Safety checks:
 * - Card must still exist and not be deleted
 * - Original image URL must match (avoid overwriting user edits)
 */
export const updateCardWithStoredImage = internalMutation({
  args: {
    cardId: v.id("cards"),
    storageId: v.id("_storage"),
    imageUrl: v.string(),
    originalImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, { cardId, storageId, imageUrl, originalImageUrl }) => {
    const card = await ctx.db.get(cardId);

    // Safety: Don't update if card was deleted or doesn't exist
    if (!card || card.deleted) {
      console.log("[Storage] Card not found or deleted, skipping update:", cardId);
      return { updated: false, reason: "card_not_found" };
    }

    // Safety: Don't overwrite if user has changed the image since scheduling
    if (originalImageUrl && card.image !== originalImageUrl) {
      console.log("[Storage] Card image changed since scheduling, skipping update:", cardId);
      return { updated: false, reason: "image_changed" };
    }

    await ctx.db.patch(cardId, {
      storageId,
      image: imageUrl,
      updatedAt: Date.now(),
    });

    return { updated: true };
  },
});

function isPrivateHost(host: string): boolean {
  // Check for localhost and loopback
  if (host === "localhost") return true;
  if (host === "::1") return true;

  // Check for .local domains
  if (host.endsWith(".local")) return true;

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

  // IPv6 unique-local (fc00::/7), link-local (fe80::/10)
  if (host.startsWith("fc") || host.startsWith("fd")) return true;
  if (host.startsWith("fe80")) return true;

  return false;
}

// =============================================================================
// INTERNAL IMAGE PERSISTENCE (for server-to-server calls)
// =============================================================================

/**
 * Internal action to persist an image from an expiring URL.
 * Called by the metadata scraper - no auth required since it's server-to-server.
 */
export const persistImageInternal = internalAction({
  args: {
    cardId: v.id("cards"),
    imageUrl: v.string(),
  },
  handler: async (ctx, { cardId, imageUrl }) => {
    console.log("[Storage] Persisting image for card (internal):", cardId);

    try {
      const parsedUrl = new URL(imageUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        console.warn("[Storage] Unsupported protocol:", parsedUrl.protocol);
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
        return { success: false, error: `Download failed: ${response.status}` };
      }

      const blob = await response.blob();

      // Validate file size before storing
      if (blob.size > MAX_DOWNLOAD_SIZE_BYTES) {
        console.warn("[Storage] Image too large:", blob.size, "bytes");
        return { success: false, error: "Image exceeds 5MB size limit" };
      }

      // Validate content-type
      const contentType = response.headers.get("content-type") || "";

      // Clear image types pass through
      if (contentType.startsWith("image/")) {
        // Explicitly valid
      } else if (
        contentType === "application/octet-stream" ||
        contentType === "" ||
        contentType === "binary/octet-stream"
      ) {
        // Ambiguous content-type: validate with magic bytes to avoid storing HTML as image
        if (!(await isLikelyImage(blob))) {
          console.warn("[Storage] Magic byte check failed for ambiguous content-type:", contentType);
          return { success: false, error: "URL does not return a recognizable image format" };
        }
      } else {
        console.warn("[Storage] Unexpected content-type:", contentType);
        return { success: false, error: "URL does not return an image" };
      }

      // Store in Convex storage
      const storageId = await ctx.storage.store(blob);

      // Get the permanent URL
      const permanentUrl = await ctx.storage.getUrl(storageId);
      if (!permanentUrl) {
        return { success: false, error: "Failed to get storage URL" };
      }

      // Update the card with the internal mutation
      // Pass originalImageUrl so we can check if user edited it since scheduling
      const result: { updated: boolean; reason?: string } = await ctx.runMutation(
        internal.storage.updateCardWithStoredImage,
        {
          cardId,
          storageId,
          imageUrl: permanentUrl,
          originalImageUrl: imageUrl,
        }
      );

      // Check if update was skipped (expected behavior, not an error)
      if (!result.updated) {
        console.log("[Storage] Update skipped:", result.reason);
        return { success: true, skipped: true, reason: result.reason };
      }

      console.log("[Storage] Successfully persisted image:", cardId, "->", permanentUrl.substring(0, 60));
      return { success: true, imageUrl: permanentUrl };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.warn("[Storage] Download timed out for card:", cardId);
        return { success: false, error: "Download timed out" };
      }
      console.error("[Storage] Persistence error for card:", cardId, error);
      return { success: false, error: String(error) };
    }
  },
});
