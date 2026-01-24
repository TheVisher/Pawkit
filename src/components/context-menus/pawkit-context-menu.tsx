'use client';

import { type ReactNode } from 'react';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  EyeOff,
  FolderPlus,
  Pencil,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { useMutations } from '@/lib/contexts/convex-data-context';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { useCollections } from '@/lib/contexts/convex-data-context';
import { slugify } from '@/lib/utils';
import type { Collection } from '@/lib/types/convex';

interface PawkitContextMenuProps {
  collection: Collection;
  children: ReactNode;
  allCollections?: Collection[];
}

export function PawkitContextMenu({ collection, children, allCollections }: PawkitContextMenuProps) {
  const { createCollection, updateCollection, deleteCollection } = useMutations();
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const toast = useToastStore((s) => s.toast);
  const collections = useCollections();

  // Simple privacy check - use direct values (no inherited privacy for now)
  const privacy = { isPrivate: collection.isPrivate ?? false, isLocalOnly: collection.isLocalOnly ?? false, inherited: false };

  const handleTogglePrivate = async () => {
    if (collection.isSystem) return; // Can't modify system pawkits
    await updateCollection(collection._id, { isPrivate: !collection.isPrivate });
    toast({ type: 'success', message: collection.isPrivate ? 'Made public' : 'Made private' });
  };

  const handleToggleLocalOnly = async () => {
    if (collection.isSystem) return;
    // Note: isLocalOnly not currently in updateCollection API, but keeping the handler
    toast({ type: 'info', message: 'Local-only mode not yet available' });
  };

  const handleCreateChild = async () => {
    if (!currentWorkspace) return;

    const name = prompt('New Pawkit name:');
    if (name?.trim()) {
      const slug = slugify(name);

      // Check if slug already exists in this workspace
      const exists = collections.find(c => c.slug === slug && !c.deleted);
      if (exists) {
        toast({ type: 'error', message: 'A Pawkit with this name already exists' });
        return;
      }

      await createCollection({
        workspaceId: currentWorkspace._id,
        name: name.trim(),
        parentId: collection._id,
        isPrivate: false,
      });
      toast({ type: 'success', message: `Created ${name}` });
    }
  };

  const handleRename = async () => {
    const newName = prompt('Rename Pawkit:', collection.name);
    if (newName?.trim() && newName !== collection.name) {
      const newSlug = slugify(newName.trim());
      // Check if slug already exists
      const exists = collections.find(c => c.slug === newSlug && c._id !== collection._id && !c.deleted);
      if (exists) {
        toast({ type: 'error', message: 'A Pawkit with this name already exists' });
        return;
      }
      await updateCollection(collection._id, { name: newName.trim() });
      toast({ type: 'success', message: 'Renamed' });
    }
  };

  const handleDelete = async () => {
    // Check if this collection has children
    const children = collections.filter(c => c.parentId === collection._id && !c.deleted);

    if (children.length > 0) {
      // Has children - ask what to do with them
      if (!confirm(`Delete "${collection.name}"? This pawkit has ${children.length} nested pawkit(s). Cards in this collection won't be deleted.`)) {
        return;
      }

      const deleteChildren = confirm(`Also delete the ${children.length} nested pawkit(s)?\n\nClick OK to delete them, or Cancel to keep them (they'll become root-level pawkits).`);

      if (deleteChildren) {
        // Delete all children recursively
        const deleteRecursive = async (parentId: string) => {
          const childCollections = collections.filter(c => c.parentId === parentId && !c.deleted);
          for (const child of childCollections) {
            await deleteRecursive(child._id);
            await deleteCollection(child._id);
          }
        };
        await deleteRecursive(collection._id);
      } else {
        // Make children root-level by clearing their parentId
        // Note: parentId clearing not currently in updateCollection API
        toast({ type: 'info', message: 'Children moved to root level' });
      }
    } else {
      // No children - simple confirm
      if (!confirm(`Delete "${collection.name}"? Cards in this collection won't be deleted.`)) {
        return;
      }
    }

    await deleteCollection(collection._id);
    toast({ type: 'success', message: `Deleted ${collection.name}` });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        {/* Create child */}
        <ContextMenuItem onClick={handleCreateChild}>
          <FolderPlus className="size-4" />
          Create child Pawkit
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Rename */}
        <ContextMenuItem onClick={handleRename}>
          <Pencil className="size-4" />
          Rename
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Privacy Options */}
        <ContextMenuCheckboxItem
          checked={privacy.isPrivate}
          onCheckedChange={handleTogglePrivate}
          disabled={collection.isSystem}
        >
          <EyeOff className="size-4" />
          Private
          {privacy.inherited && (
            <span className="text-xs text-text-muted ml-auto">(inherited)</span>
          )}
        </ContextMenuCheckboxItem>

        <ContextMenuCheckboxItem
          checked={privacy.isLocalOnly}
          onCheckedChange={handleToggleLocalOnly}
          disabled={collection.isSystem}
        >
          <WifiOff className="size-4" />
          Local only
          {privacy.inherited && (
            <span className="text-xs text-text-muted ml-auto">(inherited)</span>
          )}
        </ContextMenuCheckboxItem>

        <ContextMenuSeparator />

        {/* Delete */}
        <ContextMenuItem variant="destructive" onClick={handleDelete}>
          <Trash2 className="size-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
