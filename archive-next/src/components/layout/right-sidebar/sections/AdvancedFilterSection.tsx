"use client";

/**
 * Advanced Filter Section
 * Combines Link Status and Duplicates filters
 */

import { useState } from "react";
import { Settings, Link, RefreshCw, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarSection } from "../SidebarSection";
import { LINK_STATUS_FILTER_OPTIONS, type LinkStatusFilter } from "../config";

interface AdvancedFilterSectionProps {
  linkStatusFilter: LinkStatusFilter;
  onLinkStatusChange: (filter: LinkStatusFilter) => void;
  onRecheckLinks?: () => Promise<number>;
  showDuplicatesOnly: boolean;
  duplicateCount: number;
  onToggleDuplicates: (show: boolean) => void;
}

export function AdvancedFilterSection({
  linkStatusFilter,
  onLinkStatusChange,
  onRecheckLinks,
  showDuplicatesOnly,
  duplicateCount,
  onToggleDuplicates,
}: AdvancedFilterSectionProps) {
  const [isRechecking, setIsRechecking] = useState(false);
  const [recheckCount, setRecheckCount] = useState<number | null>(null);

  const handleRecheckAll = async () => {
    if (!onRecheckLinks || isRechecking) return;
    setIsRechecking(true);
    setRecheckCount(null);
    try {
      const count = await onRecheckLinks();
      setRecheckCount(count);
      setTimeout(() => setRecheckCount(null), 5000);
    } finally {
      setIsRechecking(false);
    }
  };

  return (
    <SidebarSection title="Advanced" icon={Settings}>
      <div className="space-y-4">
        {/* Link Status Subsection */}
        <div>
          <div className="flex items-center justify-between text-text-secondary mb-2 px-1">
            <div className="flex items-center gap-2">
              <Link className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Link Status</span>
            </div>
            {onRecheckLinks && (
              <button
                onClick={handleRecheckAll}
                disabled={isRechecking}
                className="text-xs text-text-muted hover:text-text-primary transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <RefreshCw
                  className={cn("h-3 w-3", isRechecking && "animate-spin")}
                />
                {isRechecking ? "Checking..." : "Re-check"}
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {LINK_STATUS_FILTER_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = linkStatusFilter === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => onLinkStatusChange(option.id)}
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
          {recheckCount !== null && (
            <p className="text-xs text-text-muted mt-2 px-1">
              Queued {recheckCount} link{recheckCount !== 1 ? "s" : ""} for
              checking
            </p>
          )}
        </div>

        {/* Duplicates Subsection */}
        <div>
          <div className="flex items-center justify-between text-text-secondary mb-2 px-1">
            <div className="flex items-center gap-2">
              <Copy className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Duplicates</span>
            </div>
            {duplicateCount > 0 && (
              <span className="text-xs text-text-muted">
                {duplicateCount} found
              </span>
            )}
          </div>
          <button
            onClick={() => onToggleDuplicates(!showDuplicatesOnly)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-xs rounded-md transition-all duration-200",
              showDuplicatesOnly
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm font-medium"
                : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
            )}
          >
            <span>Show duplicates only</span>
            {showDuplicatesOnly && (
              <span className="text-xs opacity-70">✓</span>
            )}
          </button>
        </div>
      </div>
    </SidebarSection>
  );
}
