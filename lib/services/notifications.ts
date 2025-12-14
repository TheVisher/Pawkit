"use client";

/**
 * Local Notification Service
 *
 * Handles browser notifications for calendar events and todos.
 * Note: Local notifications only work while the browser tab is open.
 * For notifications when the browser is closed, push notifications would be needed.
 */

export type NotificationPermissionStatus = "granted" | "denied" | "default" | "unsupported";

export interface ScheduledNotification {
  id: string;
  type: "event" | "todo";
  sourceId: string;
  title: string;
  body: string;
  scheduledTime: Date;
  timeoutId?: ReturnType<typeof setTimeout>;
}

// In-memory store of scheduled notifications
const scheduledNotifications = new Map<string, ScheduledNotification>();

/**
 * Check if the browser supports notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermissionStatus {
  if (!isNotificationSupported()) {
    return "unsupported";
  }
  return Notification.permission as NotificationPermissionStatus;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!isNotificationSupported()) {
    return "unsupported";
  }

  // Already granted
  if (Notification.permission === "granted") {
    return "granted";
  }

  // Already denied - can't request again
  if (Notification.permission === "denied") {
    return "denied";
  }

  // Request permission
  try {
    const result = await Notification.requestPermission();
    return result as NotificationPermissionStatus;
  } catch (error) {
    console.error("Failed to request notification permission:", error);
    return "default";
  }
}

/**
 * Show a notification immediately
 */
export function showNotification(
  title: string,
  options?: NotificationOptions & { onClick?: () => void }
): Notification | null {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return null;
  }

  try {
    const notification = new Notification(title, {
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      ...options,
    });

    if (options?.onClick) {
      notification.onclick = () => {
        window.focus();
        options.onClick?.();
        notification.close();
      };
    }

    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000);

    return notification;
  } catch (error) {
    console.error("Failed to show notification:", error);
    return null;
  }
}

/**
 * Schedule a notification for a future time
 */
export function scheduleNotification(
  id: string,
  type: "event" | "todo",
  sourceId: string,
  title: string,
  body: string,
  scheduledTime: Date,
  onClick?: () => void
): boolean {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  const now = new Date();
  const delay = scheduledTime.getTime() - now.getTime();

  // Don't schedule if time has passed or is more than 24 hours away
  // (for longer scheduling, we'd need a service worker)
  if (delay <= 0 || delay > 24 * 60 * 60 * 1000) {
    return false;
  }

  // Cancel existing notification with same ID
  cancelNotification(id);

  const timeoutId = setTimeout(() => {
    showNotification(title, {
      body,
      tag: id, // Prevents duplicate notifications
      onClick,
    });
    scheduledNotifications.delete(id);
  }, delay);

  scheduledNotifications.set(id, {
    id,
    type,
    sourceId,
    title,
    body,
    scheduledTime,
    timeoutId,
  });

  return true;
}

/**
 * Cancel a scheduled notification
 */
export function cancelNotification(id: string): boolean {
  const notification = scheduledNotifications.get(id);
  if (notification?.timeoutId) {
    clearTimeout(notification.timeoutId);
    scheduledNotifications.delete(id);
    return true;
  }
  return false;
}

/**
 * Cancel all notifications for a specific source (event or todo)
 */
export function cancelNotificationsForSource(sourceId: string): void {
  scheduledNotifications.forEach((notification, id) => {
    if (notification.sourceId === sourceId) {
      cancelNotification(id);
    }
  });
}

/**
 * Cancel all scheduled notifications
 */
export function cancelAllNotifications(): void {
  scheduledNotifications.forEach((notification) => {
    if (notification.timeoutId) {
      clearTimeout(notification.timeoutId);
    }
  });
  scheduledNotifications.clear();
}

/**
 * Get all currently scheduled notifications
 */
export function getScheduledNotifications(): ScheduledNotification[] {
  return Array.from(scheduledNotifications.values());
}

/**
 * Calculate notification time based on reminder minutes before event
 */
export function calculateNotificationTime(
  eventDate: string,
  eventTime: string | null | undefined,
  reminderMinutes: number
): Date | null {
  try {
    let dateTime: Date;

    if (eventTime) {
      // Timed event: combine date and time
      dateTime = new Date(`${eventDate}T${eventTime}:00`);
    } else {
      // All-day event: notify at 8 AM on the day
      dateTime = new Date(`${eventDate}T08:00:00`);
    }

    // Subtract reminder time
    dateTime.setMinutes(dateTime.getMinutes() - reminderMinutes);

    return dateTime;
  } catch {
    return null;
  }
}

/**
 * Format time for notification body
 */
export function formatEventTime(
  date: string,
  startTime: string | null | undefined,
  isAllDay: boolean
): string {
  const eventDate = new Date(`${date}T00:00:00`);
  const dateStr = eventDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (isAllDay) {
    return `${dateStr} (All day)`;
  }

  if (startTime) {
    const [hours, minutes] = startTime.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${dateStr} at ${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  }

  return dateStr;
}
