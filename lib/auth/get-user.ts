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

    // Debug logging for auth issues
    if (error) {
      console.log('[getCurrentUser] Supabase auth error:', error.message)
      return null
    }

    if (!user) {
      console.log('[getCurrentUser] No user in session')
      return null
    }

    if (!user.email) {
      console.log('[getCurrentUser] User has no email:', user.id)
      return null
    }

    // Try to get user from cache/database by ID
    let dbUser = await getCachedUser(user.id)

    // If user doesn't exist by ID, check if they exist by email
    // This handles cases where Supabase ID changed (e.g., different auth provider)
    if (!dbUser) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email: user.email }
      })

      if (existingByEmail) {
        // User exists with this email but different ID - update the ID
        // This can happen when signing in with a different auth provider
        console.log('[getCurrentUser] Updating user ID for email:', user.email)
        dbUser = await prisma.user.update({
          where: { email: user.email },
          data: {
            id: user.id,
            updatedAt: new Date()
          }
        })
      } else {
        // Truly new user - create them
        console.log('[getCurrentUser] Creating new user:', user.email)
        dbUser = await prisma.user.create({
          data: {
            id: user.id,
            email: user.email
          }
        })
      }
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
