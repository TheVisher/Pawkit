'use client';

import { useRef } from 'react';
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
import { MobileViewOptions } from '@/components/layout/mobile-view-options';
import { useCollections } from '@/lib/contexts/convex-data-context';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { useOmnibarCollision } from '@/lib/hooks/use-omnibar-collision';
import { cn } from '@/lib/utils';
import type { Collection } from '@/lib/types/convex';

interface PawkitHeaderProps {
    collection: Collection;
}

export function PawkitHeader({ collection }: PawkitHeaderProps) {
    const workspace = useCurrentWorkspace();
    const collections = useCollections();
    const openCoverImagePicker = useModalStore((s) => s.openCoverImagePicker);

    // Collision detection for omnibar
    const headerRef = useRef<HTMLDivElement>(null);
    const needsOffset = useOmnibarCollision(headerRef, [collection.name]);

    // Build breadcrumb trail
    const breadcrumbs: Collection[] = [];
    let current: Collection | undefined = collection;

    while (current && current.parentId) {
        const parent = collections.find((c) => c._id === current?.parentId);
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
                <div key={crumb._id} className="flex items-center gap-1.5">
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

    const hasCoverImage = !!collection.coverImage;

    const actions = (
        <div className="flex items-center gap-1">
            <MobileViewOptions viewType="pawkit" />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openCoverImagePicker(collection._id)}>
                        <ImagePlus className="h-4 w-4 mr-2" />
                        {hasCoverImage ? 'Change cover' : 'Add cover'}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>Rename</DropdownMenuItem>
                    <DropdownMenuItem disabled>Change Icon</DropdownMenuItem>
                    <DropdownMenuItem disabled className="text-destructive">Delete Pawkit</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );

    return (
        <div className={cn('transition-[padding] duration-200', needsOffset && 'md:pt-20')}>
            <div className="relative group/cover">
                {/* Cover Image Area - positioned absolutely as background layer */}
                {hasCoverImage && (
                    <>
                        <div className="absolute inset-x-0 top-0 overflow-hidden pointer-events-none">
                            {/* Image container with mask for smooth fade */}
                            <div
                                className="relative w-full"
                                style={{
                                    height: `${collection.coverImageHeight ?? 224}px`,
                                    maskImage: 'linear-gradient(to bottom, black 0%, black 40%, rgba(0,0,0,0.8) 60%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.1) 90%, transparent 100%)',
                                    WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 40%, rgba(0,0,0,0.8) 60%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.1) 90%, transparent 100%)',
                                }}
                            >
                                <Image
                                    src={collection.coverImage!}
                                    alt=""
                                    fill
                                    sizes="100vw"
                                    className="object-cover"
                                    style={{
                                        objectPosition: `center ${collection.coverImagePosition ?? 50}%`
                                    }}
                                />
                            </div>
                        </div>

                        {/* Change cover button - separate element for pointer events */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover/cover:opacity-100 transition-opacity z-20">
                            <button
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-bg-base/80 backdrop-blur-sm text-text-muted hover:text-text-primary text-xs transition-colors border border-border-subtle"
                                onClick={() => openCoverImagePicker(collection._id)}
                            >
                                <ImagePlus className="h-3.5 w-3.5" />
                                Change cover
                            </button>
                        </div>
                    </>
                )}

                {/* Header with title - offset down to overlap cover image */}
                <div
                    className="relative z-10"
                    style={{
                        paddingTop: hasCoverImage ? `${collection.coverContentOffset ?? 0}px` : undefined
                    }}
                >
                    <div ref={headerRef} className="w-fit">
                        <PageHeader title={collection.name} subtitle={subtitle} actions={actions} />
                    </div>
                </div>
            </div>
        </div>
    );
}
