'use client';

import { useMemo } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useCollections } from '@/lib/contexts/convex-data-context';
import { useDataContext } from '@/lib/contexts/data-context';
import { useLayout, useSorting } from '@/lib/stores/view-store';
import { CardGrid } from '@/components/cards/card-grid';
import { EmptyState } from '@/components/cards/empty-state';
import { PawkitHeader } from '@/components/pawkits/pawkit-header';
import { ContentAreaContextMenu } from '@/components/context-menus';
import { FolderOpen, Plus } from 'lucide-react';
import type { Collection } from '@/lib/types/convex';

interface PawkitDetailPageProps {
  slug: string;
}

// Helper to get all descendant slugs for leaf-only display logic
function getDescendantSlugs(pawkitSlug: string, collections: Collection[]): string[] {
  const pawkit = collections.find((c) => c.slug === pawkitSlug);
  if (!pawkit) return [];

  const descendants: string[] = [];
  function findChildren(parentId: string) {
    const children = collections.filter((c) => c.parentId === parentId && !c.deleted);
    for (const child of children) {
      descendants.push(child.slug);
      findChildren(child._id);
    }
  }
  findChildren(pawkit._id);
  return descendants;
}

export default function PawkitDetailPage({ slug }: PawkitDetailPageProps) {
  const navigate = useNavigate();
  const collections = useCollections();
  const { cards, isLoading } = useDataContext();

  // Find the collection by slug
  const collection = useMemo(() => {
    return collections.find((c) => c.slug === slug && !c.deleted);
  }, [collections, slug]);

  // Get view settings
  const layout = useLayout();
  const { sortBy, sortOrder } = useSorting();

  // Filter cards that belong to this pawkit (cards with this pawkit's slug as a tag)
  // Uses leaf-only display: excludes cards that have a descendant pawkit tag
  const pawkitCards = useMemo(() => {
    if (!collection) return [];

    // Get descendant slugs for leaf-only display
    const descendantSlugs = getDescendantSlugs(collection.slug, collections);

    // Filter cards that have this pawkit's tag
    const cardsWithTag = cards.filter((card) => {
      if (card.deleted) return false;
      return card.tags?.includes(collection.slug);
    });

    // Leaf-only: exclude cards that also have a descendant pawkit tag
    return cardsWithTag.filter((card) => {
      const hasDescendantTag = descendantSlugs.some((d) => card.tags?.includes(d));
      return !hasDescendantTag;
    });
  }, [cards, collections, collection?.slug]);

  // Sort cards
  const sortedCards = useMemo(() => {
    const sorted = [...pawkitCards];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'createdAt':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          break;
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'domain':
          comparison = (a.domain || '').localeCompare(b.domain || '');
          break;
        default:
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });
    return sorted;
  }, [pawkitCards, sortBy, sortOrder]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1">
        <div className="pt-5 pb-4 px-4 md:px-6">
          <div className="h-8 w-32 bg-bg-surface-2 rounded animate-pulse" />
        </div>
        <div className="px-4 md:px-6 pt-4 pb-6">
          <div className="text-center py-12 text-text-muted">Loading...</div>
        </div>
      </div>
    );
  }

  // Collection not found
  if (!collection) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={FolderOpen}
          title="Pawkit not found"
          description="The pawkit you're looking for doesn't exist or has been deleted."
          actionLabel="Go to Pawkits"
          onAction={() => navigate({ to: '/pawkits' })}
        />
      </div>
    );
  }

  // Get child collections
  const childCollections = collections.filter(
    (c) => c.parentId === collection._id && !c.deleted
  );

  return (
    <ContentAreaContextMenu>
      <div className="flex-1">
        <PawkitHeader collection={collection} />

        <div className="px-4 md:px-6 pt-4 pb-6">
          {/* Child Pawkits */}
          {childCollections.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-text-muted mb-3">Sub-Pawkits</h3>
              <div className="flex flex-wrap gap-2">
                {childCollections.map((child) => (
                  <Link
                    key={child._id}
                    to={`/pawkits/${child.slug}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-surface-2 hover:bg-bg-surface-3 transition-colors border border-border-subtle"
                  >
                    <FolderOpen className="h-4 w-4 text-[var(--color-accent)]" />
                    <span className="text-sm text-text-primary">{child.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Cards */}
          {sortedCards.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="No cards yet"
              description={`Add cards to "${collection.name}" by tagging them with this pawkit's name.`}
            />
          ) : (
            <CardGrid
              cards={sortedCards}
              layout={layout}
              currentCollection={collection.slug}
            />
          )}
        </div>
      </div>
    </ContentAreaContextMenu>
  );
}
