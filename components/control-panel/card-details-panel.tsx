"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDataStore } from "@/lib/stores/data-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useKitStore } from "@/lib/hooks/use-kit-store";
import { FileText, Link2, Clock, Bot, ChevronDown } from "lucide-react";
import { BacklinksPanel } from "@/components/notes/backlinks-panel";
import { AttachmentsSection } from "@/components/modals/attachments-section";
import { KitSidebarEmbed } from "@/components/kit/kit-sidebar-embed";
import { isBoard, getBoardConfig, getStatusFromTags, updateStatusTag } from "@/lib/types/board";
import type { CollectionNode } from "@/lib/types";

export function CardDetailsPanel() {
  const router = useRouter();
  const activeCardId = usePanelStore((state) => state.activeCardId);
  const setActiveCardId = usePanelStore((state) => state.setActiveCardId);
  const openCardDetails = usePanelStore((state) => state.openCardDetails);
  const { cards, collections, updateCard } = useDataStore();

  // Find the active card
  const card = cards.find((c) => c.id === activeCardId);

  // Find if card belongs to a board collection and get board config
  const boardInfo = useMemo(() => {
    if (!card?.collections?.length) return null;

    // Helper to find collection by slug recursively
    const findCollection = (nodes: CollectionNode[], slug: string): CollectionNode | null => {
      for (const node of nodes) {
        if (node.slug === slug) return node;
        if (node.children) {
          const found = findCollection(node.children, slug);
          if (found) return found;
        }
      }
      return null;
    };

    // Find the first board collection this card belongs to
    for (const collectionSlug of card.collections) {
      const collection = findCollection(collections, collectionSlug);
      if (collection && isBoard(collection)) {
        return {
          collection,
          config: getBoardConfig(collection),
          currentStatus: getStatusFromTags(card.tags || [])
        };
      }
    }
    return null;
  }, [card, collections]);

  // Status dropdown state
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Handle status change
  const handleStatusChange = async (newStatus: string) => {
    if (!card) return;
    const newTags = newStatus === "uncategorized"
      ? (card.tags || []).filter(t => !t.startsWith("status:"))
      : updateStatusTag(card.tags || [], newStatus);
    await updateCard(card.id, { tags: newTags });
    setIsStatusDropdownOpen(false);
  };

  // Internal tab state
  const [activeTab, setActiveTab] = useState<"notes" | "links" | "schedule" | "ai">("notes");

  // Kit integration
  const isKitOpen = useKitStore((state) => state.isOpen);
  const setEmbeddedInSidebar = useKitStore((state) => state.setEmbeddedInSidebar);
  const setActiveCardContext = useKitStore((state) => state.setActiveCardContext);
  const saveConversation = useKitStore((state) => state.saveConversation);
  const openKit = useKitStore((state) => state.open);
  const closeKit = useKitStore((state) => state.close);
  const wasOpenBeforeCardOpened = useKitStore((state) => state.wasOpenBeforeCardOpened);
  const setWasOpenBeforeCardOpened = useKitStore((state) => state.setWasOpenBeforeCardOpened);

  // Track if Kit was open when card opened (for restoration on close)
  useEffect(() => {
    if (card) {
      // Remember if Kit was open when card opens
      setWasOpenBeforeCardOpened(isKitOpen);
    }
    // Only run once when card changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]);

  // When card details opens and Kit is active, embed Kit in sidebar
  useEffect(() => {
    if (isKitOpen && card) {
      setEmbeddedInSidebar(true);
      // Auto-switch to AI tab if Kit was open
      setActiveTab('ai');
      // Give Kit context about the current card
      setActiveCardContext({
        id: card.id,
        title: card.title || 'Untitled',
        content: card.notes || card.description || undefined,
      });
    }
  }, [isKitOpen, card, setEmbeddedInSidebar, setActiveCardContext]);

  // Cleanup: restore Kit overlay when card closes
  useEffect(() => {
    return () => {
      const { isOpen, wasOpenBeforeCardOpened, saveConversation } = useKitStore.getState();
      if (isOpen) {
        // Auto-save conversation before transitioning
        saveConversation();
        setEmbeddedInSidebar(false);
        setActiveCardContext(null);

        // If Kit wasn't open before card opened, close it entirely
        if (!wasOpenBeforeCardOpened) {
          closeKit();
        }
      }
    };
  }, [setEmbeddedInSidebar, setActiveCardContext, closeKit]);

  // Handle AI tab click - open Kit immediately if not open
  const handleTabClick = (tabId: "notes" | "links" | "schedule" | "ai") => {
    if (tabId === 'ai' && !isKitOpen && card) {
      // Open Kit and embed immediately when clicking AI tab
      openKit();
      setEmbeddedInSidebar(true);
      setActiveCardContext({
        id: card.id,
        title: card.title || 'Untitled',
        content: card.notes || card.description || undefined,
      });
    }
    setActiveTab(tabId);
  };

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

  // Get status color for the dropdown button
  const getStatusColor = (status: string | null) => {
    if (!status) return { bg: "bg-gray-500/20", text: "text-gray-400", label: "No Status" };
    const column = boardInfo?.config.columns.find(c => c.tag === status);
    if (!column) return { bg: "bg-gray-500/20", text: "text-gray-400", label: status };

    const colorMap: Record<string, { bg: string; text: string }> = {
      red: { bg: "bg-red-500/20", text: "text-red-400" },
      orange: { bg: "bg-orange-500/20", text: "text-orange-400" },
      yellow: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
      green: { bg: "bg-green-500/20", text: "text-green-400" },
      blue: { bg: "bg-blue-500/20", text: "text-blue-400" },
      purple: { bg: "bg-purple-500/20", text: "text-purple-400" },
      gray: { bg: "bg-gray-500/20", text: "text-gray-400" },
    };

    const colors = colorMap[column.color || "gray"] || colorMap.gray;
    return { ...colors, label: column.label };
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Board Status Section - Only shows for cards in board collections */}
      {boardInfo && (
        <div className="flex-shrink-0 px-4 pt-4 pb-2 border-b border-white/10">
          <label className="block text-xs font-medium text-muted-foreground mb-2">Status</label>
          <div className="relative">
            <button
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-white/10 ${getStatusColor(boardInfo.currentStatus).bg} transition-colors hover:bg-white/10`}
            >
              <span className={`text-sm font-medium ${getStatusColor(boardInfo.currentStatus).text}`}>
                {getStatusColor(boardInfo.currentStatus).label}
              </span>
              <ChevronDown
                size={16}
                className={`text-muted-foreground transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {isStatusDropdownOpen && (
              <>
                {/* Backdrop to close dropdown */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsStatusDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-1 py-1 rounded-lg border border-white/10 bg-surface/95 backdrop-blur-lg shadow-xl z-50">
                  {boardInfo.config.columns.map((column) => {
                    const isSelected = boardInfo.currentStatus === column.tag;
                    const colorMap: Record<string, string> = {
                      red: "text-red-400",
                      orange: "text-orange-400",
                      yellow: "text-yellow-400",
                      green: "text-green-400",
                      blue: "text-blue-400",
                      purple: "text-purple-400",
                      gray: "text-gray-400",
                    };
                    const textColor = colorMap[column.color || "gray"] || "text-accent";

                    return (
                      <button
                        key={column.tag}
                        onClick={() => handleStatusChange(column.tag)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2 ${
                          isSelected ? 'bg-white/5' : ''
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${column.color === 'red' ? 'bg-red-400' : column.color === 'orange' ? 'bg-orange-400' : column.color === 'yellow' ? 'bg-yellow-400' : column.color === 'green' ? 'bg-green-400' : column.color === 'blue' ? 'bg-blue-400' : column.color === 'purple' ? 'bg-purple-400' : 'bg-gray-400'}`} />
                        <span className={textColor}>{column.label}</span>
                        {isSelected && (
                          <span className="ml-auto text-accent">✓</span>
                        )}
                      </button>
                    );
                  })}
                  {/* No Status option */}
                  <button
                    onClick={() => handleStatusChange("uncategorized")}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2 ${
                      !boardInfo.currentStatus ? 'bg-white/5' : ''
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-gray-500" />
                    <span className="text-gray-400">No Status</span>
                    {!boardInfo.currentStatus && (
                      <span className="ml-auto text-accent">✓</span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* AI Tab - Outside scrollable area, has its own scroll and needs shadow room */}
      {activeTab === "ai" && (
        <div className="flex-1 min-h-0">
          <KitSidebarEmbed
            cardId={card.id}
            cardTitle={card.title || 'Untitled'}
          />
        </div>
      )}

      {/* Other tabs - Inside scrollable area with mask gradient */}
      {activeTab !== "ai" && (
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
            <div className="space-y-6">
              {/* Backlinks Section */}
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

              {/* Divider */}
              <div className="border-t border-white/10" />

              {/* Attachments Section */}
              <AttachmentsSection cardId={card.id} />
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
        </div>
      )}

      {/* Icon Navigation Grid - Above keyboard shortcuts */}
      <div className={`p-3 flex-shrink-0 ${activeTab !== "ai" ? "border-t border-white/10" : ""}`}>
        <div className="grid grid-cols-4 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
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
