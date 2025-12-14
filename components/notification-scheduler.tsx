"use client";

import { useEffect, useState } from "react";
import { useNotificationScheduler } from "@/lib/hooks/use-notification-scheduler";

/**
 * Client component that runs the notification scheduler.
 * Should be placed in the app layout to run app-wide.
 */
export function NotificationScheduler() {
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
