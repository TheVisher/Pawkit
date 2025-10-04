import { ReactNode } from "react";
import { OmniBar } from "@/components/omni-bar";
import { ResizableSidebar } from "@/components/sidebar/resizable-sidebar";
import { SelectionStoreProvider } from "@/lib/hooks/selection-store";
import { DEFAULT_USERNAME } from "@/lib/constants";
import { listCollections } from "@/lib/server/collections";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { tree } = await listCollections();

  return (
    <SelectionStoreProvider>
      <div className="flex h-screen overflow-hidden text-foreground">
        <ResizableSidebar username={DEFAULT_USERNAME} collections={tree} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-20 border-b border-subtle bg-surface-90 backdrop-blur-xl">
            <div className="mx-auto max-w-6xl px-6 py-4">
              <OmniBar />
            </div>
          </header>
          <main className="flex flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SelectionStoreProvider>
  );
}
