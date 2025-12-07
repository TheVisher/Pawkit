"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { Trash2, RotateCcw, FileText, Folder, ExternalLink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { localDb } from "@/lib/services/local-storage";
import { useDataStore } from "@/lib/stores/data-store";
import { useToastStore } from "@/lib/stores/toast-store";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { CollectionNode } from "@/lib/types";

type TrashItem = {
  id: string;
  type: "card" | "pawkit";
  name: string;
  deletedAt: string | null;
  cardType?: string;
};

type TrashPopoverProps = {
  children: ReactNode;
};

export function TrashPopover({ children }: TrashPopoverProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TrashItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const router = useRouter();
  const toast = useToastStore();
  const refreshDataStore = useDataStore((state) => state.refresh);

  // Load trash items when popover opens
  const loadTrashItems = useCallback(async () => {
    setLoading(true);
    try {
      // Get deleted cards from IndexedDB
      const allCards = await localDb.getAllCards(true);
      const deletedCards = allCards
        .filter((c) => c.deleted === true)
        .map((card): TrashItem => ({
          id: card.id,
          type: "card",
          name: card.title || card.url || "Untitled",
          deletedAt: card.deletedAt || null,
          cardType: card.type,
        }));

      // Get deleted collections from IndexedDB
      const allCollections = await localDb.getAllCollections(true);
      const flattenCollections = (nodes: CollectionNode[]): TrashItem[] => {
        const result: TrashItem[] = [];
        for (const node of nodes) {
          if (node.deleted) {
            result.push({
              id: node.id,
              type: "pawkit",
              name: node.name,
              deletedAt: (node as any).deletedAt || null,
            });
          }
          if (node.children?.length) {
            result.push(...flattenCollections(node.children));
          }
        }
        return result;
      };
      const deletedPawkits = flattenCollections(allCollections);

      // Combine and sort by deletedAt (newest first)
      const allItems = [...deletedCards, ...deletedPawkits].sort((a, b) => {
        const aTime = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
        const bTime = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
        return bTime - aTime;
      });

      // Limit to 50 items for performance
      setItems(allItems.slice(0, 50));
    } catch (error) {
      console.error("[TrashPopover] Failed to load trash items:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load items when popover opens
  useEffect(() => {
    if (open) {
      loadTrashItems();
      setSelectedIds(new Set());
    }
  }, [open, loadTrashItems]);

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  };

  // Restore selected items
  const handleRestore = async () => {
    if (selectedIds.size === 0) return;

    setRestoring(true);
    try {
      const selectedItems = items.filter((item) => selectedIds.has(item.id));
      let successCount = 0;

      for (const item of selectedItems) {
        try {
          const endpoint =
            item.type === "card"
              ? `/api/trash/cards/${item.id}/restore`
              : `/api/trash/pawkits/${item.id}/restore`;
          const response = await fetch(endpoint, { method: "POST" });
          if (response.ok) {
            successCount++;
          }
        } catch (error) {
          console.error(`[TrashPopover] Failed to restore ${item.id}:`, error);
        }
      }

      // Refresh data store and reload trash items
      await refreshDataStore();
      await loadTrashItems();
      setSelectedIds(new Set());

      if (successCount > 0) {
        toast.success(`Restored ${successCount} item${successCount > 1 ? "s" : ""}`);
      }
    } catch (error) {
      console.error("[TrashPopover] Restore failed:", error);
      toast.error("Failed to restore items");
    } finally {
      setRestoring(false);
    }
  };

  // Empty trash
  const handleEmptyTrash = async () => {
    if (items.length === 0) return;

    const confirmed = window.confirm(
      `Permanently delete all ${items.length} items? This cannot be undone.`
    );
    if (!confirmed) return;

    setRestoring(true);
    try {
      // Call API to empty trash
      const response = await fetch("/api/trash/empty", { method: "POST" });
      if (!response.ok) throw new Error("Failed to empty trash");

      // Also empty from IndexedDB
      await localDb.emptyTrash();

      // Refresh and close
      await refreshDataStore();
      setItems([]);
      setSelectedIds(new Set());
      toast.success("Trash emptied");
    } catch (error) {
      console.error("[TrashPopover] Empty trash failed:", error);
      toast.error("Failed to empty trash");
    } finally {
      setRestoring(false);
    }
  };

  // Navigate to full trash page
  const handleViewAll = () => {
    setOpen(false);
    router.push("/trash");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[340px] p-0 z-[200]"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-2">
            <Trash2 size={16} className="text-muted-foreground" />
            <span className="font-medium text-sm">
              Trash {items.length > 0 && `(${items.length})`}
            </span>
          </div>
          {items.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {selectedIds.size === items.length ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>

        {/* Items List */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: "280px" }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Trash2 size={24} className="mb-2 opacity-50" />
              <span className="text-sm">Trash is empty</span>
            </div>
          ) : (
            <div className="py-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => toggleSelection(item.id)}
                >
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => toggleSelection(item.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {item.type === "card" ? (
                      <FileText size={14} className="shrink-0 text-muted-foreground" />
                    ) : (
                      <Folder size={14} className="shrink-0 text-muted-foreground" />
                    )}
                    <span className="text-sm truncate">{item.name}</span>
                  </div>
                  {item.deletedAt && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(item.deletedAt), { addSuffix: false })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div
          className="px-4 py-3 space-y-2"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleRestore}
              disabled={selectedIds.size === 0 || restoring}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: selectedIds.size > 0 ? "var(--bg-surface-3)" : "var(--bg-surface-2)",
                color: selectedIds.size > 0 ? "var(--text-primary)" : "var(--text-muted)",
              }}
            >
              <RotateCcw size={14} />
              <span>
                Restore{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
              </span>
            </button>
            <button
              onClick={handleEmptyTrash}
              disabled={items.length === 0 || restoring}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={14} />
              <span>Empty</span>
            </button>
          </div>

          {/* View All Link */}
          <button
            onClick={handleViewAll}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>View All</span>
            <ExternalLink size={12} />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
