import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/server/prisma'
import { User } from '@prisma/client'

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Ensure user exists in our database (upsert on every request ensures sync)
  const dbUser = await prisma.user.upsert({
    where: { id: user.id },
    update: {
      email: user.email!,
      updatedAt: new Date()
    },
    create: {
      id: user.id,
      email: user.email!
    },
  })

  return dbUser
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}
