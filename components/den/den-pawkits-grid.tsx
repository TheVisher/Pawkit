"use client";

import { useRouter } from "next/navigation";
import { DenPawkitActions } from "./den-pawkit-actions";

type CollectionPreviewCard = {
  id: string;
  name: string;
  slug: string | null;
  count: number;
  hasChildren?: boolean;
  isPinned?: boolean;
  cards: Array<{
    id: string;
    title?: string | null;
    url: string;
    image?: string | null;
    domain?: string | null;
  }>;
};

type DenPawkitsGridProps = {
  collections: CollectionPreviewCard[];
  allPawkits?: Array<{ id: string; name: string; slug: string }>;
};

const previewPositions = [
  "bottom-2 left-8 -rotate-6",
  "bottom-4 right-8 rotate-4",
  "bottom-1 left-1/2 -translate-x-1/2 rotate-2"
];

export function DenPawkitsGrid({ collections, allPawkits = [] }: DenPawkitsGridProps) {
  const router = useRouter();

  if (!collections.length) {
    return (
      <div className="rounded-2xl border border-subtle bg-surface/60 p-12 text-center text-sm text-muted-foreground">
        No Den Pawkits yet. Create one to organize your private items.
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {collections.map((collection) => (
        <div
          key={collection.id}
          onClick={() => {
            if (collection.slug) {
              router.push(`/den/pawkits/${collection.slug}`);
            }
          }}
          className="card-hover group relative flex h-56 cursor-pointer flex-col overflow-hidden rounded-2xl border border-subtle bg-surface/80 p-5 text-left"
        >
          <div className="relative z-10 flex items-center justify-between pb-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent">📁</span>
              {collection.name}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{collection.count} item{collection.count === 1 ? "" : "s"}</span>
              {collection.slug && (
                <div onClick={(e) => e.stopPropagation()}>
                  <DenPawkitActions
                    pawkitId={collection.id}
                    pawkitName={collection.name}
                    isPinned={collection.isPinned}
                    hasChildren={collection.hasChildren}
                    allPawkits={allPawkits}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="relative h-full w-full">
            {collection.cards.slice(0, 3).map((card, index) => (
              <PreviewTile key={card.id} card={card} positionClass={previewPositions[index] ?? "bottom-6 right-8 rotate-1"} />
            ))}
            {collection.cards.length === 0 && (
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
