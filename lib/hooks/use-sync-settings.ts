"use client";

import { useEffect, useRef } from "react";
import { useSettingsStore } from "@/lib/hooks/settings-store";

/**
 * Hook to sync localStorage serverSync setting with database
 * This ensures the middleware can enforce local-only mode server-side
 */
export function useSyncSettings() {
  const serverSync = useSettingsStore((state) => state.serverSync);
  const setServerSync = useSettingsStore((state) => state.setServerSync);
  const hasSynced = useRef(false);

  useEffect(() => {
    // Only sync once on mount
    if (hasSynced.current) return;
    hasSynced.current = true;

    const syncSettings = async () => {
      try {
        // Fetch current user profile with serverSync setting
        const response = await fetch('/api/user');
        if (!response.ok) return;

        const data = await response.json();
        const dbServerSync = data.serverSync ?? true;

        // If localStorage and database differ, update both to match localStorage
        // This gives localStorage (user's local preference) priority
        if (dbServerSync !== serverSync) {
          console.log('[SyncSettings] Syncing serverSync:', serverSync, '-> database');
          await setServerSync(serverSync);
        }
      } catch (error) {
        console.error('[SyncSettings] Failed to sync settings:', error);
      }
    };

    syncSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount, prevent infinite loop
}
