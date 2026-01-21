'use client';

import { Drawer } from 'vaul';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useMobile } from '@/lib/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: ResponsiveDialogProps) {
  const isMobile = useMobile();

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Drawer.Content className={cn(
            "fixed bottom-0 left-0 right-0 z-50 mt-24 flex flex-col rounded-t-[20px]",
            "bg-[var(--glass-panel-bg)] backdrop-blur-[var(--glass-blur)] border-t border-[var(--glass-border)] outline-none",
            "max-h-[90vh]"
          )}>
            <div className="mx-auto mt-4 h-1.5 w-12 flex-shrink-0 rounded-full bg-[var(--color-text-muted)] opacity-20" />
            
            <div className="p-4 overflow-y-auto">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
                {description && (
                  <p className="text-sm text-text-muted mt-1">{description}</p>
                )}
              </div>
              
              <div className={className}>
                {children}
              </div>

              {footer && (
                <div className="mt-6 flex flex-col-reverse gap-2">
                  {footer}
                </div>
              )}
            </div>
            <div className="safe-area-pb" />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        
        {children}
        
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
