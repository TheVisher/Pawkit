import { prisma } from '@/lib/server/prisma'
import type { PrismaUser } from '@/lib/types'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// Extension tokens expire after 30 days (reduced from 90 for better security)
const TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// In-memory cache for validated tokens: tokenHash -> { userId, expiresAt }
// This reduces O(n) bcrypt comparisons to O(1) for repeated requests
const tokenCache = new Map<string, { userId: string; expiresAt: number }>();
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minute cache TTL

// Clean up expired cache entries periodically
function cleanupTokenCache() {
  const now = Date.now();
  for (const [hash, entry] of tokenCache.entries()) {
    if (entry.expiresAt < now) {
      tokenCache.delete(hash);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupTokenCache, 5 * 60 * 1000);
}

/**
 * Create a fast hash for cache lookup (not for security, just for keying)
 */
function hashTokenForCache(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Validate an extension token and return the associated user
 * Tokens expire after 30 days and must be regenerated
 * Uses in-memory caching to avoid O(n) bcrypt comparisons on every request
 */
export async function getUserByExtensionToken(token: string): Promise<PrismaUser | null> {
  if (!token) {
    return null
  }

  try {
    const tokenHash = hashTokenForCache(token);
    const now = Date.now();

    // Check cache first
    const cached = tokenCache.get(tokenHash);
    if (cached && cached.expiresAt > now) {
      // Fast path: return cached user
      const user = await prisma.user.findUnique({
        where: { id: cached.userId }
      });
      if (user) {
        return user;
      }
      // User not found (deleted?), invalidate cache
      tokenCache.delete(tokenHash);
    }

    // Slow path: need to check all tokens
    // Fetch all users with extension tokens
    const users = await prisma.user.findMany({
      where: {
        extensionToken: { not: null },
        extensionTokenCreatedAt: { not: null }
      }
    })

    // Check each user's hashed token
    for (const user of users) {
      if (!user.extensionToken || !user.extensionTokenCreatedAt) {
        continue
      }

      // Check if token has expired first (faster than bcrypt comparison)
      const tokenAge = now - user.extensionTokenCreatedAt.getTime()
      if (tokenAge > TOKEN_EXPIRY_MS) {
        continue
      }

      // Compare the provided token with the hashed token
      const isValid = await bcrypt.compare(token, user.extensionToken)
      if (isValid) {
        // Cache the valid token for future requests
        tokenCache.set(tokenHash, {
          userId: user.id,
          expiresAt: now + TOKEN_CACHE_TTL_MS
        });
        return user
      }
    }

    return null
  } catch (error) {
    console.error('Error validating extension token:', error)
    return null
  }
}

/**
 * Extract token from Authorization header
 * Supports both "Bearer TOKEN" and just "TOKEN" formats
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null
  }

  // Check if it's in "Bearer TOKEN" format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Otherwise return the whole header as token
  return authHeader
}
