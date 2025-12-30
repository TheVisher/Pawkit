"use client";

/**
 * Tags Filter Section
 * Flex-wrap layout for filtering by tags
 */

import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarSection } from "../SidebarSection";

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
