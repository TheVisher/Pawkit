import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/server/prisma'
import { randomBytes } from 'crypto'
import { rateLimit, getRateLimitHeaders } from '@/lib/utils/rate-limit'
import bcrypt from 'bcryptjs'

/**
 * Generate a new extension token for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting: 5 token generations per hour per user (prevents abuse)
    const rateLimitResult = rateLimit({
      identifier: `token-gen:${user.id}`,
      limit: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many token generation requests. Please try again later.' },
        {
          status: 429,
          headers: rateLimitHeaders
        }
      );
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
    return NextResponse.json({ token }, { headers: rateLimitHeaders })
  } catch (error) {
    console.error('Error generating extension token:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}

/**
 * Revoke the user's extension token
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        extensionToken: null,
        extensionTokenCreatedAt: null
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error revoking extension token:', error)
    return NextResponse.json(
      { error: 'Failed to revoke token' },
      { status: 500 }
    )
  }
}
