'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { localDb, DEFAULT_WORKSPACE_ID } from '@/lib/services/local-storage';
import { syncQueue } from '@/lib/services/sync-queue';
import { migrateToUserSpecificStorage } from '@/lib/services/storage-migration';

/**
 * USER STORAGE HOOK - Manages user-specific storage isolation
 *
 * This hook is critical for security - it ensures that:
 * 1. IndexedDB databases are user-specific
 * 2. Data is cleared when users switch
 * 3. Migration happens automatically for existing users
 * 4. Workspace architecture is ready (using "default" for now)
 *
 * PERFORMANCE: Uses fast-path for returning users to avoid network blocking
 * - Checks localStorage for cached user ID and Supabase session
 * - If they match, initializes storage immediately (no network needed)
 * - Verifies auth in background for security
 *
 * SECURITY: This hook MUST be called before any data operations
 */
export function useUserStorage(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initializeUserStorage() {
      try {
        setIsLoading(true);
        setError(null);

        const supabase = createClient();

        // STEP 1: Check if we can fast-path for returning user (INSTANT - no network)
        const cachedUserId = localStorage.getItem('pawkit_last_user_id');

        // Get Supabase session from localStorage (stored by Supabase client)
        // The key format is 'sb-<project-ref>-auth-token'
        const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/\/\/([^.]+)/)?.[1];
        const storageKey = projectRef ? `sb-${projectRef}-auth-token` : null;
        let sessionUserId: string | null = null;

        if (storageKey) {
          const sessionStr = localStorage.getItem(storageKey);
          if (sessionStr) {
            try {
              const session = JSON.parse(sessionStr);
              sessionUserId = session?.user?.id || null;
            } catch {
              // Invalid session JSON - will fall back to network auth
            }
          }
        }

        // FAST PATH: Same user returning - trust cached data immediately
        if (cachedUserId && sessionUserId && cachedUserId === sessionUserId) {
          console.log('[useUserStorage] Fast path: returning user, loading local data immediately');

          // Initialize storage immediately (no network needed)
          await localDb.init(cachedUserId, workspaceId);
          await syncQueue.init(cachedUserId, workspaceId);

          // Update Zustand stores for user context
          await updateZustandStores(cachedUserId, workspaceId);

          if (!mounted) return;

          setUserId(cachedUserId);
          setIsReady(true);  // UI can now load from IndexedDB!
          setIsLoading(false);

          console.log('[useUserStorage] Fast path complete', {
            userId: cachedUserId,
            workspaceId,
            localDbContext: localDb.getContext(),
            syncQueueContext: syncQueue.getContext()
          });

          // Verify auth in background (non-blocking)
          verifyAuthInBackground(supabase, cachedUserId, workspaceId, mounted);
          return;
        }

        // SLOW PATH: New user, different user, or no session - must verify via network
        console.log('[useUserStorage] Slow path: verifying auth via network');
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          setError('Authentication error');
          setIsLoading(false);
          return;
        }

        if (!user) {
          setError('Not authenticated');
          setIsLoading(false);
          return;
        }

        if (!mounted) return;

        const currentUserId = user.id;

        // Check if this is a different user than last time
        const previousUserId = localStorage.getItem('pawkit_last_user_id');

        if (previousUserId && previousUserId !== currentUserId) {

          // CRITICAL: Clean up previous user's data
          await cleanupPreviousUser(previousUserId);
        }

        // Check if migration is needed (from old global database)
        const needsMigration = await checkIfMigrationNeeded(currentUserId, workspaceId);

        if (needsMigration) {
          try {
            await migrateToUserSpecificStorage(currentUserId, workspaceId);
          } catch (migrationError) {
            // Continue anyway - user might not have old data
          }
        }

        if (!mounted) return;

        // Initialize storage for current user
        await localDb.init(currentUserId, workspaceId);
        await syncQueue.init(currentUserId, workspaceId);

        // Update Zustand stores for user switching
        await updateZustandStores(currentUserId, workspaceId);

        // Store current user ID
        localStorage.setItem('pawkit_last_user_id', currentUserId);
        localStorage.setItem(`pawkit-${currentUserId}-active-workspace`, workspaceId);

        if (!mounted) return;

        setUserId(currentUserId);
        setIsReady(true);
        setIsLoading(false);

        console.log('[useUserStorage] Initialization complete', {
          userId: currentUserId,
          workspaceId,
          localDbContext: localDb.getContext(),
          syncQueueContext: syncQueue.getContext()
        });
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    }

    initializeUserStorage();

    return () => {
      mounted = false;
    };
  }, [workspaceId]);

  return {
    userId,
    workspaceId,
    isReady,
    isLoading,
    error
  };
}

/**
 * Update Zustand stores for user context
 */
async function updateZustandStores(userId: string, workspaceId: string): Promise<void> {
  try {
    const { useSettingsStore } = await import('@/lib/hooks/settings-store');
    const { useViewSettingsStore } = await import('@/lib/hooks/view-settings-store');

    // Call _switchUser on stores if method exists
    const settingsState = useSettingsStore.getState();
    const viewSettingsState = useViewSettingsStore.getState();

    if (typeof (settingsState as any)._switchUser === 'function') {
      await (settingsState as any)._switchUser(userId, workspaceId);
    }

    if (typeof (viewSettingsState as any)._switchUser === 'function') {
      await (viewSettingsState as any)._switchUser(userId, workspaceId);
    }
  } catch (storeError) {
    // Non-critical - continue anyway
  }
}

/**
 * Verify auth in background after fast-path initialization
 * If auth fails or user changed, handle gracefully
 */
async function verifyAuthInBackground(
  supabase: ReturnType<typeof createClient>,
  expectedUserId: string,
  workspaceId: string,
  mounted: boolean
): Promise<void> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.warn('[useUserStorage] Background auth failed - user may need to re-login');
      // Don't immediately kick them out - let them use local data
      // They'll get auth errors when trying to sync, which is fine
      return;
    }

    if (user.id !== expectedUserId) {
      console.warn('[useUserStorage] User mismatch detected - will reload with correct user');
      // This shouldn't happen normally, but if it does, reload the page
      // to reinitialize with the correct user
      if (mounted) {
        window.location.reload();
      }
      return;
    }

    // Update localStorage in case session was refreshed
    localStorage.setItem('pawkit_last_user_id', user.id);
    localStorage.setItem(`pawkit-${user.id}-active-workspace`, workspaceId);

    console.log('[useUserStorage] Background auth verified successfully');
  } catch (err) {
    console.warn('[useUserStorage] Background auth check failed:', err);
    // Non-critical - user can continue with local data
  }
}

/**
 * Check if migration from old global database is needed
 */
async function checkIfMigrationNeeded(userId: string, workspaceId: string): Promise<boolean> {
  try {
    // Check if user-specific database already exists
    const databases = await indexedDB.databases();
    const userDbName = `pawkit-${userId}-${workspaceId}-local-storage`;
    const hasUserDb = databases.some(db => db.name === userDbName);

    if (hasUserDb) {
      // User database exists, no migration needed
      return false;
    }

    // Check if old global database exists
    const oldDbName = 'pawkit-local-storage';
    const hasOldDb = databases.some(db => db.name === oldDbName);

    // Migration needed if old database exists but user database doesn't
    return hasOldDb;
  } catch (error) {
    return false;
  }
}

/**
 * Clean up previous user's data (called when user switches)
 */
async function cleanupPreviousUser(previousUserId: string): Promise<void> {
  try {

    // Clear IndexedDB databases
    await localDb.clearUserData(previousUserId);
    await syncQueue.clearUserData(previousUserId);

    // Clear localStorage keys for previous user
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(previousUserId)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    // Close any open connections
    await localDb.close();
    await syncQueue.close();

  } catch (error) {
    // Non-critical - continue anyway
  }
}
