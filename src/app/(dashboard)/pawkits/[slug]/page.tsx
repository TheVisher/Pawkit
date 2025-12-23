'use client';

import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useParams, useRouter } from 'next/navigation';
import { useDataStore, selectCollectionBySlug, selectCardsByCollection } from '@/lib/stores/data-store';
import { useViewActions, useViewSettings, useCardDisplaySettings } from '@/lib/stores/view-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { MasonryGrid } from '@/components/cards/masonry-grid';
import { PawkitHeader } from '@/components/pawkits/pawkit-header';

export default function PawkitPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;

    const collection = useDataStore(selectCollectionBySlug(slug));
    const cards = useDataStore(useShallow(selectCardsByCollection(slug)));
    const isLoading = useDataStore((state) => state.isLoading);
    const { loadViewSettings, reorderCards } = useViewActions();
    const { cardOrder, sortBy } = useViewSettings();
    const { cardPadding, cardSpacing, cardSize, showMetadataFooter, showUrlPill, showTitles, showTags } = useCardDisplaySettings();
    const workspace = useCurrentWorkspace();

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
        <div className="flex-1">
            <PawkitHeader collection={collection} />

            <div className="px-6 pt-4 pb-6">
                {sortedCards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-text-muted">
                        <p>No cards in this pawkit yet.</p>
                        <p className="text-sm mt-2">Drag cards here from the Library.</p>
                    </div>
                ) : (
                    <MasonryGrid
                        cards={sortedCards}
                        onReorder={reorderCards}
                        cardSize={cardSize}
                        cardSpacing={cardSpacing}
                        displaySettings={{ cardPadding, showMetadataFooter, showUrlPill, showTitles, showTags }}
                    />
                )}
            </div>
        </div>
    );
}
