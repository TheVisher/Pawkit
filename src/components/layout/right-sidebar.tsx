'use client';

import { useState, useEffect } from 'react';
import { Filter, Tag, Pin, PinOff, X } from 'lucide-react';
import { useRightSidebar } from '@/lib/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function RightSidebar() {
  const [mounted, setMounted] = useState(false);
  const { isAnchored, toggleAnchored, setOpen } = useRightSidebar();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClose = () => {
    setOpen(false);
  };

  // Use default values during SSR to match initial client render
  const anchored = mounted ? isAnchored : false;

  return (
    <div className="h-full flex flex-col">
      {/* Header with anchor and close buttons - uses border-b to align with TopBar */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-border-subtle">
        <span className="text-sm font-medium text-text-secondary">Filters</span>
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={300}>
            {/* Anchor Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleAnchored}
                  className={cn(
                    'h-7 w-7 text-text-muted hover:text-text-primary hover:bg-bg-surface-2',
                    anchored && 'text-[var(--color-accent)]'
                  )}
                >
                  {anchored ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{anchored ? 'Unpin sidebar' : 'Pin sidebar'}</p>
              </TooltipContent>
            </Tooltip>
            {/* Close Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-7 w-7 text-text-muted hover:text-text-primary hover:bg-bg-surface-2"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Close sidebar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Filters Section */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 text-text-muted mb-3">
              <Filter className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Content Type</span>
            </div>
            <div className="space-y-1">
              {['All', 'Bookmarks', 'Notes', 'Files'].map((filter) => (
                <button
                  key={filter}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors',
                    filter === 'All'
                      ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                      : 'text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary'
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <Separator className="bg-border-subtle" />

          {/* Tags Section */}
          <div>
            <div className="flex items-center gap-2 text-text-muted mb-3">
              <Tag className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Tags</span>
            </div>
            <p className="text-xs text-text-muted italic">No tags yet</p>
          </div>
        </div>
      </div>
    </div>
  );
}
