import { ReactNode } from "react";
import { OmniBar } from "@/components/omni-bar";
import { ResizableSidebar } from "@/components/sidebar/resizable-sidebar";
import { SelectionStoreProvider } from "@/lib/hooks/selection-store";

const USERNAME = "Casey Light";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SelectionStoreProvider>
      <div className="flex min-h-screen bg-gray-950 text-gray-100">
        <ResizableSidebar username={USERNAME} />
        <div className="flex flex-1 flex-col">
          <header className="border-b border-gray-800">
            <div className="mx-auto max-w-6xl px-6 py-4">
              <OmniBar />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
          </main>
        </div>
      </div>
    </SelectionStoreProvider>
  );
}
