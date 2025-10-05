import { prisma } from '@/lib/server/prisma'
import { User } from '@prisma/client'

/**
 * Validate an extension token and return the associated user
 */
export async function getUserByExtensionToken(token: string): Promise<User | null> {
  if (!token) {
    return null
  }

  try {
    const user = await prisma.user.findUnique({
      where: { extensionToken: token }
    })

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
