"use client";

import { useEffect, useRef } from "react";
import { useDataStore } from "@/lib/stores/data-store";

/**
 * Network sync hook that automatically retries failed operations when connection is restored
 *
 * Features:
 * - Listens for browser online/offline events
 * - Drains sync queue when connection returns
 * - Periodic fallback drain every 30s (in case online event is missed)
 * - Prevents duplicate drains with debouncing
 */
export function useNetworkSync() {
  const drainQueue = useDataStore((state) => state.drainQueue);
  const isDrainingRef = useRef(false);
  const lastDrainRef = useRef(0);

  useEffect(() => {
    const MIN_DRAIN_INTERVAL = 5000; // Don't drain more than once per 5 seconds

    const safeDrain = async () => {
      const now = Date.now();

      // Prevent duplicate drains
      if (isDrainingRef.current || (now - lastDrainRef.current) < MIN_DRAIN_INTERVAL) {
        console.log('[NetworkSync] Skipping drain - too soon or already draining');
        return;
      }

      isDrainingRef.current = true;
      lastDrainRef.current = now;

      try {
        console.log('[NetworkSync] Connection restored - draining queue');
        await drainQueue();
      } catch (error) {
        console.error('[NetworkSync] Failed to drain queue:', error);
      } finally {
        isDrainingRef.current = false;
      }
    };

    // Listen for network status changes
    const handleOnline = () => {
      console.log('[NetworkSync] Browser is online');
      safeDrain();
    };

    const handleOffline = () => {
      console.log('[NetworkSync] Browser is offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic fallback drain (in case online event is missed or user was already online)
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        safeDrain();
      }
    }, 30000); // Every 30 seconds

    // Initial drain attempt on mount (handles app startup)
    if (navigator.onLine) {
      // Small delay to ensure store is initialized
      setTimeout(safeDrain, 1000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [drainQueue]);
}
