import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/server/prisma'
import { User } from '@prisma/client'

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      console.log('No authenticated user:', error?.message)
      return null
    }

    if (!user.email) {
      console.log('User has no email')
      return null
    }

    // Ensure user exists in our database (upsert on every request ensures sync)
    const dbUser = await prisma.user.upsert({
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

    return dbUser
  } catch (error) {
    console.error('Error in getCurrentUser:', error)
    return null
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}
