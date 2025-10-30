"use client";

import { ReactNode, useEffect, useState, useMemo } from "react";
// Removed useSWR - using local-first data store instead
import { OmniBar } from "@/components/omni-bar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { SelectionStoreProvider } from "@/lib/hooks/selection-store";
import { useDataStore } from "@/lib/stores/data-store";
import { useNetworkSync } from "@/lib/hooks/use-network-sync";
import { useSyncSettings } from "@/lib/hooks/use-sync-settings";
import { useSyncTriggers } from "@/lib/hooks/use-sync-triggers";
import { ConflictNotifications } from "@/components/conflict-notifications";
import { ViewControls } from "@/components/layout/view-controls";
import { useViewSettingsStore } from "@/lib/hooks/view-settings-store";
import { PawkitActionsProvider } from "@/lib/contexts/pawkit-actions-context";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { CreateNoteModal } from "@/components/modals/create-note-modal";
import { AddCardModal } from "@/components/modals/add-card-modal";
import { KeyboardShortcutsModal } from "@/components/modals/keyboard-shortcuts-modal";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { useRouter } from "next/navigation";
import { ControlPanel } from "@/components/control-panel/control-panel";
import { LibraryControls } from "@/components/control-panel/library-controls";
import { NotesControls } from "@/components/control-panel/notes-controls";
import { PawkitsControls } from "@/components/control-panel/pawkits-controls";
import { CardDetailsPanel } from "@/components/control-panel/card-details-panel";
import { BulkOperationsPanel } from "@/components/control-panel/bulk-operations-panel";
import { LeftNavigationPanel } from "@/components/navigation/left-navigation-panel";
import { ContentPanel } from "@/components/layout/content-panel";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { Menu, Settings, ChevronRight, ChevronLeft } from "lucide-react";
import { CardDetailModal } from "@/components/modals/card-detail-modal";
import type { CardModel } from "@/lib/types";
import { initActivityTracking } from "@/lib/utils/device-session";
import { SessionWarningBanner } from "@/components/session-warning-banner";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<{ email: string; displayName?: string | null } | null>(null);
  const { collections, initialize, isInitialized, refresh, addCard, cards, updateCard, deleteCard } = useDataStore();
  const { loadFromServer } = useViewSettingsStore();
  const router = useRouter();

  // Check if today's daily note exists
  const dailyNoteExists = useMemo(() => {
    const today = new Date();
    const { findDailyNoteForDate } = require('@/lib/utils/daily-notes');
    return findDailyNoteForDate(cards, today) !== null;
  }, [cards]);

  // Global modal state management - single source of truth for card modals
  const panelActiveCardId = usePanelStore((state) => state.activeCardId);
  const openCardDetails = usePanelStore((state) => state.openCardDetails);
  const setActiveCardId = usePanelStore((state) => state.setActiveCardId);
  const restorePreviousContent = usePanelStore((state) => state.restorePreviousContent);

  // Command Palette state
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandPaletteInitialValue, setCommandPaletteInitialValue] = useState("");
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const [showCreateCardModal, setShowCreateCardModal] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Global Control Panel state (right panel) - use consistent selectors
  const isPanelOpen = usePanelStore((state) => state.isOpen);
  const panelMode = usePanelStore((state) => state.mode);
  const contentType = usePanelStore((state) => state.contentType);
  const closePanel = usePanelStore((state) => state.close);
  const setPanelMode = usePanelStore((state) => state.setMode);
  const togglePanel = usePanelStore((state) => state.toggle);

  // Left Navigation Panel state
  const isLeftOpen = usePanelStore((state) => state.isLeftOpen);
  const leftMode = usePanelStore((state) => state.leftMode);
  const closeLeft = usePanelStore((state) => state.closeLeft);
  const setLeftMode = usePanelStore((state) => state.setLeftMode);
  const toggleLeft = usePanelStore((state) => state.toggleLeft);

  // Track content type changes for animation
  const [animatingContentType, setAnimatingContentType] = useState(contentType);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Determine if right panel should be embedded inside content panel
  // Special case: left floating + right anchored = embedded mode
  const isRightPanelEmbedded = leftMode === "floating" && panelMode === "anchored" && isPanelOpen;

  // Debug: Track panel state changes
  useEffect(() => {
    console.log('=== LAYOUT PANEL STATE CHANGE ===');
    console.log('Left panel:', { isOpen: isLeftOpen, mode: leftMode });
    console.log('Right panel:', { isOpen: isPanelOpen, mode: panelMode });
    console.log('Embedded mode:', isRightPanelEmbedded);
  }, [isLeftOpen, leftMode, isPanelOpen, panelMode, isRightPanelEmbedded]);

  useEffect(() => {
    if (contentType !== animatingContentType) {
      setIsTransitioning(true);
      // Wait for exit animation, then switch content
      const timer = setTimeout(() => {
        setAnimatingContentType(contentType);
        setIsTransitioning(false);

        // Clear activeCardId after transition completes (only if not switching to card-details)
        if (contentType !== "card-details") {
          setActiveCardId(null);
        }
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [contentType, animatingContentType, setActiveCardId]);

  // Fetch user data once on mount (no SWR polling)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };
    fetchUser();
  }, []);

  // Initialize data store on mount - fetches from server ONCE
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Load view settings from server on mount
  useEffect(() => {
    loadFromServer();
  }, [loadFromServer]);

  // DISABLED: This was causing excessive syncing and card duplication
  // Sync is now handled by useNetworkSync hook with proper debouncing
  // useEffect(() => {
  //   const handleFocus = () => {
  //     if (isInitialized && document.visibilityState === 'visible') {
  //       useDataStore.getState().drainQueue();
  //     }
  //   };
  //   window.addEventListener('visibilitychange', handleFocus);
  //   return () => window.removeEventListener('visibilitychange', handleFocus);
  // }, [isInitialized]);

  // Network sync hook handles queue draining on reconnection + periodic retries
  useNetworkSync();

  // Sync settings hook ensures localStorage serverSync is synced to database
  useSyncSettings();

  // Sync triggers hook manages periodic sync and event-based sync
  useSyncTriggers();

  // Initialize activity tracking to mark this device as active
  useEffect(() => {
    initActivityTracking();
    console.log('[Layout] Activity tracking initialized');
  }, []);

  const username = userData?.email || "";
  const displayName = userData?.displayName || null;

  // Manual sync - checks server for updates from other devices
  const handleManualSync = async () => {
    await refresh();
  };

  // Handle paste events when nothing is focused (Cmd/Ctrl+V quick capture)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Only intercept paste when NOT in an input field
      if (!isInput && !showCommandPalette) {
        const pastedText = e.clipboardData?.getData('text');
        if (pastedText) {
          e.preventDefault();
          setCommandPaletteInitialValue(pastedText);
          setShowCommandPalette(true);
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [showCommandPalette]);

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onCommandPalette: () => {
      setCommandPaletteInitialValue("");
      setShowCommandPalette(true);
    },
    onNewNote: () => setShowCreateNoteModal(true),
    onNewCard: () => setShowCreateCardModal(true),
    onTodayNote: () => {
      // Navigate to today's note
      const today = new Date().toISOString().split('T')[0];
      router.push(`/notes#daily-${today}`);
    },
    onSearch: () => {
      // Open command palette (changed from focusing omnibar)
      setCommandPaletteInitialValue("");
      setShowCommandPalette(true);
    },
    onEscape: () => {
      // Priority: Close modals first, then right panel, then left panel
      if (showCommandPalette) {
        setShowCommandPalette(false);
      } else if (showCreateNoteModal) {
        setShowCreateNoteModal(false);
      } else if (showCreateCardModal) {
        setShowCreateCardModal(false);
      } else if (showKeyboardShortcuts) {
        setShowKeyboardShortcuts(false);
      } else if (panelActiveCardId) {
        // Close card detail modal and restore previous panel content
        setActiveCardId(null);
        restorePreviousContent();
      } else if (isPanelOpen) {
        // Close right panel if no modals are open
        closePanel();
      } else if (isLeftOpen) {
        // Close left panel if no modals or right panel are open
        closeLeft();
      }
    },
    onHelp: () => setShowKeyboardShortcuts(true),
    enableNavigation: true,
  });

  // Handle create note from command palette
  const handleCreateNote = async (data: { type: string; title: string; content?: string }) => {
    setShowCreateNoteModal(false);
    await addCard({
      type: data.type as 'md-note' | 'text-note',
      title: data.title,
      content: data.content || "",
      url: "",
    });
  };

  // Global card modal state
  const activeCard = panelActiveCardId && cards && Array.isArray(cards)
    ? cards.find(c => c.id === panelActiveCardId)
    : null;

  const handleUpdateCard = async (updated: CardModel) => {
    await updateCard(updated.id, updated);
  };

  const handleDeleteCard = async () => {
    if (panelActiveCardId) {
      await deleteCard(panelActiveCardId);
      setActiveCardId(null);
    }
  };

  const handleNavigateToCard = (cardId: string) => {
    openCardDetails(cardId);
  };

  // Bulk operations handlers
  const handleBulkDelete = async () => {
    // TODO: Implement bulk delete - will be handled by library view
    console.log('Bulk delete triggered');
  };

  const handleBulkMove = () => {
    // TODO: Implement bulk move - will be handled by library view
    console.log('Bulk move triggered');
  };

  return (
    <SelectionStoreProvider>
      <PawkitActionsProvider>
        <SidebarProvider>
          {/* Hide old sidebar for now - replaced by left panel */}
          {false && <AppSidebar username={username} displayName={displayName} collections={collections} />}
          <SidebarInset className="bg-transparent">
            {/* Mobile-only OmniBar - Shows on screens smaller than lg (1024px) */}
            <div className="sticky top-0 z-30 lg:hidden border-b border-white/10 bg-surface-80/95 backdrop-blur-xl">
              <div className="px-4 py-3">
                <OmniBar />
              </div>
            </div>

            {/* TEMPORARILY REMOVED - Components to re-add later:
              - Left Panel Toggle Button (Menu icon)
              - OmniBar
              - ViewControls with refresh handler
            */}
            {false && (
              <header className="sticky top-0 z-20 border-b border-subtle bg-surface-90 backdrop-blur-xl">
                <div className="flex items-center gap-2 px-6 py-4">
                  {/* Left Panel Toggle Button */}
                  <button
                    onClick={toggleLeft}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                    aria-label="Toggle navigation panel"
                    title="Toggle navigation panel"
                  >
                    <Menu size={20} />
                  </button>
                  <div className="mx-auto w-full max-w-6xl">
                    <OmniBar />
                  </div>
                  <div className="ml-2">
                    <ViewControls onRefresh={handleManualSync} />
                  </div>
                </div>
              </header>
            )}
            <main className="relative h-screen bg-transparent">
              <ContentPanel
                leftOpen={isLeftOpen}
                leftMode={leftMode}
                rightOpen={isPanelOpen}
                rightMode={panelMode}
              >
                {children}
              </ContentPanel>
            </main>
          </SidebarInset>
          <ConflictNotifications />

          {/* Multi-Session Warning Banner */}
          <SessionWarningBanner />

          {/* Command Palette */}
          <CommandPalette
            open={showCommandPalette}
            onClose={() => {
              setShowCommandPalette(false);
              setCommandPaletteInitialValue("");
            }}
            onOpenCreateNote={() => {
              setShowCommandPalette(false);
              setShowCreateNoteModal(true);
            }}
            onOpenCreateCard={() => {
              setShowCommandPalette(false);
              setShowCreateCardModal(true);
            }}
            initialValue={commandPaletteInitialValue}
          />

          {/* Create Note Modal */}
          <CreateNoteModal
            open={showCreateNoteModal}
            onClose={() => setShowCreateNoteModal(false)}
            onConfirm={handleCreateNote}
            dailyNoteExists={dailyNoteExists}
          />

          {/* Add Card Modal */}
          <AddCardModal
            open={showCreateCardModal}
            onClose={() => setShowCreateCardModal(false)}
          />

          {/* Keyboard Shortcuts Help Modal */}
          <KeyboardShortcutsModal
            open={showKeyboardShortcuts}
            onClose={() => setShowKeyboardShortcuts(false)}
          />

          {/* Left Panel Toggle Button - Only show when closed */}
          {!isLeftOpen && (
            <button
              onClick={toggleLeft}
              className="fixed left-4 top-1/2 -translate-y-1/2 z-[101]
                w-10 h-10 rounded-full
                bg-white/5 backdrop-blur-lg border border-white/10
                flex items-center justify-center
                hover:bg-white/10 hover:shadow-lg
                transition-all duration-300
                animate-fade-in"
              aria-label="Open navigation panel"
              title="Open navigation panel"
            >
              <ChevronRight size={20} className="text-muted-foreground" />
            </button>
          )}

          {/* Right Panel Toggle Button - Only show when closed */}
          {!isPanelOpen && (
            <button
              onClick={togglePanel}
              className="fixed right-4 top-1/2 -translate-y-1/2 z-[101]
                w-10 h-10 rounded-full
                bg-white/5 backdrop-blur-lg border border-white/10
                flex items-center justify-center
                hover:bg-white/10 hover:shadow-lg
                transition-all duration-300
                animate-fade-in"
              aria-label="Open controls panel"
              title="Open controls panel"
            >
              <ChevronLeft size={20} className="text-muted-foreground" />
            </button>
          )}

          {/* Left Navigation Panel */}
          <LeftNavigationPanel
            open={isLeftOpen}
            onClose={closeLeft}
            mode={leftMode}
            onModeChange={setLeftMode}
            username={username}
            displayName={displayName}
            collections={collections}
          />

          {/* Global Control Panel (Right) */}
          <ControlPanel
            open={isPanelOpen}
            onClose={closePanel}
            mode={panelMode}
            onModeChange={setPanelMode}
            embedded={isRightPanelEmbedded}
            username={username}
            displayName={displayName}
          >
            <div
              className={`${animatingContentType === "card-details" ? "relative h-full" : ""} transition-all duration-300 ${
                isTransitioning ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
              }`}
            >
              {animatingContentType === "library-controls" && <LibraryControls />}
              {animatingContentType === "notes-controls" && <NotesControls />}
              {animatingContentType === "pawkits-controls" && <PawkitsControls />}
              {animatingContentType === "card-details" && <CardDetailsPanel />}
              {animatingContentType === "bulk-operations" && (
                <BulkOperationsPanel
                  cards={cards || []}
                  onBulkDelete={handleBulkDelete}
                  onBulkMove={handleBulkMove}
                />
              )}
              {animatingContentType === "calendar-controls" && (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">Calendar controls coming soon...</p>
                </div>
              )}
            </div>
          </ControlPanel>

          {/* Global Card Detail Modal - rendered once for all pages */}
          {activeCard && (
            <CardDetailModal
              key={activeCard.id}
              card={activeCard as CardModel}
              collections={collections}
              onClose={() => setActiveCardId(null)}
              onUpdate={handleUpdateCard}
              onDelete={handleDeleteCard}
              onNavigateToCard={handleNavigateToCard}
            />
          )}
        </SidebarProvider>
      </PawkitActionsProvider>
    </SelectionStoreProvider>
  );
}
