"use client";

import { useState } from "react";
import { CardDTO } from "@/lib/server/cards";
import { CollectionDTO } from "@/lib/server/collections";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { localDb } from "@/lib/services/local-storage";
import { FileText, Folder } from "lucide-react";

type CardTrashItem = CardDTO & { itemType: "card" };
type PawkitTrashItem = CollectionDTO & { itemType: "pawkit" };
type TrashItem = CardTrashItem | PawkitTrashItem;

type TrashViewProps = {
  cards: CardDTO[];
  pawkits: CollectionDTO[];
};

export function TrashView({ cards, pawkits }: TrashViewProps) {
  const [filter, setFilter] = useState<"all" | "cards" | "pawkits">("all");
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; itemType: "card" | "pawkit"; name: string } | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const router = useRouter();

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

      router.refresh();
    } catch (error) {
      alert(`Failed to restore ${type}`);
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

      // Also delete from IndexedDB
      if (deleteConfirm.itemType === "card") {
        await localDb.permanentlyDeleteCard(deleteConfirm.id);
      } else {
        await localDb.permanentlyDeleteCollection(deleteConfirm.id);
      }

      router.refresh();
    } catch (error) {
      alert(`Failed to permanently delete ${deleteConfirm.itemType}`);
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
      const response = await fetch("/api/trash/empty", { method: "POST" });
      if (!response.ok) throw new Error("Failed to empty trash");

      // Also empty trash from IndexedDB
      await localDb.emptyTrash();

      router.refresh();
    } catch (error) {
      alert("Failed to empty trash");
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
