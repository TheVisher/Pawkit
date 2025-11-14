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
import { FolderPlus, Trash2, FolderMinus, RefreshCw, Pin, PinOff } from "lucide-react";
import { CollectionNode, CardType } from "@/lib/types";

type CardContextMenuWrapperProps = {
  children: ReactNode;
  onAddToPawkit: (slug: string) => void;
  onDelete: () => void;
  cardCollections?: string[]; // Current Pawkits the card is in
  onRemoveFromPawkit?: (slug: string) => void; // Remove from a specific Pawkit
  onRemoveFromAllPawkits?: () => void; // Remove from all Pawkits
  onFetchMetadata?: () => void; // Fetch metadata for the card
  // Pin to sidebar (notes only)
  cardId?: string;
  cardType?: CardType;
  isPinned?: boolean;
  onPinToSidebar?: () => void;
  onUnpinFromSidebar?: () => void;
};

export function CardContextMenuWrapper({
  children,
  onAddToPawkit,
  onDelete,
  cardCollections = [],
  onRemoveFromPawkit,
  onRemoveFromAllPawkits,
  onFetchMetadata,
  cardId,
  cardType,
  isPinned = false,
  onPinToSidebar,
  onUnpinFromSidebar,
}: CardContextMenuWrapperProps) {
  const [collections, setCollections] = useState<CollectionNode[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/pawkits");
      if (response.ok) {
        const data = await response.json();
        setCollections(data.tree || []);
      }
    } catch (error) {
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
    // Ensure cardCollections is an array
    const collectionsArray = Array.isArray(cardCollections) ? cardCollections : [];
    return collectionsArray.map(slug => ({
      slug,
      name: findCollectionName(slug, collections) || slug
    }));
  };

  return (
    <ContextMenu onOpenChange={(open) => open && fetchCollections()}>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {/* Add to Pawkit menu */}
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
              renderCollectionTree(collections, onAddToPawkit)
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>

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

        {/* Pin to Sidebar - only for notes */}
        {(cardType === 'md-note' || cardType === 'text-note') && (
          <>
            {isPinned ? (
              <ContextMenuItem onClick={onUnpinFromSidebar}>
                <PinOff className="mr-2 h-4 w-4" />
                Unpin from Sidebar
              </ContextMenuItem>
            ) : (
              <ContextMenuItem onClick={onPinToSidebar}>
                <Pin className="mr-2 h-4 w-4" />
                Pin to Sidebar
              </ContextMenuItem>
            )}
          </>
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
