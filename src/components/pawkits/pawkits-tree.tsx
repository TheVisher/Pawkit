'use client';

import { useState, useMemo } from 'react';
import { useDataStore } from '@/lib/stores/data-store';
import { PawkitTreeItem } from './pawkit-tree-item';
import type { LocalCollection } from '@/lib/db';
import { CreatePawkitButton } from './create-pawkit-button';

export function PawkitsTree() {
    const collections = useDataStore((state) => state.collections);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Build tree structure
    const rootCollections = useMemo(() => {
        return collections
            .filter((c) => !c.parentId && !c._deleted)
            .sort((a, b) => a.position - b.position);
    }, [collections]);

    const getChildCollections = (parentId: string) => {
        return collections
            .filter((c) => c.parentId === parentId && !c._deleted)
            .sort((a, b) => a.position - b.position);
    };

    const toggleExpand = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const renderItem = (collection: LocalCollection, level: number = 0) => {
        const children = getChildCollections(collection.id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedIds.has(collection.id);

        return (
            <div key={collection.id}>
                <PawkitTreeItem
                    collection={collection}
                    childCollections={children} // Pass empty if not expanded? No, item needs to know if children exist
                    level={level}
                    isExpanded={isExpanded}
                    onToggleExpand={toggleExpand}
                // We handle recursion here manually to pass props correctly
                />
                {isExpanded && hasChildren && (
                    <div className="mt-0.5">
                        {children.map((child) => renderItem(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-0.5 px-2">
            {/* Header */}
            <div className="flex items-center justify-between px-2 py-1.5 mb-1 group">
                <h3 className="text-xs font-medium uppercase text-text-muted">Pawkits</h3>
            </div>

            {rootCollections.map((c) => renderItem(c))}

            <div className="mt-2 text-xs text-text-muted hover:text-text-primary px-2 transition-colors cursor-pointer">
                <CreatePawkitButton />
            </div>
        </div>
    );
}
