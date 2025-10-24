"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Menu, ChevronRight, ChevronLeft } from "lucide-react";
import { OmniBar } from "@/components/omni-bar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SelectionStoreProvider } from "@/lib/hooks/selection-store";
import { useDemoAwareStore } from "@/lib/hooks/use-demo-aware-store";
import { Button } from "@/components/ui/button";
import { PawkitActionsProvider } from "@/lib/contexts/pawkit-actions-context";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { CreateNoteModal } from "@/components/modals/create-note-modal";
import { AddCardModal } from "@/components/modals/add-card-modal";
import { KeyboardShortcutsModal } from "@/components/modals/keyboard-shortcuts-modal";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { useRouter } from "next/navigation";
import { ControlPanel } from "@/components/control-panel/control-panel";
import { LibraryControls } from "@/components/control-panel/library-controls";
import { CardDetailsPanel } from "@/components/control-panel/card-details-panel";
import { LeftNavigationPanel } from "@/components/navigation/left-navigation-panel";
import { ContentPanel } from "@/components/layout/content-panel";
import { usePanelStore } from "@/lib/hooks/use-panel-store";

export default function DemoLayout({ children }: { children: ReactNode }) {
  const { collections, initialize, isInitialized, addCard } = useDemoAwareStore();
  const router = useRouter();

  // Command Palette state
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandPaletteInitialValue, setCommandPaletteInitialValue] = useState("");
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const [showCreateCardModal, setShowCreateCardModal] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Global Control Panel state (right panel)
  const {
    isOpen: isPanelOpen,
    mode: panelMode,
    contentType,
    close: closePanel,
    setMode: setPanelMode,
    setActiveCardId,
    toggle: togglePanel,
    open: openPanel
  } = usePanelStore();

  // Left Navigation Panel state
  const isLeftOpen = usePanelStore((state) => state.isLeftOpen);
  const leftMode = usePanelStore((state) => state.leftMode);
  const closeLeft = usePanelStore((state) => state.closeLeft);
  const setLeftMode = usePanelStore((state) => state.setLeftMode);
  const toggleLeft = usePanelStore((state) => state.toggleLeft);
  const openLeft = usePanelStore((state) => state.openLeft);

  // Track content type changes for animation
  const [animatingContentType, setAnimatingContentType] = useState(contentType);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Determine if right panel should be embedded inside content panel
  const isRightPanelEmbedded = leftMode === "floating" && panelMode === "anchored" && isPanelOpen;

  // Initialize demo data on mount
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Open both panels on first load to show 3-panel layout
  useEffect(() => {
    if (isInitialized && !isLeftOpen && !isPanelOpen) {
      openLeft();
      openPanel();
    }
  }, [isInitialized, isLeftOpen, isPanelOpen, openLeft, openPanel]);

  useEffect(() => {
    if (contentType !== animatingContentType) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setAnimatingContentType(contentType);
        setIsTransitioning(false);

        if (contentType !== "card-details") {
          setActiveCardId(null);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [contentType, animatingContentType, setActiveCardId]);

  // Handle paste events for quick capture
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

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
      const today = new Date().toISOString().split('T')[0];
      router.push(`/demo/notes#daily-${today}`);
    },
    onSearch: () => {
      setCommandPaletteInitialValue("");
      setShowCommandPalette(true);
    },
    onEscape: () => {
      if (showCommandPalette) {
        setShowCommandPalette(false);
      } else if (showCreateNoteModal) {
        setShowCreateNoteModal(false);
      } else if (showCreateCardModal) {
        setShowCreateCardModal(false);
      } else if (showKeyboardShortcuts) {
        setShowKeyboardShortcuts(false);
      } else if (isPanelOpen) {
        closePanel();
      } else if (isLeftOpen) {
        closeLeft();
      }
    },
    onHelp: () => setShowKeyboardShortcuts(true),
    enableNavigation: true,
  });

  const handleCreateNote = async (data: { type: string; title: string; content?: string }) => {
    setShowCreateNoteModal(false);
    await addCard({
      type: data.type as 'md-note' | 'text-note',
      title: data.title,
      content: data.content || "",
      url: "",
    });
  };

  return (
    <SelectionStoreProvider>
      <PawkitActionsProvider>
        <SidebarProvider>
          <SidebarInset className="bg-transparent">
            {/* Mobile-only OmniBar */}
            <div className="sticky top-0 z-30 lg:hidden border-b border-white/10 bg-surface-80/95 backdrop-blur-xl">
              <div className="px-4 py-3">
                <OmniBar />
              </div>
            </div>

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
            username="demo@pawkit.app"
            displayName="Demo User"
            collections={collections}
          />

          {/* Global Control Panel (Right) */}
          <ControlPanel
            open={isPanelOpen}
            onClose={closePanel}
            mode={panelMode}
            onModeChange={setPanelMode}
            embedded={isRightPanelEmbedded}
            username="demo@pawkit.app"
            displayName="Demo User"
          >
            <div
              className={`${animatingContentType === "card-details" ? "relative h-full" : ""} transition-all duration-300 ${
                isTransitioning ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
              }`}
            >
              {animatingContentType === "library-controls" && <LibraryControls />}
              {animatingContentType === "card-details" && <CardDetailsPanel />}
              {animatingContentType === "notes-controls" && (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">Notes controls coming soon...</p>
                </div>
              )}
              {animatingContentType === "calendar-controls" && (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">Calendar controls coming soon...</p>
                </div>
              )}
            </div>
          </ControlPanel>

          {/* Fixed Exit Demo Button - Bottom Left - Above all panels */}
          <div className="fixed bottom-6 left-6 z-[200]">
            <Link href="/">
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#7c3aed] to-[#a36bff] hover:from-[#6d2fd9] hover:to-[#9356ef] text-white shadow-2xl hover:shadow-xl transition-all rounded-xl"
              >
                <LogOut className="mr-2 h-5 w-5" />
                Exit Demo
              </Button>
            </Link>
          </div>
        </SidebarProvider>
      </PawkitActionsProvider>
    </SelectionStoreProvider>
  );
}
