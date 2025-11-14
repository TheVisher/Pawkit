"use client";

import { useEffect, useRef } from "react";
import { useSettingsStore } from "./settings-store";

/**
 * Hook to load user settings from server on mount
 * Only loads once per session, respects serverSync flag
 */
export function useLoadSettings() {
  const loadFromServer = useSettingsStore((state) => state.loadFromServer);
  const serverSync = useSettingsStore((state) => state.serverSync);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Only load if:
    // 1. Haven't loaded yet this session
    // 2. Server sync is enabled

    if (!hasLoadedRef.current && serverSync) {
      console.log('[useLoadSettings] Loading settings from server (first time)');
      hasLoadedRef.current = true;
      loadFromServer();
    } else if (hasLoadedRef.current) {
    } else if (!serverSync) {
    }
  }, [loadFromServer, serverSync]);
}
