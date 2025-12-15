"use client";

import { TodosSection } from "./todos-section";
import { StatsCard } from "@/app/(dashboard)/home/components/sidebar/stats-card";
import { ContinueCard } from "@/app/(dashboard)/home/components/sidebar/continue-card";
import { OnThisDay } from "@/app/(dashboard)/home/components/sidebar/on-this-day";
import { useHomeData } from "@/app/(dashboard)/home/hooks/use-home-data";

export function HomeControls() {
  const { thisWeekStats, continueItems, onThisDayItem } = useHomeData();

  return (
    <>
      {/* Todos Section - Always at top */}
      <TodosSection />

      {/* This Week Stats */}
      <div className="px-4 pb-4">
        <StatsCard
          savedThisWeek={thisWeekStats.savedThisWeek}
          processedThisWeek={thisWeekStats.processedThisWeek}
        />
      </div>

      {/* Continue Reading */}
      {continueItems.length > 0 && (
        <div className="px-4 pb-4">
          <ContinueCard items={continueItems} />
        </div>
      )}

      {/* On This Day */}
      <div className="px-4 pb-4">
        <OnThisDay item={onThisDayItem} />
      </div>
    </>
  );
}
