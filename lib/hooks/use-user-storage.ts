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

        // Get current authenticated user
        const supabase = createClient();
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
        // Note: This will be implemented in Step 6
        try {
          const { useSettingsStore } = await import('@/lib/hooks/settings-store');
          const { useViewSettingsStore } = await import('@/lib/hooks/view-settings-store');

          // Call _switchUser on stores if method exists
          const settingsState = useSettingsStore.getState();
          const viewSettingsState = useViewSettingsStore.getState();

          if (typeof (settingsState as any)._switchUser === 'function') {
            await (settingsState as any)._switchUser(currentUserId, workspaceId);
          }

          if (typeof (viewSettingsState as any)._switchUser === 'function') {
            await (viewSettingsState as any)._switchUser(currentUserId, workspaceId);
          }
        } catch (storeError) {
          // Non-critical - continue anyway
        }

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
