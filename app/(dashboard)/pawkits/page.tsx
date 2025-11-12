"use client";

import { useMemo, useEffect, useState } from "react";
import { CollectionsGrid } from "@/components/pawkits/grid";
import { useDataStore } from "@/lib/stores/data-store";
import { usePawkitActions } from "@/lib/contexts/pawkit-actions-context";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { FolderOpen, Plus } from "lucide-react";
import { GlowButton } from "@/components/ui/glow-button";

export default function CollectionsPage() {
  const { collections, cards, addCollection } = useDataStore();
  const { setOnCreatePawkit } = usePawkitActions();
  const setContentType = usePanelStore((state) => state.setContentType);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pawkitName, setPawkitName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set the create action for the top bar
  useEffect(() => {
    setOnCreatePawkit(() => () => setShowCreateModal(true));
    return () => setOnCreatePawkit(null);
  }, [setOnCreatePawkit]);

  // Set the right panel content to show pawkits controls
  useEffect(() => {
    setContentType("pawkits-controls");
  }, [setContentType]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = pawkitName.trim();
    if (!trimmedName) {
      setError("Pawkit name cannot be empty");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await addCollection({ name: trimmedName });
      setPawkitName("");
      setShowCreateModal(false);
      setLoading(false);
    } catch (err) {
      setError("Failed to create Pawkit");
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setShowCreateModal(false);
      setPawkitName("");
      setError(null);
    }
  };

  // Create grid items and allPawkits from Zustand store
  const { gridItems, allPawkits } = useMemo(() => {
    // Flatten all pawkits (excluding deleted ones)
    const flattenPawkits = (nodes: typeof collections, result: any[] = []): any[] => {
      for (const node of nodes) {
        // Skip deleted collections
        if (node.deleted === true) continue;

        result.push({ id: node.id, name: node.name, slug: node.slug });
        if (node.children?.length) {
          flattenPawkits(node.children, result);
        }
      }
      return result;
    };

    const allPawkits = flattenPawkits(collections);

    // Create grid items with preview cards (excluding deleted collections)
    const gridItems = collections.filter(root => root.deleted !== true).map(root => {
      const pawkitCards = cards.filter(card => 
        card.collections.includes(root.slug) && card.deleted !== true
      );

      return {
        id: root.id,
        name: root.name,
        slug: root.slug,
        count: pawkitCards.length,
        cards: pawkitCards,
        isPinned: root.pinned,
        isPrivate: root.isPrivate,
        isSystem: root.isSystem,
        hidePreview: root.hidePreview,
        useCoverAsBackground: root.useCoverAsBackground,
        coverImage: root.coverImage,
        hasChildren: root.children && root.children.length > 0
      };
    })
    // Sort: System Pawkits first, then pinned, then by name
    .sort((a, b) => {
      if (a.isSystem && !b.isSystem) return -1;
      if (!a.isSystem && b.isSystem) return 1;
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return a.name.localeCompare(b.name);
    });

    return { gridItems, allPawkits };
  }, [collections, cards]);

  return (
    <>
      {/* Create Pawkit Button - Fixed to top-right */}
      <GlowButton
        onClick={() => setShowCreateModal(true)}
        variant="primary"
        size="md"
        className="fixed top-4 right-20 z-10 flex items-center gap-2"
        title="Create Pawkit"
      >
        <Plus size={16} />
        Create Pawkit
      </GlowButton>

      <div className="space-y-10">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <FolderOpen className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Pawkits</h1>
            <p className="text-sm text-muted-foreground">
              Organize cards into visual groups. Open a Pawkit to filter the library or manage the hierarchy below.
            </p>
          </div>
        </div>

        <CollectionsGrid collections={gridItems} allPawkits={allPawkits} />
        <section className="rounded-lg border border-gray-800 bg-gray-900/40 p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-2">Manage Pawkits</h2>
          <p className="text-sm text-gray-400">
            Use the sidebar to navigate Pawkits and sub-Pawkits. Click the 3-dot menu on any Pawkit card to rename, move, or delete it.
          </p>
        </section>
      </div>

      {/* Create Pawkit Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">
              Create Pawkit
            </h2>
            <form onSubmit={handleCreate}>
              <input
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
                    handleClose();
                  }
                }}
              />
              {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleClose}
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
    </>
  );
}
