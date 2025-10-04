"use client";

import useSWR from "swr";
import { DigUpView } from "@/components/dig-up/dig-up-view";
import { CollectionNode } from "@/lib/types";

export default function DigUpPage() {
  const { data: oldCardsResult } = useSWR("/api/distill");
  const { data: collectionsData } = useSWR<{ tree: CollectionNode[] }>("/api/pawkits");

  const pawkits = collectionsData?.tree || [];

  if (!oldCardsResult) {
    return null; // Loading state
  }

  if (!oldCardsResult.cards || oldCardsResult.cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-6xl mb-4">🐕</div>
        <h1 className="text-2xl font-semibold text-gray-100 mb-2">No Old Cards to Dig Up</h1>
        <p className="text-gray-400 text-center max-w-md">
          Kit could not find any old cards to review right now. All your saved content is up to date!
        </p>
      </div>
    );
  }

  return (
    <DigUpView
      initialCards={oldCardsResult.cards}
      ageThreshold={oldCardsResult.ageThreshold}
      total={oldCardsResult.total}
      pawkits={pawkits}
    />
  );
}
