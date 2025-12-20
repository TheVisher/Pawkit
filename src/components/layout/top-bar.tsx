'use client';

import { useState, useEffect } from 'react';
import { Search, LayoutGrid, List, ArrowUpDown, Plus } from 'lucide-react';
import { useLayout, useSorting } from '@/lib/stores/view-store';
import { useCommandPalette } from '@/lib/stores/ui-store';
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
  const { sortBy, toggleSortOrder } = useSorting();
  const { toggle: toggleCommandPalette } = useCommandPalette();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use default values during SSR to match initial client render
  const currentLayout = mounted ? layout : 'masonry';
  const currentSortBy = mounted ? sortBy : 'updatedAt';

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900/50 px-4">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input
          placeholder="Search... (⌘K)"
          className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-purple-600"
          onClick={toggleCommandPalette}
          readOnly
        />
      </div>

      {/* View Controls */}
      <div className="flex items-center gap-2">
        {/* Layout Toggle */}
        <div className="flex items-center rounded-lg bg-zinc-800 p-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7',
              currentLayout === 'grid'
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-transparent'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7',
              currentLayout === 'list'
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-transparent'
            )}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 gap-1"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="text-xs">
                {sortOptions.find((o) => o.value === currentSortBy)?.label ?? 'Sort'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={toggleSortOrder}
                className={cn(
                  'text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100',
                  currentSortBy === option.value && 'text-purple-400'
                )}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* New Button */}
        <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-1">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </div>
    </header>
  );
}
