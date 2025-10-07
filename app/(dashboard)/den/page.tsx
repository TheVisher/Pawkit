"use client";

import { useState, useEffect, useMemo } from "react";
import { CardModel } from "@/lib/types";
import { useDenStore } from "@/lib/stores/den-store";
import { useDataStore } from "@/lib/stores/data-store";
import { CardDetailModal } from "@/components/modals/card-detail-modal";
import { DogHouseIcon } from "@/components/icons/dog-house";
import { DenPawkitsGrid } from "@/components/den/den-pawkits-grid";
import { CardContextMenuWrapper } from "@/components/cards/card-context-menu";
import useSWR from "swr";

export default function DenPage() {
  const { denCards, isUnlocked, loadDenCards, checkExpiry, refreshDenCards, updateDenCard } = useDenStore();
  const { collections, deleteCard } = useDataStore();
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [showCreatePawkitModal, setShowCreatePawkitModal] = useState(false);
  const [newPawkitName, setNewPawkitName] = useState("");
  const [creating, setCreating] = useState(false);

  // Fetch Den Pawkits
  const { data: denPawkitsData, mutate: mutateDenPawkits } = useSWR("/api/den/pawkits");
  const denPawkits = useMemo(() => denPawkitsData?.collections || [], [denPawkitsData]);

  // Load Den cards on mount (password protection not yet implemented)
  useEffect(() => {
    // For now, always load Den cards (password protection coming in Phase 2)
    loadDenCards();
  }, [loadDenCards]);

  // Create grid items for Den Pawkits
  const denPawkitsGridItems = useMemo(() => {
    return denPawkits.map((pawkit: any) => {
      const pawkitCards = denCards.filter((card: CardModel) =>
        card.collections?.includes(pawkit.slug)
      );

      return {
        id: pawkit.id,
        name: pawkit.name,
        slug: pawkit.slug,
        count: pawkitCards.length,
        cards: pawkitCards,
        isPinned: pawkit.pinned,
        hasChildren: false
      };
    });
  }, [denPawkits, denCards]);

  const handleCreatePawkit = async () => {
    if (!newPawkitName.trim()) return;

    setCreating(true);
    try {
      const response = await fetch("/api/den/pawkits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPawkitName.trim() })
      });

      if (!response.ok) throw new Error("Failed to create");

      setNewPawkitName("");
      setShowCreatePawkitModal(false);
      await mutateDenPawkits();
    } catch (error) {
      alert("Failed to create Den Pawkit");
    } finally {
      setCreating(false);
    }
  };

  const activeCard = activeCardId ? denCards.find(c => c.id === activeCardId) : null;

  const handleUpdateCard = async (updated: CardModel) => {
    // Just refresh to get the latest state from server
    // The modal already handles the API calls
    await refreshDenCards();
  };

  const handleDeleteCard = async () => {
    if (activeCardId) {
      await deleteCard(activeCardId);
      await refreshDenCards();
      setActiveCardId(null);
    }
  };

  return (
    <>
      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <DogHouseIcon className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-100">The Den</h1>
              <p className="text-sm text-muted-foreground">
                Your private, secure storage
              </p>
            </div>
          </div>
        </div>

        {/* Den Pawkits Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-100">Den Pawkits</h2>
            <button
              onClick={() => setShowCreatePawkitModal(true)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-gray-950 hover:bg-accent/90 transition-colors"
            >
              + Create Pawkit
            </button>
          </div>
          <DenPawkitsGrid
            collections={denPawkitsGridItems}
            allPawkits={denPawkits}
          />
        </div>

        {/* All Den Cards Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">All Den Cards</h2>
          {denCards.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-800 bg-gray-950 p-12 text-center">
              <DogHouseIcon className="mx-auto h-12 w-12 text-gray-600" />
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
                <DenCard
                  key={card.id}
                  card={card}
                  onClick={() => setActiveCardId(card.id)}
                  onAddToDenPawkit={async (slug) => {
                    const collections = Array.from(new Set([slug, ...(card.collections || [])]));
                    // Always ensure Den cards have inDen: true when adding to Den Pawkits
                    await updateDenCard(card.id, { collections, inDen: true });
                  }}
                  onAddToRegularPawkit={async (slug) => {
                    const collections = Array.from(new Set([slug, ...(card.collections || [])]));
                    // When moving to regular Pawkit, remove from Den
                    await updateDenCard(card.id, { collections, inDen: false });
                  }}
                  onDeleteCard={async () => {
                    await deleteCard(card.id);
                    await refreshDenCards();
                  }}
                  onRemoveFromPawkit={async (slug) => {
                    const collections = (card.collections || []).filter(s => s !== slug);
                    await updateDenCard(card.id, { collections });
                  }}
                  onRemoveFromAllPawkits={async () => {
                    await updateDenCard(card.id, { collections: [] });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Pawkit Modal */}
      {showCreatePawkitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !creating && setShowCreatePawkitModal(false)}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Create Den Pawkit</h2>
            <input
              type="text"
              value={newPawkitName}
              onChange={(e) => setNewPawkitName(e.target.value)}
              placeholder="Enter Pawkit name"
              className="w-full rounded bg-gray-900 px-4 py-2 text-sm text-gray-100 placeholder-gray-500 border border-gray-800 focus:border-accent focus:outline-none"
              autoFocus
              disabled={creating}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreatePawkit();
                } else if (e.key === "Escape") {
                  setShowCreatePawkitModal(false);
                }
              }}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowCreatePawkitModal(false)}
                className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-800 transition-colors"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePawkit}
                className="flex-1 rounded bg-accent px-4 py-2 text-sm font-medium text-gray-950 hover:bg-accent/90 transition-colors disabled:opacity-50"
                disabled={creating || !newPawkitName.trim()}
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

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

function DenCard({
  card,
  onClick,
  onAddToDenPawkit,
  onAddToRegularPawkit,
  onDeleteCard,
  onRemoveFromPawkit,
  onRemoveFromAllPawkits
}: {
  card: any;
  onClick: () => void;
  onAddToDenPawkit: (slug: string) => void;
  onAddToRegularPawkit: (slug: string) => void;
  onDeleteCard: () => void;
  onRemoveFromPawkit: (slug: string) => void;
  onRemoveFromAllPawkits: () => void;
}) {
  return (
    <CardContextMenuWrapper
      filterDenOnly={true}
      onAddToPawkit={onAddToDenPawkit}
      onAddToRegularPawkit={onAddToRegularPawkit}
      onDelete={onDeleteCard}
      cardCollections={card.collections || []}
      onRemoveFromPawkit={onRemoveFromPawkit}
      onRemoveFromAllPawkits={onRemoveFromAllPawkits}
    >
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
    </CardContextMenuWrapper>
  );
}
