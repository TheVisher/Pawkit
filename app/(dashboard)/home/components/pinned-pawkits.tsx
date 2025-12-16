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
    <div className="h-full flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-2 shrink-0">
        <h2 className="font-medium text-sm text-foreground">Pinned Pawkits</h2>
        <Link
          href="/pawkits"
          className="text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          Manage
        </Link>
      </div>

      {/* Cards that fill available space equally */}
      <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
        {pawkits.slice(0, 3).map((pawkit) => (
          <button
            key={pawkit.id}
            onClick={() => router.push(`/pawkits/${pawkit.slug}`)}
            className="flex-1 min-h-0 w-full text-left rounded-xl p-3 transition-all hover:border-accent/30 flex flex-col"
            style={{
              background: 'var(--bg-surface-2)',
              boxShadow: 'var(--shadow-2)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {/* Header: Icon + Name + Count */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-medium text-xs">
                {pawkit.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{pawkit.name}</p>
                <p className="text-[10px] text-muted-foreground">{pawkit.count} item{pawkit.count === 1 ? "" : "s"}</p>
              </div>
            </div>

            {/* Thumbnail stack */}
            <div className="flex gap-1.5 mt-2 flex-1 min-h-0 items-end">
              {pawkit.previewItems.slice(0, 3).map((item) => (
                <div key={item.id} className="w-10 h-10 rounded-md bg-surface-soft overflow-hidden shrink-0">
                  {item.image ? (
                    <img src={item.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground">
                      {(item.title || "").slice(0, 3)}
                    </div>
                  )}
                </div>
              ))}
              {pawkit.count > 3 && (
                <div className="w-10 h-10 rounded-md bg-surface-soft/50 flex items-center justify-center text-[10px] text-muted-foreground shrink-0">
                  +{pawkit.count - 3}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
