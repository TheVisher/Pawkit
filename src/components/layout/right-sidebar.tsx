'use client';

import { useState, useEffect } from 'react';
import { Filter, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRightSidebar } from '@/lib/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export function RightSidebar() {
  const [mounted, setMounted] = useState(false);
  const { isOpen, toggle } = useRightSidebar();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use default values during SSR to match initial client render
  const sidebarOpen = mounted ? isOpen : false;

  if (!sidebarOpen) {
    return (
      <aside className="w-10 flex flex-col items-center border-l border-zinc-800 bg-zinc-900/50 py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="w-70 flex flex-col border-l border-zinc-800 bg-zinc-900/50">
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4">
        <span className="text-sm font-medium text-zinc-300">Filters</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Separator className="bg-zinc-800" />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Filters Section */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 text-zinc-400 mb-3">
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
                      ? 'bg-purple-600/20 text-purple-400'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Tags Section */}
          <div>
            <div className="flex items-center gap-2 text-zinc-400 mb-3">
              <Tag className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Tags</span>
            </div>
            <p className="text-xs text-zinc-500 italic">No tags yet</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
