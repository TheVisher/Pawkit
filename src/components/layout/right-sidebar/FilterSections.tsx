"use client";

/**
 * Filter Sections
 * Content type, sort, quick filter, grouping, sub-pawkit, and tags sections
 */

import { useState } from "react";
import {
  Filter,
  ArrowUpDown,
  Inbox,
  Layers,
  Tag,
  Folder,
  BookOpen,
  Link,
  RefreshCw,
  Copy,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubPawkitSize, PawkitOverviewSize, PawkitOverviewSortBy } from "@/lib/stores/view-store";
import { SidebarSection } from "./SidebarSection";
import {
  CONTENT_FILTERS,
  SORT_OPTIONS,
  GROUP_OPTIONS,
  DATE_GROUP_OPTIONS,
  UNSORTED_OPTIONS,
  READING_FILTER_OPTIONS,
  LINK_STATUS_FILTER_OPTIONS,
  type ContentType,
  type GroupBy,
  type DateGrouping,
  type UnsortedFilter,
  type ReadingFilter,
  type LinkStatusFilter,
} from "./config";

// Content Type Filter Section (Grid Layout)
interface ContentTypeFilterProps {
  filters: ContentType[];
  onToggle: (type: ContentType) => void;
  onClear: () => void;
}

export function ContentTypeFilter({
  filters,
  onToggle,
  onClear,
}: ContentTypeFilterProps) {
  return (
    <SidebarSection
      title="Content Type"
      icon={Filter}
      defaultOpen={true}
      action={
        filters.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Clear
          </button>
        )
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {CONTENT_FILTERS.map((filter) => {
          const Icon = filter.icon;
          const isActive = filters.includes(filter.id);
          return (
            <button
              key={filter.id}
              onClick={() => onToggle(filter.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-all duration-200 w-full justify-start",
                isActive
                  ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
                  : "bg-bg-surface-2 border border-transparent text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{filter.label}</span>
            </button>
          );
        })}
      </div>
      {filters.length === 0 && (
        <p className="text-xs text-text-muted mt-2 italic px-1">
          All types shown
        </p>
      )}
    </SidebarSection>
  );
}

// Sort Options Section (Vertical List)
interface SortOptionsProps {
  sortBy: string;
  sortOrder: "asc" | "desc";
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
    <SidebarSection title="Sort By" icon={ArrowUpDown} defaultOpen={true}>
      <div className="flex flex-col gap-1">
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
                "w-full flex items-center justify-between px-3 py-2 text-xs rounded-md transition-all duration-200",
                isActive
                  ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
                  : "border border-transparent text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
              )}
            >
              <span>{option.label}</span>
              {isActive && (
                <span className="text-xs opacity-70">
                  {sortOrder === "desc" ? "↓" : "↑"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </SidebarSection>
  );
}

// Quick Filter Section (Vertical List)
interface QuickFilterProps {
  filter: UnsortedFilter;
  onFilterChange: (filter: UnsortedFilter) => void;
  viewType?: "library" | "pawkit";
}

export function QuickFilter({ filter, onFilterChange, viewType = "library" }: QuickFilterProps) {
  // Remove "Unsorted" (id: 'both') from options
  // Also hide "No Pawkits" when viewing a pawkit (cards are already in a pawkit)
  const options = UNSORTED_OPTIONS.filter((opt) => {
    if (opt.id === "both") return false;
    if (opt.id === "no-pawkits" && viewType === "pawkit") return false;
    return true;
  });

  return (
    <SidebarSection title="Quick Filter" icon={Inbox}>
      <div className="flex flex-col gap-1">
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = filter === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onFilterChange(option.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-all duration-200 w-full justify-start",
                isActive
                  ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
                  : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </SidebarSection>
  );
}

// Reading Status Filter Section (Vertical List)
interface ReadingStatusFilterProps {
  filter: ReadingFilter;
  onFilterChange: (filter: ReadingFilter) => void;
}

export function ReadingStatusFilter({
  filter,
  onFilterChange,
}: ReadingStatusFilterProps) {
  return (
    <SidebarSection title="Reading Status" icon={BookOpen}>
      <div className="flex flex-col gap-1">
        {READING_FILTER_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = filter === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onFilterChange(option.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-all duration-200 w-full justify-start",
                isActive
                  ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
                  : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </SidebarSection>
  );
}

// Advanced Section (Combines Link Status and Duplicates) - Vertical Lists
interface AdvancedFilterSectionProps {
  linkStatusFilter: LinkStatusFilter;
  onLinkStatusChange: (filter: LinkStatusFilter) => void;
  onRecheckLinks?: () => Promise<number>;
  showDuplicatesOnly: boolean;
  duplicateCount: number;
  onToggleDuplicates: (show: boolean) => void;
}

export function AdvancedFilterSection({
  linkStatusFilter,
  onLinkStatusChange,
  onRecheckLinks,
  showDuplicatesOnly,
  duplicateCount,
  onToggleDuplicates,
}: AdvancedFilterSectionProps) {
  const [isRechecking, setIsRechecking] = useState(false);
  const [recheckCount, setRecheckCount] = useState<number | null>(null);

  const handleRecheckAll = async () => {
    if (!onRecheckLinks || isRechecking) return;
    setIsRechecking(true);
    setRecheckCount(null);
    try {
      const count = await onRecheckLinks();
      setRecheckCount(count);
      setTimeout(() => setRecheckCount(null), 5000);
    } finally {
      setIsRechecking(false);
    }
  };

  return (
    <SidebarSection title="Advanced" icon={Settings}>
      <div className="space-y-4">
        {/* Link Status Subsection */}
        <div>
          <div className="flex items-center justify-between text-text-secondary mb-2 px-1">
            <div className="flex items-center gap-2">
              <Link className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Link Status</span>
            </div>
            {onRecheckLinks && (
              <button
                onClick={handleRecheckAll}
                disabled={isRechecking}
                className="text-xs text-text-muted hover:text-text-primary transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <RefreshCw
                  className={cn("h-3 w-3", isRechecking && "animate-spin")}
                />
                {isRechecking ? "Checking..." : "Re-check"}
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {LINK_STATUS_FILTER_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = linkStatusFilter === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => onLinkStatusChange(option.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-all duration-200 w-full justify-start",
                    isActive
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
                      : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
          {recheckCount !== null && (
            <p className="text-xs text-text-muted mt-2 px-1">
              Queued {recheckCount} link{recheckCount !== 1 ? "s" : ""} for
              checking
            </p>
          )}
        </div>

        {/* Duplicates Subsection */}
        <div>
          <div className="flex items-center justify-between text-text-secondary mb-2 px-1">
            <div className="flex items-center gap-2">
              <Copy className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Duplicates</span>
            </div>
            {duplicateCount > 0 && (
              <span className="text-xs text-text-muted">
                {duplicateCount} found
              </span>
            )}
          </div>
          <button
            onClick={() => onToggleDuplicates(!showDuplicatesOnly)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-xs rounded-md transition-all duration-200",
              showDuplicatesOnly
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
                : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
            )}
          >
            <span>Show duplicates only</span>
            {showDuplicatesOnly && (
              <span className="text-xs opacity-70">✓</span>
            )}
          </button>
        </div>
      </div>
    </SidebarSection>
  );
}

// Grouping Section (Vertical List)
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
    <SidebarSection title="Group By" icon={Layers}>
      <div className="space-y-3">
        {/* Group by options */}
        <div className="flex flex-col gap-1">
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
                  "flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-all duration-200 w-full justify-start",
                  isActive
                    ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
                    : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date grouping options (only when groupBy === 'date') */}
        {groupBy === "date" && (
          <div>
            <label className="text-xs text-text-secondary mb-2 block px-1">
              Date Range
            </label>
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
                      "px-2 py-1.5 text-xs rounded-md transition-all duration-200",
                      isActive
                        ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
                        : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
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
    </SidebarSection>
  );
}

// Sub-Pawkit Settings Section (Grid for size, slider for columns)
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
    <SidebarSection title="Sub-Pawkits" icon={Folder}>
      <div className="space-y-4">
        {/* Size options */}
        <div>
          <label className="text-xs text-text-secondary mb-2 block px-1">
            Card Size
          </label>
          <div className="grid grid-cols-3 gap-1">
            {(["compact", "normal", "large"] as SubPawkitSize[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  onSizeChange(s);
                  onSettingChange();
                }}
                className={cn(
                  "px-2 py-1.5 text-xs rounded-md transition-all duration-200 capitalize",
                  size === s
                    ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
                    : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Columns slider */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
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
    </SidebarSection>
  );
}

// Tags Filter Section (Organic Flex Wrap)
interface TagsFilterProps {
  allTags: Array<{ tag: string; count: number }>;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
}

export function TagsFilter({
  allTags,
  selectedTags,
  onToggleTag,
  onClearTags,
}: TagsFilterProps) {
  return (
    <SidebarSection
      title="Tags"
      icon={Tag}
      action={
        selectedTags.length > 0 && (
          <button
            onClick={onClearTags}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Clear
          </button>
        )
      }
    >
      {allTags.length === 0 ? (
        <p className="text-xs text-text-muted italic px-1">No tags yet</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map(({ tag, count }) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => onToggleTag(tag)}
                className={cn(
                  "px-2 py-1 text-xs rounded-md transition-all duration-200 border",
                  isSelected
                    ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/20 shadow-sm font-medium"
                    : "bg-bg-surface-2 border-transparent text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary",
                )}
              >
                {tag}
                <span className="ml-1 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      )}
    </SidebarSection>
  );
}

// Pawkit Overview Settings Section (for /pawkits main page)
const PAWKIT_SORT_OPTIONS: { id: PawkitOverviewSortBy; label: string }[] = [
  { id: "manual", label: "Manual" },
  { id: "alphabetical", label: "A-Z" },
  { id: "dateCreated", label: "Created" },
  { id: "dateModified", label: "Modified" },
  { id: "itemCount", label: "Items" },
];

interface PawkitOverviewSettingsProps {
  size: PawkitOverviewSize;
  columns: number;
  showThumbnails: boolean;
  showItemCount: boolean;
  sortBy: PawkitOverviewSortBy;
  onSizeChange: (size: PawkitOverviewSize) => void;
  onColumnsChange: (columns: number) => void;
  onShowThumbnailsChange: (show: boolean) => void;
  onShowItemCountChange: (show: boolean) => void;
  onSortByChange: (sortBy: PawkitOverviewSortBy) => void;
  onSettingChange: () => void;
}

export function PawkitOverviewSettings({
  size,
  columns,
  showThumbnails,
  showItemCount,
  sortBy,
  onSizeChange,
  onColumnsChange,
  onShowThumbnailsChange,
  onShowItemCountChange,
  onSortByChange,
  onSettingChange,
}: PawkitOverviewSettingsProps) {
  return (
    <>
      {/* Display Settings */}
      <SidebarSection title="Display" icon={Settings} defaultOpen={true}>
        <div className="space-y-4">
          {/* Size options */}
          <div>
            <label className="text-xs text-text-secondary mb-2 block px-1">
              Card Size
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(["small", "medium", "large"] as PawkitOverviewSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onSizeChange(s);
                    onSettingChange();
                  }}
                  className={cn(
                    "px-2 py-1.5 text-xs rounded-md transition-all duration-200 capitalize",
                    size === s
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
                      : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Columns slider */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
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

          {/* Toggles */}
          <div className="space-y-3">
            <button
              onClick={() => {
                onShowThumbnailsChange(!showThumbnails);
                onSettingChange();
              }}
              className="flex items-center justify-between w-full group"
            >
              <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">
                Show Thumbnails
              </span>
              <div
                className={cn(
                  "relative w-9 h-5 rounded-full transition-all duration-200 flex items-center",
                  showThumbnails
                    ? "bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30"
                    : "bg-bg-surface-3 border border-transparent",
                )}
              >
                <div
                  className={cn(
                    "absolute left-0.5 w-4 h-4 rounded-full transition-all duration-200 shadow-sm",
                    showThumbnails ? "translate-x-4 bg-white" : "bg-text-muted",
                  )}
                />
              </div>
            </button>

            <button
              onClick={() => {
                onShowItemCountChange(!showItemCount);
                onSettingChange();
              }}
              className="flex items-center justify-between w-full group"
            >
              <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">
                Show Item Count
              </span>
              <div
                className={cn(
                  "relative w-9 h-5 rounded-full transition-all duration-200 flex items-center",
                  showItemCount
                    ? "bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30"
                    : "bg-bg-surface-3 border border-transparent",
                )}
              >
                <div
                  className={cn(
                    "absolute left-0.5 w-4 h-4 rounded-full transition-all duration-200 shadow-sm",
                    showItemCount ? "translate-x-4 bg-white" : "bg-text-muted",
                  )}
                />
              </div>
            </button>
          </div>
        </div>
      </SidebarSection>

      {/* Sort Options */}
      <SidebarSection title="Sort" icon={ArrowUpDown} defaultOpen={true}>
        <div className="grid grid-cols-3 gap-1">
          {PAWKIT_SORT_OPTIONS.map((option) => {
            const isActive = sortBy === option.id;
            return (
              <button
                key={option.id}
                onClick={() => {
                  onSortByChange(option.id);
                  onSettingChange();
                }}
                className={cn(
                  "px-2 py-1.5 text-xs rounded-md transition-all duration-200",
                  isActive
                    ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
                    : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {sortBy === "manual" && (
          <p className="text-xs text-text-muted mt-2 italic px-1">
            Drag to reorder
          </p>
        )}
      </SidebarSection>
    </>
  );
}
