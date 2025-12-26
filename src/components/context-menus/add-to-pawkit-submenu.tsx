'use client';

import {
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { FolderPlus, Check, ChevronRight } from 'lucide-react';
import { useDataStore } from '@/lib/stores/data-store';
import { useToastStore } from '@/lib/stores/toast-store';
import type { LocalCollection } from '@/lib/db';
import { cn } from '@/lib/utils';

interface AddToPawkitSubmenuProps {
  cardId: string;
  cardCollections: string[];
}

interface CollectionTreeItem extends LocalCollection {
  children: CollectionTreeItem[];
}

function buildCollectionTree(collections: LocalCollection[]): CollectionTreeItem[] {
  const map = new Map<string | null, CollectionTreeItem[]>();

  // Initialize with empty arrays
  map.set(null, []);
  collections.forEach(c => map.set(c.id, []));

  // Build tree
  const items: CollectionTreeItem[] = collections.map(c => ({
    ...c,
    children: []
  }));

  const itemMap = new Map(items.map(i => [i.id, i]));
  const roots: CollectionTreeItem[] = [];

  items.forEach(item => {
    if (item.parentId && itemMap.has(item.parentId)) {
      itemMap.get(item.parentId)!.children.push(item);
    } else {
      roots.push(item);
    }
  });

  // Sort by position
  const sortByPosition = (a: CollectionTreeItem, b: CollectionTreeItem) =>
    (a.position || 0) - (b.position || 0);

  roots.sort(sortByPosition);
  items.forEach(item => item.children.sort(sortByPosition));

  return roots;
}

function CollectionItem({
  item,
  cardId,
  cardCollections,
  depth = 0,
  onAdd,
}: {
  item: CollectionTreeItem;
  cardId: string;
  cardCollections: string[];
  depth?: number;
  onAdd: (slug: string, name: string) => void;
}) {
  const isInCollection = cardCollections.includes(item.slug);
  const hasChildren = item.children.length > 0;

  if (hasChildren) {
    return (
      <ContextMenuSub>
        <ContextMenuSubTrigger
          className={cn(depth > 0 && 'pl-4')}
          onClick={(e) => {
            // Allow clicking parent to add/remove
            e.preventDefault();
            e.stopPropagation();
            onAdd(item.slug, item.name);
          }}
        >
          <span className="flex items-center gap-2 flex-1">
            {item.icon && <span className="text-sm">{item.icon}</span>}
            <span className="truncate">{item.name}</span>
          </span>
          {isInCollection && <Check className="size-4 text-[var(--color-accent)]" />}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {item.children.map((child) => (
            <CollectionItem
              key={child.id}
              item={child}
              cardId={cardId}
              cardCollections={cardCollections}
              depth={depth + 1}
              onAdd={onAdd}
            />
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>
    );
  }

  return (
    <ContextMenuItem
      className={cn(depth > 0 && 'pl-4')}
      onClick={() => onAdd(item.slug, item.name)}
    >
      <span className="flex items-center gap-2 flex-1">
        {item.icon && <span className="text-sm">{item.icon}</span>}
        <span className="truncate">{item.name}</span>
      </span>
      {isInCollection && <Check className="size-4 text-[var(--color-accent)]" />}
    </ContextMenuItem>
  );
}

export function AddToPawkitSubmenu({ cardId, cardCollections }: AddToPawkitSubmenuProps) {
  const collections = useDataStore((s) => s.collections);
  const addCardToCollection = useDataStore((s) => s.addCardToCollection);
  const removeCardFromCollection = useDataStore((s) => s.removeCardFromCollection);
  const toast = useToastStore((s) => s.toast);

  const tree = buildCollectionTree(collections.filter(c => !c._deleted && !c.isSystem));

  const handleToggleCollection = async (slug: string, name: string) => {
    const isInCollection = cardCollections.includes(slug);

    if (isInCollection) {
      await removeCardFromCollection(cardId, slug);
      toast({ type: 'success', message: `Removed from ${name}` });
    } else {
      await addCardToCollection(cardId, slug);
      toast({ type: 'success', message: `Added to ${name}` });
    }
  };

  if (tree.length === 0) {
    return (
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <FolderPlus className="size-4" />
          Add to Pawkit
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem disabled>
            <span className="text-text-muted">No collections yet</span>
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
    );
  }

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <FolderPlus className="size-4" />
        Add to Pawkit
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="max-h-[300px] overflow-y-auto">
        {tree.map((item) => (
          <CollectionItem
            key={item.id}
            item={item}
            cardId={cardId}
            cardCollections={cardCollections}
            onAdd={handleToggleCollection}
          />
        ))}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}
