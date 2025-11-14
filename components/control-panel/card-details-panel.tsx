"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDataStore } from "@/lib/stores/data-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { FileText, Link2, Clock, Bot } from "lucide-react";
import { BacklinksPanel } from "@/components/notes/backlinks-panel";

export function CardDetailsPanel() {
  const router = useRouter();
  const activeCardId = usePanelStore((state) => state.activeCardId);
  const setActiveCardId = usePanelStore((state) => state.setActiveCardId);
  const openCardDetails = usePanelStore((state) => state.openCardDetails);
  const { cards, updateCard } = useDataStore();

  // Find the active card
  const card = cards.find((c) => c.id === activeCardId);

  // Internal tab state
  const [activeTab, setActiveTab] = useState<"notes" | "links" | "schedule" | "ai">("notes");

  // Notes state
  const [notes, setNotes] = useState(card?.notes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Schedule state
  const initialDate = card?.scheduledDate ? card.scheduledDate.split('T')[0] : "";
  const [scheduledDate, setScheduledDate] = useState(initialDate);

  if (!card) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground">No card selected</p>
      </div>
    );
  }

  // Handle notes save
  const handleSaveNotes = async () => {
    if (notes === card.notes) return;

    setIsSavingNotes(true);
    try {
      await updateCard(card.id, { notes });
    } catch (error) {
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Handle schedule save
  const handleSaveSchedule = async () => {
    if (!scheduledDate) return;

    // Convert YYYY-MM-DD to ISO datetime at noon UTC to avoid timezone issues
    const isoDate = `${scheduledDate}T12:00:00.000Z`;
    try {
      await updateCard(card.id, { scheduledDate: isoDate });
    } catch (error) {
    }
  };

  // Handle schedule clear
  const handleClearSchedule = async () => {
    setScheduledDate("");
    try {
      await updateCard(card.id, { scheduledDate: null });
    } catch (error) {
    }
  };

  // Tabs configuration
  const tabs = [
    { id: "notes" as const, icon: FileText, label: "Notes" },
    { id: "links" as const, icon: Link2, label: "Links" },
    { id: "schedule" as const, icon: Clock, label: "Schedule" },
    { id: "ai" as const, icon: Bot, label: "AI Chat" },
  ];

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Main Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 24px, black calc(100% - 24px), transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 24px, black calc(100% - 24px), transparent 100%)"
        }}
      >
        {/* Notes Tab */}
        {activeTab === "notes" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Notes</h3>
              {notes !== card.notes && (
                <button
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="text-xs text-accent hover:underline disabled:opacity-50"
                >
                  {isSavingNotes ? "Saving..." : "Save"}
                </button>
              )}
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder="Add your notes about this card..."
              className="w-full min-h-[300px] rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-foreground placeholder-muted-foreground resize-none focus:border-accent focus:outline-none"
            />
          </div>
        )}

        {/* Links/Backlinks Tab */}
        {activeTab === "links" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Backlinks</h3>
            <BacklinksPanel
              noteId={card.id}
              onNavigate={(id) => {
                // Ensure both the panel and modal navigate consistently
                openCardDetails(id);
              }}
            />
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === "schedule" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">📅 Schedule for Calendar</h3>
              <p className="text-xs text-muted-foreground">
                Assign a date to this card to display it on your calendar. Perfect for tracking release dates, reminders, or countdowns.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-2">
                Scheduled Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-foreground border border-white/10 focus:border-accent focus:outline-none"
              />
            </div>

            {scheduledDate && (
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-muted-foreground">
                  This card will appear on your calendar on{" "}
                  <button
                    onClick={() => router.push('/calendar')}
                    className="text-accent font-medium hover:underline cursor-pointer"
                  >
                    {(() => {
                      // Parse YYYY-MM-DD as local date to avoid timezone issues
                      const [year, month, day] = scheduledDate.split('-').map(Number);
                      return new Date(year, month - 1, day).toLocaleDateString();
                    })()}
                  </button>
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSaveSchedule}
                disabled={!scheduledDate || scheduledDate === initialDate}
                className="flex-1 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Date
              </button>
              {card.scheduledDate && (
                <button
                  onClick={handleClearSchedule}
                  className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* AI Chat Tab */}
        {activeTab === "ai" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">AI Chat</h3>
            <div className="p-8 text-center">
              <Bot size={48} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                AI Chat coming soon...
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Chat with AI about this card&apos;s content, get insights, and more.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Icon Navigation Grid - Above keyboard shortcuts */}
      <div className="border-t border-white/10 p-3 flex-shrink-0">
        <div className="grid grid-cols-4 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full aspect-square rounded-xl flex items-center justify-center border transition-all
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
    </div>
  );
}
