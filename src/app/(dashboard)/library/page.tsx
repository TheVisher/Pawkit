'use client';

import { useMemo, useCallback, useEffect } from 'react';
import { useDataStore } from '@/lib/stores/data-store';
import { useViewStore, useCardDisplaySettings } from '@/lib/stores/view-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { CardGrid } from '@/components/cards/card-grid';
import { EmptyState } from '@/components/cards/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Bookmark } from 'lucide-react';

export default function LibraryPage() {
  const cards = useDataStore((state) => state.cards);
  const isLoading = useDataStore((state) => state.isLoading);
  const layout = useViewStore((state) => state.layout);
  const sortBy = useViewStore((state) => state.sortBy);
  const sortOrder = useViewStore((state) => state.sortOrder);
  const cardOrder = useViewStore((state) => state.cardOrder);
  const reorderCards = useViewStore((state) => state.reorderCards);
  const loadViewSettings = useViewStore((state) => state.loadViewSettings);
  const openAddCard = useModalStore((state) => state.openAddCard);
  const workspace = useCurrentWorkspace();

  // Load library-specific view settings on mount
  useEffect(() => {
    if (workspace) {
      loadViewSettings(workspace.id, 'library');
    }
  }, [workspace, loadViewSettings]);

  // Card display settings
  const { cardPadding, cardSize, showMetadataFooter, showUrlPill, showTitles, showTags } = useCardDisplaySettings();

  // Filter out deleted cards
  const activeCards = useMemo(() => cards.filter((card) => !card._deleted), [cards]);

  // Sort cards based on current sort settings
  const sortedCards = useMemo(() => {
    // Manual sort - use cardOrder array
    if (sortBy === 'manual' && cardOrder.length > 0) {
      const orderMap = new Map(cardOrder.map((id, index) => [id, index]));
      return [...activeCards].sort((a, b) => {
        const indexA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const indexB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return indexA - indexB;
      });
    }

    // Automatic sorting by field
    return [...activeCards].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
        default:
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [activeCards, sortBy, sortOrder, cardOrder]);

  // Handle card reorder from drag-and-drop
  const handleReorder = useCallback((reorderedIds: string[]) => {
    reorderCards(reorderedIds);
  }, [reorderCards]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1">
        <PageHeader title="Library" subtitle="Loading..." />
        <div className="px-6 pt-4 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-2xl animate-pulse bg-bg-surface-2"
            />
          ))}
        </div>
      </div>
    );
  }

  const subtitle = activeCards.length === 0
    ? 'All your saved content'
    : `${activeCards.length} item${activeCards.length === 1 ? '' : 's'}`;

  return (
    <div className="flex-1">
      <PageHeader title="Library" subtitle={subtitle} />

      {/* Page content - pt-4 creates spacing below header */}
      <div className="px-6 pt-4 pb-6">
        {activeCards.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="No bookmarks yet"
            description="Save your first bookmark to get started. Use the + button above or press ⌘⇧B."
            actionLabel="Add bookmark"
            onAction={() => openAddCard('bookmark')}
          />
        ) : (
          <CardGrid
            cards={sortedCards}
            layout={layout}
            onReorder={handleReorder}
            cardSize={cardSize}
            displaySettings={{ cardPadding, showMetadataFooter, showUrlPill, showTitles, showTags }}
          />
        )}
      </div>
    </div>
  );
}
