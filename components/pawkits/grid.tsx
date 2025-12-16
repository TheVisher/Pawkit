"use client";

import { useRouter } from "next/navigation";
import { PawkitActions } from "./pawkit-actions";
import { useViewSettingsStore } from "@/lib/hooks/view-settings-store";
import { useMemo } from "react";
import { Inbox, Pin, Folder, KanbanSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { MuuriGridComponent, MuuriItem } from "@/components/library/muuri-grid";
import { isBoard } from "@/lib/types/board";

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
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
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
  layout?: "grid" | "list";
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

  // Calculate pawkit widths based on size slider (1-100)
  // Both min and max scale together (like Library grid) to prevent jumpy repositioning
  // 1 = 180px min, 100 = 400px min
  const minPawkitWidth = useMemo(() => {
    return Math.round(180 + ((pawkitSize - 1) / 99) * 220);
  }, [pawkitSize]);

  // Max is always 1.5x min, capped at 600px (same pattern as Library)
  const maxPawkitWidth = Math.min(minPawkitWidth * 1.5, 600);

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
              <th className="text-left py-3 px-4 font-medium">Date Created</th>
              <th className="text-left py-3 px-4 font-medium">Date Modified</th>
              <th className="text-left py-3 px-4 font-medium w-16"></th>
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => {
              const formattedCreatedAt = collection.createdAt
                ? new Date(collection.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : "-";

              const formattedUpdatedAt = collection.updatedAt
                ? formatDistanceToNow(new Date(collection.updatedAt), { addSuffix: true })
                : "-";

              return (
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
                    collection.isSystem ? 'bg-accent/10' : ''
                  }`}
                >
                  <td className="py-3 px-4 max-w-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`flex items-center justify-center h-8 w-8 rounded-lg backdrop-blur-sm flex-shrink-0 ${
                        collection.isSystem
                          ? 'bg-accent/30 text-accent'
                          : 'bg-accent/20 text-accent'
                      }`}>
                        {collection.isSystem ? (
                          <Inbox size={16} />
                        ) : collection.isPrivate ? (
                          '🔒'
                        ) : isBoard(collection) ? (
                          <KanbanSquare size={16} className="text-purple-400" />
                        ) : (
                          <Folder size={16} className="text-accent" />
                        )}
                      </span>
                      <span className="text-sm text-foreground font-medium truncate min-w-0 flex-1">{collection.name}</span>
                      {collection.isPinned && <Pin size={14} className="text-accent flex-shrink-0" />}
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
                    <span className="text-sm text-muted-foreground">{formattedCreatedAt}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-muted-foreground">{formattedUpdatedAt}</span>
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
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Grid view (default) - Muuri-powered with drag-and-drop
  // Fixed height of 224px (h-56 = 14rem = 224px)
  const cardHeight = 224;
  const cardSpacing = 24; // gap-6 = 24px

  return (
    <MuuriGridComponent
      className="w-full"
      style={{ minHeight: 200 }}
      itemCount={collections.length}
      cardIds={collections.map(c => c.id).join(',')}
      minItemWidth={minPawkitWidth}
      edgePadding={0}
      fillGaps={false}
      dragEnabled={true}
      dragHandle=".muuri-item-content"
      layoutDuration={300}
      layoutEasing="ease-out"
      onDragStart={() => {
        document.body.classList.add('muuri-dragging');
      }}
      onDragEnd={() => {
        document.body.classList.remove('muuri-dragging');
      }}
      onOrderChange={(newOrder) => {
        // TODO: Save pawkit order to backend when implemented
        console.log('New pawkit order:', newOrder);
      }}
    >
      {(calculatedWidth: number) => (
        <>
          {collections.map((collection) => (
            <MuuriItem
              key={collection.id}
              cardId={collection.id}
              width={calculatedWidth}
              spacing={cardSpacing}
              height={cardHeight + cardSpacing}
            >
              <div
                onClick={() => {
                  if (collection.slug) {
                    router.push(`/pawkits/${collection.slug}`);
                  } else {
                    router.push(`/library`);
                  }
                }}
                className={`card-hover group relative flex h-56 cursor-pointer flex-col overflow-visible rounded-2xl border-2 p-5 text-left ${
                  collection.isSystem
                    ? 'border-accent/50 bg-accent/20'
                    : 'border-accent/30 bg-surface/80'
                }`}
                style={{
                  ...(collection.isSystem ? {
                    boxShadow: '0 0 20px hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.15)'
                  } : {}),
                  ...(collection.useCoverAsBackground && collection.coverImage
                    ? {
                        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.85)), url(${collection.coverImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : {})
                }}
              >
                <div className={`relative z-10 flex items-center justify-between pb-4 text-sm ${collection.useCoverAsBackground && collection.coverImage ? 'backdrop-blur-md bg-black/60 -mx-5 -mt-5 px-5 pt-5 rounded-t-2xl' : ''}`}>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg backdrop-blur-sm ${
                      collection.isSystem
                        ? 'bg-accent/30 text-accent'
                        : 'bg-accent/20 text-accent'
                    }`}>
                      {collection.isSystem ? (
                        <Inbox size={16} />
                      ) : collection.isPrivate ? (
                        '🔒'
                      ) : isBoard(collection) ? (
                        <KanbanSquare size={16} className="text-purple-400" />
                      ) : (
                        <Folder size={16} className="text-accent" />
                      )}
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
            </MuuriItem>
          ))}
        </>
      )}
    </MuuriGridComponent>
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
