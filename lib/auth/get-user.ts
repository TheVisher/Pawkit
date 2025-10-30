import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/server/prisma'
import type { PrismaUser } from '@/lib/types'
import { unstable_cache } from 'next/cache'

// Cache user lookup for 5 minutes to avoid repeated database queries
const getCachedUser = unstable_cache(
  async (userId: string) => {
    return prisma.user.findUnique({
      where: { id: userId }
    })
  },
  ['user-by-id'],
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

    // Try to get user from cache/database
    let dbUser = await getCachedUser(user.id)

    // If user doesn't exist, create them (only happens on first login)
    if (!dbUser) {
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

    return dbUser
  } catch (error) {
    console.error('Error in getCurrentUser:', error)
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
