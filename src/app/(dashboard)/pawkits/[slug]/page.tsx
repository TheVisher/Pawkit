'use client';

import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useParams, useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Folder, CalendarDays, Tag, Type, Globe } from 'lucide-react';
import { useDataStore, selectCollectionBySlug, selectCardsByCollection } from '@/lib/stores/data-store';
import {
    useViewStore,
    useViewActions,
    useViewSettings,
    useCardDisplaySettings,
    useSubPawkitSettings,
    cardMatchesContentTypes,
    cardMatchesUnsortedFilter,
    cardMatchesReadingFilter,
    cardMatchesLinkStatusFilter,
    findDuplicateCardIds,
} from '@/lib/stores/view-store';
import type { GroupBy, DateGrouping, UnsortedFilter, ReadingFilter, LinkStatusFilter } from '@/lib/stores/view-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { CardGrid } from '@/components/cards/card-grid';
import { PawkitHeader } from '@/components/pawkits/pawkit-header';
import { PawkitCard } from '@/components/pawkits/pawkit-card';
import { ContentAreaContextMenu } from '@/components/context-menus';
import { cn } from '@/lib/utils';
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

export default function PawkitPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;

    const collection = useDataStore(selectCollectionBySlug(slug));
    const collections = useDataStore((state) => state.collections);
    const cards = useDataStore(useShallow(selectCardsByCollection(slug)));
    const isLoading = useDataStore((state) => state.isLoading);

    // State for sub-pawkits section collapse
    const [subPawkitsExpanded, setSubPawkitsExpanded] = useState(true);
    const { loadViewSettings, reorderCards } = useViewActions();
    const { cardOrder, sortBy } = useViewSettings();
    const { cardPadding, cardSpacing, cardSize, showMetadataFooter, showUrlPill, showTitles, showTags } = useCardDisplaySettings();
    const { subPawkitSize, subPawkitColumns } = useSubPawkitSettings();
    const workspace = useCurrentWorkspace();

    // Filter state from view store
    const layout = useViewStore((state) => state.layout);
    const sortOrder = useViewStore((state) => state.sortOrder);
    const contentTypeFilters = useViewStore((state) => state.contentTypeFilters);
    const selectedTags = useViewStore((state) => state.selectedTags);
    const unsortedFilter = useViewStore((state) => state.unsortedFilter) as UnsortedFilter;
    const readingFilter = useViewStore((state) => state.readingFilter) as ReadingFilter;
    const linkStatusFilter = useViewStore((state) => state.linkStatusFilter) as LinkStatusFilter;
    const showDuplicatesOnly = useViewStore((state) => state.showDuplicatesOnly);
    const groupBy = useViewStore((state) => state.groupBy) as GroupBy;
    const dateGrouping = useViewStore((state) => state.dateGrouping) as DateGrouping;

    // Get grid columns class based on subPawkitColumns setting
    const getSubPawkitGridCols = () => {
        switch (subPawkitColumns) {
            case 2: return 'grid-cols-1 sm:grid-cols-2';
            case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
            case 4: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
            case 5: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
            case 6: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6';
            default: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
        }
    };

    // Calculate duplicate card IDs (memoized)
    const duplicateCardIds = useMemo(() => {
        return findDuplicateCardIds(cards);
    }, [cards]);

    // Filter cards based on all filter settings
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
        if (sortBy === 'manual' && cardOrder && cardOrder.length > 0) {
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
                const groupCards = groups.get(label);
                if (groupCards) {
                    result.push({ key: label, label, cards: groupCards });
                    groups.delete(label);
                }
            }
            // Then add any remaining groups (for non-smart date groupings)
            for (const [label, groupCards] of groups) {
                result.push({ key: label, label, cards: groupCards });
            }
        } else {
            // For other groupings, sort alphabetically but put 'Untagged'/'No Domain' last
            const entries = Array.from(groups.entries());
            entries.sort((a, b) => {
                if (a[0] === 'Untagged' || a[0] === 'No Domain') return 1;
                if (b[0] === 'Untagged' || b[0] === 'No Domain') return -1;
                return a[0].localeCompare(b[0]);
            });
            for (const [label, groupCards] of entries) {
                result.push({ key: label, label, cards: groupCards });
            }
        }

        return result;
    }, [sortedCards, groupBy, dateGrouping, sortOrder]);

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

    // Get child collections (sub-pawkits)
    const childCollections = useMemo(() => {
        if (!collection) return [];
        return collections
            .filter((c) => c.parentId === collection.id && !c._deleted)
            .sort((a, b) => a.position - b.position);
    }, [collections, collection]);

    const hasSubPawkits = childCollections.length > 0;

    // Load view settings for this pawkit
    useEffect(() => {
        if (workspace && slug) {
            loadViewSettings(workspace.id, `pawkit:${slug}`);
        }
    }, [workspace, slug, loadViewSettings]);

    // If collection doesn't exist (and not loading), redirect to library
    useEffect(() => {
        // Only redirect if we definitely know it doesn't exist (store loaded)
        // But data might still be loading initially.
        // Ideally we check if "loadAll" has completed.
        // For now, if collection is missing after a timeout or check, redirect.
        // But simplified: if not found, showing 404 or redirect.
    }, [collection, isLoading, router]);

    if (!collection) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
                <p>Collection not found</p>
                <button
                    onClick={() => router.push('/library')}
                    className="mt-4 text-[var(--color-accent)] hover:underline"
                >
                    Return to Library
                </button>
            </div>
        );
    }

    return (
        <ContentAreaContextMenu>
            <div className="flex-1">
                <PawkitHeader collection={collection} />

                <div className="px-4 md:px-6 pt-4 pb-6 space-y-6">
                    {/* Sub-Pawkits Section */}
                    {hasSubPawkits && (
                        <div>
                            <button
                                onClick={() => setSubPawkitsExpanded(!subPawkitsExpanded)}
                                className="flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors mb-3"
                            >
                                {subPawkitsExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                                <Folder className="h-4 w-4" />
                                Sub-Pawkits
                                <span className="text-text-muted">({childCollections.length})</span>
                            </button>
                            {subPawkitsExpanded && (
                                <div className={cn('grid gap-4', getSubPawkitGridCols())}>
                                    {childCollections.map((child) => (
                                        <PawkitCard key={child.id} collection={child} size={subPawkitSize} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cards Section */}
                    {sortedCards.length === 0 && !hasSubPawkits ? (
                        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
                            <p>No cards in this pawkit yet.</p>
                            <p className="text-sm mt-2">Drag cards here from the Library.</p>
                        </div>
                    ) : sortedCards.length > 0 ? (
                        <div>
                            {hasSubPawkits && (
                                <div className="flex items-center gap-2 text-sm font-medium text-text-muted mb-3">
                                    Cards
                                    <span>({sortedCards.length})</span>
                                </div>
                            )}

                            {/* Layout rendering based on layout and groupBy */}
                            {groupBy === 'none' ? (
                                <CardGrid
                                    cards={sortedCards}
                                    layout={layout}
                                    onReorder={reorderCards}
                                    cardSize={cardSize}
                                    cardSpacing={cardSpacing}
                                    displaySettings={{ cardPadding, showMetadataFooter, showUrlPill, showTitles, showTags }}
                                    currentCollection={slug}
                                />
                            ) : layout === 'list' ? (
                                // List view with grouping - pass groups to single CardGrid for inline separators
                                <CardGrid
                                    cards={sortedCards}
                                    layout={layout}
                                    onReorder={reorderCards}
                                    cardSize={cardSize}
                                    cardSpacing={cardSpacing}
                                    displaySettings={{ cardPadding, showMetadataFooter, showUrlPill, showTitles, showTags }}
                                    groups={groupedCards}
                                    groupIcon={GroupIcon || undefined}
                                    currentCollection={slug}
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
                                                onReorder={reorderCards}
                                                cardSize={cardSize}
                                                cardSpacing={cardSpacing}
                                                displaySettings={{ cardPadding, showMetadataFooter, showUrlPill, showTitles, showTags }}
                                                currentCollection={slug}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </ContentAreaContextMenu>
    );
}
