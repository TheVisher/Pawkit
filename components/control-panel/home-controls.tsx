"use client";

import { ContinueCard } from "@/app/(dashboard)/home/components/sidebar/continue-card";
import { OnThisDayCard } from "@/app/(dashboard)/home/components/on-this-day-card";
import { useHomeData } from "@/app/(dashboard)/home/hooks/use-home-data";

export function HomeControls() {
  const { continueItems, cards } = useHomeData();

  return (
    <>
      {/* On This Day */}
      <OnThisDayCard allCards={cards} />

      {/* Continue Reading */}
      {continueItems.length > 0 && (
        <ContinueCard items={continueItems} />
      )}
    </>
  );
}
