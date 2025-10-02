import { ReactNode } from "react";
import Link from "next/link";
import { OmniBar } from "@/components/omni-bar";
import { SelectionStoreProvider } from "@/lib/hooks/selection-store";

const navLinks = [
  { href: "/home", label: "Home" },
  { href: "/library", label: "Library" },
  { href: "/settings", label: "Settings" }
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SelectionStoreProvider>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <header className="border-b border-gray-800">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4">
            <Link href="/home" className="text-lg font-semibold">
              Visual Bookmark Manager
            </Link>
            <nav className="ml-auto flex items-center gap-4 text-sm text-gray-400">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-gray-100">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="border-t border-gray-800">
            <div className="mx-auto max-w-6xl px-4 py-4">
              <OmniBar />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    </SelectionStoreProvider>
  );
}
