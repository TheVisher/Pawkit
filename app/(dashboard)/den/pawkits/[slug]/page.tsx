"use client";

import { useState, useEffect } from "react";
import { CardModel } from "@/lib/types";
import { useDenStore } from "@/lib/stores/den-store";
import { useDataStore } from "@/lib/stores/data-store";
import { CardDetailModal } from "@/components/modals/card-detail-modal";
import { DogHouseIcon } from "@/components/icons/dog-house";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";

export default function DenPawkitPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { denCards, loadDenCards, refreshDenCards } = useDenStore();
  const { collections, deleteCard } = useDataStore();
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const router = useRouter();

  // Fetch Den Pawkits
  const { data: denPawkitsData } = useSWR("/api/den/pawkits");
  const denPawkits = denPawkitsData?.collections || [];

  // Find the current pawkit
  const currentPawkit = denPawkits.find((p: any) => p.slug === slug);

  // Load Den cards on mount
  useEffect(() => {
    loadDenCards();
  }, [loadDenCards]);

  // Filter cards that belong to this pawkit
  const pawkitCards = denCards.filter((card: CardModel) =>
    card.collections?.includes(slug)
  );

  const activeCard = activeCardId ? denCards.find(c => c.id === activeCardId) : null;

  const handleUpdateCard = async (updated: CardModel) => {
    await refreshDenCards();
  };

  const handleDeleteCard = async () => {
    if (activeCardId) {
      await deleteCard(activeCardId);
      await refreshDenCards();
      setActiveCardId(null);
    }
  };

  if (!currentPawkit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/den")}
            className="text-gray-400 hover:text-gray-200"
          >
            ← Back to Den
          </button>
        </div>
        <div className="rounded-lg border border-dashed border-gray-800 bg-gray-950 p-12 text-center">
          <DogHouseIcon className="mx-auto h-12 w-12 text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-300">
            Pawkit not found
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            This Den Pawkit doesn&apos;t exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/den")}
              className="text-gray-400 hover:text-gray-200"
            >
              ← Back to Den
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <span className="text-accent">📁</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-100">{currentPawkit.name}</h1>
            <p className="text-sm text-muted-foreground">
              {pawkitCards.length} item{pawkitCards.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {pawkitCards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-800 bg-gray-950 p-12 text-center">
            <span className="text-6xl">📁</span>
            <h3 className="mt-4 text-lg font-medium text-gray-300">
              This Pawkit is empty
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Add cards to this Pawkit by editing them and selecting this collection.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pawkitCards.map((card) => (
              <DenCard key={card.id} card={card} onClick={() => setActiveCardId(card.id)} />
            ))}
          </div>
        )}
      </div>

      {activeCard && (
        <CardDetailModal
          card={activeCard as CardModel}
          collections={collections || []}
          onClose={() => setActiveCardId(null)}
          onUpdate={handleUpdateCard}
          onDelete={handleDeleteCard}
        />
      )}
    </>
  );
}

function DenCard({ card, onClick }: { card: any; onClick: () => void }) {
  return (
    <div onClick={onClick} className="card-hover group cursor-pointer rounded-2xl border border-subtle bg-surface p-4 transition-all">
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
