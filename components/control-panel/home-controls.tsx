"use client";

import { StatsCard } from "@/app/(dashboard)/home/components/sidebar/stats-card";
import { ContinueCard } from "@/app/(dashboard)/home/components/sidebar/continue-card";
import { OnThisDay } from "@/app/(dashboard)/home/components/sidebar/on-this-day";
import { useHomeData } from "@/app/(dashboard)/home/hooks/use-home-data";

export function HomeControls() {
  const { thisWeekStats, continueItems, onThisDayItem } = useHomeData();

  return (
    <>
      {/* This Week Stats */}
      <StatsCard
        savedThisWeek={thisWeekStats.savedThisWeek}
        processedThisWeek={thisWeekStats.processedThisWeek}
      />

      {/* Continue Reading */}
      {continueItems.length > 0 && (
        <ContinueCard items={continueItems} />
      )}

      {/* On This Day */}
      <OnThisDay item={onThisDayItem} />
    </>
  );
}
