"use client";

/**
 * Card Display Settings
 * Controls for card layout, size, padding, and visibility toggles
 */

import {
  Sliders,
  LayoutDashboard,
  LayoutGrid,
  List,
  Columns3,
  Grid3x3,
  Grid2x2,
  Square,
  Maximize,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CardSize } from "./config";
import { SidebarSection } from "./SidebarSection";

type Layout = "grid" | "masonry" | "list" | "timeline" | "board";

interface CardDisplaySettingsProps {
  layout: Layout;
  cardSize: CardSize;
  cardPadding: number;
  cardSpacing: number;
  showMetadataFooter: boolean;
  showUrlPill: boolean;
  showTitles: boolean;
  showTags: boolean;
  onLayoutChange: (layout: Layout) => void;
  onCardSizeChange: (size: CardSize) => void;
  onCardPaddingChange: (padding: number) => void;
  onCardSpacingChange: (spacing: number) => void;
  onShowMetadataFooterChange: (show: boolean) => void;
  onShowUrlPillChange: (show: boolean) => void;
  onShowTitlesChange: (show: boolean) => void;
  onShowTagsChange: (show: boolean) => void;
  onSettingChange: () => void;
}

export function CardDisplaySettings({
  layout,
  cardSize,
  cardPadding,
  cardSpacing,
  showMetadataFooter,
  showUrlPill,
  showTitles,
  showTags,
  onLayoutChange,
  onCardSizeChange,
  onCardPaddingChange,
  onCardSpacingChange,
  onShowMetadataFooterChange,
  onShowUrlPillChange,
  onShowTitlesChange,
  onShowTagsChange,
  onSettingChange,
}: CardDisplaySettingsProps) {
  return (
    <SidebarSection title="Card Display" icon={Sliders} defaultOpen={true}>
      <div className="space-y-4">
        {/* View Dropdown - Always visible */}
        <div className="group/view relative flex items-center justify-between">
          <label className="text-xs text-text-secondary">View</label>
          <button className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary transition-colors">
            {layout === "masonry" && (
              <LayoutDashboard className="h-3.5 w-3.5" />
            )}
            {layout === "grid" && <LayoutGrid className="h-3.5 w-3.5" />}
            {layout === "list" && <List className="h-3.5 w-3.5" />}
            {layout === "board" && <Columns3 className="h-3.5 w-3.5" />}
            <span className="capitalize">
              {layout === "board" ? "Kanban" : layout}
            </span>
          </button>
          {/* Hover dropdown */}
          <div className="absolute right-0 top-full mt-1 z-50 opacity-0 invisible group-hover/view:opacity-100 group-hover/view:visible transition-all duration-150">
            <div
              className="py-1 rounded-lg shadow-lg min-w-[120px]"
              style={{
                background: "var(--color-bg-surface-2)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <button
                onClick={() => {
                  onLayoutChange("masonry");
                  onSettingChange();
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                  layout === "masonry"
                    ? "text-[var(--color-accent)]"
                    : "text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary",
                )}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Masonry</span>
              </button>
              <button
                onClick={() => {
                  onLayoutChange("grid");
                  onSettingChange();
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                  layout === "grid"
                    ? "text-[var(--color-accent)]"
                    : "text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Grid</span>
              </button>
              <button
                onClick={() => {
                  onLayoutChange("list");
                  onSettingChange();
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                  layout === "list"
                    ? "text-[var(--color-accent)]"
                    : "text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary",
                )}
              >
                <List className="h-3.5 w-3.5" />
                <span>List</span>
              </button>
              <button
                onClick={() => {
                  onLayoutChange("board");
                  onSettingChange();
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                  layout === "board"
                    ? "text-[var(--color-accent)]"
                    : "text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary",
                )}
              >
                <Columns3 className="h-3.5 w-3.5" />
                <span>Kanban</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card options - Hidden in List View since they don't apply */}
        {layout !== "list" && (
          <>
            {/* Card Size */}
            <div>
              <label className="text-xs text-text-secondary mb-2 block">
                Card Size
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { size: "small" as CardSize, icon: Grid3x3, title: "Small" },
                  {
                    size: "medium" as CardSize,
                    icon: Grid2x2,
                    title: "Medium",
                  },
                  { size: "large" as CardSize, icon: Square, title: "Large" },
                  {
                    size: "xl" as CardSize,
                    icon: Maximize,
                    title: "Extra Large",
                  },
                ].map(({ size, icon: Icon, title }) => (
                  <button
                    key={size}
                    onClick={() => {
                      onCardSizeChange(size);
                      onSettingChange();
                    }}
                    title={title}
                    className={cn(
                      "flex items-center justify-center py-2 rounded-md transition-all duration-200",
                      cardSize === size
                        ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm"
                        : "bg-bg-surface-2 border border-transparent text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Card Padding Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-text-secondary">Padding</label>
                <span className="text-xs text-text-muted">{cardPadding}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={cardPadding}
                onChange={(e) => {
                  onCardPaddingChange(Number(e.target.value));
                  onSettingChange();
                }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-slider"
                style={{
                  background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${(cardPadding / 40) * 100}%, var(--bg-surface-3) ${(cardPadding / 40) * 100}%, var(--bg-surface-3) 100%)`,
                }}
              />
            </div>

            {/* Card Spacing Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-text-secondary">Spacing</label>
                <span className="text-xs text-text-muted">{cardSpacing}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={cardSpacing}
                onChange={(e) => {
                  onCardSpacingChange(Number(e.target.value));
                  onSettingChange();
                }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-slider"
                style={{
                  background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${(cardSpacing / 40) * 100}%, var(--bg-surface-3) ${(cardSpacing / 40) * 100}%, var(--bg-surface-3) 100%)`,
                }}
              />
            </div>

            {/* Toggle Switches */}
            <div className="space-y-2">
              <ToggleSwitch
                label="Metadata Footer"
                checked={showMetadataFooter}
                onChange={(checked) => {
                  onShowMetadataFooterChange(checked);
                  onSettingChange();
                }}
              />
              <ToggleSwitch
                label="URL Pill"
                checked={showUrlPill}
                onChange={(checked) => {
                  onShowUrlPillChange(checked);
                  onSettingChange();
                }}
              />
              <ToggleSwitch
                label="Titles"
                checked={showTitles}
                onChange={(checked) => {
                  onShowTitlesChange(checked);
                  onSettingChange();
                }}
              />
              <ToggleSwitch
                label="Tags"
                checked={showTags}
                onChange={(checked) => {
                  onShowTagsChange(checked);
                  onSettingChange();
                }}
              />
            </div>
          </>
        )}
      </div>
    </SidebarSection>
  );
}

// Toggle switch component
function ToggleSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-text-secondary">{label}</label>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-9 h-5 rounded-full transition-all duration-200 flex items-center",
          checked
            ? "bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30"
            : "bg-bg-surface-3 border border-transparent",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 w-4 h-4 rounded-full transition-all duration-200 shadow-sm",
            checked ? "translate-x-4 bg-white" : "bg-text-muted",
          )}
        />
      </button>
    </div>
  );
}
