'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, MoreHorizontal, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/layout/page-header';
import { useCollections } from '@/lib/stores/data-store';
import { cn } from '@/lib/utils';
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
            <Link href="/pawkits" className="hover:text-text-primary transition-colors">
                Pawkits
            </Link>
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
        <Link href="/pawkits" className="hover:text-text-primary transition-colors">
            Pawkits
        </Link>
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

    const hasCoverImage = !!collection.coverImage;

    return (
        <div>
            {/* Cover Image Area */}
            <div
                className={cn(
                    'relative group',
                    hasCoverImage ? 'h-48' : 'h-24'
                )}
            >
                {hasCoverImage ? (
                    <>
                        <Image
                            src={collection.coverImage!}
                            alt=""
                            fill
                            className="object-cover"
                            style={{
                                objectPosition: `center ${collection.coverImagePosition ?? 50}%`
                            }}
                        />
                        {/* Gradient overlay for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-bg-base/80 via-bg-base/20 to-transparent" />
                    </>
                ) : (
                    /* Empty cover placeholder - shows on hover */
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-bg-surface-2/50">
                        <button
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-surface-2 text-text-muted hover:text-text-primary hover:bg-bg-surface-3 transition-colors text-sm"
                            onClick={() => {
                                // TODO: Open cover image picker
                                console.log('Add cover image');
                            }}
                        >
                            <ImagePlus className="h-4 w-4" />
                            Add cover
                        </button>
                    </div>
                )}

                {/* Change cover button - only when there's an existing cover */}
                {hasCoverImage && (
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-bg-base/80 backdrop-blur-sm text-text-muted hover:text-text-primary text-xs transition-colors"
                            onClick={() => {
                                // TODO: Open cover image picker
                                console.log('Change cover image');
                            }}
                        >
                            <ImagePlus className="h-3.5 w-3.5" />
                            Change cover
                        </button>
                    </div>
                )}
            </div>

            {/* Header with title - positioned to overlap cover slightly when present */}
            <div className={cn(hasCoverImage && '-mt-8 relative z-10')}>
                <PageHeader title={collection.name} subtitle={subtitle} actions={actions} />
            </div>
        </div>
    );
}
