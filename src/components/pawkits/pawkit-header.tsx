'use client';

import Link from 'next/link';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/layout/page-header';
import { useCollections } from '@/lib/stores/data-store';
import type { LocalCollection } from '@/lib/db';

interface PawkitHeaderProps {
    collection: LocalCollection;
}

export function PawkitHeader({ collection }: PawkitHeaderProps) {
    const collections = useCollections();

    // Build breadcrumb trail
    const breadcrumbs: LocalCollection[] = [];
    let current: LocalCollection | undefined = collection;

    while (current && current.parentId) {
        const parent = collections.find((c) => c.id === current?.parentId);
        if (parent) {
            breadcrumbs.unshift(parent);
            current = parent;
        } else {
            current = undefined;
        }
    }

    // For nested pawkits, show parent trail; for root pawkits, just "Pawkits"
    const subtitle = breadcrumbs.length > 0 ? (
        <div className="flex items-center gap-1.5">
            <span>Pawkits</span>
            {breadcrumbs.map((crumb) => (
                <div key={crumb.id} className="flex items-center gap-1.5">
                    <ChevronRight className="h-3 w-3" />
                    <Link
                        href={`/pawkits/${crumb.slug}`}
                        className="hover:text-text-primary transition-colors"
                    >
                        {crumb.name}
                    </Link>
                </div>
            ))}
        </div>
    ) : (
        <span>Pawkits</span>
    );

    const actions = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>Rename</DropdownMenuItem>
                <DropdownMenuItem disabled>Change Icon</DropdownMenuItem>
                <DropdownMenuItem disabled className="text-destructive">Delete Pawkit</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return <PageHeader title={collection.name} subtitle={subtitle} actions={actions} />;
}
