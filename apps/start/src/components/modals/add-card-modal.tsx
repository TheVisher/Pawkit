'use client';

import { useModalStore } from '@/lib/stores/modal-store';
import { useMobile } from '@/lib/hooks/use-mobile';
import { Drawer } from 'vaul';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AddCardForm } from './add-card-form';

export function AddCardModal() {
  const { isAddCardOpen, addCardDefaultTab, closeAddCard } = useModalStore();
  const isMobile = useMobile();

  if (isMobile) {
    return (
      <Drawer.Root open={isAddCardOpen} onOpenChange={(open) => !open && closeAddCard()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex max-h-[96%] flex-col rounded-t-[20px] bg-[var(--glass-panel-bg)] backdrop-blur-[var(--glass-blur)] border-t border-[var(--glass-border)] outline-none">
            <div className="mx-auto mt-4 h-1.5 w-12 flex-shrink-0 rounded-full bg-[var(--color-text-muted)] opacity-20" />
            <div className="p-6 overflow-y-auto">
              <h2 className="text-xl font-semibold text-text-primary mb-6">Add New</h2>
              <AddCardForm 
                defaultTab={addCardDefaultTab} 
                onSuccess={closeAddCard} 
                onCancel={closeAddCard} 
              />
            </div>
            <div className="safe-area-pb" />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Dialog open={isAddCardOpen} onOpenChange={(open) => !open && closeAddCard()}>
      <DialogContent className="sm:max-w-[500px] bg-[var(--glass-panel-bg)] backdrop-blur-[var(--glass-blur)] border-[var(--glass-border)] shadow-[var(--glass-shadow)]">
        <DialogHeader>
          <DialogTitle className="text-xl text-text-primary">Add New</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <AddCardForm 
            defaultTab={addCardDefaultTab} 
            onSuccess={closeAddCard} 
            onCancel={closeAddCard} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}