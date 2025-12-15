"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
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
      className="rounded-xl p-5 h-full flex flex-col"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
        borderTopColor: 'var(--border-highlight-top)',
        borderLeftColor: 'var(--border-highlight-left)',
      }}
    >
      <h2 className="font-semibold text-foreground mb-4">Pinned Pawkits</h2>

      {/* Vertical list of pawkits */}
      <div className="flex flex-col gap-2 flex-1">
        {pawkits.map((pawkit) => (
          <button
            key={pawkit.id}
            onClick={() => router.push(`/pawkits/${pawkit.slug}`)}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-soft/50 hover:bg-surface-soft border border-transparent hover:border-accent/30 transition-all"
          >
            {/* Colored icon with initial */}
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0"
              style={{
                backgroundColor: `var(--ds-accent)20`,
                color: 'var(--ds-accent)'
              }}
            >
              {pawkit.name.charAt(0).toUpperCase()}
            </div>

            {/* Name and count */}
            <div className="text-left flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors truncate">
                {pawkit.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {pawkit.count} item{pawkit.count === 1 ? '' : 's'}
              </p>
            </div>

            <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-accent transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* Manage link at bottom */}
      <Link
        href="/pawkits"
        className="mt-4 text-xs text-muted-foreground hover:text-accent transition-colors flex items-center justify-center gap-1 py-2"
      >
        Manage Pawkits <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
