'use client';

/**
 * Filter Sections
 * Content type, sort, quick filter, grouping, sub-pawkit, and tags sections
 */

import { Filter, ArrowUpDown, Inbox, Layers, Tag, Folder } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { SubPawkitSize } from '@/lib/stores/view-store';
import {
  CONTENT_FILTERS,
  SORT_OPTIONS,
  GROUP_OPTIONS,
  DATE_GROUP_OPTIONS,
  UNSORTED_OPTIONS,
  type ContentType,
  type GroupBy,
  type DateGrouping,
  type UnsortedFilter,
} from './config';

// Content Type Filter Section
interface ContentTypeFilterProps {
  filters: ContentType[];
  onToggle: (type: ContentType) => void;
  onClear: () => void;
}

export function ContentTypeFilter({ filters, onToggle, onClear }: ContentTypeFilterProps) {
  return (
    <>
      <div>
        <div className="flex items-center justify-between text-text-muted mb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <span className="text-xs font-medium uppercase">Content Type</span>
          </div>
          {filters.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CONTENT_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = filters.includes(filter.id);
            return (
              <button
                key={filter.id}
                onClick={() => onToggle(filter.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors',
                  isActive
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>
        {filters.length === 0 && (
          <p className="text-xs text-text-muted mt-2 italic">All types shown</p>
        )}
      </div>
      <Separator className="bg-border-subtle" />
    </>
  );
}

// Sort Options Section
interface SortOptionsProps {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortByChange: (sortBy: string) => void;
  onToggleSortOrder: () => void;
  onSettingChange: () => void;
}

export function SortOptions({
  sortBy,
  sortOrder,
  onSortByChange,
  onToggleSortOrder,
  onSettingChange,
}: SortOptionsProps) {
  return (
    <>
      <div>
        <div className="flex items-center gap-2 text-text-muted mb-3">
          <ArrowUpDown className="h-5 w-5" />
          <span className="text-xs font-medium uppercase">Sort By</span>
        </div>
        <div className="space-y-0.5">
          {SORT_OPTIONS.map((option) => {
            const isActive = sortBy === option.id;
            return (
              <button
                key={option.id}
                onClick={() => {
                  if (isActive) {
                    onToggleSortOrder();
                  } else {
                    onSortByChange(option.id);
                  }
                  onSettingChange();
                }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-md transition-colors',
                  isActive
                    ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                    : 'text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary'
                )}
              >
                <span>{option.label}</span>
                {isActive && (
                  <span className="text-xs opacity-70">
                    {sortOrder === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <Separator className="bg-border-subtle" />
    </>
  );
}

// Quick Filter Section
interface QuickFilterProps {
  filter: UnsortedFilter;
  onFilterChange: (filter: UnsortedFilter) => void;
}

export function QuickFilter({ filter, onFilterChange }: QuickFilterProps) {
  return (
    <>
      <div>
        <div className="flex items-center gap-2 text-text-muted mb-3">
          <Inbox className="h-5 w-5" />
          <span className="text-xs font-medium uppercase">Quick Filter</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {UNSORTED_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = filter === option.id;
            return (
              <button
                key={option.id}
                onClick={() => onFilterChange(option.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors',
                  isActive
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary'
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <Separator className="bg-border-subtle" />
    </>
  );
}

// Grouping Section
interface GroupingSectionProps {
  groupBy: GroupBy;
  dateGrouping: DateGrouping;
  onGroupByChange: (groupBy: GroupBy) => void;
  onDateGroupingChange: (grouping: DateGrouping) => void;
  onSettingChange: () => void;
}

export function GroupingSection({
  groupBy,
  dateGrouping,
  onGroupByChange,
  onDateGroupingChange,
  onSettingChange,
}: GroupingSectionProps) {
  return (
    <>
      <div>
        <div className="flex items-center gap-2 text-text-muted mb-3">
          <Layers className="h-5 w-5" />
          <span className="text-xs font-medium uppercase">Group By</span>
        </div>
        <div className="space-y-3">
          {/* Group by options */}
          <div className="flex flex-wrap gap-1.5">
            {GROUP_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = groupBy === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => {
                    onGroupByChange(option.id);
                    onSettingChange();
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors',
                    isActive
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>

          {/* Date grouping options (only when groupBy === 'date') */}
          {groupBy === 'date' && (
            <div>
              <label className="text-xs text-text-secondary mb-2 block">Date Range</label>
              <div className="grid grid-cols-5 gap-1">
                {DATE_GROUP_OPTIONS.map((option) => {
                  const isActive = dateGrouping === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        onDateGroupingChange(option.id);
                        onSettingChange();
                      }}
                      className={cn(
                        'px-2 py-1.5 text-xs rounded-md transition-colors',
                        isActive
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary'
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      <Separator className="bg-border-subtle" />
    </>
  );
}

// Sub-Pawkit Settings Section
interface SubPawkitSettingsProps {
  size: SubPawkitSize;
  columns: number;
  onSizeChange: (size: SubPawkitSize) => void;
  onColumnsChange: (columns: number) => void;
  onSettingChange: () => void;
}

export function SubPawkitSettings({
  size,
  columns,
  onSizeChange,
  onColumnsChange,
  onSettingChange,
}: SubPawkitSettingsProps) {
  return (
    <>
      <div>
        <div className="flex items-center gap-2 text-text-muted mb-3">
          <Folder className="h-5 w-5" />
          <span className="text-xs font-medium uppercase">Sub-Pawkits</span>
        </div>

        <div className="space-y-4">
          {/* Size options */}
          <div>
            <label className="text-xs text-text-secondary mb-2 block">Card Size</label>
            <div className="grid grid-cols-3 gap-1">
              {(['compact', 'normal', 'large'] as SubPawkitSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onSizeChange(s);
                    onSettingChange();
                  }}
                  className={cn(
                    'px-2 py-1.5 text-xs rounded-md transition-colors capitalize',
                    size === s
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Columns slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-text-secondary">Columns</label>
              <span className="text-xs text-text-muted">{columns}</span>
            </div>
            <input
              type="range"
              min="2"
              max="6"
              value={columns}
              onChange={(e) => {
                onColumnsChange(Number(e.target.value));
                onSettingChange();
              }}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-slider"
              style={{
                background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${((columns - 2) / 4) * 100}%, var(--bg-surface-3) ${((columns - 2) / 4) * 100}%, var(--bg-surface-3) 100%)`,
              }}
            />
          </div>
        </div>
      </div>
      <Separator className="bg-border-subtle" />
    </>
  );
}

// Tags Filter Section
interface TagsFilterProps {
  allTags: Array<{ tag: string; count: number }>;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
}

export function TagsFilter({ allTags, selectedTags, onToggleTag, onClearTags }: TagsFilterProps) {
  return (
    <div>
      <div className="flex items-center justify-between text-text-muted mb-3">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          <span className="text-xs font-medium uppercase">Tags</span>
        </div>
        {selectedTags.length > 0 && (
          <button
            onClick={onClearTags}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      {allTags.length === 0 ? (
        <p className="text-xs text-text-muted italic">No tags yet</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map(({ tag, count }) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => onToggleTag(tag)}
                className={cn(
                  'px-2 py-1 text-xs rounded-md transition-colors',
                  isSelected
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary'
                )}
              >
                {tag}
                <span className="ml-1 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
