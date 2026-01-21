'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Drawer } from 'vaul';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useViewStore, useCardDisplaySettings, useSubPawkitSettings, type SubPawkitSize } from '@/lib/stores/view-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useCards, useCollections } from '@/lib/contexts/convex-data-context';
import {
  type ContentType,
  type GroupBy,
  type DateGrouping,
} from '@/components/layout/right-sidebar/config';

// Import components from right-sidebar sections
import {
  ContentTypeFilter as ContentTypeFilterComponent,
  SortOptions as SortOptionsComponent,
  GroupingSection as GroupingSectionComponent,
  SubPawkitSettings as SubPawkitSettingsComponent,
  TagsFilter as TagsFilterComponent,
} from '@/components/layout/right-sidebar/sections';

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
  const groupBy = useViewStore((s) => s.groupBy) as GroupBy;
  const dateGrouping = useViewStore((s) => s.dateGrouping) as DateGrouping;
  const selectedTags = useViewStore((s) => s.selectedTags);
  const showNoTagsOnly = useViewStore((s) => s.showNoTagsOnly);
  const showNoPawkitsOnly = useViewStore((s) => s.showNoPawkitsOnly);

  // Actions
  const setSortBy = useViewStore((s) => s.setSortBy);
  const toggleSortOrder = useViewStore((s) => s.toggleSortOrder);
  const toggleContentType = useViewStore((s) => s.toggleContentType);
  const clearContentTypes = useViewStore((s) => s.clearContentTypes);
  const setGroupBy = useViewStore((s) => s.setGroupBy);
  const setDateGrouping = useViewStore((s) => s.setDateGrouping);
  const toggleTag = useViewStore((s) => s.toggleTag);
  const clearTags = useViewStore((s) => s.clearTags);
  const setShowNoTagsOnly = useViewStore((s) => s.setShowNoTagsOnly);
  const setShowNoPawkitsOnly = useViewStore((s) => s.setShowNoPawkitsOnly);

  // Sub-Pawkit Settings
  const { subPawkitSize, subPawkitColumns, setSubPawkitSize, setSubPawkitColumns } = useSubPawkitSettings();

  // All Tags
  const cards = useCards();
  const collections = useCollections();

  // Build set of Pawkit slugs to check if card has any Pawkit tags
  const pawkitSlugs = new Set(collections.map((c) => c.slug));

  const { sortedTags, noTagsCount, noPawkitsCount } = (() => {
    const tagCounts = new Map<string, number>();
    let noTags = 0;
    let noPawkits = 0;
    for (const card of cards) {
      if (card.deleted) continue;
      const tags = card.tags || [];
      // A card is "in a Pawkit" if any of its tags match a Pawkit slug
      const hasAnyPawkitTag = tags.some((tag) => pawkitSlugs.has(tag));
      if (tags.length === 0) {
        noTags++;
      }
      if (!hasAnyPawkitTag) {
        noPawkits++;
      }
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    const sorted = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count }));
    return { sortedTags: sorted, noTagsCount: noTags, noPawkitsCount: noPawkits };
  })();

  const handleSettingChange = () => {
    if (workspace) {
      setTimeout(() => saveViewSettings(workspace._id), 500);
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
                showNoTagsOnly={showNoTagsOnly}
                onToggleNoTags={(show) => {
                  setShowNoTagsOnly(show);
                  handleSettingChange();
                }}
                noTagsCount={noTagsCount}
                showNoPawkitsOnly={showNoPawkitsOnly}
                onToggleNoPawkits={(show) => {
                  setShowNoPawkitsOnly(show);
                  handleSettingChange();
                }}
                noPawkitsCount={noPawkitsCount}
              />
            )}
          </div>
          
          <div className="safe-area-pb" />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
