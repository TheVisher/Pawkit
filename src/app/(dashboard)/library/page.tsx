'use client';

import { useDataStore } from '@/lib/stores/data-store';
import { useViewStore } from '@/lib/stores/view-store';
import { CardGrid } from '@/components/cards/card-grid';
import { EmptyState } from '@/components/cards/empty-state';
import { Bookmark } from 'lucide-react';

export default function LibraryPage() {
  const cards = useDataStore((state) => state.cards);
  const isLoading = useDataStore((state) => state.isLoading);
  const layout = useViewStore((state) => state.layout);

  // Filter out deleted cards
  const activeCards = cards.filter((card) => !card._deleted);

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-100">Library</h1>
          <p className="text-zinc-400 mt-1">All your saved content</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-48 bg-zinc-800/50 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-100">Library</h1>
        <p className="text-zinc-400 mt-1">
          {activeCards.length === 0
            ? 'All your saved content'
            : `${activeCards.length} item${activeCards.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {activeCards.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No bookmarks yet"
          description="Save your first bookmark to get started. Paste a URL or use the browser extension."
          actionLabel="Add bookmark"
          onAction={() => {
            // TODO: Open create card modal
            console.log('Add bookmark clicked');
          }}
        />
      ) : (
        <CardGrid cards={activeCards} layout={layout} />
      )}
    </div>
  );
}
