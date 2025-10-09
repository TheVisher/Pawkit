"use client";

import { Suspense, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { DigUpView } from "@/components/dig-up/dig-up-view";
import { useDemoAwareStore } from "@/lib/hooks/use-demo-aware-store";

function DemoDigUpContent() {
  const searchParams = useSearchParams();
  const [filterMode, setFilterMode] = useState<"uncategorized" | "all">(
    (searchParams.get("mode") as "uncategorized" | "all") || "uncategorized"
  );

  const { cards, collections } = useDemoAwareStore();

  // Filter cards based on mode
  const filteredCards = useMemo(() => {
    let filtered = cards.filter(card => !card.inDen);

    if (filterMode === "uncategorized") {
      // Cards with no collections
      filtered = filtered.filter(card => !card.collections || card.collections.length === 0);
    }

    return filtered.slice(0, 20); // Limit to 20 for demo
  }, [cards, filterMode]);

  if (filteredCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-6xl mb-4">🐕</div>
        <h1 className="text-2xl font-semibold text-gray-100 mb-2">No Cards to Dig Up</h1>
        <p className="text-gray-400 text-center max-w-md">
          {filterMode === "uncategorized"
            ? "Kit could not find any uncategorized cards. All your cards are organized!"
            : "Kit could not find any cards to review right now."}
        </p>
      </div>
    );
  }

  return (
    <DigUpView
      initialCards={filteredCards}
      initialNextCursor={null}
      initialHasMore={false}
      initialTotalCount={filteredCards.length}
      pawkits={collections}
      filterMode={filterMode}
      onFilterModeChange={setFilterMode}
    />
  );
}

export default function DemoDigUpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DemoDigUpContent />
    </Suspense>
  );
}
