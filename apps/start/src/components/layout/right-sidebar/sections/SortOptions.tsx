"use client";

/**
 * Sort Options Section
 * Vertical list for sorting by date, title, domain, etc.
 */

import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarSection } from "../SidebarSection";
import { SORT_OPTIONS } from "../config";

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
