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
  layout?: "grid" | "list" | "compact";
};

const previewPositions = [
  "bottom-2 left-8 -rotate-6",
  "bottom-4 right-8 rotate-4",
  "bottom-1 left-1/2 -translate-x-1/2 rotate-2"
];

export function CollectionsGrid({ collections, allPawkits = [], layout = "grid" }: CollectionsGridProps) {
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

  // List View - Data Table
  if (layout === "list") {
    return (
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-subtle text-xs text-muted-foreground">
              <th className="text-left py-3 px-4 font-medium">Name</th>
              <th className="text-left py-3 px-4 font-medium">Items</th>
              <th className="text-left py-3 px-4 font-medium">Sub-Pawkits</th>
              <th className="text-left py-3 px-4 font-medium">Type</th>
              <th className="text-left py-3 px-4 font-medium w-16"></th>
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => (
              <tr
                key={collection.id}
                onClick={() => {
                  if (collection.slug) {
                    router.push(`/pawkits/${collection.slug}`);
                  } else {
                    router.push(`/library`);
                  }
                }}
                className={`border-b border-subtle hover:bg-white/5 cursor-pointer transition-colors ${
                  collection.isSystem ? 'bg-purple-950/10' : ''
                }`}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center justify-center h-8 w-8 rounded-lg backdrop-blur-sm ${
                      collection.isSystem
                        ? 'bg-purple-500/30 text-purple-300'
                        : 'bg-accent/20 text-accent'
                    }`}>
                      {collection.isSystem ? <Inbox size={16} /> : collection.isPrivate ? '🔒' : '📁'}
                    </span>
                    <span className="text-sm text-foreground font-medium">{collection.name}</span>
                    {collection.isPinned && <span className="text-xs text-purple-400">⭐</span>}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-muted-foreground">
                    {collection.count} item{collection.count === 1 ? "" : "s"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-muted-foreground">
                    {collection.hasChildren ? "Yes" : "-"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-xs text-muted-foreground">
                    {collection.isSystem ? "System" : collection.isPrivate ? "Private" : "Pawkit"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {collection.slug && !collection.isSystem && (
                    <div onClick={(e) => e.stopPropagation()} className="relative z-50">
                      <PawkitActions
                        pawkitId={collection.id}
                        pawkitName={collection.name}
                        isPinned={collection.isPinned}
                        isPrivate={collection.isPrivate}
                        allPawkits={allPawkits}
                      />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Compact View - Dense Grid (No Previews)
  if (layout === "compact") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
            className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border cursor-pointer transition-all hover:scale-105 ${
              collection.isSystem
                ? 'border-purple-500/50 bg-purple-950/20 hover:bg-purple-950/30'
                : 'border-purple-500/30 bg-surface/80 hover:bg-surface'
            }`}
          >
            {/* Icon */}
            <span className={`flex items-center justify-center h-12 w-12 rounded-lg backdrop-blur-sm ${
              collection.isSystem
                ? 'bg-purple-500/30 text-purple-300'
                : 'bg-accent/20 text-accent'
            }`}>
              {collection.isSystem ? <Inbox size={24} /> : collection.isPrivate ? '🔒' : '📁'}
            </span>

            {/* Name */}
            <div className="text-center w-full">
              <div className="text-sm font-semibold text-foreground truncate">
                {collection.name}
              </div>

              {/* Item count badge */}
              <div className="text-xs text-muted-foreground mt-1">
                {collection.count} {collection.count === 1 ? "item" : "items"}
              </div>
            </div>

            {/* Actions menu - show on hover */}
            {collection.slug && !collection.isSystem && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-50"
              >
                <PawkitActions
                  pawkitId={collection.id}
                  pawkitName={collection.name}
                  isPinned={collection.isPinned}
                  isPrivate={collection.isPrivate}
                  allPawkits={allPawkits}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Grid view (default)
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
