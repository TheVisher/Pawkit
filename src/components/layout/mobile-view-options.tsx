'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Drawer } from 'vaul';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useViewStore, useCardDisplaySettings, useSubPawkitSettings, type SubPawkitSize } from '@/lib/stores/view-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useDataStore } from '@/lib/stores/data-store';
import {
  type ContentType,
  type UnsortedFilter,
  type GroupBy,
  type DateGrouping,
} from '@/components/layout/right-sidebar/config';

// Import components from right-sidebar refactor
import {
  ContentTypeFilter as ContentTypeFilterComponent,
  SortOptions as SortOptionsComponent,
  QuickFilter as QuickFilterComponent,
  GroupingSection as GroupingSectionComponent,
  SubPawkitSettings as SubPawkitSettingsComponent,
  TagsFilter as TagsFilterComponent,
} from '@/components/layout/right-sidebar/FilterSections';

interface MobileViewOptionsProps {
  viewType: 'library' | 'pawkit' | 'home';
}

export function MobileViewOptions({ viewType }: MobileViewOptionsProps) {
  const [open, setOpen] = useState(false);
  const workspace = useCurrentWorkspace();
  const saveViewSettings = useViewStore((s) => s.saveViewSettings);

  // Store selectors
  const sortBy = useViewStore((s) => s.sortBy);
  const sortOrder = useViewStore((s) => s.sortOrder);
  const contentTypeFilters = useViewStore((s) => s.contentTypeFilters) as ContentType[];
  const unsortedFilter = useViewStore((s) => s.unsortedFilter) as UnsortedFilter;
  const groupBy = useViewStore((s) => s.groupBy) as GroupBy;
  const dateGrouping = useViewStore((s) => s.dateGrouping) as DateGrouping;
  const selectedTags = useViewStore((s) => s.selectedTags);
  
  // Actions
  const setSortBy = useViewStore((s) => s.setSortBy);
  const toggleSortOrder = useViewStore((s) => s.toggleSortOrder);
  const toggleContentType = useViewStore((s) => s.toggleContentType);
  const clearContentTypes = useViewStore((s) => s.clearContentTypes);
  const setUnsortedFilter = useViewStore((s) => s.setUnsortedFilter);
  const setGroupBy = useViewStore((s) => s.setGroupBy);
  const setDateGrouping = useViewStore((s) => s.setDateGrouping);
  const toggleTag = useViewStore((s) => s.toggleTag);
  const clearTags = useViewStore((s) => s.clearTags);

  // Sub-Pawkit Settings
  const { subPawkitSize, subPawkitColumns, setSubPawkitSize, setSubPawkitColumns } = useSubPawkitSettings();

  // All Tags
  const cards = useDataStore((s) => s.cards);
  const allTags = cards
    .filter(c => !c._deleted)
    .flatMap(c => c.tags || [])
    .reduce((acc, tag) => {
      acc.set(tag, (acc.get(tag) || 0) + 1);
      return acc;
    }, new Map<string, number>());
  
  const sortedTags = Array.from(allTags.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }));

  const handleSettingChange = () => {
    if (workspace) {
      setTimeout(() => saveViewSettings(workspace.id), 500);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <SlidersHorizontal className="h-5 w-5 text-text-muted" />
        </Button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex max-h-[90%] flex-col rounded-t-[20px] bg-[var(--glass-panel-bg)] backdrop-blur-[var(--glass-blur)] border-t border-[var(--glass-border)] outline-none">
          <div className="mx-auto mt-4 h-1.5 w-12 flex-shrink-0 rounded-full bg-[var(--color-text-muted)] opacity-20" />
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">View Options</h2>

            {/* Content Type Filter */}
            {viewType !== 'home' && (
              <ContentTypeFilterComponent
                filters={contentTypeFilters}
                onToggle={(type) => {
                  toggleContentType(type);
                  handleSettingChange();
                }}
                onClear={() => {
                  clearContentTypes();
                  handleSettingChange();
                }}
              />
            )}

            {/* Sort Options */}
            {viewType !== 'home' && (
              <SortOptionsComponent
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortByChange={setSortBy}
                onToggleSortOrder={toggleSortOrder}
                onSettingChange={handleSettingChange}
              />
            )}

            {/* Group By */}
            {viewType !== 'home' && (
              <GroupingSectionComponent
                groupBy={groupBy}
                dateGrouping={dateGrouping}
                onGroupByChange={setGroupBy}
                onDateGroupingChange={setDateGrouping}
                onSettingChange={handleSettingChange}
              />
            )}

            {/* Sub-Pawkit Settings (Pawkit View Only) */}
            {viewType === 'pawkit' && (
              <SubPawkitSettingsComponent
                size={subPawkitSize}
                columns={subPawkitColumns}
                onSizeChange={setSubPawkitSize}
                onColumnsChange={setSubPawkitColumns}
                onSettingChange={handleSettingChange}
              />
            )}

            {/* Tags Filter */}
            {viewType !== 'home' && (
              <TagsFilterComponent
                allTags={sortedTags}
                selectedTags={selectedTags}
                onToggleTag={(tag) => {
                  toggleTag(tag);
                  handleSettingChange();
                }}
                onClearTags={() => {
                  clearTags();
                  handleSettingChange();
                }}
              />
            )}
            
            {/* Quick Filter */}
            {viewType !== 'home' && (
              <QuickFilterComponent
                filter={unsortedFilter}
                onFilterChange={(f) => {
                  setUnsortedFilter(f);
                  handleSettingChange();
                }}
              />
            )}
          </div>
          
          <div className="safe-area-pb" />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
