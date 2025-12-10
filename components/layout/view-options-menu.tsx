"use client";

import { useState } from "react";
import { Check, Grid3x3, LayoutList, LayoutGrid, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CardSizeSlider } from "@/components/card-size-slider";
import { CardDisplayControls } from "@/components/modals/card-display-controls";
import { useViewSettingsStore, type ViewType, type LayoutMode } from "@/lib/hooks/view-settings-store";

type ViewOptionsMenuProps = {
  view: ViewType;
  showTimelineToggle?: boolean;
  onTimelineToggle?: () => void;
  isTimelineView?: boolean;
};

const LAYOUT_OPTIONS: { value: LayoutMode; label: string; icon: LucideIcon }[] = [
  { value: "grid", label: "Grid", icon: LayoutGrid },
  { value: "masonry", label: "Masonry", icon: Grid3x3 },
  { value: "list", label: "List", icon: LayoutList },
];

export function ViewOptionsMenu({ 
  view, 
  showTimelineToggle = false,
  onTimelineToggle,
  isTimelineView = false,
}: ViewOptionsMenuProps) {
  const [showCardSizeSlider, setShowCardSizeSlider] = useState(false);
  const [showCardDisplayControls, setShowCardDisplayControls] = useState(false);
  
  const settings = useViewSettingsStore((state) => state.getSettings(view));
  const setLayout = useViewSettingsStore((state) => state.setLayout);

  const handleLayoutChange = async (layout: LayoutMode) => {
    await setLayout(view, layout);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title="View Options">
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Layout Options */}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Layout
          </div>
          {LAYOUT_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleLayoutChange(option.value)}
                className="cursor-pointer relative pl-8"
              >
                {settings.layout === option.value && (
                  <Check className="absolute left-2 h-4 w-4" />
                )}
                <Icon className="mr-2 h-4 w-4" />
                {option.label}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />

          {/* Card Size */}
          <DropdownMenuItem
            onClick={() => setShowCardSizeSlider(true)}
            className="cursor-pointer"
          >
            Card Size
          </DropdownMenuItem>

          {/* Display Options */}
          <DropdownMenuItem
            onClick={() => setShowCardDisplayControls(true)}
            className="cursor-pointer"
          >
            Display Options
          </DropdownMenuItem>

          {/* Timeline Toggle (if applicable) */}
          {showTimelineToggle && onTimelineToggle && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onTimelineToggle}
                className="cursor-pointer relative pl-8"
              >
                {isTimelineView && <Check className="absolute left-2 h-4 w-4" />}
                Timeline View
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Card Size Slider Modal */}
      <CardSizeSlider
        open={showCardSizeSlider}
        onClose={() => setShowCardSizeSlider(false)}
        view={view}
      />

      {/* Card Display Controls Modal */}
      <CardDisplayControls
        open={showCardDisplayControls}
        onClose={() => setShowCardDisplayControls(false)}
        view={view}
      />
    </>
  );
}

