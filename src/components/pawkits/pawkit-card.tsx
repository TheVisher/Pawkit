'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Folder, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDataStore } from '@/lib/stores/data-store';
import { PawkitContextMenu } from '@/components/context-menus';
import type { LocalCollection } from '@/lib/db';

interface PawkitCardProps {
  collection: LocalCollection;
  isActive?: boolean;
  isDragging?: boolean;
}

export function PawkitCard({ collection, isActive = false, isDragging = false }: PawkitCardProps) {
  const cards = useDataStore((state) => state.cards);
  const collections = useDataStore((state) => state.collections);

  // Sortable for reordering pawkits
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isOver: isSortOver,
  } = useSortable({
    id: collection.id,
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

  // Get cards in this collection
  const collectionCards = useMemo(() => {
    return cards.filter(
      (card) => card.collections.includes(collection.slug) && !card._deleted
    );
  }, [cards, collection.slug]);

  // Get child collections count
  const childCount = useMemo(() => {
    return collections.filter(
      (c) => c.parentId === collection.id && !c._deleted
    ).length;
  }, [collections, collection.id]);

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
          href={`/pawkits/${collection.slug}`}
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
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Folder className="h-5 w-5 shrink-0 text-[var(--color-accent)]" />
            <span className="font-medium text-text-primary truncate">
              {collection.name}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-text-muted">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
            {hasChildren && (
              <ChevronRight className="h-4 w-4 text-text-muted" />
            )}
          </div>
        </div>

        {/* Thumbnail grid */}
        <div className="px-4 pb-4">
          {thumbnails.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 aspect-[2/1]">
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
            <div className="flex items-center justify-center aspect-[2/1] rounded-lg bg-bg-surface-3">
              <Folder className="h-8 w-8 text-text-muted opacity-50" />
            </div>
          )}
        </div>

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
