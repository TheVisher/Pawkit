/**
 * Convex-based Rate Limiter for HTTP API Endpoints
 *
 * Uses the database for persistent rate limiting across Convex instances.
 * Implements a sliding window algorithm with IP-based limiting.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Rate limit configurations per endpoint
export const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "/api/metadata": { limit: 30, windowMs: 60_000 }, // 30 req/min - expensive scraping
  "/api/article": { limit: 20, windowMs: 60_000 }, // 20 req/min - heavy processing
  "/api/link-check": { limit: 50, windowMs: 60_000 }, // 50 req/min - batch operations
  "/api/tweet": { limit: 60, windowMs: 60_000 }, // 60 req/min - lightweight
  "/api/reddit": { limit: 40, windowMs: 60_000 }, // 40 req/min - external API
  "/api/tiktok": { limit: 30, windowMs: 60_000 }, // 30 req/min - oEmbed calls
  "/api/pinterest": { limit: 30, windowMs: 60_000 }, // 30 req/min - URL resolution
  "/api/facebook": { limit: 30, windowMs: 60_000 }, // 30 req/min - URL resolution
};

/**
 * Extract client IP from request headers.
 * Checks X-Forwarded-For, X-Real-IP, and falls back to CF-Connecting-IP.
 */
export function getClientIp(request: Request): string {
  // Check standard proxy headers
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first (client)
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // Cloudflare
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  // Fallback - unknown client
  return "unknown";
}

/**
 * Check rate limit for a request.
 * Returns { allowed: true } or { allowed: false, retryAfter: seconds }
 */
export const checkRateLimit = internalQuery({
  args: {
    ip: v.string(),
    endpoint: v.string(),
    now: v.number(),
  },
  handler: async (ctx, { ip, endpoint, now }) => {
    const config = RATE_LIMITS[endpoint];
    if (!config) {
      // Unknown endpoint - allow by default
      return { allowed: true };
    }

    const key = `${ip}:${endpoint}`;
    const record = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (!record) {
      // No record - first request, allow
      return { allowed: true, currentCount: 0 };
    }

    const windowStart = record.windowStart;
    const windowEnd = windowStart + config.windowMs;

    if (now >= windowEnd) {
      // Window expired - reset, allow
      return { allowed: true, currentCount: 0, needsReset: true };
    }

    // Within window - check count
    if (record.count >= config.limit) {
      const retryAfter = Math.ceil((windowEnd - now) / 1000);
      return { allowed: false, retryAfter, currentCount: record.count };
    }

    return { allowed: true, currentCount: record.count };
  },
});

/**
 * Record a request for rate limiting.
 * Increments the count or creates a new window.
 */
export const recordRequest = internalMutation({
  args: {
    ip: v.string(),
    endpoint: v.string(),
    now: v.number(),
  },
  handler: async (ctx, { ip, endpoint, now }) => {
    const config = RATE_LIMITS[endpoint];
    if (!config) {
      return; // Unknown endpoint
    }

    const key = `${ip}:${endpoint}`;
    const record = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    const expiresAt = now + config.windowMs * 2; // Keep for 2 windows

    if (!record) {
      // Create new record
      await ctx.db.insert("rateLimits", {
        key,
        count: 1,
        windowStart: now,
        expiresAt,
      });
      return;
    }

    const windowEnd = record.windowStart + config.windowMs;

    if (now >= windowEnd) {
      // Window expired - reset
      await ctx.db.patch(record._id, {
        count: 1,
        windowStart: now,
        expiresAt,
      });
    } else {
      // Increment count
      await ctx.db.patch(record._id, {
        count: record.count + 1,
        expiresAt,
      });
    }
  },
});

/**
 * Clean up expired rate limit records.
 * Should be called periodically via a cron job.
 */
export const cleanupExpiredRecords = internalMutation({
  args: {
    now: v.number(),
  },
  handler: async (ctx, { now }) => {
    const expired = await ctx.db
      .query("rateLimits")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .take(100); // Process in batches

    for (const record of expired) {
      await ctx.db.delete(record._id);
    }

    return { deleted: expired.length };
  },
});
