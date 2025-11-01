"use client";

import { useRouter } from "next/navigation";
import { PawkitActions } from "./pawkit-actions";
import { useViewSettingsStore } from "@/lib/hooks/view-settings-store";
import { useMemo } from "react";
import { Inbox } from "lucide-react";

type CollectionPreviewCard = {
  id: string;
  name: string;
  slug: string | null;
  count: number;
  hasChildren?: boolean;
  isPinned?: boolean;
  isPrivate?: boolean;
  isSystem?: boolean;
  hidePreview?: boolean;
  useCoverAsBackground?: boolean;
  coverImage?: string | null;
  cards: Array<{
    id: string;
    title?: string | null;
    url: string;
    image?: string | null;
    domain?: string | null;
  }>;
};

type CollectionsGridProps = {
  collections: CollectionPreviewCard[];
  allPawkits?: Array<{ id: string; name: string; slug: string }>;
};

const previewPositions = [
  "bottom-2 left-8 -rotate-6",
  "bottom-4 right-8 rotate-4",
  "bottom-1 left-1/2 -translate-x-1/2 rotate-2"
];

export function CollectionsGrid({ collections, allPawkits = [] }: CollectionsGridProps) {
  const router = useRouter();

  // Get pawkit size from view settings
  const viewSettings = useViewSettingsStore((state) => state.getSettings("pawkits"));
  const pawkitSize = viewSettings.cardSize || 50;

  // Calculate minimum pawkit width based on size slider (1-100)
  // 1 = 250px (smallest), 100 = 600px (largest)
  const minPawkitWidth = useMemo(() => {
    return Math.round(250 + ((pawkitSize - 1) / 99) * 350);
  }, [pawkitSize]);

  if (!collections.length) {
    return (
      <div className="rounded-2xl border border-subtle bg-surface/60 p-12 text-center text-sm text-muted-foreground">
        No collections yet. Create one to get started.
      </div>
    );
  }

  return (
    <div
      className="grid gap-6"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${minPawkitWidth}px, 1fr))`
      }}
    >
      {collections.map((collection) => (
        <div
          key={collection.id}
          onClick={() => {
            if (collection.slug) {
              router.push(`/pawkits/${collection.slug}`);
            } else {
              router.push(`/library`);
            }
          }}
          className={`card-hover group relative flex h-56 cursor-pointer flex-col overflow-visible rounded-2xl border-2 p-5 text-left ${
            collection.isSystem
              ? 'border-purple-500/50 bg-purple-950/20 shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:shadow-[0_0_30px_rgba(168,85,247,0.25)]'
              : 'border-purple-500/30 bg-surface/80'
          }`}
          style={
            collection.useCoverAsBackground && collection.coverImage
              ? {
                  backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.85)), url(${collection.coverImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className={`relative z-10 flex items-center justify-between pb-4 text-sm ${collection.useCoverAsBackground && collection.coverImage ? 'backdrop-blur-md bg-black/60 -mx-5 -mt-5 px-5 pt-5 rounded-t-2xl' : ''}`}>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg backdrop-blur-sm ${
                collection.isSystem
                  ? 'bg-purple-500/30 text-purple-300'
                  : 'bg-accent/20 text-accent'
              }`}>
                {collection.isSystem ? <Inbox size={16} /> : collection.isPrivate ? '🔒' : '📁'}
              </span>
              <span className={collection.useCoverAsBackground && collection.coverImage ? 'text-white font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : ''}>
                {collection.name}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${collection.useCoverAsBackground && collection.coverImage ? 'text-white/90 font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-muted-foreground'}`}>
                {collection.count} item{collection.count === 1 ? "" : "s"}
              </span>
              {collection.slug && !collection.isSystem && (
                <div onClick={(e) => e.stopPropagation()} className="relative z-50">
                  <PawkitActions
                    pawkitId={collection.id}
                    pawkitName={collection.name}
                    isPinned={collection.isPinned}
                    isPrivate={collection.isPrivate}
                    hidePreview={collection.hidePreview}
                    useCoverAsBackground={collection.useCoverAsBackground}
                    hasChildren={collection.hasChildren}
                    allPawkits={allPawkits}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="relative h-full w-full overflow-hidden">
            {!collection.hidePreview && collection.cards.slice(0, 3).map((card, index) => (
              <PreviewTile key={card.id} card={card} positionClass={previewPositions[index] ?? "bottom-6 right-8 rotate-1"} />
            ))}
            {!collection.hidePreview && collection.cards.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-dashed border-subtle bg-surface-soft/60 text-xs text-muted-foreground">
                No previews yet
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

type PreviewTileProps = {
  card: CollectionPreviewCard["cards"][number];
  positionClass: string;
};

function PreviewTile({ card, positionClass }: PreviewTileProps) {
  const label = card.title || card.domain || card.url;

  return (
    <div
      className={`absolute flex w-28 flex-col overflow-hidden rounded-xl border border-subtle bg-surface shadow-xl transition group-hover:scale-105 ${positionClass}`}
    >
      {card.image ? (
        <img src={card.image} alt={label ?? "preview"} className="h-20 w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-20 items-center justify-center bg-surface-soft text-xs text-muted-foreground">
          {(label ?? "").slice(0, 18)}
        </div>
      )}
      <span className="px-3 py-2 text-[10px] text-muted-foreground truncate">{label}</span>
    </div>
  );
}
