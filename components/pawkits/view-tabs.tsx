"use client";

import { LayoutMode } from "@/lib/constants";
import { Grid3X3, List, LayoutGrid, KanbanSquare } from "lucide-react";

interface ViewTabsProps {
  layout: LayoutMode;
  onLayoutChange: (layout: LayoutMode) => void;
}

const viewOptions: { value: LayoutMode; label: string; icon: React.ElementType }[] = [
  { value: "grid", label: "Grid", icon: Grid3X3 },
  { value: "list", label: "List", icon: List },
  { value: "masonry", label: "Masonry", icon: LayoutGrid },
  { value: "kanban", label: "Kanban", icon: KanbanSquare },
];

export function ViewTabs({ layout, onLayoutChange }: ViewTabsProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-1.5">
      <div className="flex items-center gap-0.5">
        {viewOptions.map((option) => {
          const Icon = option.icon;
          const isActive = layout === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onLayoutChange(option.value)}
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm
                transition-all duration-200
                ${isActive
                  ? "text-foreground bg-surface-soft/80"
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
