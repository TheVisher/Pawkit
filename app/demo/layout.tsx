"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { OmniBar } from "@/components/omni-bar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { SelectionStoreProvider } from "@/lib/hooks/selection-store";
import { useDemoAwareStore } from "@/lib/hooks/use-demo-aware-store";
import { Button } from "@/components/ui/button";

export default function DemoLayout({ children }: { children: ReactNode }) {
  const { collections, initialize, isInitialized } = useDemoAwareStore();

  // Initialize demo data on mount
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  return (
    <SelectionStoreProvider>
      <SidebarProvider>
        <AppSidebar username="demo@pawkit.app" displayName="Demo User" collections={collections} />
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
              {/* Demo Banner */}
              <div className="mb-6 rounded-lg border-2 border-[#6d5cff] bg-gradient-to-r from-[#6d5cff]/10 to-[#a36bff]/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[#6d5cff]">Demo Mode</h2>
                    <p className="text-sm text-zinc-400">
                      You&apos;re exploring Pawkit in demo mode. Try adding cards, creating Pawkits, and organizing your bookmarks!
                    </p>
                  </div>
                  <Link href="/">
                    <Button
                      variant="outline"
                      className="border-[#6d5cff] text-[#6d5cff] hover:bg-[#6d5cff] hover:text-white"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Exit Demo
                    </Button>
                  </Link>
                </div>
              </div>
              {children}
            </div>
          </main>
        </SidebarInset>

        {/* Fixed Exit Demo Button - Lower Left */}
        <div className="fixed bottom-6 left-6 z-50">
          <Link href="/">
            <Button
              size="lg"
              className="bg-gradient-to-r from-[#6d5cff] to-[#a36bff] hover:from-[#5d4cef] hover:to-[#9361ef] text-white shadow-2xl hover:shadow-xl transition-all"
            >
              <LogOut className="mr-2 h-5 w-5" />
              Exit Demo
            </Button>
          </Link>
        </div>
      </SidebarProvider>
    </SelectionStoreProvider>
  );
}
