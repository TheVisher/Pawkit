"use client";

/**
 * Reading Status Filter Section
 * Filter by reading status (unread, in-progress, read)
 */

import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarSection } from "../SidebarSection";
import { READING_FILTER_OPTIONS, type ReadingFilter } from "../config";

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
