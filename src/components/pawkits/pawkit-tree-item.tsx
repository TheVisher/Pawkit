'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDroppable } from '@dnd-kit/core';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PawkitContextMenu } from '@/components/context-menus';
import type { LocalCollection } from '@/lib/db';

interface PawkitTreeItemProps {
    collection: LocalCollection;
    childCollections?: LocalCollection[];
    level?: number;
    isExpanded?: boolean;
    onToggleExpand?: (id: string) => void;
    cardCount?: number;
}

export function PawkitTreeItem({
    collection,
    childCollections = [],
    level = 0,
    isExpanded = false,
    onToggleExpand,
    cardCount = 0,
}: PawkitTreeItemProps) {
    const pathname = usePathname();
    const isActive = pathname === `/pawkits/${collection.slug}`;
    const hasChildren = childCollections.length > 0;

    // DnD Drop Target
    const { setNodeRef, isOver } = useDroppable({
        id: `collection-${collection.slug}`,
        data: {
            type: 'collection',
            slug: collection.slug,
            name: collection.name,
        },
    });

    return (
        <PawkitContextMenu collection={collection}>
            <div className="select-none">
                <div
                    ref={setNodeRef}
                    className={cn(
                        'group flex items-center justify-between py-1 px-2 rounded-md transition-colors cursor-pointer text-sm',
                        isActive
                            ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-medium'
                            : 'text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary',
                        isOver && 'bg-[var(--color-accent)]/20 ring-2 ring-inset ring-[var(--color-accent)]'
                    )}
                    style={{ paddingLeft: `${level * 12 + 8}px` }}
                >
                    <div className="flex items-center flex-1 min-w-0 gap-2">
                        {/* Expand/Collapse Toggle */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleExpand?.(collection.id);
                            }}
                            className={cn(
                                'h-4 w-4 shrink-0 flex items-center justify-center rounded-sm hover:bg-bg-surface-2',
                                !hasChildren && 'invisible'
                            )}
                        >
                            {isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                            ) : (
                                <ChevronRight className="h-3 w-3" />
                            )}
                        </button>

                        {/* Link to Pawkit Page */}
                        <Link href={`/pawkits/${collection.slug}`} className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                            {isActive ? (
                                <FolderOpen className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                            ) : (
                                <Folder className="h-4 w-4 shrink-0" />
                            )}
                            <span className="truncate">{collection.name}</span>
                        </Link>
                    </div>

                    {/* Card count */}
                    {cardCount > 0 && (
                        <span className="text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                            {cardCount}
                        </span>
                    )}
                </div>
            </div>
        </PawkitContextMenu>
    );
}
