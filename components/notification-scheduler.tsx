"use client";

import { useEffect, useState } from "react";
import { useNotificationScheduler } from "@/lib/hooks/use-notification-scheduler";

// Top-level log to verify module is being imported
console.log("[NotificationScheduler] Module loaded");

/**
 * Client component that runs the notification scheduler.
 * Should be placed in the app layout to run app-wide.
 */
export function NotificationScheduler() {
  console.log("[NotificationScheduler] Component rendering");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log("[NotificationScheduler] Component mounted");
    setMounted(true);
  }, []);

  // Only run the scheduler after mounting on client
  if (mounted) {
    return <NotificationSchedulerInner />;
  }

  return null;
}

function NotificationSchedulerInner() {
  try {
    useNotificationScheduler();
  } catch (error) {
    console.error("[NotificationScheduler] Error:", error);
  }
  return null;
}
