"use client";

import { useEffect } from "react";
import { useNotificationScheduler } from "@/lib/hooks/use-notification-scheduler";

/**
 * Client component that runs the notification scheduler.
 * Should be placed in the app layout to run app-wide.
 */
export function NotificationScheduler() {
  useEffect(() => {
    console.warn("[NotificationScheduler] Component mounted");
  }, []);

  useNotificationScheduler();

  return null;
}
