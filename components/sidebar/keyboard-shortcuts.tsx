"use client";

import { Command, Plus, Search, HelpCircle } from "lucide-react";
import { useState, useEffect } from "react";

export function KeyboardShortcuts() {
  const [isMac, setIsMac] = useState(true);

  // Detect OS on mount
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  const cmdKey = isMac ? "⌘" : "Ctrl";

  const shortcuts = [
    { icon: Search, label: "Quick search", keys: [`${cmdKey}`, "K"] },
    { icon: Command, label: "Paste URL", keys: [`${cmdKey}`, "V"] },
    { icon: Plus, label: "Add card", keys: [`${cmdKey}`, "P"] },
    { icon: HelpCircle, label: "View all shortcuts", keys: ["?"] },
  ];

  return (
    <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border-divider)' }}>
      <div className="text-xs text-muted-foreground space-y-2">
        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-divider)' }}>
          <span className="font-semibold text-foreground">Quick Actions</span>
        </div>

        {shortcuts.map((shortcut, index) => (
          <div
            key={index}
            className="flex items-center justify-between hover:bg-white/5 -mx-1 px-1 py-1 rounded transition-colors"
          >
            <div className="flex items-center gap-2">
              <shortcut.icon className="h-3.5 w-3.5" />
              <span>{shortcut.label}</span>
            </div>
            <div className="flex items-center gap-1">
              {shortcut.keys.map((key, i) => (
                <kbd
                  key={i}
                  className="px-2 py-0.5 rounded bg-white/10 font-mono text-[10px] flex items-center justify-center min-w-[20px]"
                >
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
