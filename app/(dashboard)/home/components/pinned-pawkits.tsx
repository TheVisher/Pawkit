"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Folder } from "lucide-react";
import { PinnedPawkit } from "../hooks/use-home-data";

interface PinnedPawkitsProps {
  pawkits: PinnedPawkit[];
}

// Preview tile positions for the fanned stack effect
const previewPositions = [
  "bottom-2 left-4 -rotate-6",
  "bottom-3 right-4 rotate-4",
  "bottom-1 left-1/2 -translate-x-1/2 rotate-2"
];

export function PinnedPawkits({ pawkits }: PinnedPawkitsProps) {
  const router = useRouter();

  if (pawkits.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-xl p-4 h-full flex flex-col min-h-0"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
        borderTopColor: 'var(--border-highlight-top)',
        borderLeftColor: 'var(--border-highlight-left)',
      }}
    >
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="font-semibold text-foreground">Pinned Pawkits</h2>
        <Link
          href="/pawkits"
          className="text-xs text-muted-foreground hover:text-accent transition-colors flex items-center gap-0.5"
        >
          Manage <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Grid of Pawkit cards - styled like /pawkits page */}
      <div className="grid grid-cols-1 gap-3 flex-1 min-h-0 overflow-hidden">
        {pawkits.slice(0, 3).map((pawkit) => (
          <button
            key={pawkit.id}
            onClick={() => router.push(`/pawkits/${pawkit.slug}`)}
            className="card-hover group relative flex flex-1 min-h-0 cursor-pointer flex-col overflow-visible rounded-xl border-2 border-accent/30 bg-surface/80 p-3 text-left transition-all hover:border-accent/50"
          >
            {/* Header: Icon, Name, Count */}
            <div className="relative z-10 flex items-center justify-between pb-2 text-sm shrink-0">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20">
                  <Folder size={14} className="text-accent" />
                </span>
                <span className="truncate">{pawkit.name}</span>
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {pawkit.count} item{pawkit.count === 1 ? "" : "s"}
              </span>
            </div>

            {/* Fanned preview thumbnails */}
            <div className="relative flex-1 min-h-0 overflow-hidden">
              {pawkit.previewItems.slice(0, 3).map((item, index) => (
                <div
                  key={item.id}
                  className={`absolute flex w-16 flex-col overflow-hidden rounded-lg border border-subtle bg-surface shadow-lg transition group-hover:scale-105 ${previewPositions[index]}`}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      className="h-12 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-12 items-center justify-center bg-surface-soft text-[10px] text-muted-foreground">
                      {(item.title || "").slice(0, 10)}
                    </div>
                  )}
                </div>
              ))}
              {pawkit.previewItems.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg border border-dashed border-subtle bg-surface-soft/60 text-xs text-muted-foreground">
                  Empty
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
