"use client";

/**
 * Settings Panel for Right Sidebar
 * Hanging tabs that drop from the header divider with glass-through styling
 */

import { useRightSidebarSettings } from "@/lib/stores/ui-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { AppearanceSection } from "@/components/settings/sections/appearance-section";
import { AccountSection } from "@/components/settings/sections/account-section";
import { DataSection } from "@/components/settings/sections/data-section";
import { cn } from "@/lib/utils";
import { Palette, User, Database } from "lucide-react";

type SettingsTab = "appearance" | "account" | "data";

const TABS: { id: SettingsTab; label: string; icon: typeof Palette }[] = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "account", label: "Account", icon: User },
  { id: "data", label: "Data", icon: Database },
];

export function SettingsPanel() {
  const { settingsTab, setTab } = useRightSidebarSettings();
  const visualStyle = useSettingsStore((s) => s.visualStyle);
  const activeTab = settingsTab || "appearance";
  const isHighContrast = visualStyle === 'highContrast';

  return (
    <div className="flex flex-col h-full -mx-4">
      {/* Floating pill tabs - below header divider */}
      <div className="flex gap-1.5 px-3 pt-3">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 relative",
                // Fully rounded squircle pills
                "rounded-xl",
                // High contrast mode styles
                isHighContrast
                  ? isActive
                    ? "text-[var(--color-accent)] bg-bg-surface-3 border-2 border-[var(--color-accent)] font-bold"
                    : "text-text-primary border border-border-subtle hover:border-text-muted hover:bg-bg-surface-2"
                  // Default glass styles
                  : isActive
                    ? "text-text-primary bg-black/5 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.6)]"
                    : "text-text-muted hover:text-text-secondary hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              <Icon className={cn(
                "h-4 w-4 transition-colors",
                isActive ? "text-[var(--color-accent)]" : ""
              )} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content area - transparent, glass shows through */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeTab === "appearance" && <AppearanceSection />}
        {activeTab === "account" && <AccountSection />}
        {activeTab === "data" && <DataSection />}
      </div>
    </div>
  );
}
