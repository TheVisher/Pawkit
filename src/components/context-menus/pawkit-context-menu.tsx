'use client';

import { type ReactNode } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  FolderPlus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useDataStore } from '@/lib/stores/data-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { useCollections } from '@/lib/hooks/use-live-data';
import { slugify } from '@/lib/utils';
import type { LocalCollection } from '@/lib/db';

interface PawkitContextMenuProps {
  collection: LocalCollection;
  children: ReactNode;
}

export function PawkitContextMenu({ collection, children }: PawkitContextMenuProps) {
  const renamePawkit = useDataStore((s) => s.renamePawkit);
  const deleteCollection = useDataStore((s) => s.deleteCollection);
  const createCollection = useDataStore((s) => s.createCollection);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const toast = useToastStore((s) => s.toast);
  const collections = useCollections(currentWorkspace?.id);

  const handleCreateChild = async () => {
    if (!currentWorkspace) return;

    const name = prompt('New Pawkit name:');
    if (name?.trim()) {
      const slug = slugify(name);

      // Check if slug already exists in this workspace
      const exists = collections.find(c => c.slug === slug && !c._deleted);
      if (exists) {
        toast({ type: 'error', message: 'A Pawkit with this name already exists' });
        return;
      }

      await createCollection({
        workspaceId: currentWorkspace.id,
        name: name.trim(),
        slug,
        parentId: collection.id,
        position: 0,
        isPrivate: false,
        isSystem: false,
        pinned: false,
        hidePreview: false,
        useCoverAsBackground: false,
      });
      toast({ type: 'success', message: `Created ${name}` });
    }
  };

  const handleRename = async () => {
    const newName = prompt('Rename Pawkit:', collection.name);
    if (newName?.trim() && newName !== collection.name) {
      const result = await renamePawkit(collection.id, newName.trim());
      if (result.success) {
        toast({ type: 'success', message: 'Renamed' });
      } else {
        toast({ type: 'error', message: result.error || 'Failed to rename' });
      }
    }
  };

  const handleDelete = async () => {
    if (confirm(`Delete "${collection.name}"? Cards in this collection won't be deleted.`)) {
      await deleteCollection(collection.id);
      toast({ type: 'success', message: `Deleted ${collection.name}` });
    }
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

        {/* Delete */}
        <ContextMenuItem variant="destructive" onClick={handleDelete}>
          <Trash2 className="size-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
