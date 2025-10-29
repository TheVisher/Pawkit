/**
 * Multi-Session Detection Hook
 *
 * Detects when the user is logged in on multiple tabs/windows and provides
 * a way to take over as the active device.
 *
 * Uses localStorage for cross-tab communication (no server polling).
 */

import { useEffect, useState } from 'react';
import { getDeviceId, getDeviceMetadata } from '@/lib/utils/device-session';

type SessionState = {
  otherDevices: never[];
  isCheckingMultipleSessions: boolean;
};

export function useMultiSessionDetector() {
  const [sessionState, setSessionState] = useState<SessionState>({
    otherDevices: [],
    isCheckingMultipleSessions: false,
  });
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const currentDeviceId = getDeviceId();

    // Check if another device is already active
    const activeDeviceId = localStorage.getItem('pawkit_active_device');
    if (activeDeviceId && activeDeviceId !== currentDeviceId) {
      console.log('[MultiSession] Another device is active, starting in passive mode');
      setIsActive(false);
      return;
    } else {
      // This is the active device, mark it in localStorage
      localStorage.setItem('pawkit_active_device', currentDeviceId);
    }

    // Note: Multi-session detection now uses localStorage only
    // No server-side heartbeat needed - cross-tab communication via storage events

    // Listen for storage events (cross-tab communication)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pawkit_active_device' && e.newValue) {
        const activeDeviceId = e.newValue;
        if (activeDeviceId !== currentDeviceId) {
          console.log('[MultiSession] Another device took over, deactivating this session');
          setIsActive(false);
        }
      }
    };

    // Listen for cross-tab communication
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isActive]);

  // Take over as active device
  const takeoverSession = () => {
    const metadata = getDeviceMetadata();

    try {
      // Broadcast to other tabs that THIS device is now active
      // This will trigger the storage event listener in other tabs
      localStorage.setItem('pawkit_active_device', metadata.deviceId);
      localStorage.setItem('pawkit_takeover_timestamp', Date.now().toString());

      console.log('[MultiSession] Taking over as active device:', metadata.deviceId);

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
