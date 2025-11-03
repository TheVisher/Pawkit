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
    console.log('[Auth] ===== SIGN OUT INITIATED =====');

    try {
      // 1. Get current user ID before clearing session
      console.log('[Auth] Step 1: Getting current user...');
      const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser();

      if (getUserError) {
        console.error('[Auth] Error getting user:', getUserError);
      }

      const userId = currentUser?.id;
      console.log('[Auth] Current user ID:', userId);

      if (userId) {
        console.log('[Auth] Step 2: Importing storage services...');
        // 2. Import storage services (dynamic import to avoid circular dependencies)
        const { localDb } = await import('@/lib/services/local-storage');
        const { syncQueue } = await import('@/lib/services/sync-queue');
        console.log('[Auth] Storage services imported successfully');

        console.log('[Auth] Step 3: Clearing IndexedDB databases...');
        // 3. Clear ALL workspace databases for this user
        try {
          await localDb.clearUserData(userId);
          console.log('[Auth] ✓ Cleared localDb databases');
        } catch (dbError) {
          console.error('[Auth] Error clearing localDb:', dbError);
        }

        try {
          await syncQueue.clearUserData(userId);
          console.log('[Auth] ✓ Cleared syncQueue databases');
        } catch (queueError) {
          console.error('[Auth] Error clearing syncQueue:', queueError);
        }

        console.log('[Auth] Step 4: Clearing localStorage keys...');
        // 4. Clear user-specific localStorage keys
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

        console.log(`[Auth] Found ${keysToRemove.length} localStorage keys to remove:`, keysToRemove);
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });

        // 5. Clear session markers
        localStorage.removeItem('pawkit_last_user_id');
        localStorage.removeItem('pawkit_active_device');
        console.log('[Auth] ✓ Cleared localStorage keys');

        console.log('[Auth] Step 5: Closing database connections...');
        // 6. Close database connections
        try {
          await localDb.close();
          await syncQueue.close();
          console.log('[Auth] ✓ Closed all database connections');
        } catch (closeError) {
          console.error('[Auth] Error closing connections:', closeError);
        }
      } else {
        console.warn('[Auth] No user ID found, clearing session markers only');
        localStorage.removeItem('pawkit_last_user_id');
        localStorage.removeItem('pawkit_active_device');
      }

      console.log('[Auth] Step 6: Clearing Supabase auth session...');
      // 7. Clear Supabase auth session
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('[Auth] Error during Supabase signOut:', signOutError);
      } else {
        console.log('[Auth] ✓ Supabase session cleared');
      }

      console.log('[Auth] Step 7: Redirecting to login...');
      // 8. Redirect to login
      router.push('/login');
      console.log('[Auth] ===== LOGOUT COMPLETE =====');
    } catch (error) {
      console.error('[Auth] ===== CRITICAL ERROR DURING LOGOUT =====');
      console.error('[Auth] Error details:', error);
      console.error('[Auth] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

      // Still proceed with logout even if cleanup fails
      console.log('[Auth] Attempting fallback logout...');
      try {
        await supabase.auth.signOut();
        console.log('[Auth] Fallback logout successful');
      } catch (fallbackError) {
        console.error('[Auth] Fallback logout also failed:', fallbackError);
      }
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
