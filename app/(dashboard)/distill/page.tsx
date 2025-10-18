"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
// Removed useSWR - using local-first data store instead
import { DigUpView } from "@/components/dig-up/dig-up-view";
import { CollectionNode } from "@/lib/types";
import { useDataStore } from "@/lib/stores/data-store";

function DigUpContent() {
  const searchParams = useSearchParams();
  const [filterMode, setFilterMode] = useState<"uncategorized" | "all">(
    (searchParams.get("mode") as "uncategorized" | "all") || "uncategorized"
  );

  // Get data from local store instead of API calls
  const { cards, collections } = useDataStore();
  
  // Filter cards based on mode (simplified for now)
  const filteredCards = cards.filter(card => {
    if (filterMode === 'uncategorized') return !card.collections || card.collections.length === 0;
    return true; // all
  });
  
  const digUpResult = {
    cards: filteredCards.slice(0, 20),
    hasMore: filteredCards.length > 20,
    nextCursor: null,
    totalCount: filteredCards.length
  };
  
  const pawkits = collections;

  if (!digUpResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-gray-950 rounded-lg p-12 max-w-md text-center border border-gray-800">
          <div className="text-6xl mb-4 animate-bounce">🐕</div>
          <h2 className="text-2xl font-semibold text-gray-100 mb-2">Digging Up Cards...</h2>
          <p className="text-gray-400">
            Kit is fetching your cards to review
          </p>
        </div>
      </div>
    );
  }

  if (!digUpResult.cards || digUpResult.cards.length === 0) {
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
      initialCards={digUpResult.cards}
      initialNextCursor={digUpResult.nextCursor}
      initialHasMore={digUpResult.hasMore}
      initialTotalCount={digUpResult.totalCount}
      pawkits={pawkits}
      filterMode={filterMode}
      onFilterModeChange={setFilterMode}
    />
  );
}

export default function DigUpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DigUpContent />
    </Suspense>
  );
}
