'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DragOverlay, useDndMonitor } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { FolderPlus, Folder } from 'lucide-react';
import { useDataStore } from '@/lib/stores/data-store';
import { useCards, useCollections } from '@/lib/hooks/use-live-data';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { usePawkitOverviewSettings } from '@/lib/stores/view-store';
import { useOmnibarCollision } from '@/lib/hooks/use-omnibar-collision';
import { PageHeader } from '@/components/layout/page-header';
import { PawkitCard } from '@/components/pawkits/pawkit-card';
import { EmptyState } from '@/components/cards/empty-state';
import { ContentAreaContextMenu } from '@/components/context-menus';
import { cn } from '@/lib/utils';
import type { LocalCollection } from '@/lib/db';

export default function PawkitsPage() {
  const workspace = useCurrentWorkspace();
  const collections = useCollections(workspace?.id);
  const cards = useCards(workspace?.id);
  const isLoading = useDataStore((state) => state.isLoading);
  const updateCollection = useDataStore((state) => state.updateCollection);
  const openCreatePawkitModal = useModalStore((state) => state.openCreatePawkitModal);

  // Pawkit overview display settings
  const {
    pawkitOverviewSize,
    pawkitOverviewColumns,
    pawkitOverviewShowThumbnails,
    pawkitOverviewShowItemCount,
    pawkitOverviewSortBy,
  } = usePawkitOverviewSettings();

  // Collision detection for omnibar
  const headerRef = useRef<HTMLDivElement>(null);
  const needsOffset = useOmnibarCollision(headerRef);

  const [activeCollection, setActiveCollection] = useState<LocalCollection | null>(null);

  // Build set of valid Pawkit slugs
  const pawkitSlugs = useMemo(() => {
    return new Set(collections.map((c) => c.slug));
  }, [collections]);

  // Calculate card counts per Pawkit (using tags)
  // A card counts toward a Pawkit if it has that Pawkit's slug as a tag
  const cardCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of cards) {
      if (card._deleted) continue;
      for (const tag of card.tags || []) {
        // Only count tags that are Pawkit slugs
        if (pawkitSlugs.has(tag)) {
          counts.set(tag, (counts.get(tag) || 0) + 1);
        }
      }
    }
    return counts;
  }, [cards, pawkitSlugs]);

  // Get root-level collections (no parent) and sort based on settings
  const rootCollections = useMemo(() => {
    const filtered = collections.filter((c) => !c.parentId && !c._deleted);

    // Sort based on pawkitOverviewSortBy
    return filtered.sort((a, b) => {
      switch (pawkitOverviewSortBy) {
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'dateCreated':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'dateModified':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'itemCount':
          return (cardCounts.get(b.slug) || 0) - (cardCounts.get(a.slug) || 0);
        case 'manual':
        default:
          return a.position - b.position;
      }
    });
  }, [collections, pawkitOverviewSortBy, cardCounts]);

  // Collection IDs for SortableContext
  const collectionIds = useMemo(() => rootCollections.map((c) => c.id), [rootCollections]);

  // Get grid columns class based on pawkitOverviewColumns setting
  const getGridCols = () => {
    switch (pawkitOverviewColumns) {
      case 2: return 'grid-cols-1 sm:grid-cols-2';
      case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 4: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
      case 5: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
      case 6: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6';
      default: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    }
  };

  // Handle reordering collections
  const handleReorder = useCallback(async (activeId: string, overId: string) => {
    const oldIndex = rootCollections.findIndex((c) => c.id === activeId);
    const newIndex = rootCollections.findIndex((c) => c.id === overId);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    // Create new order
    const newOrder = [...rootCollections];
    const [removed] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, removed);

    // Update positions for all affected collections
    for (let i = 0; i < newOrder.length; i++) {
      if (newOrder[i].position !== i) {
        await updateCollection(newOrder[i].id, { position: i });
      }
    }
  }, [rootCollections, updateCollection]);

  // DnD monitor for collection reordering
  useDndMonitor({
    onDragStart: (event) => {
      const activeData = event.active.data.current;
      if (activeData?.type === 'pawkit') {
        const collection = rootCollections.find((c) => c.id === event.active.id);
        setActiveCollection(collection || null);
      }
    },
    onDragEnd: (event) => {
      const { active, over } = event;
      setActiveCollection(null);

      if (!over) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      // Only handle pawkit-to-pawkit reordering
      if (activeData?.type === 'pawkit' && overData?.type === 'pawkit') {
        if (active.id !== over.id) {
          handleReorder(active.id as string, over.id as string);
        }
      }
    },
    onDragCancel: () => {
      setActiveCollection(null);
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1">
        <div className={cn('transition-[padding] duration-200', needsOffset && 'md:pt-20')}>
          <div ref={headerRef} className="w-fit">
            <PageHeader title="Pawkits" subtitle="Loading..." />
          </div>
        </div>
        <div className="px-6 pt-4 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-2xl animate-pulse bg-bg-surface-2"
            />
          ))}
        </div>
      </div>
    );
  }

  const subtitle = rootCollections.length === 0
    ? 'Organize cards into visual groups'
    : `${rootCollections.length} pawkit${rootCollections.length === 1 ? '' : 's'}`;

  return (
    <>
      <ContentAreaContextMenu>
        <div className="flex-1">
          {/* Header with collision-aware offset */}
          <div className={cn('transition-[padding] duration-200', needsOffset && 'md:pt-20')}>
            <div ref={headerRef} className="w-fit">
              <PageHeader
                title="Pawkits"
                subtitle={subtitle}
              />
            </div>
          </div>

          <div className="px-6 pt-4 pb-6">
            {rootCollections.length === 0 ? (
              <EmptyState
                icon={FolderPlus}
                title="No Pawkits yet"
                description="Create your first Pawkit to organize your cards into visual groups."
                actionLabel="Create Pawkit"
                onAction={openCreatePawkitModal}
              />
            ) : (
              <SortableContext items={collectionIds} strategy={rectSortingStrategy}>
                <div className={cn('grid gap-4', getGridCols())}>
                  {rootCollections.map((collection) => (
                    <PawkitCard
                      key={collection.id}
                      collection={collection}
                      isDragging={activeCollection?.id === collection.id}
                      size={pawkitOverviewSize}
                      showThumbnails={pawkitOverviewShowThumbnails}
                      showItemCount={pawkitOverviewShowItemCount}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </div>

          {/* Manage Pawkits hint */}
          {rootCollections.length > 0 && (
            <div className="px-6 pb-6">
              <div className="p-4 rounded-xl bg-bg-surface-2 border border-border-subtle">
                <h3 className="text-sm font-medium text-text-primary mb-1">
                  Manage Pawkits
                </h3>
                <p className="text-sm text-text-muted">
                  Use the sidebar to navigate Pawkits and sub-Pawkits. Right-click any Pawkit card to rename, move, or delete it.
                </p>
              </div>
            </div>
          )}
        </div>
      </ContentAreaContextMenu>

      {/* Drag overlay for visual feedback */}
      {typeof document !== 'undefined' && createPortal(
        <DragOverlay
          adjustScale={false}
          dropAnimation={null}
          style={{ zIndex: 9999 }}
        >
          {activeCollection && (
            <div
              style={{
                width: 280,
                opacity: 0.9,
                transform: 'rotate(-2deg)',
                pointerEvents: 'none',
                filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4))',
              }}
            >
              <div
                className="flex flex-col overflow-hidden rounded-2xl p-4"
                style={{
                  background: 'var(--color-bg-surface-2)',
                  border: '2px solid var(--color-accent)',
                }}
              >
                <div className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-[var(--color-accent)]" />
                  <span className="font-medium text-text-primary truncate">
                    {activeCollection.name}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DragOverlay>,
        document.body
      )}
    </>
  );
}
