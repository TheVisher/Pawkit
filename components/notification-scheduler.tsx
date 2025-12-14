"use client";

import { useNotificationScheduler } from "@/lib/hooks/use-notification-scheduler";

/**
 * Client component that runs the notification scheduler.
 * Should be placed in the app layout to run app-wide.
 */
export function NotificationScheduler() {
  useNotificationScheduler();
  return null;
}
