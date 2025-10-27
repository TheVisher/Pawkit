import { prisma } from '@/lib/server/prisma'
import type { PrismaUser } from '@/lib/types'
import bcrypt from 'bcryptjs'

// Extension tokens expire after 30 days (reduced from 90 for better security)
const TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Validate an extension token and return the associated user
 * Tokens expire after 30 days and must be regenerated
 * Note: Tokens are hashed in the database, so we need to check all users
 * and compare hashes (performance consideration for future: add token index)
 */
export async function getUserByExtensionToken(token: string): Promise<PrismaUser | null> {
  if (!token) {
    return null
  }

  try {
    // Fetch all users with extension tokens
    // Note: This is necessary because tokens are hashed and we can't query by hash
    // For better performance at scale, consider adding a separate tokens table
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
      const tokenAge = Date.now() - user.extensionTokenCreatedAt.getTime()
      if (tokenAge > TOKEN_EXPIRY_MS) {
        continue
      }

      // Compare the provided token with the hashed token
      const isValid = await bcrypt.compare(token, user.extensionToken)
      if (isValid) {
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
