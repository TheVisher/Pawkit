"use client";

import { useState, useEffect } from "react";
import { Home } from "lucide-react";
import { CardModel, CollectionNode } from "@/lib/types";
import { useDenStore } from "@/lib/stores/den-store";
import { useDataStore } from "@/lib/stores/data-store";

export default function DenPage() {
  const { denCards, isUnlocked, loadDenCards, checkExpiry } = useDenStore();
  const { collections } = useDataStore();
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Check if unlock has expired on mount and navigation
  useEffect(() => {
    checkExpiry();
    if (isUnlocked) {
      loadDenCards();
    }
  }, [isUnlocked, checkExpiry, loadDenCards]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <Home className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-100">The Den</h1>
            <p className="text-sm text-muted-foreground">
              Your private, secure storage
            </p>
          </div>
        </div>
      </div>

      {denCards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-800 bg-gray-950 p-12 text-center">
          <Home className="mx-auto h-12 w-12 text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-300">
            Your Den is empty
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Move sensitive items here to keep them private and hidden from Library, Timeline, and Search.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {denCards.map((card) => (
            <DenCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

function DenCard({ card }: { card: any }) {
  return (
    <div className="card-hover group cursor-pointer rounded-2xl border border-subtle bg-surface p-4 transition-all">
      {card.image && (
        <div className="relative mb-3 w-full overflow-hidden rounded-xl bg-surface-soft aspect-video">
          <img
            src={card.image}
            alt={card.title ?? card.url}
            className="block h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <h3 className="flex-1 font-semibold text-foreground transition-colors">
            {card.title || card.domain || card.url}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground/80 line-clamp-2">
          {card.domain || card.url}
        </p>
      </div>
    </div>
  );
}
