'use client';

import { useModalStore } from '@/lib/stores/modal-store';
import { useMobile } from '@/lib/hooks/use-mobile';
import { Drawer } from 'vaul';
import { FolderOpen } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { CreatePawkitForm } from './create-pawkit-form';

export function CreatePawkitModal() {
  const { isCreatePawkitOpen, closeCreatePawkitModal } = useModalStore();
  const isMobile = useMobile();

  if (isMobile) {
    return (
      <Drawer.Root open={isCreatePawkitOpen} onOpenChange={(open) => !open && closeCreatePawkitModal()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex max-h-[96%] flex-col rounded-t-[20px] bg-[var(--glass-panel-bg)] backdrop-blur-[var(--glass-blur)] border-t border-[var(--glass-border)] outline-none">
            <div className="mx-auto mt-4 h-1.5 w-12 flex-shrink-0 rounded-full bg-[var(--color-text-muted)] opacity-20" />
            <div className="p-6 overflow-y-auto">
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="h-5 w-5 text-[var(--color-accent)]" />
                <h2 className="text-xl font-semibold text-text-primary">Create New Pawkit</h2>
              </div>
              <p className="text-sm text-text-muted mb-6">Organize your cards into a new collection.</p>
              <CreatePawkitForm 
                onSuccess={closeCreatePawkitModal} 
                onCancel={closeCreatePawkitModal} 
              />
            </div>
            <div className="safe-area-pb" />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Dialog open={isCreatePawkitOpen} onOpenChange={(open) => !open && closeCreatePawkitModal()}>
      <DialogContent className="sm:max-w-[425px] bg-[var(--glass-panel-bg)] backdrop-blur-[var(--glass-blur)] border-[var(--glass-border)] shadow-[var(--glass-shadow)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-text-primary">
            <FolderOpen className="h-5 w-5 text-[var(--color-accent)]" />
            Create New Pawkit
          </DialogTitle>
          <DialogDescription className="text-text-muted">
            Organize your cards into a new collection.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <CreatePawkitForm 
            onSuccess={closeCreatePawkitModal} 
            onCancel={closeCreatePawkitModal} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}