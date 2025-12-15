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
    <div className="rounded-xl border border-subtle bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-foreground">Pinned Pawkits</h2>
        <Link
          href="/pawkits"
          className="text-xs text-muted-foreground hover:text-accent transition-colors flex items-center gap-0.5"
        >
          Manage shortcuts <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {pawkits.map((pawkit) => (
          <button
            key={pawkit.id}
            onClick={() => router.push(`/pawkits/${pawkit.slug}`)}
            className="group bg-surface-soft rounded-xl p-3 text-left hover:bg-surface border border-transparent hover:border-accent/20 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
                  style={{
                    backgroundColor: `var(--ds-accent)25`,
                    color: 'var(--ds-accent)'
                  }}
                >
                  {pawkit.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-medium text-sm text-foreground group-hover:text-accent transition-colors">
                    {pawkit.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    {pawkit.count} item{pawkit.count === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            </div>

            {/* Thumbnail previews */}
            <div className="flex gap-1.5">
              {pawkit.previewItems.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  className="w-12 h-12 rounded-lg overflow-hidden bg-surface"
                >
                  <img
                    src={item.image!}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
              {pawkit.count > 2 && (
                <div className="w-12 h-12 rounded-lg bg-surface-soft/50 flex items-center justify-center text-[10px] text-muted-foreground">
                  +{pawkit.count - 2}
                </div>
              )}
              {pawkit.previewItems.length === 0 && (
                <div className="w-12 h-12 rounded-lg bg-surface-soft/50 flex items-center justify-center">
                  <Folder className="w-5 h-5 text-muted-foreground/50" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
