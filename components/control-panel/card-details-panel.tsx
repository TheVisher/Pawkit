"use client";

import { useState } from "react";
import { useDataStore } from "@/lib/stores/data-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { FileText, FolderOpen, Link2, Tag, Clock, BookOpen, Sparkles, Zap } from "lucide-react";

export function CardDetailsPanel() {
  const activeCardId = usePanelStore((state) => state.activeCardId);
  const { cards } = useDataStore();

  // Find the active card
  const card = cards.find((c) => c.id === activeCardId);

  // Internal tab state
  const [activeTab, setActiveTab] = useState<
    "pawkits" | "notes" | "links" | "tags" | "schedule" | "reader" | "summary" | "actions"
  >("pawkits");

  if (!card) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground">No card selected</p>
      </div>
    );
  }

  const isNote = card.type === "md-note" || card.type === "text-note";

  // Vertical navigation buttons
  const tabs = [
    { id: "pawkits", icon: FolderOpen, label: "Pawkits", show: true },
    { id: "notes", icon: FileText, label: "Notes", show: true },
    { id: "links", icon: Link2, label: "Links", show: true },
    { id: "tags", icon: Tag, label: "Tags", show: isNote },
    { id: "schedule", icon: Clock, label: "Schedule", show: true },
    { id: "reader", icon: BookOpen, label: "Reader", show: !isNote },
    { id: "summary", icon: Sparkles, label: "Summary", show: !isNote },
    { id: "actions", icon: Zap, label: "Actions", show: true },
  ].filter((tab) => tab.show);

  return (
    <div className="flex h-full">
      {/* Vertical Tab Navigation on the Right */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Tab Content */}
        {activeTab === "pawkits" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Pawkits</h3>
            <p className="text-xs text-muted-foreground">
              Pawkits tab content coming soon...
            </p>
          </div>
        )}
        {activeTab === "notes" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Notes</h3>
            <textarea
              value={card.notes || ""}
              placeholder="Add notes about this card..."
              className="w-full min-h-[200px] rounded border border-white/10 bg-white/5 p-3 text-sm text-foreground placeholder-muted-foreground resize-none focus:border-accent focus:outline-none"
            />
          </div>
        )}
        {activeTab === "links" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Links</h3>
            <p className="text-xs text-muted-foreground">
              Backlinks and references coming soon...
            </p>
          </div>
        )}
        {activeTab === "schedule" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Schedule</h3>
            <p className="text-xs text-muted-foreground">
              Schedule for calendar coming soon...
            </p>
          </div>
        )}
        {activeTab === "actions" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Actions</h3>
            <p className="text-xs text-muted-foreground">
              Card actions coming soon...
            </p>
          </div>
        )}

        {/* Card Metadata at bottom */}
        <div className="mt-8 pt-4 border-t border-white/10 space-y-2">
          <h4 className="text-xs font-semibold text-foreground uppercase">Card Details</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Title:</span>
              <span className="text-foreground truncate ml-2">{card.title || "Untitled"}</span>
            </div>
            <div className="flex justify-between">
              <span>Domain:</span>
              <span className="text-foreground">{card.domain || "—"}</span>
            </div>
            {card.collections && card.collections.length > 0 && (
              <div className="flex justify-between">
                <span>Pawkits:</span>
                <span className="text-foreground">{card.collections.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vertical Navigation Sidebar */}
      <div className="w-14 border-l border-white/10 flex flex-col items-center py-4 gap-2 flex-shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                w-11 h-11 rounded-xl flex items-center justify-center border transition-all
                ${
                  isActive
                    ? "border-accent bg-white/10 shadow-glow-accent text-accent"
                    : "border-transparent hover:bg-white/5 text-muted-foreground hover:text-foreground"
                }
              `}
              title={tab.label}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
