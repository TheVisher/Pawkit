"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Folder } from "lucide-react";
import { PinnedPawkit } from "../hooks/use-home-data";

interface PinnedPawkitsProps {
  pawkits: PinnedPawkit[];
}

export function PinnedPawkits({ pawkits }: PinnedPawkitsProps) {
  const router = useRouter();

  if (pawkits.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
        borderTopColor: 'var(--border-highlight-top)',
        borderLeftColor: 'var(--border-highlight-left)',
      }}
    >
      <h2 className="font-semibold text-sm text-foreground mb-3">Pinned Pawkits</h2>

      {/* Compact vertical list */}
      <div className="space-y-2">
        {pawkits.slice(0, 5).map((pawkit) => (
          <button
            key={pawkit.id}
            onClick={() => router.push(`/pawkits/${pawkit.slug}`)}
            className="group w-full flex items-center gap-2 p-2 rounded-lg hover:bg-surface-soft transition-colors"
          >
            <div className="w-7 h-7 rounded-md bg-accent/20 flex items-center justify-center shrink-0">
              <Folder size={14} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-foreground truncate group-hover:text-accent transition-colors">
                {pawkit.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {pawkit.count} item{pawkit.count === 1 ? "" : "s"}
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-accent shrink-0" />
          </button>
        ))}
      </div>

      {/* Manage link */}
      <Link
        href="/pawkits"
        className="mt-3 block text-center text-[10px] text-muted-foreground hover:text-accent transition-colors"
      >
        Manage Pawkits
      </Link>
    </div>
  );
}
