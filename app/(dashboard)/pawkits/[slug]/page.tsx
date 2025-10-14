"use client";

import { useMemo, useState, useEffect, useRef, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { LibraryWorkspace } from "@/components/library/workspace";
import { DEFAULT_LAYOUT, LAYOUTS, LayoutMode } from "@/lib/constants";
import { useDataStore } from "@/lib/stores/data-store";
import { useSelection } from "@/lib/hooks/selection-store";
import { MoveToPawkitModal } from "@/components/modals/move-to-pawkit-modal";
import { CardDisplayControls } from "@/components/modals/card-display-controls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ListFilter, Check, MoreVertical, Eye } from "lucide-react";

function CollectionPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMoveCardsModal, setShowMoveCardsModal] = useState(false);
  const [showDeleteCardsConfirm, setShowDeleteCardsConfirm] = useState(false);
  const [showRenamePawkitModal, setShowRenamePawkitModal] = useState(false);
  const [showMovePawkitModal, setShowMovePawkitModal] = useState(false);
  const [showDeletePawkitConfirm, setShowDeletePawkitConfirm] = useState(false);
  const [showCardDisplayControls, setShowCardDisplayControls] = useState(false);
  const [pawkitName, setPawkitName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [selectedMoveTarget, setSelectedMoveTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedIds = useSelection((state) => state.selectedIds);
  const clearSelection = useSelection((state) => state.clear);

  // Focus input when modal opens
  useEffect(() => {
    if (showCreateModal) {
      // Delay to let dropdown close completely and modal render
      const timer = setTimeout(() => {
        console.log('[FOCUS] Attempting to focus input, ref:', inputRef.current);
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    } else {
      // Reset input when modal closes
      setPawkitName("");
      setError(null);
    }
  }, [showCreateModal]);

  const q = searchParams.get("q") || undefined;
  const statusParam = searchParams.get("status") || undefined;
  const status = statusParam && ["PENDING", "READY", "ERROR"].includes(statusParam) ? statusParam as "PENDING" | "READY" | "ERROR" : undefined;
  const layoutParam = searchParams.get("layout") as LayoutMode | null;

  // Read from localStorage first, then URL param, then default
  // Use slug-specific key so each pawkit remembers its own layout
  const savedLayout = typeof window !== 'undefined' ? localStorage.getItem(`pawkit-${slug}-layout`) as LayoutMode | null : null;
  const layout: LayoutMode = layoutParam && LAYOUTS.includes(layoutParam)
    ? layoutParam
    : savedLayout && LAYOUTS.includes(savedLayout)
      ? savedLayout
      : DEFAULT_LAYOUT;

  // Read from global store
  const { cards, collections, updateCard, deleteCard, refresh } = useDataStore();

  // Filter cards for this specific collection
  const items = useMemo(() => {
    let filtered = cards.filter(card => card.collections?.includes(slug));

    if (q) {
      const query = q.toLowerCase();
      filtered = filtered.filter(card =>
        card.title?.toLowerCase().includes(query) ||
        card.url.toLowerCase().includes(query) ||
        card.notes?.toLowerCase().includes(query)
      );
    }

    if (status) {
      filtered = filtered.filter(card => card.status === status);
    }

    return filtered;
  }, [cards, slug, q, status]);

  // Find current collection
  const findCollection = (nodes: any[], targetSlug: string): any => {
    for (const node of nodes) {
      if (node.slug === targetSlug) return node;
      if (node.children) {
        const found = findCollection(node.children, targetSlug);
        if (found) return found;
      }
    }
    return null;
  };

  const currentCollection = findCollection(collections, slug);
  if (!currentCollection) {
    return <div>Collection not found</div>;
  }

  // Flatten all pawkits for the move modal (only root-level pawkits)
  const allPawkits = collections.map((node) => ({
    id: node.id,
    name: node.name,
    slug: node.slug,
  }));

  const handleLayoutChange = (newLayout: LayoutMode) => {
    localStorage.setItem(`pawkit-${slug}-layout`, newLayout);
    const params = new URLSearchParams(searchParams.toString());
    params.set("layout", newLayout);
    router.push(`/pawkits/${slug}?${params.toString()}`);
  };

  // Card actions
  const handleBulkMoveCards = () => {
    if (!selectedIds.length) return;
    setShowMoveCardsModal(true);
  };

  const handleConfirmMoveCards = async (targetSlug: string) => {
    if (!selectedIds.length) return;
    await Promise.all(
      selectedIds.map((id) => {
        const card = cards.find((item) => item.id === id);
        const collections = card ? Array.from(new Set([targetSlug, ...card.collections])) : [targetSlug];
        return updateCard(id, { collections });
      })
    );
    clearSelection();
    setShowMoveCardsModal(false);
  };

  const handleBulkDeleteCards = () => {
    if (!selectedIds.length) return;
    setShowDeleteCardsConfirm(true);
  };

  const handleConfirmDeleteCards = async () => {
    await Promise.all(selectedIds.map((id) => deleteCard(id)));
    clearSelection();
    setShowDeleteCardsConfirm(false);
  };

  // Pawkit actions
  const handleCreateSubPawkit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = pawkitName.trim();
    if (!trimmedName) {
      setError("Pawkit name cannot be empty");
      return;
    }

    console.log('[CREATE] Starting sub-pawkit creation:', trimmedName, 'parent:', currentCollection.id);
    setLoading(true);
    setError(null);

    try {
      console.log('[CREATE] Sending POST request...');
      const response = await fetch("/api/pawkits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, parentId: currentCollection.id }),
      });

      console.log('[CREATE] Response status:', response.status);

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || "Failed to create Sub-Pawkit");
        setLoading(false);
        return;
      }

      const newPawkit = await response.json();
      console.log('[CREATE] Created pawkit:', newPawkit);

      setPawkitName("");
      setShowCreateModal(false);
      setLoading(false);

      console.log('[CREATE] Calling refresh()...');
      // Refresh the Zustand store to get the new sub-pawkit
      await refresh();
      console.log('[CREATE] Refresh complete');
    } catch (err) {
      console.error('[CREATE] Error:', err);
      setError("Failed to create Sub-Pawkit");
      setLoading(false);
    }
  };

  const handleRenamePawkit = async () => {
    if (!renameValue.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/pawkits/${currentCollection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to rename Pawkit");
      }

      setShowRenamePawkitModal(false);
      setRenameValue("");
      setLoading(false);

      // Refresh the Zustand store to get the updated name
      await refresh();
    } catch (err) {
      alert("Failed to rename Pawkit");
      setLoading(false);
    }
  };

  const handleMovePawkit = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pawkits/${currentCollection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: selectedMoveTarget }),
      });

      if (!response.ok) {
        throw new Error("Failed to move Pawkit");
      }

      setShowMovePawkitModal(false);
      setSelectedMoveTarget(null);
      setLoading(false);

      // Refresh the Zustand store and navigate
      await refresh();
      router.push("/pawkits");
    } catch (err) {
      alert("Failed to move Pawkit");
      setLoading(false);
    }
  };

  const handleDeletePawkit = async () => {
    console.log("handleDeletePawkit called", currentCollection.id);
    setLoading(true);
    setShowDeletePawkitConfirm(false);

    try {
      console.log("Sending DELETE request to /api/pawkits/" + currentCollection.id);
      const response = await fetch(`/api/pawkits/${currentCollection.id}`, {
        method: "DELETE",
      });

      console.log("DELETE response status:", response.status);

      if (!response.ok) {
        throw new Error("Failed to delete Pawkit");
      }

      console.log("Delete successful, refreshing store...");
      // Refresh the Zustand store and navigate
      await refresh();
      console.log("Navigating to /pawkits");
      router.push("/pawkits");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete Pawkit");
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{currentCollection.name}</h1>
            <p className="text-sm text-muted-foreground">{items.length} card(s)</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg bg-surface-soft px-3 py-2 text-sm text-foreground hover:bg-surface transition-colors">
                <ListFilter className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {LAYOUTS.map((layoutOption) => (
                  <DropdownMenuItem
                    key={layoutOption}
                    onClick={() => handleLayoutChange(layoutOption)}
                    className="capitalize cursor-pointer relative pl-8"
                  >
                    {layout === layoutOption && (
                      <Check className="absolute left-2 h-4 w-4" />
                    )}
                    {layoutOption}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg bg-surface-soft px-3 py-2 text-sm text-foreground hover:bg-surface transition-colors">
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleBulkMoveCards}
                  disabled={!selectedIds.length}
                  className="cursor-pointer"
                >
                  Move to Pawkit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleBulkDeleteCards}
                  disabled={!selectedIds.length}
                  className="cursor-pointer text-rose-400"
                >
                  Delete selected
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowCardDisplayControls(true)}
                  className="cursor-pointer relative pl-8"
                >
                  <Eye className="absolute left-2 h-4 w-4" />
                  Display Options
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    setShowCreateModal(true);
                  }}
                  className="cursor-pointer"
                >
                  Create Sub-Pawkit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowRenamePawkitModal(true)}
                  className="cursor-pointer"
                >
                  Rename Pawkit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowMovePawkitModal(true)}
                  className="cursor-pointer"
                >
                  Move Pawkit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeletePawkitConfirm(true)}
                  className="cursor-pointer text-rose-400"
                >
                  Delete Pawkit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <LibraryWorkspace
          initialCards={items}
          initialNextCursor={undefined}
          initialQuery={{ q, collection: slug, status, layout }}
          collectionsTree={collections}
          collectionName={currentCollection.name}
          storageKey={`pawkit-${slug}-layout`}
          hideControls={true}
          area="pawkit"
        />
      </div>

      {/* Move Cards Modal */}
      <MoveToPawkitModal
        open={showMoveCardsModal}
        onClose={() => setShowMoveCardsModal(false)}
        onConfirm={handleConfirmMoveCards}
      />

      {/* Delete Cards Confirmation Modal */}
      {showDeleteCardsConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDeleteCardsConfirm(false)}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Delete Cards?</h2>
            <p className="text-sm text-gray-400 mb-4">
              Move {selectedIds.length} selected card{selectedIds.length !== 1 ? 's' : ''} to Trash? You can restore them within 30 days.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteCardsConfirm(false)}
                className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteCards}
                className="flex-1 rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
              >
                Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Sub-Pawkit Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !loading) {
              setShowCreateModal(false);
            }
          }}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Create Sub-Pawkit</h2>
            <form onSubmit={handleCreateSubPawkit}>
              <input
                ref={inputRef}
                type="text"
                value={pawkitName}
                onChange={(e) => {
                  setPawkitName(e.target.value);
                  setError(null);
                }}
                placeholder="Enter Pawkit name"
                className="w-full rounded bg-gray-900 px-4 py-2 text-sm text-gray-100 placeholder-gray-500 border border-gray-800 focus:border-accent focus:outline-none"
                autoFocus
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setShowCreateModal(false);
                  }
                }}
              />
              {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-800 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded bg-accent px-4 py-2 text-sm font-medium text-gray-950 hover:bg-accent/90 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Pawkit Modal */}
      {showRenamePawkitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !loading && setShowRenamePawkitModal(false)}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Rename Pawkit</h2>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter new name"
              className="w-full rounded bg-gray-900 px-4 py-2 text-sm text-gray-100 placeholder-gray-500 border border-gray-800 focus:border-accent focus:outline-none"
              autoFocus
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRenamePawkit();
                } else if (e.key === "Escape") {
                  setShowRenamePawkitModal(false);
                }
              }}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRenamePawkitModal(false)}
                className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-800 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleRenamePawkit}
                className="flex-1 rounded bg-accent px-4 py-2 text-sm font-medium text-gray-950 hover:bg-accent/90 transition-colors disabled:opacity-50"
                disabled={loading || !renameValue.trim()}
              >
                {loading ? "Renaming..." : "Rename"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Pawkit Modal */}
      {showMovePawkitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !loading && setShowMovePawkitModal(false)}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Move to another Pawkit</h2>
            <p className="text-sm text-gray-400 mb-4">
              Select a Pawkit to move this into, or select &quot;Root&quot; to make it a top-level Pawkit.
            </p>
            <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
              <button
                onClick={() => setSelectedMoveTarget(null)}
                className={`w-full rounded px-4 py-2 text-left text-sm transition-colors ${
                  selectedMoveTarget === null
                    ? "bg-accent text-gray-950"
                    : "bg-gray-900 text-gray-300 hover:bg-gray-800"
                }`}
              >
                Root (Top Level)
              </button>
              {allPawkits
                .filter((p) => p.id !== currentCollection.id)
                .map((pawkit) => (
                  <button
                    key={pawkit.id}
                    onClick={() => setSelectedMoveTarget(pawkit.id)}
                    className={`w-full rounded px-4 py-2 text-left text-sm transition-colors ${
                      selectedMoveTarget === pawkit.id
                        ? "bg-accent text-gray-950"
                        : "bg-gray-900 text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    {pawkit.name}
                  </button>
                ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMovePawkitModal(false)}
                className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-800 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleMovePawkit}
                className="flex-1 rounded bg-accent px-4 py-2 text-sm font-medium text-gray-950 hover:bg-accent/90 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Moving..." : "Move"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Pawkit Confirmation Modal */}
      {showDeletePawkitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDeletePawkitConfirm(false)}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Delete Pawkit?</h2>
            <p className="text-sm text-gray-400 mb-6">
              This will permanently delete this Pawkit and all its contents. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeletePawkitConfirm(false)}
                className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-800 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePawkit}
                className="flex-1 rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Display Controls */}
      <CardDisplayControls
        open={showCardDisplayControls}
        onClose={() => setShowCardDisplayControls(false)}
        area="pawkit"
      />
    </>
  );
}

export default function CollectionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CollectionPageContent />
    </Suspense>
  );
}
