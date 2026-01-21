"use client";

/**
 * Content Type Filter Section
 * Grid layout for filtering by content type (bookmarks, notes, video, etc.)
 */

import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarSection } from "../SidebarSection";
import { CONTENT_FILTERS, type ContentType } from "../config";

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
