'use client';

import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import Image from '@/components/ui/image';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Folder, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCards, useCollections } from '@/lib/contexts/convex-data-context';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { PawkitContextMenu } from '@/components/context-menus';
import type { Collection } from '@/lib/types/convex';
import type { SubPawkitSize, PawkitOverviewSize } from '@/lib/stores/view-store';
import { getCardsInPawkit } from '@/lib/utils/pawkit-membership';

interface PawkitCardProps {
  collection: Collection;
  isActive?: boolean;
  isDragging?: boolean;
  size?: SubPawkitSize | PawkitOverviewSize;
  showThumbnails?: boolean;
  showItemCount?: boolean;
}

// Map PawkitOverviewSize to internal size keys
function normalizeSize(size: SubPawkitSize | PawkitOverviewSize): 'compact' | 'normal' | 'large' {
  if (size === 'small') return 'compact';
  if (size === 'medium') return 'normal';
  return size as 'compact' | 'normal' | 'large';
}

export function PawkitCard({
  collection,
  isActive = false,
  isDragging = false,
  size = 'normal',
  showThumbnails = true,
  showItemCount = true,
}: PawkitCardProps) {
  const normalizedSize = normalizeSize(size);
  const workspace = useCurrentWorkspace();
  const cards = useCards();
  const collections = useCollections();

  // Size-based styling
  const sizeClasses = {
    compact: {
      padding: 'p-3',
      iconSize: 'h-4 w-4',
      textSize: 'text-sm',
      countSize: 'text-xs',
      thumbnailAspect: 'aspect-[3/1]',
      thumbnailGrid: 'grid-cols-4',
      emptyIconSize: 'h-6 w-6',
    },
    normal: {
      padding: 'p-4',
      iconSize: 'h-5 w-5',
      textSize: 'text-base',
      countSize: 'text-sm',
      thumbnailAspect: 'aspect-[2/1]',
      thumbnailGrid: 'grid-cols-2',
      emptyIconSize: 'h-8 w-8',
    },
    large: {
      padding: 'p-5',
      iconSize: 'h-6 w-6',
      textSize: 'text-lg',
      countSize: 'text-sm',
      thumbnailAspect: 'aspect-[2/1.2]',
      thumbnailGrid: 'grid-cols-2',
      emptyIconSize: 'h-10 w-10',
    },
  };

  const sizeStyle = sizeClasses[normalizedSize];

  // Sortable for reordering pawkits
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isOver: isSortOver,
  } = useSortable({
    id: collection._id,
    data: {
      type: 'pawkit',
      collection,
    },
  });

  // Drop target for receiving cards from Library
  const { setNodeRef: setDroppableRef, isOver: isCardOver } = useDroppable({
    id: `collection-${collection.slug}`,
    data: {
      type: 'collection',
      slug: collection.slug,
      name: collection.name,
    },
  });

  // Combine refs
  const setNodeRef = (node: HTMLElement | null) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

  const isOver = isCardOver || isSortOver;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Get cards in this Pawkit using centralized helper (leaf-only by default)
  // @see docs/adr/0001-tags-canonical-membership.md
  const collectionCards = useMemo(() => {
    return getCardsInPawkit(cards, collection.slug, collections);
  }, [cards, collections, collection.slug]);

  // Get child collections count
  const childCount = useMemo(() => {
    return collections.filter(
      (c) => c.parentId === collection._id && !c.deleted
    ).length;
  }, [collections, collection._id]);

  // Get up to 4 thumbnail images from cards
  const thumbnails = useMemo(() => {
    const withImages = collectionCards.filter((card) => card.image);
    return withImages.slice(0, 4).map((card) => card.image!);
  }, [collectionCards]);

  const itemCount = collectionCards.length;
  const hasChildren = childCount > 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isDragging ? 0.5 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <PawkitContextMenu collection={collection}>
        <Link
          to={`/pawkits/${collection.slug}`}
          className={cn(
            'group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-200 ease-out',
            'hover:-translate-y-1',
            'focus:outline-none',
            isActive && 'ring-2 ring-[var(--color-accent)]',
            isOver && 'ring-2 ring-[var(--color-accent)] scale-[1.02]',
            isDragging && 'cursor-grabbing'
          )}
          style={{
            boxShadow: isOver
              ? '0 0 0 2px var(--color-accent), 0 0 20px hsl(var(--hue-accent) var(--sat-accent) 50% / 0.4)'
              : 'var(--card-shadow)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: isOver ? 'var(--color-bg-surface-3)' : 'var(--color-bg-surface-2)',
          }}
        >
        {/* Header with name and count */}
        <div className={cn('flex items-center justify-between pb-2', sizeStyle.padding)}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Folder className={cn('shrink-0 text-[var(--color-accent)]', sizeStyle.iconSize)} />
            <span className={cn('font-medium text-text-primary truncate', sizeStyle.textSize)}>
              {collection.name}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {showItemCount && (
              <span className={cn('text-text-muted', sizeStyle.countSize)}>
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            )}
            {hasChildren && (
              <ChevronRight className={cn('text-text-muted', normalizedSize === 'compact' ? 'h-3 w-3' : 'h-4 w-4')} />
            )}
          </div>
        </div>

        {/* Thumbnail grid */}
        {showThumbnails && (
          <div className={cn('pt-0', sizeStyle.padding)}>
            {thumbnails.length > 0 ? (
              <div className={cn('grid gap-2', sizeStyle.thumbnailGrid, sizeStyle.thumbnailAspect)}>
                {thumbnails.map((src, idx) => (
                  <div
                    key={idx}
                    className="relative overflow-hidden rounded-lg bg-bg-surface-3"
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="150px"
                      className="object-cover"
                    />
                  </div>
                ))}
                {/* Fill empty slots */}
                {[...Array(Math.max(0, 4 - thumbnails.length))].map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="rounded-lg bg-bg-surface-3"
                  />
                ))}
              </div>
            ) : (
              <div className={cn('flex items-center justify-center rounded-lg bg-bg-surface-3', sizeStyle.thumbnailAspect)}>
                <Folder className={cn('text-text-muted opacity-50', sizeStyle.emptyIconSize)} />
              </div>
            )}
          </div>
        )}

        {/* Hover glow effect */}
        <div
          className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10"
          style={{
            background: `radial-gradient(ellipse at center, hsl(var(--hue-accent) var(--sat-accent) 50% / 0.4) 0%, transparent 70%)`,
            filter: 'blur(20px)',
          }}
        />
        </Link>
      </PawkitContextMenu>
    </div>
  );
}
