"use client";

import { OnThisDayCard } from "@/app/(dashboard)/home/components/on-this-day-card";
import { useHomeData } from "@/app/(dashboard)/home/hooks/use-home-data";

export function HomeControls() {
  const { cards } = useHomeData();

  return (
    <>
      {/* On This Day */}
      <OnThisDayCard allCards={cards} />
    </>
  );
}
