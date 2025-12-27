'use client';

import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useParams, useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Folder } from 'lucide-react';
import { useDataStore, selectCollectionBySlug, selectCardsByCollection } from '@/lib/stores/data-store';
import { useViewActions, useViewSettings, useCardDisplaySettings, useSubPawkitSettings } from '@/lib/stores/view-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { MasonryGrid } from '@/components/cards/masonry-grid';
import { PawkitHeader } from '@/components/pawkits/pawkit-header';
import { PawkitCard } from '@/components/pawkits/pawkit-card';
import { ContentAreaContextMenu } from '@/components/context-menus';
import { cn } from '@/lib/utils';

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

    // Sort cards based on manual order if 'manual' sort is active or if cardOrder exists
    const sortedCards = useMemo(() => {
        if (!cardOrder || cardOrder.length === 0 || sortBy !== 'manual') {
            return cards;
        }

        const cardMap = new Map(cards.map(c => [c.id, c]));
        const sorted: typeof cards = [];

        // Add cards in the order specified by cardOrder
        for (const id of cardOrder) {
            const card = cardMap.get(id);
            if (card) {
                sorted.push(card);
                cardMap.delete(id);
            }
        }

        // Append any remaining cards that weren't in cardOrder (e.g. newly added)
        // They go to the end
        if (cardMap.size > 0) {
            sorted.push(...Array.from(cardMap.values()));
        }

        return sorted;
    }, [cards, cardOrder, sortBy]);

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
                            <MasonryGrid
                                cards={sortedCards}
                                onReorder={reorderCards}
                                cardSize={cardSize}
                                cardSpacing={cardSpacing}
                                displaySettings={{ cardPadding, showMetadataFooter, showUrlPill, showTitles, showTags }}
                            />
                        </div>
                    ) : null}
                </div>
            </div>
        </ContentAreaContextMenu>
    );
}
