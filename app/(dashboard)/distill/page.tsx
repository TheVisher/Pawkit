"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { DigUpView } from "@/components/dig-up/dig-up-view";
import { CollectionNode } from "@/lib/types";

function DigUpContent() {
  const searchParams = useSearchParams();
  const [filterMode, setFilterMode] = useState<"uncategorized" | "all">(
    (searchParams.get("mode") as "uncategorized" | "all") || "uncategorized"
  );

  const { data: digUpResult, isLoading: isLoadingCards } = useSWR(`/api/distill?mode=${filterMode}&limit=20`);
  const { data: collectionsData } = useSWR<{ tree: CollectionNode[] }>("/api/pawkits");

  const pawkits = collectionsData?.tree || [];

  if (isLoadingCards || !digUpResult) {
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
