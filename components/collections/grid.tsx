"use client";

import { useRouter } from "next/navigation";

type CollectionPreviewCard = {
  id: string;
  name: string;
  slug: string | null;
  count: number;
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
};

const previewPositions = [
  "bottom-2 left-8 -rotate-6",
  "bottom-4 right-8 rotate-4",
  "bottom-1 left-1/2 -translate-x-1/2 rotate-2"
];

export function CollectionsGrid({ collections }: CollectionsGridProps) {
  const router = useRouter();

  if (!collections.length) {
    return (
      <div className="rounded border border-gray-800 bg-gray-900/40 p-12 text-center text-sm text-gray-400">
        No collections yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {collections.map((collection) => (
        <button
          key={collection.id}
          onClick={() => {
            if (collection.slug) {
              router.push(`/library?collection=${collection.slug}`);
            } else {
              router.push(`/library`);
            }
          }}
          className="group relative flex h-56 flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/60 p-5 text-left transition hover:border-accent/60 hover:shadow-lg"
        >
          <div className="relative z-10 flex items-center justify-between bg-gray-900/60 pb-4 text-sm text-gray-400">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-200">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent">📁</span>
              {collection.name}
            </span>
            <span className="text-xs text-gray-500">{collection.count} item{collection.count === 1 ? "" : "s"}</span>
          </div>
          <div className="relative h-full w-full">
            {collection.cards.slice(0, 3).map((card, index) => (
              <PreviewTile key={card.id} card={card} positionClass={previewPositions[index] ?? "bottom-6 right-8 rotate-1"} />
            ))}
            {collection.cards.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-dashed border-gray-800 bg-gray-900/40 text-xs text-gray-500">
                No previews yet
              </div>
            )}
          </div>
        </button>
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
      className={`absolute flex w-28 flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-950/90 shadow-xl transition group-hover:scale-105 ${positionClass}`}
    >
      {card.image ? (
        <img src={card.image} alt={label ?? "preview"} className="h-20 w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-20 items-center justify-center bg-gray-900 text-xs text-gray-500">
          {(label ?? "").slice(0, 18)}
        </div>
      )}
      <span className="px-3 py-2 text-[10px] text-gray-400 truncate">{label}</span>
    </div>
  );
}
