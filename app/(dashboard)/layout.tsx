"use client";

import { ReactNode, useEffect, useState } from "react";
// Removed useSWR - using local-first data store instead
import { OmniBar } from "@/components/omni-bar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { SelectionStoreProvider } from "@/lib/hooks/selection-store";
import { useDataStore } from "@/lib/stores/data-store";
import { useNetworkSync } from "@/lib/hooks/use-network-sync";
import { useSyncSettings } from "@/lib/hooks/use-sync-settings";
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
import Link from "next/link";
import { HelpCircle, Keyboard } from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<{ email: string; displayName?: string | null } | null>(null);
  const { collections, initialize, isInitialized, refresh, addCard } = useDataStore();
  const { loadFromServer } = useViewSettingsStore();
  const router = useRouter();

  // Command Palette state
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const [showCreateCardModal, setShowCreateCardModal] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

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

  // Sync check on window focus (checks if another device made changes)
  useEffect(() => {
    const handleFocus = () => {
      if (isInitialized && document.visibilityState === 'visible') {
        // Optional: You can add a timestamp check here to avoid too frequent syncs
        // For now, just drain the queue when user returns to tab
        useDataStore.getState().drainQueue();
      }
    };

    window.addEventListener('visibilitychange', handleFocus);
    return () => window.removeEventListener('visibilitychange', handleFocus);
  }, [isInitialized]);

  // Network sync hook handles queue draining on reconnection + periodic retries
  useNetworkSync();

  // Sync settings hook ensures localStorage serverSync is synced to database
  useSyncSettings();

  const username = userData?.email || "";
  const displayName = userData?.displayName || null;

  // Manual sync - checks server for updates from other devices
  const handleManualSync = async () => {
    await refresh();
  };

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onCommandPalette: () => setShowCommandPalette(true),
    onNewNote: () => setShowCreateNoteModal(true),
    onNewCard: () => setShowCreateCardModal(true),
    onTodayNote: () => {
      // Navigate to today's note
      const today = new Date().toISOString().split('T')[0];
      router.push(`/notes#daily-${today}`);
    },
    onSearch: () => {
      // Focus the omnibar search input
      const searchInput = document.querySelector('input[placeholder*="search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    },
    onEscape: () => {
      // Close any open modals
      setShowCommandPalette(false);
      setShowCreateNoteModal(false);
      setShowCreateCardModal(false);
      setShowKeyboardShortcuts(false);
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

  return (
    <SelectionStoreProvider>
      <PawkitActionsProvider>
        <SidebarProvider>
          <AppSidebar username={username} displayName={displayName} collections={collections} />
          <SidebarInset className="bg-transparent">
            <header className="sticky top-0 z-20 border-b border-subtle bg-surface-90 backdrop-blur-xl">
              <div className="flex items-center gap-2 px-6 py-4">
                <SidebarTrigger className="mr-2" />
                <div className="mx-auto w-full max-w-6xl">
                  <OmniBar />
                </div>
                <div className="ml-2">
                  <ViewControls onRefresh={handleManualSync} />
                </div>
              </div>
            </header>
            <main className="flex flex-1 overflow-y-auto bg-transparent">
              <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8">
                {children}
              </div>
            </main>
          </SidebarInset>
          <ConflictNotifications />

          {/* Command Palette */}
          <CommandPalette
            open={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            onOpenCreateNote={() => {
              setShowCommandPalette(false);
              setShowCreateNoteModal(true);
            }}
            onOpenCreateCard={() => {
              setShowCommandPalette(false);
              setShowCreateCardModal(true);
            }}
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
        </SidebarProvider>
      </PawkitActionsProvider>
    </SelectionStoreProvider>
  );
}
