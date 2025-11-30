"use client";

import { useState, useEffect, useCallback } from "react";
import { CardDTO } from "@/lib/server/cards";
import { CollectionDTO } from "@/lib/server/collections";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { localDb } from "@/lib/services/local-storage";
import { FileText, Folder } from "lucide-react";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { useDataStore } from "@/lib/stores/data-store";
import { useToastStore } from "@/lib/stores/toast-store";
import { useFileStore } from "@/lib/stores/file-store";

type CardTrashItem = CardDTO & { itemType: "card" };
type PawkitTrashItem = CollectionDTO & { itemType: "pawkit" };
type TrashItem = CardTrashItem | PawkitTrashItem;

type TrashViewProps = {
  cards: CardDTO[];
  pawkits: CollectionDTO[];
};

export function TrashView({ cards: serverCards, pawkits: serverPawkits }: TrashViewProps) {
  const [filter, setFilter] = useState<"all" | "cards" | "pawkits">("all");
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; itemType: "card" | "pawkit"; name: string } | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [localCards, setLocalCards] = useState<CardDTO[]>([]);
  const [localPawkits, setLocalPawkits] = useState<CollectionDTO[]>([]);
  const router = useRouter();
  const serverSync = useSettingsStore((state) => state.serverSync);
  const refreshDataStore = useDataStore((state) => state.refresh);
  const toast = useToastStore();
  const files = useFileStore((state) => state.files);
  const permanentlyDeleteFile = useFileStore((state) => state.permanentlyDeleteFile);

  // Load deleted items from local storage
  const loadLocalTrash = useCallback(async () => {
    try {
      // Get all cards including deleted ones
      const allCards = await localDb.getAllCards(true); // includeDeleted = true
      const deletedCards = allCards.filter(c => c.deleted === true);
      setLocalCards(deletedCards);

      // Get all collections including deleted ones
      const allCollections = await localDb.getAllCollections(true); // includeDeleted = true
      // Flatten the tree structure since trash items shouldn't have children
      const flatCollections = allCollections.reduce<CollectionDTO[]>((acc, collection) => {
        const flatten = (node: typeof collection): CollectionDTO[] => {
          // Convert CollectionNode to CollectionDTO format
          // CollectionDTO requires passwordHash which CollectionNode doesn't have in local storage
          // Also ensure all optional fields have proper defaults
          const dto: CollectionDTO = {
            ...node,
            parentId: node.parentId ?? null, // Convert undefined to null
            coverImage: node.coverImage ?? null,
            coverImagePosition: node.coverImagePosition ?? null,
            hidePreview: node.hidePreview ?? false,
            useCoverAsBackground: node.useCoverAsBackground ?? false,
            inDen: node.inDen ?? false,
            isPrivate: node.isPrivate ?? false,
            isSystem: node.isSystem ?? false,
            passwordHash: null, // Local storage doesn't store passwordHash
            children: [], // Trash items don't need children
            deletedAt: (node as any).deletedAt || null, // Ensure deletedAt is present
          };
          const result: CollectionDTO[] = [dto];
          if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
              result.push(...flatten(child));
            });
          }
          return result;
        };
        return [...acc, ...flatten(collection)];
      }, []);
      const deletedCollections = flatCollections.filter(c => c.deleted === true);
      setLocalPawkits(deletedCollections);
    } catch (error) {
    }
  }, []);

  useEffect(() => {
    // Always load local trash to merge with server data
    loadLocalTrash();
  }, [loadLocalTrash, serverSync, serverCards.length, serverPawkits.length]); // Reload when sync status or server data changes

  // Merge server and local data - prefer server data for items that exist on both
  // This handles the case where serverSync is enabled but some items were deleted locally before sync
  const mergedCards = (() => {
    const serverCardIds = new Set(serverCards.map(c => c.id));
    // Add server cards first, then add local cards that aren't on server
    return [
      ...serverCards,
      ...localCards.filter(c => !serverCardIds.has(c.id))
    ];
  })();

  const mergedPawkits = (() => {
    const serverPawkitIds = new Set(serverPawkits.map(p => p.id));
    // Add server pawkits first, then add local pawkits that aren't on server
    return [
      ...serverPawkits,
      ...localPawkits.filter(p => !serverPawkitIds.has(p.id))
    ];
  })();

  // Use merged data (server + local) when serverSync is enabled, or just local when disabled
  const cards = serverSync ? mergedCards : localCards;
  const pawkits = serverSync ? mergedPawkits : localPawkits;

  const allItems: TrashItem[] = [
    ...cards.map((card): CardTrashItem => ({ ...card, itemType: "card" as const })),
    ...pawkits.map((pawkit): PawkitTrashItem => ({ ...pawkit, itemType: "pawkit" as const }))
  ].sort((a, b) => {
    const aTime = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
    const bTime = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
    return bTime - aTime;
  });

  const filteredItems = allItems.filter((item) => {
    if (filter === "all") return true;
    if (filter === "cards") return item.itemType === "card";
    if (filter === "pawkits") return item.itemType === "pawkit";
    return true;
  });

  const handleRestore = async (id: string, type: "card" | "pawkit") => {
    setLoading(id);
    try {
      const endpoint = type === "card" ? `/api/trash/cards/${id}/restore` : `/api/trash/pawkits/${id}/restore`;
      const response = await fetch(endpoint, { method: "POST" });

      if (!response.ok) throw new Error("Failed to restore");

      const data = await response.json();

      // Show appropriate toast based on restore context
      if (type === "pawkit" && data.restoredToRoot) {
        toast.info("Pawkit restored to root level (parent no longer exists)");
      } else if (type === "pawkit") {
        toast.success("Pawkit restored successfully");
      } else if (type === "card" && data.restoredToLibrary) {
        toast.info("Card restored to Library (Pawkit no longer exists)");
      } else if (type === "card") {
        toast.success("Card restored successfully");
      }

      // Reload local trash and refresh data-store after restore
      await loadLocalTrash();
      await refreshDataStore(); // Update data-store with restored item
      router.refresh();
    } catch (error) {
      toast.error(`Failed to restore ${type}`);
    } finally {
      setLoading(null);
    }
  };

  const handlePermanentDelete = (id: string, itemType: "card" | "pawkit", name: string) => {
    setDeleteConfirm({ id, itemType, name });
  };

  const confirmPermanentDelete = async () => {
    if (!deleteConfirm) return;

    setLoading(deleteConfirm.id);
    try {
      const endpoint = deleteConfirm.itemType === "card"
        ? `/api/trash/cards/${deleteConfirm.id}`
        : `/api/trash/pawkits/${deleteConfirm.id}`;
      const response = await fetch(endpoint, { method: "DELETE" });

      if (!response.ok) throw new Error("Failed to delete");

      // Delete associated files from Filen when deleting a card
      if (deleteConfirm.itemType === "card") {
        // Find files attached to this card OR file cards with this card's fileId
        const cardToDelete = [...localCards, ...serverCards].find(c => c.id === deleteConfirm.id);
        const filesToDelete = files.filter(f =>
          f.cardId === deleteConfirm.id || // Attachments
          (cardToDelete?.isFileCard && cardToDelete.fileId === f.id) // File card's file
        );

        // Delete each file (this will also delete from Filen)
        for (const file of filesToDelete) {
          try {
            await permanentlyDeleteFile(file.id);
          } catch (error) {
            console.error("[TrashView] Failed to delete file from Filen:", file.id, error);
          }
        }
      }

      // Also delete from IndexedDB
      if (deleteConfirm.itemType === "card") {
        await localDb.permanentlyDeleteCard(deleteConfirm.id);
      } else {
        await localDb.permanentlyDeleteCollection(deleteConfirm.id);
      }

      // Wait a bit to ensure server deletion completes before refresh
      await new Promise(resolve => setTimeout(resolve, 100));

      // Reload local trash after permanent delete
      await loadLocalTrash();
      router.refresh();
    } catch (error) {
      toast.error(`Failed to permanently delete ${deleteConfirm.itemType}`);
    } finally {
      setLoading(null);
      setDeleteConfirm(null);
    }
  };

  const handleEmptyTrash = () => {
    setShowEmptyConfirm(true);
  };

  const confirmEmptyTrash = async () => {
    setLoading("empty-all");
    try {
      // Get all deleted cards to find their files
      const allDeletedCards = [...localCards, ...serverCards].filter(c => c.deleted);

      // Delete files from Filen for all deleted cards
      for (const card of allDeletedCards) {
        const filesToDelete = files.filter(f =>
          f.cardId === card.id || // Attachments
          (card.isFileCard && card.fileId === f.id) // File card's file
        );

        for (const file of filesToDelete) {
          try {
            await permanentlyDeleteFile(file.id);
          } catch (error) {
            console.error("[TrashView] Failed to delete file from Filen:", file.id, error);
          }
        }
      }

      const response = await fetch("/api/trash/empty", { method: "POST" });
      if (!response.ok) throw new Error("Failed to empty trash");

      // Also empty trash from IndexedDB
      await localDb.emptyTrash();

      // Wait a bit to ensure server deletion completes before refresh
      // This prevents a race condition where sync pulls data before deletion finishes
      await new Promise(resolve => setTimeout(resolve, 200));

      // Reload local trash after emptying
      await loadLocalTrash();
      router.refresh();
    } catch (error) {
      toast.error("Failed to empty trash");
    } finally {
      setLoading(null);
      setShowEmptyConfirm(false);
    }
  };

  const getDaysRemaining = (deletedAt: string | null) => {
    if (!deletedAt) return 30;
    const now = new Date();
    const thirtyDaysLater = new Date(deletedAt);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const diff = thirtyDaysLater.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-100">Trash</h1>
        {allItems.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            disabled={loading === "empty-all"}
            className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {loading === "empty-all" ? "Emptying..." : "Empty Trash"}
          </button>
        )}
      </div>

      <p className="text-sm text-gray-400">
        Items in trash will be permanently deleted after 30 days.
      </p>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded px-4 py-2 text-sm ${
            filter === "all"
              ? "bg-accent text-gray-900 font-medium"
              : "bg-gray-900 text-gray-300 hover:bg-gray-800"
          }`}
        >
          All ({allItems.length})
        </button>
        <button
          onClick={() => setFilter("cards")}
          className={`rounded px-4 py-2 text-sm ${
            filter === "cards"
              ? "bg-accent text-gray-900 font-medium"
              : "bg-gray-900 text-gray-300 hover:bg-gray-800"
          }`}
        >
          Cards ({cards.length})
        </button>
        <button
          onClick={() => setFilter("pawkits")}
          className={`rounded px-4 py-2 text-sm ${
            filter === "pawkits"
              ? "bg-accent text-gray-900 font-medium"
              : "bg-gray-900 text-gray-300 hover:bg-gray-800"
          }`}
        >
          Pawkits ({pawkits.length})
        </button>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="text-lg font-medium text-gray-300 mb-2">Trash is empty</div>
          <div className="text-sm text-gray-500">Deleted items will appear here</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const isCard = item.itemType === "card";
            const name = isCard ? (item as CardTrashItem).title || (item as CardTrashItem).url : (item as PawkitTrashItem).name;
            const daysRemaining = getDaysRemaining(item.deletedAt);

            return (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-lg border border-gray-800 bg-gray-900/40 p-4 hover:border-gray-700"
              >
                {/* Icon */}
                <div className={`flex h-10 w-10 items-center justify-center rounded ${isCard ? "bg-blue-900/20" : "bg-purple-900/20"}`}>
                  <span className="text-gray-500">
                    {isCard ? <FileText size={20} /> : <Folder size={20} />}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-200 truncate">{name}</div>
                  <div className="text-xs text-gray-500">
                    {item.deletedAt && (
                      <>
                        Deleted {formatDistanceToNow(new Date(item.deletedAt), { addSuffix: true })} •{" "}
                        <span className={daysRemaining <= 7 ? "text-rose-400" : ""}>
                          Auto-deletes in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRestore(item.id, item.itemType)}
                    disabled={loading === item.id}
                    className="rounded bg-accent px-3 py-1 text-sm font-medium text-gray-900 hover:bg-accent/90 disabled:opacity-50"
                  >
                    {loading === item.id ? "Restoring..." : "Restore"}
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(item.id, item.itemType, name)}
                    disabled={loading === item.id}
                    className="rounded bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                  >
                    Delete Forever
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Permanently Delete?</h2>
            <p className="text-sm text-gray-400 mb-2">
              Are you sure you want to permanently delete <span className="font-medium text-gray-200">&quot;{deleteConfirm.name}&quot;</span>?
            </p>
            <p className="text-sm text-rose-400 mb-4">
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPermanentDelete}
                className="flex-1 rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty Trash Confirmation Modal */}
      {showEmptyConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowEmptyConfirm(false)}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Empty Trash?</h2>
            <p className="text-sm text-gray-400 mb-2">
              Are you sure you want to permanently delete <span className="font-medium text-gray-200">ALL {allItems.length} items</span> in trash?
            </p>
            <p className="text-sm text-rose-400 mb-4">
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEmptyConfirm(false)}
                disabled={loading === "empty-all"}
                className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmEmptyTrash}
                disabled={loading === "empty-all"}
                className="flex-1 rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {loading === "empty-all" ? "Emptying..." : "Empty Trash"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
