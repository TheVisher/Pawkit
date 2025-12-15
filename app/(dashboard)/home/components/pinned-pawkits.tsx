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
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-foreground">Pinned Pawkits</h2>
        <Link
          href="/pawkits"
          className="text-xs text-muted-foreground hover:text-accent transition-colors flex items-center gap-0.5"
        >
          Manage shortcuts <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {pawkits.map((pawkit) => (
          <button
            key={pawkit.id}
            onClick={() => router.push(`/pawkits/${pawkit.slug}`)}
            className="card-hover group relative flex h-40 cursor-pointer flex-col overflow-visible rounded-2xl border-2 border-accent/30 bg-surface/80 p-4 text-left transition-all hover:border-accent/50"
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-semibold"
                style={{
                  backgroundColor: `var(--ds-accent)25`,
                  color: 'var(--ds-accent)'
                }}
              >
                {pawkit.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-foreground group-hover:text-accent transition-colors truncate">
                  {pawkit.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {pawkit.count} item{pawkit.count === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {/* Thumbnail previews */}
            <div className="flex gap-2 mt-auto">
              {pawkit.previewItems.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="w-14 h-14 rounded-lg overflow-hidden bg-surface border border-subtle"
                >
                  <img
                    src={item.image!}
                    alt=""
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    loading="lazy"
                  />
                </div>
              ))}
              {pawkit.count > 3 && (
                <div className="w-14 h-14 rounded-lg bg-surface-soft/50 flex items-center justify-center text-xs text-muted-foreground border border-subtle">
                  +{pawkit.count - 3}
                </div>
              )}
              {pawkit.previewItems.length === 0 && (
                <div className="w-14 h-14 rounded-lg bg-surface-soft/50 flex items-center justify-center border border-subtle">
                  <Folder className="w-6 h-6 text-muted-foreground/50" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
