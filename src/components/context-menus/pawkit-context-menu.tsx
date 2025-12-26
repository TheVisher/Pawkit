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
import type { LocalCollection } from '@/lib/db';

interface PawkitContextMenuProps {
  collection: LocalCollection;
  children: ReactNode;
}

export function PawkitContextMenu({ collection, children }: PawkitContextMenuProps) {
  const updateCollection = useDataStore((s) => s.updateCollection);
  const deleteCollection = useDataStore((s) => s.deleteCollection);
  const createCollection = useDataStore((s) => s.createCollection);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const toast = useToastStore((s) => s.toast);

  const handleCreateChild = async () => {
    if (!currentWorkspace) return;

    const name = prompt('New Pawkit name:');
    if (name?.trim()) {
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await createCollection({
        workspaceId: currentWorkspace.id,
        name: name.trim(),
        slug: `${slug}-${Date.now()}`,
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
      await updateCollection(collection.id, { name: newName.trim() });
      toast({ type: 'success', message: 'Renamed' });
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
