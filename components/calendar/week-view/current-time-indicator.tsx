"use client";

import { useEffect, useState } from "react";
import { isToday } from "date-fns";
import { getCurrentTimePosition, HOUR_HEIGHT } from "@/lib/utils/time-grid";

interface CurrentTimeIndicatorProps {
  weekDays: Date[];
  hourHeight?: number;
}

/**
 * Current time indicator line that shows "now" on today's column
 * Updates every minute to track current time
 *
 * This component is positioned inside the day columns grid (grid-cols-7),
 * so it uses percentage-based positioning relative to the grid.
 */
export function CurrentTimeIndicator({
  weekDays,
  hourHeight = HOUR_HEIGHT,
}: CurrentTimeIndicatorProps) {
  const [position, setPosition] = useState(0);
  const [todayIndex, setTodayIndex] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      // Find which day column is today
      const idx = weekDays.findIndex((day) => isToday(day));
      setTodayIndex(idx);

      // Calculate vertical position
      setPosition(getCurrentTimePosition(hourHeight));
    };

    // Initial update
    update();

    // Update every minute
    const interval = setInterval(update, 60000);

    return () => clearInterval(interval);
  }, [weekDays, hourHeight]);

  // Don't render if today isn't in the visible week
  if (todayIndex === null || todayIndex < 0) {
    return null;
  }

  // Since we're inside a grid-cols-7, each column is 1/7 of the width
  // Position line to span just today's column
  const columnWidthPercent = 100 / 7;
  const leftPercent = todayIndex * columnWidthPercent;

  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        top: position,
        left: `${leftPercent}%`,
        width: `${columnWidthPercent}%`,
      }}
    >
      {/* Circle indicator at left edge */}
      <div
        className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full"
        style={{
          background: "var(--ds-accent)",
          boxShadow: "0 0 6px var(--ds-accent)",
        }}
      />

      {/* Horizontal line spanning the day column */}
      <div
        className="h-0.5 w-full"
        style={{
          background: "var(--ds-accent)",
          boxShadow: "0 0 8px var(--ds-accent)",
        }}
      />
    </div>
  );
}
