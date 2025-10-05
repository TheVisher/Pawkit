"use client";

import { ReactNode, useEffect } from "react";
import useSWR from "swr";
import { OmniBar } from "@/components/omni-bar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { SelectionStoreProvider } from "@/lib/hooks/selection-store";
import { useDataStore } from "@/lib/stores/data-store";
import { useNetworkSync } from "@/lib/hooks/use-network-sync";
import { ConflictNotifications } from "@/components/conflict-notifications";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { data: userData } = useSWR<{ email: string; displayName?: string | null }>("/api/user");
  const { collections, initialize, isInitialized } = useDataStore();

  // Initialize data store on mount
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Network sync hook handles queue draining on reconnection + periodic retries
  useNetworkSync();

  const username = userData?.email || "";
  const displayName = userData?.displayName || null;

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
