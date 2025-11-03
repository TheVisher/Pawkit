'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

type AuthContextType = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for changes on auth state (sign in, sign out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      router.refresh()
    })

    return () => subscription.unsubscribe()
  }, [router, supabase.auth])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    try {
      // CRITICAL SECURITY FIX: Clear all user data before logging out
      console.log('[Auth] Starting logout cleanup...');

      // 1. Get current user ID before clearing session
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userId = currentUser?.id;

      if (userId) {
        // 2. Import storage services (dynamic import to avoid circular dependencies)
        const { localDb } = await import('@/lib/services/local-storage');
        const { syncQueue } = await import('@/lib/services/sync-queue');

        // 3. Clear ALL workspace databases for this user
        await localDb.clearUserData(userId);
        await syncQueue.clearUserData(userId);
        console.log('[Auth] Cleared IndexedDB databases for user:', userId);

        // 4. Clear user-specific localStorage keys
        // Find all keys that belong to this user
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            // Remove keys that include userId or are workspace-related
            if (key.includes(userId) ||
                key.startsWith('vbm-settings-') ||
                key.startsWith('view-settings-storage-') ||
                key.startsWith('control-panel-state-')) {
              keysToRemove.push(key);
            }
          }
        }

        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          console.log('[Auth] Removed localStorage key:', key);
        });

        // 5. Clear session markers
        localStorage.removeItem('pawkit_last_user_id');
        localStorage.removeItem('pawkit_active_device');

        // 6. Close database connections
        await localDb.close();
        await syncQueue.close();
        console.log('[Auth] Closed all database connections');
      } else {
        console.warn('[Auth] No user ID found during logout, clearing session markers only');
        localStorage.removeItem('pawkit_last_user_id');
        localStorage.removeItem('pawkit_active_device');
      }

      // 7. Clear Supabase auth session
      await supabase.auth.signOut();
      console.log('[Auth] Logout complete');

      // 8. Redirect to login
      router.push('/login');
    } catch (error) {
      console.error('[Auth] Error during logout cleanup:', error);
      // Still proceed with logout even if cleanup fails
      await supabase.auth.signOut();
      router.push('/login');
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
