"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Folder, FileText } from "lucide-react";
import { PinnedPawkit } from "../hooks/use-home-data";

interface PinnedPawkitsProps {
  pawkits: PinnedPawkit[];
}

// Preview positions - use percentages to spread across card width
const previewPositions = [
  { left: '0%', top: 0, rotate: -6, zIndex: 6 },
  { left: '12%', top: 6, rotate: 3, zIndex: 5 },
  { left: '24%', top: 2, rotate: -3, zIndex: 4 },
  { left: '36%', top: 8, rotate: 5, zIndex: 3 },
  { left: '48%', top: 4, rotate: -2, zIndex: 2 },
  { left: '60%', top: 10, rotate: 4, zIndex: 1 },
];

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

            {/* Thumbnail previews - stacked/fanned */}
            <div className="relative h-20 mt-1">
              {pawkit.previewItems.slice(0, 6).map((item, i) => {
                const pos = previewPositions[i];
                return (
                  <div
                    key={item.id}
                    className="absolute rounded-lg overflow-hidden border border-subtle/50 shadow-md transition-transform group-hover:scale-105"
                    style={{
                      width: '54px',
                      height: '54px',
                      left: pos.left,
                      top: `${pos.top}px`,
                      zIndex: pos.zIndex,
                      transform: `rotate(${pos.rotate}deg)`,
                    }}
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
                );
              })}

              {/* +N more indicator - inline at end of stack */}
              {pawkit.count > pawkit.previewItems.length && (
                <div
                  className="absolute rounded-lg bg-surface-soft/90 border border-subtle/50 flex items-center justify-center text-xs font-medium text-muted-foreground shadow-md"
                  style={{
                    width: '54px',
                    height: '54px',
                    left: `${12 * pawkit.previewItems.length}%`,
                    top: `${(pawkit.previewItems.length % 2) * 6 + 4}px`,
                    zIndex: 0,
                    transform: `rotate(${pawkit.previewItems.length % 2 === 0 ? -3 : 3}deg)`,
                  }}
                >
                  +{pawkit.count - pawkit.previewItems.length}
                </div>
              )}

              {/* Empty state */}
              {pawkit.previewItems.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg border border-dashed border-subtle bg-surface-soft/60 text-[10px] text-muted-foreground">
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
