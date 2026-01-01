"use client";

/**
 * Tags Filter Section
 * Flex-wrap layout for filtering by tags
 * Includes "No Tags" and "No Pawkit" filters at the bottom
 */

import { Tag, TagsIcon, FolderMinus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarSection } from "../SidebarSection";

interface TagsFilterProps {
  allTags: Array<{ tag: string; count: number }>;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
  showNoTagsOnly: boolean;
  onToggleNoTags: (show: boolean) => void;
  noTagsCount?: number;
  showNoPawkitsOnly?: boolean;
  onToggleNoPawkits?: (show: boolean) => void;
  noPawkitsCount?: number;
}

export function TagsFilter({
  allTags,
  selectedTags,
  onToggleTag,
  onClearTags,
  showNoTagsOnly,
  onToggleNoTags,
  noTagsCount = 0,
  showNoPawkitsOnly = false,
  onToggleNoPawkits,
  noPawkitsCount = 0,
}: TagsFilterProps) {
  const hasActiveFilter = selectedTags.length > 0 || showNoTagsOnly || showNoPawkitsOnly;

  const handleClear = () => {
    onClearTags();
    onToggleNoTags(false);
    onToggleNoPawkits?.(false);
  };

  return (
    <SidebarSection
      title="Tags"
      icon={Tag}
      action={
        hasActiveFilter && (
          <button
            onClick={handleClear}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Clear
          </button>
        )
      }
    >
      <div className="space-y-3">
        {/* Tag list */}
        {allTags.length === 0 && !showNoTagsOnly ? (
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

        {/* No Tags and No Pawkit filter buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onToggleNoTags(!showNoTagsOnly)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200 flex-1 justify-center border",
              showNoTagsOnly
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/20 shadow-sm font-medium"
                : "bg-bg-surface-2 border-transparent text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary",
            )}
          >
            <TagsIcon className="h-3 w-3 shrink-0" />
            <span>No Tags</span>
            {noTagsCount > 0 && (
              <span className="opacity-60">{noTagsCount}</span>
            )}
          </button>
          {onToggleNoPawkits && (
            <button
              onClick={() => onToggleNoPawkits(!showNoPawkitsOnly)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200 flex-1 justify-center border",
                showNoPawkitsOnly
                  ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/20 shadow-sm font-medium"
                  : "bg-bg-surface-2 border-transparent text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary",
              )}
            >
              <FolderMinus className="h-3 w-3 shrink-0" />
              <span>No Pawkit</span>
              {noPawkitsCount > 0 && (
                <span className="opacity-60">{noPawkitsCount}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </SidebarSection>
  );
}
