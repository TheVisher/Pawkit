import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

export interface SidebarTabsProps {
  tabs: TabItem[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const SidebarTabs = React.forwardRef<HTMLDivElement, SidebarTabsProps>(
  ({ tabs, activeTabId, onTabChange, className }, ref) => {
    return (
      <div ref={ref} className={cn("flex flex-col gap-2 p-4", className)}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-75",
                isActive
                  ? "bg-white/10 text-gray-100 shadow-glow-accent"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-300"
              )}
            >
              <span className={cn("text-lg", isActive && "text-accent")}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    );
  }
);
SidebarTabs.displayName = "SidebarTabs";
