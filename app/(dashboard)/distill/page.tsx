"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { DigUpView } from "@/components/dig-up/dig-up-view";
import { CollectionNode } from "@/lib/types";

export default function DigUpPage() {
  const searchParams = useSearchParams();
  const [filterMode, setFilterMode] = useState<"uncategorized" | "all">(
    (searchParams.get("mode") as "uncategorized" | "all") || "uncategorized"
  );

  const { data: digUpResult } = useSWR(`/api/distill?mode=${filterMode}&limit=20`);
  const { data: collectionsData } = useSWR<{ tree: CollectionNode[] }>("/api/pawkits");

  const pawkits = collectionsData?.tree || [];

  if (!digUpResult) {
    return null; // Loading state
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
      pawkits={pawkits}
      filterMode={filterMode}
      onFilterModeChange={setFilterMode}
    />
  );
}
