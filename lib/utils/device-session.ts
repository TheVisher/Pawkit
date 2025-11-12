/**
 * Device Session Tracking
 *
 * Generates a persistent device ID and tracks when this device is actively used.
 * This helps the sync system prefer changes from the device the user is currently on.
 */

const DEVICE_ID_KEY = 'pawkit-device-id';
const LAST_ACTIVE_KEY = 'pawkit-last-active';
const ACTIVITY_THRESHOLD = 60 * 60 * 1000; // 1 hour - device is "active" if used within 1 hour
const STALE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours - device is "stale" if not synced in 24 hours

// Session ID - unique per tab/window (stored in memory, not localStorage)
let sessionId: string | null = null;

/**
 * Get or create a unique session ID for this tab/window
 * Each tab gets its own unique ID (not shared via localStorage)
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';

  if (!sessionId) {
    // Generate a new session ID unique to this tab
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  return sessionId;
}

/**
 * Get or create a unique device ID for this browser/device
 * This is shared across all tabs via localStorage
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    // Generate a new device ID
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

/**
 * Mark this device as currently active
 * Call this whenever the user interacts with the app
 */
export function markDeviceActive(): void {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  localStorage.setItem(LAST_ACTIVE_KEY, now.toString());
}

/**
 * Get the last active timestamp for this device
 */
export function getLastActiveTime(): number {
  if (typeof window === 'undefined') return 0;

  const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
  return lastActive ? parseInt(lastActive, 10) : 0;
}

/**
 * Check if this device was recently active (within 1 hour)
 * If true, this device should be considered the "source of truth"
 */
export function isDeviceRecentlyActive(): boolean {
  const lastActive = getLastActiveTime();
  const now = Date.now();
  return (now - lastActive) < ACTIVITY_THRESHOLD;
}

/**
 * Check if a timestamp indicates stale data (older than 24 hours)
 * Used to determine if data from another device is stale
 */
export function isTimestampStale(timestamp: string | number): boolean {
  const timestampMs = typeof timestamp === 'string'
    ? new Date(timestamp).getTime()
    : timestamp;
  const now = Date.now();
  return (now - timestampMs) > STALE_THRESHOLD;
}

/**
 * Get device metadata to send with sync requests
 */
export function getDeviceMetadata(): {
  deviceId: string;
  lastActive: number;
  isActive: boolean;
} {
  return {
    deviceId: getDeviceId(),
    lastActive: getLastActiveTime(),
    isActive: isDeviceRecentlyActive(),
  };
}

/**
 * Initialize activity tracking
 * Sets up listeners to mark device as active on user interaction
 */
export function initActivityTracking(): void {
  if (typeof window === 'undefined') return;

  // Mark as active immediately
  markDeviceActive();

  // Track user activity
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

  let activityTimeout: NodeJS.Timeout | null = null;

  const handleActivity = () => {
    // Debounce: only update every 10 seconds
    if (activityTimeout) return;

    markDeviceActive();

    activityTimeout = setTimeout(() => {
      activityTimeout = null;
    }, 10000); // 10 seconds
  };

  events.forEach(event => {
    window.addEventListener(event, handleActivity, { passive: true });
  });

  // Update on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      markDeviceActive();
    }
  });
}
