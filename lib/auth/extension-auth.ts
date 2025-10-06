import { prisma } from '@/lib/server/prisma'
import { User } from '@prisma/client'

// Extension tokens expire after 90 days
const TOKEN_EXPIRY_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

/**
 * Validate an extension token and return the associated user
 * Tokens expire after 90 days and must be regenerated
 */
export async function getUserByExtensionToken(token: string): Promise<User | null> {
  if (!token) {
    return null
  }

  try {
    const user = await prisma.user.findUnique({
      where: { extensionToken: token }
    })

    if (!user) {
      return null
    }

    // Check if token has expired
    if (user.extensionTokenCreatedAt) {
      const tokenAge = Date.now() - user.extensionTokenCreatedAt.getTime()

      if (tokenAge > TOKEN_EXPIRY_MS) {
        console.warn(`Extension token expired for user ${user.id} (age: ${Math.floor(tokenAge / (24 * 60 * 60 * 1000))} days)`)
        return null
      }
    }

    return user
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
