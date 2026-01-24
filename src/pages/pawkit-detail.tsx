'use client';

import { useMemo, useCallback, useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useCollections } from '@/lib/contexts/convex-data-context';
import { useDataContext } from '@/lib/contexts/data-context';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useLayout, useSorting, useGrouping, useFilterSettings, useCardDisplaySettings, useViewActions, useViewStore, cardMatchesContentTypes } from '@/lib/stores/view-store';
import type { DateGrouping, ContentType } from '@/lib/stores/view-store';
import { CardGrid } from '@/components/cards/card-grid';
import { EmptyState } from '@/components/cards/empty-state';
import { PawkitHeader } from '@/components/pawkits/pawkit-header';
import { ContentAreaContextMenu } from '@/components/context-menus';
import { FolderOpen, Plus, Tag, X, CalendarDays, Type, Globe, Bookmark, FileText, Video, Image, FileIcon, Music, Filter } from 'lucide-react';
import type { Collection, Card } from '@/lib/types/convex';

// Helper to get smart date label (Today, Yesterday, This Week, etc.)
function getSmartDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cardDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - cardDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'This Week';
  if (diffDays < 14) return 'Last Week';
  if (diffDays < 30) return 'This Month';
  if (diffDays < 60) return 'Last Month';
  if (diffDays < 365) return 'This Year';
  return 'Older';
}

// Helper to get date label based on grouping type
function getDateLabel(date: Date, dateGrouping: DateGrouping): string {
  switch (dateGrouping) {
    case 'smart':
      return getSmartDateLabel(date);
    case 'day':
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    case 'week': {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    case 'year':
      return date.getFullYear().toString();
    default:
      return getSmartDateLabel(date);
  }
}

// Helper to get content type label
function getContentTypeLabel(card: Card): string {
  if (['md-note', 'text-note'].includes(card.type)) return 'Notes';
  if (card.type === 'file') return 'Files';
  if (card.type === 'url') return 'Bookmarks';
  return 'Other';
}

interface CardGroup {
  key: string;
  label: string;
  cards: Card[];
}

// Content type display info
const CONTENT_TYPE_INFO: Record<ContentType, { label: string; icon: typeof Bookmark }> = {
  bookmarks: { label: 'Bookmarks', icon: Bookmark },
  notes: { label: 'Notes', icon: FileText },
  video: { label: 'Video', icon: Video },
  images: { label: 'Images', icon: Image },
  docs: { label: 'Docs', icon: FileIcon },
  audio: { label: 'Audio', icon: Music },
  other: { label: 'Other', icon: FileIcon },
};

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
  const workspace = useCurrentWorkspace();

  // Find the collection by slug
  const collection = useMemo(() => {
    return collections.find((c) => c.slug === slug && !c.deleted);
  }, [collections, slug]);

  // Get view settings
  const layout = useLayout();
  const { sortBy, sortOrder } = useSorting();
  const { groupBy, dateGrouping } = useGrouping();
  const { loadViewSettings, saveViewSettings } = useViewActions();

  // Card display settings
  const { cardPadding, cardSpacing, cardSize, showMetadataFooter, showTitles, showTags } = useCardDisplaySettings();

  // Load pawkit-specific view settings on mount
  useEffect(() => {
    if (workspace && slug) {
      loadViewSettings(workspace._id, `pawkit:${slug}`);
    }
  }, [workspace, slug, loadViewSettings]);

  // Auto-save view settings when they change
  useEffect(() => {
    if (workspace && slug) {
      // Debounce save to avoid excessive writes
      const timer = setTimeout(() => {
        saveViewSettings(workspace._id);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [workspace, slug, layout, sortBy, sortOrder, cardPadding, cardSpacing, cardSize, showMetadataFooter, showTitles, showTags, groupBy, dateGrouping, saveViewSettings]);

  // Get filter settings
  const { selectedTags, toggleTag, contentTypeFilters } = useFilterSettings();
  const clearTags = useViewStore((state) => state.clearTags);
  const toggleContentType = useViewStore((state) => state.toggleContentType);
  const clearContentTypes = useViewStore((state) => state.clearContentTypes);

  // Handle tag click in card footer
  const handleTagClick = useCallback((tag: string) => {
    toggleTag(tag);
  }, [toggleTag]);

  // Filter cards that belong to this pawkit (cards with this pawkit's slug as a tag)
  // Uses leaf-only display: excludes cards that have a descendant pawkit tag
  // Also applies additional tag and content type filters from the sidebar
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
    const leafCards = cardsWithTag.filter((card) => {
      const hasDescendantTag = descendantSlugs.some((d) => card.tags?.includes(d));
      return !hasDescendantTag;
    });

    // Apply content type filter
    const contentFiltered = leafCards.filter((card) => cardMatchesContentTypes(card, contentTypeFilters));

    // Apply additional tag filters (AND logic - card must have ALL selected tags)
    if (selectedTags.length === 0) return contentFiltered;
    return contentFiltered.filter((card) => {
      const cardTags = card.tags || [];
      return selectedTags.every((tag) => cardTags.includes(tag));
    });
  }, [cards, collections, collection?.slug, selectedTags, contentTypeFilters]);

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

  // Group cards based on groupBy setting
  const groupedCards = useMemo((): CardGroup[] => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: '', cards: sortedCards }];
    }

    const groups = new Map<string, Card[]>();

    for (const card of sortedCards) {
      let key: string;

      switch (groupBy) {
        case 'date': {
          const date = new Date(card.createdAt);
          key = getDateLabel(date, dateGrouping);
          break;
        }
        case 'tags': {
          // Group by first tag (excluding the pawkit slug), or 'Untagged' if no other tags
          const tags = (card.tags || []).filter(t => t !== slug);
          key = tags.length > 0 ? tags[0] : 'Untagged';
          break;
        }
        case 'type':
          key = getContentTypeLabel(card);
          break;
        case 'domain':
          key = card.domain || 'No Domain';
          break;
        default:
          key = 'Other';
      }

      const existing = groups.get(key) || [];
      existing.push(card);
      groups.set(key, existing);
    }

    // Convert to array and maintain sort order for date groups
    const result: CardGroup[] = [];

    if (groupBy === 'date') {
      // For date grouping, maintain chronological order based on sort order
      const dateOrder = sortOrder === 'desc'
        ? ['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Last Month', 'This Year', 'Older']
        : ['Older', 'This Year', 'Last Month', 'This Month', 'Last Week', 'This Week', 'Yesterday', 'Today'];

      // First add known date groups in order
      for (const label of dateOrder) {
        const cards = groups.get(label);
        if (cards) {
          result.push({ key: label, label, cards });
          groups.delete(label);
        }
      }
      // Then add any remaining groups (for non-smart date groupings)
      for (const [label, cards] of groups) {
        result.push({ key: label, label, cards });
      }
    } else {
      // For other groupings, sort alphabetically but put 'Untagged'/'No Domain' last
      const entries = Array.from(groups.entries());
      entries.sort((a, b) => {
        if (a[0] === 'Untagged' || a[0] === 'No Domain') return 1;
        if (b[0] === 'Untagged' || b[0] === 'No Domain') return -1;
        return a[0].localeCompare(b[0]);
      });
      for (const [label, cards] of entries) {
        result.push({ key: label, label, cards });
      }
    }

    return result;
  }, [sortedCards, groupBy, dateGrouping, sortOrder, slug]);

  // Get icon for group header based on groupBy type
  const getGroupIcon = () => {
    switch (groupBy) {
      case 'date': return CalendarDays;
      case 'tags': return Tag;
      case 'type': return Type;
      case 'domain': return Globe;
      default: return null;
    }
  };

  const GroupIcon = getGroupIcon();

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

        {/* Active filter indicator */}
        {(selectedTags.length > 0 || contentTypeFilters.length > 0) && (
          <div className="px-4 md:px-6 pb-2">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Filter className="h-3.5 w-3.5 text-text-muted" />
              <span className="text-text-muted">Filtering by:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Content type filters */}
                {contentTypeFilters.map((type) => {
                  const info = CONTENT_TYPE_INFO[type];
                  const Icon = info.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => toggleContentType(type)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors"
                    >
                      <Icon className="h-3 w-3" />
                      <span>{info.label}</span>
                      <X className="h-3 w-3 opacity-60 hover:opacity-100" />
                    </button>
                  );
                })}
                {/* Tag filters */}
                {selectedTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-accent)]/15 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25 transition-colors"
                  >
                    <Tag className="h-3 w-3" />
                    <span>{tag}</span>
                    <X className="h-3 w-3 opacity-60 hover:opacity-100" />
                  </button>
                ))}
                {/* Clear all button */}
                {(selectedTags.length + contentTypeFilters.length) > 1 && (
                  <button
                    onClick={() => { clearTags(); clearContentTypes(); }}
                    className="text-xs text-text-muted hover:text-text-primary transition-colors ml-1"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

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
              title={selectedTags.length > 0 || contentTypeFilters.length > 0 ? "No matching cards" : "No cards yet"}
              description={selectedTags.length > 0 || contentTypeFilters.length > 0
                ? "Try adjusting your filters to find what you're looking for."
                : `Add cards to "${collection.name}" by tagging them with this pawkit's name.`}
            />
          ) : groupBy === 'none' ? (
            <CardGrid
              cards={sortedCards}
              layout={layout}
              currentCollection={collection.slug}
              cardSize={cardSize}
              cardSpacing={cardSpacing}
              displaySettings={{ cardPadding, showMetadataFooter, showTitles, showTags }}
              onTagClick={handleTagClick}
            />
          ) : layout === 'list' ? (
            // List view with grouping - pass groups to single CardGrid for inline separators
            <CardGrid
              cards={sortedCards}
              layout={layout}
              currentCollection={collection.slug}
              cardSize={cardSize}
              cardSpacing={cardSpacing}
              displaySettings={{ cardPadding, showMetadataFooter, showTitles, showTags }}
              groups={groupedCards}
              groupIcon={GroupIcon || undefined}
              onTagClick={handleTagClick}
            />
          ) : (
            // Masonry/Grid view with grouping - separate sections with headers
            <div className="space-y-8">
              {groupedCards.map((group) => (
                <div key={group.key}>
                  {/* Group header */}
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--color-text-muted)]/15">
                    {GroupIcon && <GroupIcon className="h-4 w-4 text-[var(--color-text-muted)]" />}
                    <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">
                      {group.label}
                    </h2>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {group.cards.length} item{group.cards.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {/* Group cards */}
                  <CardGrid
                    cards={group.cards}
                    layout={layout}
                    currentCollection={collection.slug}
                    cardSize={cardSize}
                    cardSpacing={cardSpacing}
                    displaySettings={{ cardPadding, showMetadataFooter, showTitles, showTags }}
                    onTagClick={handleTagClick}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ContentAreaContextMenu>
  );
}
