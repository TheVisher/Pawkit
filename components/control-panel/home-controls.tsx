"use client";

import { ContinueCard } from "@/app/(dashboard)/home/components/sidebar/continue-card";
import { useHomeData } from "@/app/(dashboard)/home/hooks/use-home-data";

export function HomeControls() {
  const { continueItems } = useHomeData();

  return (
    <>
      {/* Continue Reading */}
      {continueItems.length > 0 && (
        <ContinueCard items={continueItems} />
      )}
    </>
  );
}
