"use client";

import { useEffect, useCallback, useRef } from "react";
import { format, addDays, startOfDay } from "date-fns";
import { useCalendarStore } from "./use-calendar-store";
import { useEventStore } from "./use-event-store";
import { useTodoStore } from "./use-todos";
import {
  isNotificationSupported,
  getNotificationPermission,
  scheduleNotification,
  cancelAllNotifications,
  cancelNotificationsForSource,
  calculateNotificationTime,
  formatEventTime,
} from "@/lib/services/notifications";

const SCHEDULER_INTERVAL = 60000; // Check every minute
const SCHEDULE_AHEAD_HOURS = 24; // Schedule notifications up to 24 hours ahead

/**
 * Hook that manages scheduling notifications for upcoming events and todos.
 * Should be used once at the app root level.
 */
export function useNotificationScheduler() {
  const lastScheduleRef = useRef<number>(0);

  // Get notification settings
  const notificationsEnabled = useCalendarStore((s) => s.notificationsEnabled);
  const eventReminderMinutes = useCalendarStore((s) => s.eventReminderMinutes);
  const todoNotificationsEnabled = useCalendarStore((s) => s.todoNotificationsEnabled);
  const todoReminderTime = useCalendarStore((s) => s.todoReminderTime);

  // Get data
  const events = useEventStore((s) => s.events);
  const generateRecurrenceInstances = useEventStore((s) => s.generateRecurrenceInstances);
  const todos = useTodoStore((s) => s.todos);

  // Schedule notifications for events
  const scheduleEventNotifications = useCallback(() => {
    if (!notificationsEnabled || eventReminderMinutes === 0) {
      console.log(`[Notifications] Skipping events - enabled: ${notificationsEnabled}, reminder: ${eventReminderMinutes}`);
      return;
    }

    const permission = getNotificationPermission();
    if (permission !== "granted") {
      console.log(`[Notifications] Permission not granted: ${permission}`);
      return;
    }

    const now = new Date();
    const rangeStart = format(now, "yyyy-MM-dd");
    const rangeEnd = format(addDays(now, 1), "yyyy-MM-dd"); // Next 24 hours

    console.log(`[Notifications] Checking ${events.length} events for range ${rangeStart} to ${rangeEnd}`);

    // Get events in range including recurrence instances
    events.forEach((event) => {
      // Skip deleted events
      if (event.deleted) return;

      // Generate instances (handles both recurring and single events)
      const instances = generateRecurrenceInstances(event, rangeStart, rangeEnd);

      instances.forEach((instance) => {
        const notificationTime = calculateNotificationTime(
          instance.instanceDate,
          instance.event.startTime,
          eventReminderMinutes
        );

        if (!notificationTime) return;

        // Only schedule if notification time is in the future and within 24 hours
        const msUntilNotification = notificationTime.getTime() - now.getTime();
        if (msUntilNotification <= 0 || msUntilNotification > SCHEDULE_AHEAD_HOURS * 60 * 60 * 1000) {
          return;
        }

        const notificationId = `event-${instance.event.id}-${instance.instanceDate}`;
        const timeStr = formatEventTime(
          instance.instanceDate,
          instance.event.startTime,
          instance.event.isAllDay
        );

        const scheduled = scheduleNotification(
          notificationId,
          "event",
          instance.event.id,
          instance.event.title,
          timeStr,
          notificationTime,
          () => {
            // On click, could navigate to calendar - for now just focus window
            window.focus();
          }
        );

        if (scheduled) {
          console.log(`[Notifications] Scheduled: "${instance.event.title}" at ${notificationTime.toLocaleTimeString()}`);
        }
      });
    });
  }, [notificationsEnabled, eventReminderMinutes, events, generateRecurrenceInstances]);

  // Schedule notifications for todos
  const scheduleTodoNotifications = useCallback(() => {
    if (!notificationsEnabled || !todoNotificationsEnabled) {
      return;
    }

    const permission = getNotificationPermission();
    if (permission !== "granted") {
      return;
    }

    const now = new Date();
    const today = startOfDay(now);
    const tomorrow = addDays(today, 1);

    // Get todos with due dates today or tomorrow
    const upcomingTodos = todos.filter((todo) => {
      if (todo.completed || !todo.dueDate) return false;

      const dueDate = startOfDay(todo.dueDate);
      return dueDate >= today && dueDate < addDays(tomorrow, 1);
    });

    upcomingTodos.forEach((todo) => {
      const dueDate = startOfDay(todo.dueDate!);
      const dateStr = format(dueDate, "yyyy-MM-dd");

      // Schedule notification at the configured reminder time
      const notificationTime = new Date(`${dateStr}T${todoReminderTime}:00`);

      // Only schedule if notification time is in the future and within 24 hours
      const msUntilNotification = notificationTime.getTime() - now.getTime();
      if (msUntilNotification <= 0 || msUntilNotification > SCHEDULE_AHEAD_HOURS * 60 * 60 * 1000) {
        return;
      }

      const notificationId = `todo-${todo.id}-${dateStr}`;
      const isToday = format(today, "yyyy-MM-dd") === dateStr;

      scheduleNotification(
        notificationId,
        "todo",
        todo.id,
        `Task due ${isToday ? "today" : "tomorrow"}`,
        todo.text,
        notificationTime,
        () => {
          window.focus();
        }
      );
    });
  }, [notificationsEnabled, todoNotificationsEnabled, todoReminderTime, todos]);

  // Main scheduler function
  const runScheduler = useCallback((force = false) => {
    // Prevent running too frequently (unless forced)
    const now = Date.now();
    if (!force && now - lastScheduleRef.current < 30000) {
      return;
    }
    lastScheduleRef.current = now;

    if (!isNotificationSupported()) {
      console.log("[Notifications] Browser doesn't support notifications");
      return;
    }

    // Clear and reschedule all
    cancelAllNotifications();

    if (notificationsEnabled) {
      console.log(`[Notifications] Scheduler running. Events: ${events.length}, Reminder: ${eventReminderMinutes}min`);
      scheduleEventNotifications();
      scheduleTodoNotifications();
    } else {
      console.log("[Notifications] Disabled - skipping");
    }
  }, [notificationsEnabled, scheduleEventNotifications, scheduleTodoNotifications, events.length, eventReminderMinutes]);

  // Force reschedule when events or todos change
  useEffect(() => {
    if (notificationsEnabled) {
      runScheduler(true);
    }
  }, [events, todos, notificationsEnabled, runScheduler]);

  // Run scheduler on mount and when dependencies change
  useEffect(() => {
    // Initial run
    runScheduler();

    // Set up interval to periodically check and reschedule
    const intervalId = setInterval(runScheduler, SCHEDULER_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [runScheduler]);

  // Clean up when notifications are disabled
  useEffect(() => {
    if (!notificationsEnabled) {
      cancelAllNotifications();
    }
  }, [notificationsEnabled]);

  return null;
}

/**
 * Cancel notifications when an event is deleted or updated
 */
export function cancelEventNotifications(eventId: string) {
  cancelNotificationsForSource(eventId);
}

/**
 * Cancel notifications when a todo is completed or deleted
 */
export function cancelTodoNotifications(todoId: string) {
  cancelNotificationsForSource(todoId);
}
