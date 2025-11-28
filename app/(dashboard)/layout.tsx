"use client";

import { ReactNode, useEffect, useState, useMemo } from "react";
// Removed useSWR - using local-first data store instead
import { OmniBar } from "@/components/omni-bar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { SelectionStoreProvider, useSelection } from "@/lib/hooks/selection-store";
import { useDataStore } from "@/lib/stores/data-store";
import { useFileStore } from "@/lib/stores/file-store";
import { useCalendarStore } from "@/lib/hooks/use-calendar-store";
import { useNetworkSync } from "@/lib/hooks/use-network-sync";
import { useSyncSettings } from "@/lib/hooks/use-sync-settings";
import { useSyncTriggers } from "@/lib/hooks/use-sync-triggers";
import { useLoadSettings } from "@/lib/hooks/use-load-settings";
import { ConflictNotifications } from "@/components/conflict-notifications";
import { GlobalToastProvider } from "@/components/providers/global-toast-provider";
import { ViewControls } from "@/components/layout/view-controls";
import { useViewSettingsStore } from "@/lib/hooks/view-settings-store";
import { PawkitActionsProvider } from "@/lib/contexts/pawkit-actions-context";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { CreateNoteModal } from "@/components/modals/create-note-modal";
import { AddCardModal } from "@/components/modals/add-card-modal";
import { KeyboardShortcutsModal } from "@/components/modals/keyboard-shortcuts-modal";
import { MoveToPawkitModal } from "@/components/modals/move-to-pawkit-modal";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HelpCircle, Keyboard } from "lucide-react";
import { ControlPanel } from "@/components/control-panel/control-panel";
import { HomeControls } from "@/components/control-panel/home-controls";
import { LibraryControls } from "@/components/control-panel/library-controls";
import { NotesControls } from "@/components/control-panel/notes-controls";
import { PawkitsControls } from "@/components/control-panel/pawkits-controls";
import { CalendarControls } from "@/components/control-panel/calendar-controls";
import { DayDetailsPanel } from "@/components/control-panel/day-details-panel";
import { CardDetailsPanel } from "@/components/control-panel/card-details-panel";
import { BulkOperationsPanel } from "@/components/control-panel/bulk-operations-panel";
import { LeftNavigationPanel } from "@/components/navigation/left-navigation-panel";
import { ContentPanel } from "@/components/layout/content-panel";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { Menu, Settings, ChevronRight, ChevronLeft } from "lucide-react";
import { CardDetailModal } from "@/components/modals/card-detail-modal";
import type { CardModel, CollectionNode } from "@/lib/types";
import { initActivityTracking } from "@/lib/utils/device-session";
import { SessionWarningBanner } from "@/components/session-warning-banner";
import { useUserStorage } from "@/lib/hooks/use-user-storage";
import { useOnboarding } from "@/lib/hooks/use-onboarding";
import { TourProvider } from "@/components/onboarding/tour-provider";
import { CardDTO } from "@/lib/server/cards";

// Wrapper component that provides bulk operation handlers with access to selection store
function BulkOperationsPanelWithHandlers({
  cards,
  collections,
  deleteCard,
  updateCard,
  setShowMoveToPawkitModal,
  setBulkMoveCardIds,
}: {
  cards: CardDTO[];
  collections: CollectionNode[];
  deleteCard: (id: string) => Promise<void>;
  updateCard: (id: string, updates: Partial<CardDTO>) => Promise<void>;
  setShowMoveToPawkitModal: (show: boolean) => void;
  setBulkMoveCardIds: (ids: string[]) => void;
}) {
  const selectedIds = useSelection((state) => state.selectedIds);
  const clear = useSelection((state) => state.clear);

  const handleBulkDelete = async () => {
    // Delete all selected cards
    await Promise.all(selectedIds.map((id) => deleteCard(id)));
    // Clear selection after deletion
    clear();
  };

  const handleBulkMove = () => {
    // Store selected IDs for the modal handler to use
    setBulkMoveCardIds(selectedIds);
    // Show the move to pawkit modal
    setShowMoveToPawkitModal(true);
  };

  return (
    <BulkOperationsPanel
      cards={cards}
      onBulkDelete={handleBulkDelete}
      onBulkMove={handleBulkMove}
    />
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // CRITICAL: Initialize user-specific storage FIRST (security fix)
  const { userId, workspaceId, isReady, isLoading, error } = useUserStorage();

  const [userData, setUserData] = useState<{ email: string; displayName?: string | null } | null>(null);
  const { collections, initialize, isInitialized, refresh, addCard, cards, updateCard, deleteCard } = useDataStore();
  const loadFiles = useFileStore((state) => state.loadFiles);
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
  const [showMoveToPawkitModal, setShowMoveToPawkitModal] = useState(false);
  const [bulkMoveCardIds, setBulkMoveCardIds] = useState<string[]>([]);

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

  // Determine if right panel is floating over content (needs darker glass for readability)
  // Special case: left anchored + right floating = floating over visible content
  const isRightPanelFloatingOverContent = leftMode === "anchored" && panelMode === "floating" && isPanelOpen;

  // Track panel state changes
  useEffect(() => {
    // Panel state tracking for debugging if needed
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

  // Fetch user data once user storage is ready
  useEffect(() => {
    if (!isReady) return;

    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        }
      } catch (error) {
      }
    };
    fetchUser();
  }, [isReady]);

  // Initialize data store and file store ONLY after user storage is ready (security fix)
  useEffect(() => {
    if (isReady && !isInitialized) {
      initialize();
      loadFiles(); // Load files from IndexedDB for file card thumbnails
    }
  }, [isReady, isInitialized, initialize, loadFiles]);

  // Load view settings ONLY after user storage is ready
  useEffect(() => {
    if (isReady) {
      loadFromServer();
    }
  }, [isReady, loadFromServer]);

  // Network sync hook handles queue draining on reconnection + periodic retries
  useNetworkSync();

  // Sync settings hook ensures localStorage serverSync is synced to database
  useSyncSettings();

  // Sync triggers hook manages periodic sync and event-based sync
  useSyncTriggers();

  // Load user settings from server on mount (respects serverSync flag)
  useLoadSettings();

  // Onboarding hook - seeds sample data for new users
  useOnboarding();

  // Initialize activity tracking to mark this device as active
  useEffect(() => {
    initActivityTracking();
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
      // Priority: Close modals first, then bulk operations (handled by BulkOperationsPanel), then right panel, then left panel
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
      } else if (contentType === "day-details") {
        // Close day details and clear selected day
        useCalendarStore.getState().setSelectedDay(null);
        restorePreviousContent();
      } else if (contentType === "bulk-operations") {
        // Bulk operations panel handles ESC itself by clearing selection
        // Don't close the panel - let the selection clearing trigger restoration
        return;
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
  const handleCreateNote = async (data: { type: string; title: string; content?: string; tags?: string[] }) => {
    setShowCreateNoteModal(false);
    try {
      await addCard({
        type: data.type as 'md-note' | 'text-note',
        title: data.title,
        content: data.content || "",
        url: "",
        tags: data.tags,
      });
      const { useToastStore } = await import("@/lib/stores/toast-store");
      const isDailyNote = data.tags?.includes("daily");
      useToastStore.getState().success(isDailyNote ? "Daily note created" : "Note created");
    } catch (error) {
      const { useToastStore } = await import("@/lib/stores/toast-store");
      useToastStore.getState().error("Failed to create note");
    }
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

  // Handler for bulk moving cards to a pawkit
  const handleBulkMoveToPawkit = async (pawkitSlug: string) => {
    // Move all selected cards to the pawkit by updating their collections
    await Promise.all(
      bulkMoveCardIds.map(async (cardId) => {
        const card = cards?.find((c) => c.id === cardId);
        if (card) {
          // Get existing collections and add the new one
          const existingCollections = card.collections || [];
          if (!existingCollections.includes(pawkitSlug)) {
            existingCollections.push(pawkitSlug);
            await updateCard(cardId, {
              collections: existingCollections,
            });
          }
        }
      })
    );
    // Clear the stored card IDs
    setBulkMoveCardIds([]);
  };

  // Show loading screen while user storage is initializing
  if (isLoading || !isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="text-muted-foreground">Initializing secure storage...</p>
          {userId && <p className="text-xs text-muted-foreground/60">User: {userId.slice(0, 8)}...</p>}
        </div>
      </div>
    );
  }

  // Show error screen if storage initialization failed
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4 max-w-md p-6">
          <div className="text-red-500 text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold">Storage Initialization Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <TourProvider>
      <SelectionStoreProvider>
        <PawkitActionsProvider>
          <SidebarProvider>
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
          <GlobalToastProvider />

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
            footer={
              <div className="mt-4 flex items-center justify-between gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>
                    Need a refresher? Visit the{' '}
                    <Link
                      href="/help"
                      onClick={() => setShowCommandPalette(false)}
                      className="font-medium text-foreground underline decoration-dotted underline-offset-4"
                    >
                      Help Center
                    </Link>
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowCommandPalette(false);
                    setShowKeyboardShortcuts(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 font-medium text-foreground transition hover:border-accent hover:text-accent"
                >
                  <Keyboard className="h-3.5 w-3.5" />
                  View shortcuts
                </button>
              </div>
            }
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
            title="Keyboard Shortcuts"
            footer={
              <span className="text-muted-foreground">
                Press <kbd className="rounded bg-white/10 px-2 py-1 font-mono">?</kbd> anywhere to toggle this guide
              </span>
            }
          />

          {/* Move to Pawkit Modal */}
          <MoveToPawkitModal
            open={showMoveToPawkitModal}
            onClose={() => setShowMoveToPawkitModal(false)}
            onConfirm={handleBulkMoveToPawkit}
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
            floatingOverContent={isRightPanelFloatingOverContent}
            username={username}
            displayName={displayName}
          >
            <div
              className={`${animatingContentType === "card-details" ? "relative h-full" : ""} transition-all duration-300 ${
                isTransitioning ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
              }`}
            >
              {animatingContentType === "home-controls" && <HomeControls />}
              {animatingContentType === "library-controls" && <LibraryControls />}
              {animatingContentType === "notes-controls" && <NotesControls />}
              {animatingContentType === "pawkits-controls" && <PawkitsControls />}
              {animatingContentType === "card-details" && <CardDetailsPanel />}
              {animatingContentType === "bulk-operations" && (
                <BulkOperationsPanelWithHandlers
                  cards={cards || []}
                  collections={collections}
                  deleteCard={deleteCard}
                  updateCard={updateCard}
                  setShowMoveToPawkitModal={setShowMoveToPawkitModal}
                  setBulkMoveCardIds={setBulkMoveCardIds}
                />
              )}
              {animatingContentType === "calendar-controls" && <CalendarControls />}
              {animatingContentType === "day-details" && <DayDetailsPanel />}
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
    </TourProvider>
  );
}
