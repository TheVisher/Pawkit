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
      className="rounded-xl p-3 h-full flex flex-col"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
        borderTopColor: 'var(--border-highlight-top)',
        borderLeftColor: 'var(--border-highlight-left)',
      }}
    >
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="font-semibold text-sm text-foreground">Pinned Pawkits</h2>
        <Link
          href="/pawkits"
          className="text-[10px] text-muted-foreground hover:text-accent transition-colors flex items-center gap-0.5"
        >
          Manage <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Compact vertical list of pawkit cards */}
      <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-hidden">
        {pawkits.slice(0, 3).map((pawkit) => (
          <button
            key={pawkit.id}
            onClick={() => router.push(`/pawkits/${pawkit.slug}`)}
            className="group flex items-center gap-3 p-2 rounded-lg border border-accent/20 bg-surface/60 hover:border-accent/40 hover:bg-surface transition-all h-[72px] shrink-0"
          >
            {/* Left: Icon + Name + Count */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                <Folder size={14} className="text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate group-hover:text-accent transition-colors">
                  {pawkit.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {pawkit.count} item{pawkit.count === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {/* Right: Stacked thumbnails */}
            <div className="relative w-16 h-12 shrink-0">
              {pawkit.previewItems.slice(0, 2).map((item, index) => (
                <div
                  key={item.id}
                  className="absolute w-10 h-10 rounded overflow-hidden border border-subtle bg-surface shadow-sm"
                  style={{
                    right: index * 14,
                    top: index * 2,
                    zIndex: 2 - index,
                    transform: `rotate(${index * 4 - 2}deg)`,
                  }}
                >
                  {item.image ? (
                    <img src={item.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-surface-soft flex items-center justify-center text-[8px] text-muted-foreground">
                      {(item.title || "").slice(0, 4)}
                    </div>
                  )}
                </div>
              ))}
              {pawkit.previewItems.length === 0 && (
                <div className="w-10 h-10 rounded bg-surface-soft/50 border border-dashed border-subtle flex items-center justify-center">
                  <Folder size={12} className="text-muted-foreground/50" />
                </div>
              )}
            </div>

            <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-accent shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
