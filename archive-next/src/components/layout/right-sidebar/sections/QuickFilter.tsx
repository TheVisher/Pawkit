"use client";

/**
 * Quick Filter Section
 * Filter for unsorted/unorganized items (no pawkits, no tags)
 */

import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarSection } from "../SidebarSection";
import { UNSORTED_OPTIONS, type UnsortedFilter } from "../config";

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
