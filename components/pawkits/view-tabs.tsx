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
    <div className="flex items-center gap-1 px-4 py-2 border-b border-subtle bg-surface/50 backdrop-blur-sm">
      <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-surface-soft/50">
        {viewOptions.map((option) => {
          const Icon = option.icon;
          const isActive = layout === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onLayoutChange(option.value)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-soft"
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
