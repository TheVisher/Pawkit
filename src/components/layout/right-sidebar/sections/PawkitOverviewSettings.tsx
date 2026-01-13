"use client";

/**
 * Pawkit Overview Settings Section
 * Display and sort settings for the /pawkits main page
 */

import { Settings, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PawkitOverviewSize, PawkitOverviewSortBy } from "@/lib/stores/view-store";
import { SidebarSection } from "../SidebarSection";
import { PAWKIT_SORT_OPTIONS } from "../config";

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
            <ToggleButton
              label="Show Thumbnails"
              checked={showThumbnails}
              onChange={() => {
                onShowThumbnailsChange(!showThumbnails);
                onSettingChange();
              }}
            />
            <ToggleButton
              label="Show Item Count"
              checked={showItemCount}
              onChange={() => {
                onShowItemCountChange(!showItemCount);
                onSettingChange();
              }}
            />
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

// Internal toggle button component
function ToggleButton({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className="flex items-center justify-between w-full group"
    >
      <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">
        {label}
      </span>
      <div
        className={cn(
          "relative w-9 h-5 rounded-full transition-all duration-200 flex items-center",
          checked
            ? "bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30"
            : "bg-bg-surface-3 border border-transparent",
        )}
      >
        <div
          className={cn(
            "absolute left-0.5 w-4 h-4 rounded-full transition-all duration-200 shadow-sm",
            checked ? "translate-x-4 bg-white" : "bg-text-muted",
          )}
        />
      </div>
    </button>
  );
}
