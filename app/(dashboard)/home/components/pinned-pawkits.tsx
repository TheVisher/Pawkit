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
      className="rounded-xl p-5"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
        borderTopColor: 'var(--border-highlight-top)',
        borderLeftColor: 'var(--border-highlight-left)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">Pinned Pawkits</h2>
        <Link
          href="/pawkits"
          className="text-xs text-muted-foreground hover:text-accent transition-colors flex items-center gap-0.5"
        >
          Manage <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Simplified compact row layout */}
      <div className="flex flex-wrap gap-3">
        {pawkits.map((pawkit) => (
          <button
            key={pawkit.id}
            onClick={() => router.push(`/pawkits/${pawkit.slug}`)}
            className="group flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-soft/50 hover:bg-surface-soft border border-transparent hover:border-accent/30 transition-all"
          >
            {/* Colored icon with initial */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0"
              style={{
                backgroundColor: `var(--ds-accent)20`,
                color: 'var(--ds-accent)'
              }}
            >
              {pawkit.name.charAt(0).toUpperCase()}
            </div>

            {/* Name and count */}
            <div className="text-left">
              <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                {pawkit.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {pawkit.count} item{pawkit.count === 1 ? '' : 's'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
