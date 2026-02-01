'use client';

import { useDndMonitor, DragEndEvent } from '@dnd-kit/core';
import { useMutations, useCards, useCollections } from '@/lib/contexts/convex-data-context';
import { useToastStore } from '@/lib/stores/toast-store';
import { isCardInPawkit } from '@/lib/utils/pawkit-membership';

export function CardsDragHandler() {
    const { addCardToCollection } = useMutations();
    const cards = useCards();
    const collections = useCollections();
    const toast = useToastStore((state) => state.toast);

    // Route all membership changes through collections.addCard
    // This ensures tags and collectionNotes stay in sync
    // @see docs/adr/0001-tags-canonical-membership.md
    useDndMonitor({
        onDragEnd: async (event: DragEndEvent) => {
            const { active, over } = event;

            if (!over) return;

            // Check if dropped on a collection
            const overData = over.data.current;
            const isCollection = overData?.type === 'collection';

            if (isCollection && overData.slug) {
                // Check if dragged item is a card
                const activeData = active.data.current;
                const isCard = activeData?.type === 'Card';

                if (isCard) {
                    const cardId = active.id as string;
                    const collectionSlug = overData.slug as string;
                    const collectionName = overData.name || collectionSlug;

                    const card = cards.find((c) => c._id === cardId);
                    if (!card) return;

                    // Check if already in collection using helper
                    if (isCardInPawkit(card, collectionSlug)) {
                        return;
                    }

                    // Find the collection by slug
                    const collection = collections.find((c) => c.slug === collectionSlug);
                    if (!collection) return;

                    await addCardToCollection(collection._id, card._id);

                    toast({
                        type: 'success',
                        message: `Added to ${collectionName}`,
                        duration: 2000,
                    });
                }
            }
        },
    });

    return null;
}
