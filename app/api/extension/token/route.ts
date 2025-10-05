import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/server/prisma'
import { randomBytes } from 'crypto'

/**
 * Generate a new extension token for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate a secure random token (32 bytes = 64 hex characters)
    const token = randomBytes(32).toString('hex')

    // Store token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        extensionToken: token,
        extensionTokenCreatedAt: new Date()
      }
    })

    return NextResponse.json({ token })
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
