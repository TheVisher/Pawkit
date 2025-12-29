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
import type { SubPawkitSize } from "@/lib/stores/view-store";
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

// Content Type Filter Section
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
      <div className="flex flex-wrap gap-1.5">
        {CONTENT_FILTERS.map((filter) => {
          const Icon = filter.icon;
          const isActive = filters.includes(filter.id);
          return (
            <button
              key={filter.id}
              onClick={() => onToggle(filter.id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200",
                isActive
                  ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
                  : "bg-bg-surface-2 border border-transparent text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary",
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
    </SidebarSection>
  );
}

// Sort Options Section
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
                "w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-md transition-all duration-200",
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

// Quick Filter Section
interface QuickFilterProps {
  filter: UnsortedFilter;
  onFilterChange: (filter: UnsortedFilter) => void;
}

export function QuickFilter({ filter, onFilterChange }: QuickFilterProps) {
  // Remove "Unsorted" (id: 'both') from options as requested
  const options = UNSORTED_OPTIONS.filter((opt) => opt.id !== "both");

  return (
    <SidebarSection title="Quick Filter" icon={Inbox}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = filter === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onFilterChange(option.id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200",
                isActive
                  ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
                  : "bg-bg-surface-2 border border-transparent text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary",
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </SidebarSection>
  );
}

// Reading Status Filter Section
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
      <div className="flex flex-wrap gap-1.5">
        {READING_FILTER_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = filter === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onFilterChange(option.id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200",
                isActive
                  ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
                  : "bg-bg-surface-2 border border-transparent text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </SidebarSection>
  );
}

// Advanced Section (Combines Link Status and Duplicates)
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
          <div className="flex items-center justify-between text-text-secondary mb-2">
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
          <div className="flex flex-wrap gap-1.5">
            {LINK_STATUS_FILTER_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = linkStatusFilter === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => onLinkStatusChange(option.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200",
                    isActive
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
                      : "bg-bg-surface-2 border border-transparent text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
          {recheckCount !== null && (
            <p className="text-xs text-text-muted mt-2">
              Queued {recheckCount} link{recheckCount !== 1 ? "s" : ""} for
              checking
            </p>
          )}
        </div>

        {/* Duplicates Subsection */}
        <div>
          <div className="flex items-center justify-between text-text-secondary mb-2">
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
              "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-all duration-200",
              showDuplicatesOnly
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
                : "bg-bg-surface-2 border border-transparent text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary",
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
    <SidebarSection title="Group By" icon={Layers}>
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
                  "flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200",
                  isActive
                    ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
                    : "bg-bg-surface-2 border border-transparent text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date grouping options (only when groupBy === 'date') */}
        {groupBy === "date" && (
          <div>
            <label className="text-xs text-text-secondary mb-2 block">
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
                        : "bg-bg-surface-2 border border-transparent text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary",
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
    <SidebarSection title="Sub-Pawkits" icon={Folder}>
      <div className="space-y-4">
        {/* Size options */}
        <div>
          <label className="text-xs text-text-secondary mb-2 block">
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
                    : "bg-bg-surface-2 border border-transparent text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary",
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
    </SidebarSection>
  );
}

// Tags Filter Section
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
                  "px-2 py-1 text-xs rounded-md transition-all duration-200",
                  isSelected
                    ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
                    : "bg-bg-surface-2 border border-transparent text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary",
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
