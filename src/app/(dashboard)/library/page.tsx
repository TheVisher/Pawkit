'use client';

import { useMemo, useCallback, useEffect } from 'react';
import { useDataStore } from '@/lib/stores/data-store';
import { useViewStore, useCardDisplaySettings, cardMatchesContentTypes, cardMatchesUnsortedFilter, cardMatchesReadingFilter, cardMatchesLinkStatusFilter, findDuplicateCardIds } from '@/lib/stores/view-store';
import type { GroupBy, DateGrouping, UnsortedFilter, ReadingFilter, LinkStatusFilter } from '@/lib/stores/view-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { CardGrid } from '@/components/cards/card-grid';
import { EmptyState } from '@/components/cards/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { MobileViewOptions } from '@/components/layout/mobile-view-options';
import { ContentAreaContextMenu } from '@/components/context-menus';
import { Bookmark, CalendarDays, Tag, Type, Globe, SearchX } from 'lucide-react';
import type { LocalCard } from '@/lib/db';

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
function getContentTypeLabel(card: LocalCard): string {
  if (['md-note', 'text-note', 'quick-note'].includes(card.type)) return 'Notes';
  if (card.type === 'file') return 'Files';
  if (card.type === 'url') return 'Bookmarks';
  return 'Other';
}

interface CardGroup {
  key: string;
  label: string;
  cards: LocalCard[];
}

export default function LibraryPage() {
  const cards = useDataStore((state) => state.cards);
  const isLoading = useDataStore((state) => state.isLoading);
  const layout = useViewStore((state) => state.layout);
  const sortBy = useViewStore((state) => state.sortBy);
  const sortOrder = useViewStore((state) => state.sortOrder);
  const cardOrder = useViewStore((state) => state.cardOrder);
  const contentTypeFilters = useViewStore((state) => state.contentTypeFilters);
  const selectedTags = useViewStore((state) => state.selectedTags);
  const unsortedFilter = useViewStore((state) => state.unsortedFilter) as UnsortedFilter;
  const readingFilter = useViewStore((state) => state.readingFilter) as ReadingFilter;
  const linkStatusFilter = useViewStore((state) => state.linkStatusFilter) as LinkStatusFilter;
  const showDuplicatesOnly = useViewStore((state) => state.showDuplicatesOnly);
  const groupBy = useViewStore((state) => state.groupBy) as GroupBy;
  const dateGrouping = useViewStore((state) => state.dateGrouping) as DateGrouping;
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
  const { cardPadding, cardSpacing, cardSize, showMetadataFooter, showUrlPill, showTitles, showTags } = useCardDisplaySettings();

  // Calculate duplicate card IDs (memoized)
  const duplicateCardIds = useMemo(() => {
    return findDuplicateCardIds(cards);
  }, [cards]);

  // Count total non-deleted cards to distinguish between "no items" vs "no results"
  const totalCards = useMemo(() => {
    return cards.filter(c => !c._deleted).length;
  }, [cards]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return contentTypeFilters.length > 0 ||
           selectedTags.length > 0 ||
           unsortedFilter !== 'none' ||
           readingFilter !== 'all' ||
           linkStatusFilter !== 'all' ||
           showDuplicatesOnly;
  }, [contentTypeFilters, selectedTags, unsortedFilter, readingFilter, linkStatusFilter, showDuplicatesOnly]);

  // Filter out deleted cards and apply content type + tag + unsorted + reading filters
  const activeCards = useMemo(() => {
    return cards.filter((card) => {
      if (card._deleted) return false;
      if (!cardMatchesContentTypes(card, contentTypeFilters)) return false;
      // Tag filter - card must have ALL selected tags
      if (selectedTags.length > 0) {
        const cardTags = card.tags || [];
        if (!selectedTags.every(tag => cardTags.includes(tag))) return false;
      }
      // Unsorted/Quick filter
      if (!cardMatchesUnsortedFilter(card, unsortedFilter)) return false;
      // Reading status filter
      if (!cardMatchesReadingFilter(card, readingFilter)) return false;
      // Link status filter
      if (!cardMatchesLinkStatusFilter(card, linkStatusFilter)) return false;
      // Duplicates filter
      if (showDuplicatesOnly && !duplicateCardIds.has(card.id)) return false;
      return true;
    });
  }, [cards, contentTypeFilters, selectedTags, unsortedFilter, readingFilter, linkStatusFilter, showDuplicatesOnly, duplicateCardIds]);

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
        case 'domain':
          comparison = (a.domain || '').localeCompare(b.domain || '');
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

  // Group cards based on groupBy setting
  const groupedCards = useMemo((): CardGroup[] => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: '', cards: sortedCards }];
    }

    const groups = new Map<string, LocalCard[]>();

    for (const card of sortedCards) {
      let key: string;

      switch (groupBy) {
        case 'date': {
          const date = new Date(card.createdAt);
          key = getDateLabel(date, dateGrouping);
          break;
        }
        case 'tags': {
          // Group by first tag, or 'Untagged' if no tags
          const tags = card.tags || [];
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
  }, [sortedCards, groupBy, dateGrouping, sortOrder]);

  // Handle card reorder from drag-and-drop
  const handleReorder = useCallback((reorderedIds: string[]) => {
    reorderCards(reorderedIds);
  }, [reorderCards]);

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
    ? (hasActiveFilters ? 'No matching items' : 'All your saved content')
    : `${activeCards.length} item${activeCards.length === 1 ? '' : 's'}`;

  return (
    <ContentAreaContextMenu>
      <div className="flex-1">
        <PageHeader 
          title="Library" 
          subtitle={subtitle} 
          actions={<MobileViewOptions viewType="library" />}
        />

        {/* Page content - pt-4 creates spacing below header */}
        <div className="px-4 md:px-6 pt-4 pb-6">
          {activeCards.length === 0 ? (
            totalCards === 0 ? (
              // Truly empty library
              <EmptyState
                icon={Bookmark}
                title="No bookmarks yet"
                description="Save your first bookmark to get started. Use the + button above or press ⌘⇧B."
                actionLabel="Add bookmark"
                onAction={() => openAddCard('bookmark')}
              />
            ) : (
              // Filters returned no results
              <EmptyState
                icon={SearchX}
                title="No matching items"
                description="Try adjusting your filters or search criteria to find what you're looking for."
              />
            )
          ) : groupBy === 'none' ? (
            <CardGrid
              cards={sortedCards}
              layout={layout}
              onReorder={handleReorder}
              cardSize={cardSize}
              cardSpacing={cardSpacing}
              displaySettings={{ cardPadding, showMetadataFooter, showUrlPill, showTitles, showTags }}
            />
          ) : layout === 'list' ? (
            // List view with grouping - pass groups to single CardGrid for inline separators
            <CardGrid
              cards={sortedCards}
              layout={layout}
              onReorder={handleReorder}
              cardSize={cardSize}
              cardSpacing={cardSpacing}
              displaySettings={{ cardPadding, showMetadataFooter, showUrlPill, showTitles, showTags }}
              groups={groupedCards}
              groupIcon={GroupIcon || undefined}
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
                    onReorder={handleReorder}
                    cardSize={cardSize}
                    cardSpacing={cardSpacing}
                    displaySettings={{ cardPadding, showMetadataFooter, showUrlPill, showTitles, showTags }}
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
