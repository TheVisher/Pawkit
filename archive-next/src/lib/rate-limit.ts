/**
 * Simple in-memory rate limiter
 * Works immediately with zero setup, no external dependencies
 *
 * Limitations:
 * - Resets on server restart
 * - Doesn't persist across Vercel instances (acceptable for most use cases)
 */

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  windowMs: number = 60000,
  maxRequests: number = 10
): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Reset if window expired
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { success: true, remaining: maxRequests - 1 };
  }

  // Increment count
  entry.count++;

  const success = entry.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - entry.count);

  return { success, remaining };
}

// Clean up old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}
