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
    console.log('[useLoadSettings] Effect triggered. hasLoaded:', hasLoadedRef.current, 'serverSync:', serverSync);

    if (!hasLoadedRef.current && serverSync) {
      console.log('[useLoadSettings] Loading settings from server (first time)');
      hasLoadedRef.current = true;
      loadFromServer();
    } else if (hasLoadedRef.current) {
      console.log('[useLoadSettings] Already loaded settings this session, skipping');
    } else if (!serverSync) {
      console.log('[useLoadSettings] Server sync disabled, skipping load');
    }
  }, [loadFromServer, serverSync]);
}
