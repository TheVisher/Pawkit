/**
 * Simple in-memory rate limiter for API endpoints
 * Uses a sliding window approach to track requests per IP/token
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

// In-memory store (consider Redis for production multi-instance deployments)
const limitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of limitStore.entries()) {
    if (entry.resetAt < now) {
      limitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export type RateLimitConfig = {
  /** Unique identifier (IP address, user ID, token, etc.) */
  identifier: string;
  /** Maximum requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Check if a request is within rate limits
 *
 * @example
 * const result = rateLimit({
 *   identifier: request.ip || 'anonymous',
 *   limit: 10, // 10 requests
 *   windowMs: 60000 // per minute
 * });
 *
 * if (!result.allowed) {
 *   return new Response('Too many requests', { status: 429 });
 * }
 */
export function rateLimit(config: RateLimitConfig): RateLimitResult {
  const { identifier, limit, windowMs } = config;
  const now = Date.now();
  const key = `${identifier}:${windowMs}`;

  let entry = limitStore.get(key);

  // Create new entry if doesn't exist or expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
    limitStore.set(key, entry);
  }

  // Increment request count
  entry.count++;

  const allowed = entry.count <= limit;
  const remaining = Math.max(0, limit - entry.count);

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Rate limit middleware for Next.js API routes
 * Returns headers to include in response
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': String(result.remaining + (result.allowed ? 1 : 0)),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
  };
}
