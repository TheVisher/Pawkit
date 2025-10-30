import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/server/prisma'
import { randomBytes } from 'crypto'
import { rateLimit, getRateLimitHeaders } from '@/lib/utils/rate-limit'
import { handleApiError } from '@/lib/utils/api-error'
import { unauthorized, rateLimited, success } from '@/lib/utils/api-responses'
import bcrypt from 'bcryptjs'

/**
 * Generate a new extension token for the authenticated user
 */
export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    // Rate limiting: 5 token generations per hour per user (prevents abuse)
    const rateLimitResult = rateLimit({
      identifier: `token-gen:${user.id}`,
      limit: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.allowed) {
      const response = rateLimited('Too many token generation requests. Please try again later.');
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        response.headers.set(key, value as string);
      });
      return response;
    }

    // Generate a secure random token (32 bytes = 64 hex characters)
    const token = randomBytes(32).toString('hex')

    // Hash the token before storing (using bcrypt with 10 rounds)
    const hashedToken = await bcrypt.hash(token, 10)

    // Store hashed token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        extensionToken: hashedToken,
        extensionTokenCreatedAt: new Date()
      }
    })

    // Return the plain token to the user (they need this for the extension)
    // This is the only time they'll see it - it's hashed in the database
    const response = success({ token });
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value as string);
    });
    return response;
  } catch (error) {
    return handleApiError(error, { route: '/api/extension/token', userId: user?.id });
  }
}

/**
 * Revoke the user's extension token
 */
export async function DELETE(request: NextRequest) {
  let user;
  try {
    user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        extensionToken: null,
        extensionTokenCreatedAt: null
      }
    })

    return success({ ok: true, message: 'Extension token revoked successfully' });
  } catch (error) {
    return handleApiError(error, { route: '/api/extension/token', userId: user?.id });
  }
}
