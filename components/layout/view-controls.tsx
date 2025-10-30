"use client";

import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { ViewOptionsMenu } from "./view-options-menu";
import { SortFilterMenu } from "./sort-filter-menu";
import { ActionsMenu } from "./actions-menu";
import { usePawkitActions } from "@/lib/contexts/pawkit-actions-context";
import type { ViewType } from "@/lib/hooks/view-settings-store";

type ViewControlsProps = {
  onRefresh?: () => Promise<void>;
};

export function ViewControls({ onRefresh }: ViewControlsProps) {
  const pathname = usePathname();
  const { pawkitActions, onCreatePawkit } = usePawkitActions();

  // Detect current view from pathname
  const getCurrentView = (): ViewType | null => {
    if (!pathname) return null;

    if (pathname.includes('/library')) return 'library';
    if (pathname.includes('/notes')) return 'notes';
    if (pathname.includes('/calendar') || pathname.includes('/timeline')) return 'timeline';
    if (pathname.includes('/pawkits')) return 'pawkits';
    if (pathname.includes('/home')) return 'home';
    if (pathname.includes('/favorites')) return 'favorites';
    if (pathname.includes('/trash')) return 'trash';
    if (pathname.includes('/tags')) return 'tags';

    return null;
  };

  const currentView = getCurrentView();

  // Don't render if we can't detect the view or if it's not a supported view
  if (!currentView) {
    return null;
  }

  // All views now have controls
  // (Removed the exclusion for home view)

  return (
    <div className="flex items-center gap-1">
      {/* View Options (Layout, Card Size, Display Options) */}
      <ViewOptionsMenu
        view={currentView}
        showTimelineToggle={currentView === 'library'}
      />

      {/* Sort & Filter */}
      <SortFilterMenu view={currentView} />

      {/* Create Pawkit button - show on pawkits page */}
      {onCreatePawkit && currentView === 'pawkits' && (
        <button
          onClick={onCreatePawkit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-accent text-gray-950 hover:bg-accent/90 transition-colors"
          title="Create Pawkit"
        >
          <Plus className="h-4 w-4" />
          Add Pawkit
        </button>
      )}

      {/* Actions Menu (Refresh, Bulk Actions, Pawkit Actions) */}
      <ActionsMenu
        view={currentView}
        onRefresh={onRefresh}
        pawkitActions={pawkitActions || undefined}
        onCreatePawkit={onCreatePawkit || undefined}
      />
    </div>
  );
}

