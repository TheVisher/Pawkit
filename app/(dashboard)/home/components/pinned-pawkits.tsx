"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Folder, FileText } from "lucide-react";
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
    <div className="flex flex-col min-h-0 overflow-hidden">
      <div className="flex justify-between items-center mb-3 shrink-0">
        <h2 className="font-medium text-sm text-foreground">Pinned Pawkits</h2>
        <Link
          href="/pawkits"
          className="text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          Manage
        </Link>
      </div>

      {/* 2-column grid of portrait cards */}
      <div className="grid grid-cols-2 gap-3 overflow-y-auto auto-rows-max">
        {pawkits.slice(0, 4).map((pawkit) => (
          <button
            key={pawkit.id}
            onClick={() => router.push(`/pawkits/${pawkit.slug}`)}
            className="group w-full text-left rounded-xl p-3 transition-all hover:border-accent/30 flex flex-col border-2 border-accent/20 bg-surface/80"
          >
            {/* Header row: icon, name, count */}
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Folder size={14} className="text-accent" />
                </div>
                <span className="font-medium text-xs text-foreground truncate">{pawkit.name}</span>
              </div>
              <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">
                {pawkit.count}
              </span>
            </div>

            {/* Thumbnail grid - 3 columns, up to 2 rows */}
            <div className="grid grid-cols-3 gap-1.5 mt-1">
              {pawkit.previewItems.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="aspect-square rounded-md overflow-hidden border border-subtle/50 shadow-sm transition-transform group-hover:scale-105"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-surface-soft flex items-center justify-center">
                      <FileText size={12} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {/* +N more indicator - only if more than 6 items */}
              {pawkit.count > 6 && pawkit.previewItems.length >= 6 && (
                <div className="aspect-square rounded-md bg-surface-soft/80 border border-subtle/50 flex items-center justify-center text-[10px] text-muted-foreground">
                  +{pawkit.count - 6}
                </div>
              )}

              {/* Fill empty slots with placeholders if less than 3 items */}
              {pawkit.previewItems.length > 0 && pawkit.previewItems.length < 3 && (
                Array.from({ length: 3 - pawkit.previewItems.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="aspect-square rounded-md bg-surface-soft/40 border border-dashed border-subtle/30"
                  />
                ))
              )}
            </div>

            {/* Empty state */}
            {pawkit.previewItems.length === 0 && (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-subtle bg-surface-soft/60 text-[10px] text-muted-foreground h-16">
                Empty
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
