'use client';

import { useDndMonitor, DragEndEvent } from '@dnd-kit/core';
import { useMutations, useCards } from '@/lib/contexts/convex-data-context';
import { useToastStore } from '@/lib/stores/toast-store';

export function CardsDragHandler() {
    const { updateCard } = useMutations();
    const cards = useCards();
    const toast = useToastStore((state) => state.toast);

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

                    const currentTags = card.tags || [];
                    if (currentTags.includes(collectionSlug)) {
                        return;
                    }

                    await updateCard(card._id, {
                        tags: [...currentTags, collectionSlug],
                    });

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
