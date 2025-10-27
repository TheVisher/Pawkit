/**
 * Multi-Session Detection Hook
 *
 * Detects when the user is logged in on another device and provides
 * a way to take over as the active device.
 */

import { useEffect, useState } from 'react';
import { getDeviceId, getDeviceMetadata } from '@/lib/utils/device-session';

type DeviceSession = {
  id: string;
  deviceId: string;
  deviceName: string;
  browser: string | null;
  os: string | null;
  lastActive: string;
};

type SessionState = {
  otherDevices: DeviceSession[];
  isCheckingMultipleSessions: boolean;
};

export function useMultiSessionDetector() {
  const [sessionState, setSessionState] = useState<SessionState>({
    otherDevices: [],
    isCheckingMultipleSessions: false,
  });

  useEffect(() => {
    const currentDeviceId = getDeviceId();
    let heartbeatInterval: NodeJS.Timeout | null = null;
    let checkInterval: NodeJS.Timeout | null = null;

    // Send heartbeat every 30 seconds
    const sendHeartbeat = async () => {
      try {
        const metadata = getDeviceMetadata();
        const deviceName = getDeviceName();

        await fetch('/api/sessions/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: metadata.deviceId,
            deviceName,
            browser: getBrowserName(),
            os: getOSName(),
          }),
        });
      } catch (error) {
        console.error('[MultiSession] Heartbeat failed:', error);
      }
    };

    // Check for other active sessions
    const checkSessions = async () => {
      try {
        const response = await fetch('/api/sessions/heartbeat');
        if (response.ok) {
          const data = await response.json();
          const sessions = data.sessions as DeviceSession[];

          // Filter out current device
          const otherDevices = sessions.filter(
            (s) => s.deviceId !== currentDeviceId
          );

          setSessionState({
            otherDevices,
            isCheckingMultipleSessions: false,
          });
        }
      } catch (error) {
        console.error('[MultiSession] Check failed:', error);
      }
    };

    // Send initial heartbeat
    sendHeartbeat();
    checkSessions();

    // Set up intervals
    heartbeatInterval = setInterval(sendHeartbeat, 30000); // 30 seconds
    checkInterval = setInterval(checkSessions, 30000); // 30 seconds

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  // Take over as active device (just mark this device as active)
  const takeoverSession = async () => {
    const metadata = getDeviceMetadata();
    const deviceName = getDeviceName();

    try {
      await fetch('/api/sessions/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: metadata.deviceId,
          deviceName,
          browser: getBrowserName(),
          os: getOSName(),
        }),
      });

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

/**
 * Get human-readable device name
 */
function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Unknown Device';

  const ua = navigator.userAgent;
  let deviceType = 'Desktop';

  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
    if (/iPad/i.test(ua)) deviceType = 'iPad';
    else if (/iPhone/i.test(ua)) deviceType = 'iPhone';
    else deviceType = 'Mobile';
  } else if (/Macintosh/i.test(ua)) {
    deviceType = 'Mac';
  } else if (/Windows/i.test(ua)) {
    deviceType = 'PC';
  } else if (/Linux/i.test(ua)) {
    deviceType = 'Linux';
  }

  const browser = getBrowserName();
  return `${deviceType} - ${browser}`;
}

/**
 * Get browser name
 */
function getBrowserName(): string {
  if (typeof window === 'undefined') return 'Unknown';

  const ua = navigator.userAgent;

  if (/Edg/i.test(ua)) return 'Edge';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/MSIE|Trident/i.test(ua)) return 'IE';

  return 'Browser';
}

/**
 * Get OS name
 */
function getOSName(): string {
  if (typeof window === 'undefined') return 'Unknown';

  const ua = navigator.userAgent;

  if (/Windows/i.test(ua)) return 'Windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  if (/Android/i.test(ua)) return 'Android';
  if (/iOS|iPhone|iPad|iPod/i.test(ua)) return 'iOS';

  return 'Unknown';
}
