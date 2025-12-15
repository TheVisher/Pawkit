"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-medium text-sm text-foreground">Pinned Pawkits</h2>
        <Link
          href="/pawkits"
          className="text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          Manage
        </Link>
      </div>

      {/* Styled cards like /pawkits page */}
      <div className="space-y-3">
        {pawkits.slice(0, 3).map((pawkit) => (
          <button
            key={pawkit.id}
            onClick={() => router.push(`/pawkits/${pawkit.slug}`)}
            className="w-full text-left rounded-xl p-4 transition-all hover:border-accent/30"
            style={{
              background: 'var(--bg-surface-2)',
              boxShadow: 'var(--shadow-2)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {/* Header: Icon + Name + Count */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-medium text-sm">
                {pawkit.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{pawkit.name}</p>
                <p className="text-xs text-muted-foreground">{pawkit.count} item{pawkit.count === 1 ? "" : "s"}</p>
              </div>
            </div>

            {/* Thumbnail stack */}
            <div className="flex gap-2">
              {pawkit.previewItems.slice(0, 2).map((item) => (
                <div key={item.id} className="w-12 h-12 rounded-lg bg-surface-soft overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground">
                      {(item.title || "").slice(0, 4)}
                    </div>
                  )}
                </div>
              ))}
              {pawkit.count > 2 && (
                <div className="w-12 h-12 rounded-lg bg-surface-soft/50 flex items-center justify-center text-xs text-muted-foreground">
                  +{pawkit.count - 2}
                </div>
              )}
              {pawkit.previewItems.length === 0 && (
                <div className="w-12 h-12 rounded-lg bg-surface-soft/50 flex items-center justify-center text-xs text-muted-foreground">
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
