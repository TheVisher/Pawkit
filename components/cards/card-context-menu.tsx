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
import { FolderPlus, Trash2, Home, FolderMinus } from "lucide-react";
import { CollectionNode } from "@/lib/types";

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
}: CardContextMenuWrapperProps) {
  const [collections, setCollections] = useState<CollectionNode[]>([]);
  const [regularCollections, setRegularCollections] = useState<CollectionNode[]>([]);
  const [loading, setLoading] = useState(false);

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
    return cardCollections.map(slug => ({
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
              renderCollectionTree(collections, onAddToPawkit)
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
        {cardCollections.length > 0 && onRemoveFromPawkit && (
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

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onDelete} className="text-rose-400">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
