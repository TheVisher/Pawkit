'use client';

import { useState, useEffect } from 'react';
import { Search, LayoutGrid, List, Columns, ArrowUpDown, Plus } from 'lucide-react';
import { useLayout, useSorting, useViewStore } from '@/lib/stores/view-store';
import { useCommandPalette } from '@/lib/stores/ui-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const sortOptions = [
  { value: 'updatedAt', label: 'Last modified' },
  { value: 'createdAt', label: 'Date created' },
  { value: 'title', label: 'Title' },
];

export function TopBar() {
  const [mounted, setMounted] = useState(false);
  const layout = useLayout();
  const setLayout = useViewStore((state) => state.setLayout);
  const { sortBy, toggleSortOrder } = useSorting();
  const { toggle: toggleCommandPalette } = useCommandPalette();
  const openAddCard = useModalStore((state) => state.openAddCard);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use default values during SSR to match initial client render
  const currentLayout = mounted ? layout : 'masonry';
  const currentSortBy = mounted ? sortBy : 'updatedAt';

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-border-subtle px-4">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
        <Input
          placeholder="Search... (⌘K)"
          className="pl-9 bg-bg-surface-2 border-border-subtle text-text-primary placeholder:text-text-muted focus-visible:ring-[var(--color-accent)]"
          onClick={toggleCommandPalette}
          readOnly
        />
      </div>

      {/* View Controls */}
      <div className="flex items-center gap-2">
        {/* Layout Toggle */}
        <div className="flex items-center rounded-lg bg-bg-surface-2 p-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLayout('masonry')}
            title="Masonry layout"
            className={cn(
              'h-7 w-7',
              currentLayout === 'masonry'
                ? 'bg-bg-surface-3 text-text-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-transparent'
            )}
          >
            <Columns className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLayout('grid')}
            title="Grid layout"
            className={cn(
              'h-7 w-7',
              currentLayout === 'grid'
                ? 'bg-bg-surface-3 text-text-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-transparent'
            )}
          >
            <LayoutGrid className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLayout('list')}
            title="List layout"
            className={cn(
              'h-7 w-7',
              currentLayout === 'list'
                ? 'bg-bg-surface-3 text-text-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-transparent'
            )}
          >
            <List className="h-5 w-5" />
          </Button>
        </div>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-text-muted hover:text-text-primary hover:bg-bg-surface-2 gap-1"
            >
              <ArrowUpDown className="h-5 w-5" />
              <span className="text-xs hidden sm:inline">
                {sortOptions.find((o) => o.value === currentSortBy)?.label ?? 'Sort'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-bg-surface-1 border-border-subtle">
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={toggleSortOrder}
                className={cn(
                  'text-text-secondary focus:bg-bg-surface-2 focus:text-text-primary',
                  currentSortBy === option.value && 'text-[var(--color-accent)]'
                )}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* New Button */}
        <Button
          onClick={() => openAddCard()}
          className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white gap-1"
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </div>
    </header>
  );
}
