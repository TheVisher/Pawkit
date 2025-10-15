"use client";

import { ReactNode, useEffect, useState } from "react";
import useSWR from "swr";
import { RefreshCw } from "lucide-react";
import { OmniBar } from "@/components/omni-bar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { SelectionStoreProvider } from "@/lib/hooks/selection-store";
import { useDataStore } from "@/lib/stores/data-store";
import { useNetworkSync } from "@/lib/hooks/use-network-sync";
import { useSyncSettings } from "@/lib/hooks/use-sync-settings";
import { ConflictNotifications } from "@/components/conflict-notifications";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { data: userData } = useSWR<{ email: string; displayName?: string | null }>("/api/user");
  const { collections, initialize, isInitialized, refresh } = useDataStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize data store on mount - fetches from server ONCE
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

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

  // Manual sync button - checks server for updates from other devices
  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <SelectionStoreProvider>
      <SidebarProvider>
        <AppSidebar username={username} displayName={displayName} collections={collections} />
        <SidebarInset className="bg-transparent">
          <header className="sticky top-0 z-20 border-b border-subtle bg-surface-90 backdrop-blur-xl">
            <div className="flex items-center gap-2 px-6 py-4">
              <SidebarTrigger className="mr-2" />
              <div className="mx-auto w-full max-w-6xl">
                <OmniBar />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleManualSync}
                disabled={isRefreshing}
                title="Sync with server (check for updates from other devices)"
                className="ml-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </header>
          <main className="flex flex-1 overflow-y-auto bg-transparent">
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8">
              {children}
            </div>
          </main>
        </SidebarInset>
        <ConflictNotifications />
      </SidebarProvider>
    </SelectionStoreProvider>
  );
}
