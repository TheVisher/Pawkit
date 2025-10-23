"use client";

import { useState } from "react";
import { useDataStore } from "@/lib/stores/data-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { FileText, FolderOpen, Link2, Tag, Clock, BookOpen, Sparkles, Zap, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CardDetailsPanel() {
  const activeCardId = usePanelStore((state) => state.activeCardId);
  const { cards, updateCard } = useDataStore();

  // Find the active card
  const card = cards.find((c) => c.id === activeCardId);

  // Internal tab state
  const [activeTab, setActiveTab] = useState<
    "pawkits" | "notes" | "links" | "tags" | "schedule" | "reader" | "summary" | "actions"
  >("pawkits");

  // Edit title state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(card?.title || "");

  if (!card) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground">No card selected</p>
      </div>
    );
  }

  const isNote = card.type === "md-note" || card.type === "text-note";

  const handleSaveTitle = () => {
    if (editedTitle.trim() !== card.title) {
      updateCard(card.id, { title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === "Escape") {
      setEditedTitle(card.title || "");
      setIsEditingTitle(false);
    }
  };

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
    <div className="flex h-full flex-col">
      {/* Main Content Area with Tabs */}
      <div className="flex flex-1 overflow-hidden">
        {/* Vertical Tab Content */}
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

      {/* Bottom Details Section - Always Visible */}
      <div className="border-t border-white/10 bg-white/5 p-4 space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase">Details</h3>

        {/* Title with Edit */}
        <div>
          {isEditingTitle ? (
            <textarea
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveTitle}
              autoFocus
              rows={3}
              className="w-full text-sm font-semibold text-foreground bg-surface border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-accent resize-none"
              placeholder="Enter title..."
            />
          ) : (
            <div className="flex items-start gap-2 group">
              <h4 className="flex-1 text-sm font-semibold text-foreground line-clamp-2">
                {card.title || card.domain || "Untitled"}
              </h4>
              <button
                onClick={() => {
                  setEditedTitle(card.title || "");
                  setIsEditingTitle(true);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                title="Edit title"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:underline break-all line-clamp-1"
          >
            {card.url}
          </a>
        </div>

        {/* Pawkits */}
        {card.collections && card.collections.length > 0 && (
          <div>
            <h5 className="text-xs text-muted-foreground mb-1">Pawkits</h5>
            <div className="flex flex-wrap gap-1">
              {card.collections.map((collection) => (
                <Badge key={collection} variant="secondary" className="text-xs">
                  📁 {collection}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {card.tags && card.tags.length > 0 && (
          <div>
            <h5 className="text-xs text-muted-foreground mb-1">Tags</h5>
            <div className="flex flex-wrap gap-1">
              {card.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {card.status === "PENDING" && (
            <div className="flex justify-between items-center">
              <span>Status</span>
              <Badge variant="secondary" className="text-xs">Fetching</Badge>
            </div>
          )}
          {card.status === "ERROR" && (
            <div className="flex justify-between items-center">
              <span>Status</span>
              <Badge variant="destructive" className="text-xs">Error</Badge>
            </div>
          )}
          <div className="flex justify-between">
            <span>Domain</span>
            <span className="text-foreground truncate ml-2">{card.domain || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span>Created</span>
            <span className="text-foreground">
              {new Date(card.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Updated</span>
            <span className="text-foreground">
              {new Date(card.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
