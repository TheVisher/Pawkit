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
  Trash2,
} from 'lucide-react';
import { useDataStore } from '@/lib/stores/data-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { useRouter } from 'next/navigation';

interface SidebarContextMenuProps {
  children: ReactNode;
}

export function SidebarContextMenu({ children }: SidebarContextMenuProps) {
  const createCollection = useDataStore((s) => s.createCollection);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const toast = useToastStore((s) => s.toast);
  const router = useRouter();

  const handleCreatePawkit = async () => {
    if (!currentWorkspace) return;

    const name = prompt('New Pawkit name:');
    if (name?.trim()) {
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await createCollection({
        workspaceId: currentWorkspace.id,
        name: name.trim(),
        slug: `${slug}-${Date.now()}`,
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

  const handleOpenTrash = () => {
    router.push('/trash');
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleCreatePawkit}>
          <FolderPlus className="size-4" />
          New Pawkit
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={handleOpenTrash}>
          <Trash2 className="size-4" />
          Open Trash
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
