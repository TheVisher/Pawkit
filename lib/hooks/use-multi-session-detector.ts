/**
 * Multi-Session Detection Hook
 *
 * Detects when the user is logged in on multiple tabs/windows and provides
 * a way to take over as the active device.
 *
 * Uses localStorage for cross-tab communication (no server polling).
 */

import { useEffect, useState } from 'react';
import { getSessionId, getDeviceMetadata } from '@/lib/utils/device-session';

type OtherDevice = {
  deviceId: string;
  timestamp: number;
};

type SessionState = {
  otherDevices: OtherDevice[];
  isCheckingMultipleSessions: boolean;
};

export function useMultiSessionDetector() {
  // Initialize state with safe defaults (no localStorage access during SSR)
  const [sessionState, setSessionState] = useState<SessionState>({
    otherDevices: [],
    isCheckingMultipleSessions: false,
  });

  const [isActive, setIsActive] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {

    // Mark as mounted (client-side only)
    setMounted(true);

    const currentSessionId = getSessionId();

    // Check if another session is already active
    const activeSessionId = localStorage.getItem('pawkit_active_device');

    if (activeSessionId && activeSessionId !== currentSessionId) {
      setIsActive(false);

      // Populate otherDevices so banner shows
      setSessionState({
        otherDevices: [{
          deviceId: activeSessionId,
          timestamp: Date.now()
        }],
        isCheckingMultipleSessions: false,
      });
    } else {
      // This is the active session, mark it in localStorage
      localStorage.setItem('pawkit_active_device', currentSessionId);
      setIsActive(true);

      // Clear other devices
      setSessionState({
        otherDevices: [],
        isCheckingMultipleSessions: false,
      });
    }

    // Note: Multi-session detection now uses localStorage only
    // No server-side heartbeat needed - cross-tab communication via storage events

    // Listen for storage events (cross-tab communication)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pawkit_active_device' && e.newValue) {
        const activeSessionId = e.newValue;
        if (activeSessionId !== currentSessionId) {
          setIsActive(false);

          // Populate otherDevices so banner shows
          setSessionState({
            otherDevices: [{
              deviceId: activeSessionId,
              timestamp: Date.now()
            }],
            isCheckingMultipleSessions: false,
          });
        } else {
          // This tab became active again
          setIsActive(true);
          setSessionState({
            otherDevices: [],
            isCheckingMultipleSessions: false,
          });
        }
      }
    };

    // Listen for cross-tab communication
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Take over as active session
  const takeoverSession = () => {
    const currentSessionId = getSessionId();

    try {
      // Broadcast to other tabs that THIS session is now active
      // This will trigger the storage event listener in other tabs
      localStorage.setItem('pawkit_active_device', currentSessionId);
      localStorage.setItem('pawkit_takeover_timestamp', Date.now().toString());

      // Ensure this session is marked as active
      setIsActive(true);

      // Clear other devices from UI
      setSessionState({
        otherDevices: [],
        isCheckingMultipleSessions: false,
      });
    } catch (error) {
      console.error('[MultiSession] Takeover failed:', error);
    }
  };

  return {
    ...sessionState,
    takeoverSession,
    hasOtherSessions: sessionState.otherDevices.length > 0,
  };
}
