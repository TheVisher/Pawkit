import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/server/prisma'
import type { PrismaUser } from '@/lib/types'
import { unstable_cache } from 'next/cache'

// Cache user lookup for 5 minutes to avoid repeated database queries
// CRITICAL: Cache key MUST include userId to prevent cross-user data leakage
const getCachedUser = unstable_cache(
  async (userId: string) => {
    return prisma.user.findUnique({
      where: { id: userId }
    })
  },
  ['user-by-id'], // This will be combined with the userId parameter
  { revalidate: 300, tags: ['user'] }
)

export async function getCurrentUser(): Promise<PrismaUser | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      console.error('[getCurrentUser] Supabase auth error:', error);
      return null
    }

    if (!user) {
      console.error('[getCurrentUser] No user from Supabase');
      return null
    }

    if (!user.email) {
      console.error('[getCurrentUser] User has no email');
      return null
    }

    console.log('[getCurrentUser] 🔑 Supabase user:', {
      id: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    });

    // Try to get user from cache/database
    let dbUser = await getCachedUser(user.id)

    // If user doesn't exist, create them (only happens on first login)
    if (!dbUser) {
      console.log('[getCurrentUser] Creating new user in database:', user.id);
      dbUser = await prisma.user.upsert({
        where: { id: user.id },
        update: {
          email: user.email,
          updatedAt: new Date()
        },
        create: {
          id: user.id,
          email: user.email
        },
      })
    }

    console.log('[getCurrentUser] ✅ Returning dbUser:', {
      id: dbUser.id,
      email: dbUser.email
    });

    return dbUser
  } catch (error) {
    console.error('[getCurrentUser] ❌ Error:', error)
    return null
  }
}

export async function requireUser(): Promise<PrismaUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}
