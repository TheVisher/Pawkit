"use client";

/**
 * Sub-Pawkit Settings Section
 * Card size and columns configuration for sub-pawkits
 */

import { Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubPawkitSize } from "@/lib/stores/view-store";
import { SidebarSection } from "../SidebarSection";

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
          <label className="text-xs text-text-secondary mb-2 block px-1">
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
      </div>
    </SidebarSection>
  );
}
