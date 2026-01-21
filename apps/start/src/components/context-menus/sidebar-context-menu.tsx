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
import { useMutations } from '@/lib/contexts/convex-data-context';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { useCollections } from '@/lib/contexts/convex-data-context';
import { slugify } from '@/lib/utils';
import { useRouter } from '@/lib/navigation';

interface SidebarContextMenuProps {
  children: ReactNode;
}

export function SidebarContextMenu({ children }: SidebarContextMenuProps) {
  const { createCollection } = useMutations();
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const toast = useToastStore((s) => s.toast);
  const collections = useCollections();
  const router = useRouter();

  const handleCreatePawkit = async () => {
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
        slug,
        isPrivate: false,
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
