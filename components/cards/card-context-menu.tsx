"use client";

import { useState, ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FolderPlus, Trash2, Home, FolderMinus, RefreshCw, Plus } from "lucide-react";
import { CollectionNode } from "@/lib/types";
import { useDataStore } from "@/lib/stores/data-store";

type CardContextMenuWrapperProps = {
  children: ReactNode;
  onAddToPawkit: (slug: string) => void;
  onDelete: () => void;
  onAddToDen?: () => void;
  filterDenOnly?: boolean; // If true, only show Den Pawkits
  onAddToRegularPawkit?: (slug: string) => void; // For Den cards to move to regular Pawkits
  cardCollections?: string[]; // Current Pawkits the card is in
  onRemoveFromPawkit?: (slug: string) => void; // Remove from a specific Pawkit
  onRemoveFromAllPawkits?: () => void; // Remove from all Pawkits
  onFetchMetadata?: () => void; // Fetch metadata for the card
  cardId?: string; // Card ID for creating new pawkit with card
};

export function CardContextMenuWrapper({
  children,
  onAddToPawkit,
  onDelete,
  onAddToDen,
  filterDenOnly = false,
  onAddToRegularPawkit,
  cardCollections = [],
  onRemoveFromPawkit,
  onRemoveFromAllPawkits,
  onFetchMetadata,
  cardId,
}: CardContextMenuWrapperProps) {
  const [collections, setCollections] = useState<CollectionNode[]>([]);
  const [regularCollections, setRegularCollections] = useState<CollectionNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPawkitName, setNewPawkitName] = useState("");
  const [creating, setCreating] = useState(false);

  const { addCollection, updateCard } = useDataStore();

  const handleCreateNewPawkit = async () => {
    const trimmedName = newPawkitName.trim();
    if (!trimmedName || creating || !cardId) return;

    setCreating(true);
    try {
      // Create the pawkit
      await addCollection({ name: trimmedName });

      // Fetch the updated collections to get the new pawkit's slug
      const response = await fetch("/api/pawkits");
      if (response.ok) {
        const data = await response.json();
        const flattenCollections = (nodes: any[]): any[] => {
          return nodes.reduce((acc, node) => {
            acc.push(node);
            if (node.children && node.children.length > 0) {
              acc.push(...flattenCollections(node.children));
            }
            return acc;
          }, []);
        };

        const allCollections = flattenCollections(data.tree || []);
        const newCollection = allCollections.find((c: any) => c.name === trimmedName);

        if (newCollection && newCollection.slug) {
          const currentCollections = cardCollections || [];
          await updateCard(cardId, {
            collections: [...currentCollections, newCollection.slug]
          });
        }
      }

      // Reset and close
      setNewPawkitName("");
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create pawkit:', error);
    } finally {
      setCreating(false);
    }
  };

  const fetchCollections = async () => {
    setLoading(true);
    try {
      if (filterDenOnly && onAddToRegularPawkit) {
        // Fetch both Den and regular Pawkits
        const [denResponse, regularResponse] = await Promise.all([
          fetch("/api/den/pawkits"),
          fetch("/api/pawkits")
        ]);
        if (denResponse.ok && regularResponse.ok) {
          const denData = await denResponse.json();
          const regularData = await regularResponse.json();
          setCollections(denData.collections || []);
          setRegularCollections(regularData.tree || []);
        }
      } else {
        // Fetch only one type
        const endpoint = filterDenOnly ? "/api/den/pawkits" : "/api/pawkits";
        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          setCollections(filterDenOnly ? data.collections || [] : data.tree || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch collections:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderCollectionTree = (items: CollectionNode[] | any[], onClick: (slug: string) => void) => {
    if (!items || items.length === 0) {
      return (
        <ContextMenuItem disabled className="text-xs text-muted-foreground">
          No Pawkits yet
        </ContextMenuItem>
      );
    }

    return items.map((collection) => {
      const hasChildren = collection.children && collection.children.length > 0;

      if (hasChildren) {
        return (
          <ContextMenuSub key={collection.id}>
            <ContextMenuSubTrigger>
              {collection.name}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onClick={() => onClick(collection.slug)}>
                Add to {collection.name}
              </ContextMenuItem>
              <ContextMenuSeparator />
              {renderCollectionTree(collection.children, onClick)}
            </ContextMenuSubContent>
          </ContextMenuSub>
        );
      }

      return (
        <ContextMenuItem
          key={collection.id}
          onClick={() => onClick(collection.slug)}
        >
          {collection.name}
        </ContextMenuItem>
      );
    });
  };

  // Helper to find collection name from slug
  const findCollectionName = (slug: string, items: CollectionNode[]): string | null => {
    for (const item of items) {
      if (item.slug === slug) return item.name;
      if (item.children) {
        const found = findCollectionName(slug, item.children);
        if (found) return found;
      }
    }
    return null;
  };

  // Get names for current collections
  const getCurrentPawkitNames = () => {
    const allCollections = filterDenOnly ? [...collections, ...regularCollections] : collections;
    // Ensure cardCollections is an array
    const collectionsArray = Array.isArray(cardCollections) ? cardCollections : [];
    return collectionsArray.map(slug => ({
      slug,
      name: findCollectionName(slug, allCollections) || slug
    }));
  };

  return (
    <ContextMenu onOpenChange={(open) => open && fetchCollections()}>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {/* Show regular Pawkits menu when in Den */}
        {filterDenOnly && onAddToRegularPawkit && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <FolderPlus className="mr-2 h-4 w-4" />
              Add to Pawkit
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="max-h-[300px] overflow-y-auto">
              {loading ? (
                <ContextMenuItem disabled className="text-xs text-muted-foreground">
                  Loading...
                </ContextMenuItem>
              ) : (
                renderCollectionTree(regularCollections, onAddToRegularPawkit)
              )}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        {/* Show Den Pawkits or regular Pawkits menu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <FolderPlus className="mr-2 h-4 w-4" />
            Add to {filterDenOnly ? "Den " : ""}Pawkit
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="max-h-[300px] overflow-y-auto">
            {loading ? (
              <ContextMenuItem disabled className="text-xs text-muted-foreground">
                Loading...
              </ContextMenuItem>
            ) : (
              <>
                {cardId && (
                  <>
                    <ContextMenuItem onClick={() => setShowCreateModal(true)}>
                      <Plus className="mr-2 h-4 w-4 text-purple-400" />
                      Create New Pawkit
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                  </>
                )}
                {renderCollectionTree(collections, onAddToPawkit)}
              </>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>

        {!filterDenOnly && onAddToDen && (
          <ContextMenuItem onClick={onAddToDen}>
            <Home className="mr-2 h-4 w-4" />
            Add to The Den
          </ContextMenuItem>
        )}

        {/* Remove from Pawkits submenu */}
        {Array.isArray(cardCollections) && cardCollections.length > 0 && onRemoveFromPawkit && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <FolderMinus className="mr-2 h-4 w-4" />
              Remove from Pawkits
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="max-h-[300px] overflow-y-auto">
              {getCurrentPawkitNames().map(({ slug, name }) => (
                <ContextMenuItem
                  key={slug}
                  onClick={() => onRemoveFromPawkit(slug)}
                >
                  {name}
                </ContextMenuItem>
              ))}
              {cardCollections.length > 1 && onRemoveFromAllPawkits && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={onRemoveFromAllPawkits}
                    className="text-rose-400"
                  >
                    Remove from all Pawkits
                  </ContextMenuItem>
                </>
              )}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        {onFetchMetadata && (
          <ContextMenuItem onClick={onFetchMetadata}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Fetch metadata
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onDelete} className="text-rose-400">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
      {/* Create Pawkit Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            if (!creating) {
              setShowCreateModal(false);
              setNewPawkitName("");
            }
          }}
        >
          <div
            className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 shadow-glow-accent p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">Create Pawkit</h3>
            <input
              type="text"
              value={newPawkitName}
              onChange={(e) => setNewPawkitName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateNewPawkit();
                } else if (e.key === "Escape") {
                  if (!creating) {
                    setShowCreateModal(false);
                    setNewPawkitName("");
                  }
                }
              }}
              placeholder="Pawkit name"
              className="w-full rounded-lg bg-white/5 backdrop-blur-sm px-4 py-2 text-sm text-foreground placeholder-muted-foreground border border-white/10 focus:border-accent focus:outline-none transition-colors"
              autoFocus
              disabled={creating}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  if (!creating) {
                    setShowCreateModal(false);
                    setNewPawkitName("");
                  }
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                disabled={creating}
              >
                Esc to Cancel
              </button>
              <button
                onClick={handleCreateNewPawkit}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50"
                disabled={creating || !newPawkitName.trim()}
              >
                {creating ? "Creating..." : "Enter to Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ContextMenu>
  );
}
