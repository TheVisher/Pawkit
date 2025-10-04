import { ReactNode } from "react";
import { OmniBar } from "@/components/omni-bar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { SelectionStoreProvider } from "@/lib/hooks/selection-store";
import { listCollections } from "@/lib/server/collections";
import { requireUser } from "@/lib/auth/get-user";

// Force dynamic rendering because we use authentication (cookies)
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const { tree } = await listCollections(user.id);

  return (
    <SelectionStoreProvider>
      <SidebarProvider>
        <AppSidebar username={user.email} collections={tree} />
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
      </SidebarProvider>
    </SelectionStoreProvider>
  );
}
