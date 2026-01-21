"use client";

/**
 * Grouping Section
 * Group cards by date, tags, type, or domain
 */

import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarSection } from "../SidebarSection";
import {
  GROUP_OPTIONS,
  DATE_GROUP_OPTIONS,
  type GroupBy,
  type DateGrouping,
} from "../config";

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
