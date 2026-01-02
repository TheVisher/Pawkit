'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ImagePlus, Link2, X, Check, MoveVertical, Maximize2, ArrowDown } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useModalStore } from '@/lib/stores/modal-store';
import { useDataStore } from '@/lib/stores/data-store';
import { useCards, useCollections } from '@/lib/hooks/use-live-data';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { cn } from '@/lib/utils';

export function CoverImagePickerModal() {
    const { isCoverImagePickerOpen, coverImageCollectionId, closeCoverImagePicker } = useModalStore();
    const workspace = useCurrentWorkspace();
    const collections = useCollections(workspace?.id);
    const cards = useCards(workspace?.id);
    const updateCollection = useDataStore((state) => state.updateCollection);
    const toast = useToastStore((s) => s.toast);

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [urlInput, setUrlInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('gallery');

    // Cover adjustments
    const [coverHeight, setCoverHeight] = useState(224);
    const [coverPosition, setCoverPosition] = useState(50);
    const [contentOffset, setContentOffset] = useState(0);

    // Live update helper - updates collection immediately for real-time preview
    const updateLive = async (updates: Partial<{ coverImageHeight: number; coverImagePosition: number; coverContentOffset: number }>) => {
        if (!coverImageCollectionId) return;
        try {
            await updateCollection(coverImageCollectionId, updates);
        } catch (err) {
            console.error('Failed to update:', err);
        }
    };

    // Get the collection being edited
    const collection = useMemo(() => {
        if (!coverImageCollectionId) return null;
        return collections.find(c => c.id === coverImageCollectionId);
    }, [collections, coverImageCollectionId]);

    // Get cards with images from this collection
    const collectionCards = useMemo(() => {
        if (!collection) return [];
        return cards.filter(
            card => card.collections.includes(collection.slug) && !card._deleted && card.image
        );
    }, [cards, collection]);

    // Current preview image
    const previewImage = activeTab === 'url' ? urlInput : selectedImage;

    // Reset form when modal opens
    useEffect(() => {
        if (isCoverImagePickerOpen && collection) {
            setSelectedImage(collection.coverImage || null);
            setUrlInput('');
            setActiveTab(collection.coverImage ? 'adjust' : 'gallery');
            setCoverHeight(collection.coverImageHeight ?? 224);
            setCoverPosition(collection.coverImagePosition ?? 50);
            setContentOffset(collection.coverContentOffset ?? 0);
        }
    }, [isCoverImagePickerOpen, collection]);

    const handleSubmit = async () => {
        if (!coverImageCollectionId) return;

        const imageUrl = activeTab === 'url' ? urlInput.trim() : selectedImage;

        setIsSubmitting(true);

        try {
            await updateCollection(coverImageCollectionId, {
                coverImage: imageUrl || undefined,
                coverImageHeight: coverHeight,
                coverImagePosition: coverPosition,
                coverContentOffset: contentOffset,
            });

            toast({
                type: 'success',
                message: imageUrl ? 'Cover image updated' : 'Cover image removed',
            });

            closeCoverImagePicker();
        } catch (err) {
            console.error('Failed to update cover image:', err);
            toast({
                type: 'error',
                message: 'Failed to update cover image',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveCover = async () => {
        if (!coverImageCollectionId) return;

        setIsSubmitting(true);

        try {
            await updateCollection(coverImageCollectionId, {
                coverImage: undefined,
                coverImageHeight: undefined,
                coverImagePosition: undefined,
                coverContentOffset: undefined,
            });

            toast({
                type: 'success',
                message: 'Cover image removed',
            });

            closeCoverImagePicker();
        } catch (err) {
            console.error('Failed to remove cover image:', err);
            toast({
                type: 'error',
                message: 'Failed to remove cover image',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            closeCoverImagePicker();
        }
    };

    const hasExistingCover = !!collection?.coverImage;

    return (
        <Dialog open={isCoverImagePickerOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-bg-surface-1 border-border-subtle max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ImagePlus className="h-5 w-5 text-accent" />
                        {hasExistingCover ? 'Edit Cover Image' : 'Set Cover Image'}
                    </DialogTitle>
                    <DialogDescription>
                        {hasExistingCover
                            ? 'Adjust your cover image or choose a new one'
                            : `Choose a cover image for "${collection?.name}"`
                        }
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className={cn('grid w-full', hasExistingCover ? 'grid-cols-3' : 'grid-cols-2')}>
                        {hasExistingCover && <TabsTrigger value="adjust">Adjust</TabsTrigger>}
                        <TabsTrigger value="gallery">From Cards</TabsTrigger>
                        <TabsTrigger value="url">Image URL</TabsTrigger>
                    </TabsList>

                    {/* Adjust Tab - only when cover exists */}
                    {hasExistingCover && (
                        <TabsContent value="adjust" className="mt-4 space-y-4">
                            <p className="text-xs text-text-muted mb-2">
                                Drag the sliders to see changes live on the page behind this modal.
                            </p>

                            {/* Height Slider */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2 text-sm">
                                        <Maximize2 className="h-4 w-4 text-text-muted" />
                                        Height
                                    </Label>
                                    <span className="text-xs text-text-muted">{coverHeight}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="120"
                                    max="400"
                                    value={coverHeight}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setCoverHeight(val);
                                        updateLive({ coverImageHeight: val });
                                    }}
                                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                    style={{
                                        background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${((coverHeight - 120) / 280) * 100}%, var(--color-bg-surface-3) ${((coverHeight - 120) / 280) * 100}%, var(--color-bg-surface-3) 100%)`,
                                    }}
                                />
                                <div className="flex justify-between text-xs text-text-muted">
                                    <span>Short</span>
                                    <span>Tall</span>
                                </div>
                            </div>

                            {/* Position Slider */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2 text-sm">
                                        <MoveVertical className="h-4 w-4 text-text-muted" />
                                        Image Position
                                    </Label>
                                    <span className="text-xs text-text-muted">{coverPosition}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={coverPosition}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setCoverPosition(val);
                                        updateLive({ coverImagePosition: val });
                                    }}
                                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                    style={{
                                        background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${coverPosition}%, var(--color-bg-surface-3) ${coverPosition}%, var(--color-bg-surface-3) 100%)`,
                                    }}
                                />
                                <div className="flex justify-between text-xs text-text-muted">
                                    <span>Top</span>
                                    <span>Bottom</span>
                                </div>
                            </div>

                            {/* Content Offset Slider */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2 text-sm">
                                        <ArrowDown className="h-4 w-4 text-text-muted" />
                                        Title Position
                                    </Label>
                                    <span className="text-xs text-text-muted">{contentOffset}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="200"
                                    value={contentOffset}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setContentOffset(val);
                                        updateLive({ coverContentOffset: val });
                                    }}
                                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                    style={{
                                        background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${(contentOffset / 200) * 100}%, var(--color-bg-surface-3) ${(contentOffset / 200) * 100}%, var(--color-bg-surface-3) 100%)`,
                                    }}
                                />
                                <div className="flex justify-between text-xs text-text-muted">
                                    <span>Top</span>
                                    <span>Lower</span>
                                </div>
                            </div>
                        </TabsContent>
                    )}

                    <TabsContent value="gallery" className="mt-4">
                        {collectionCards.length === 0 ? (
                            <div className="text-center py-8 text-text-muted">
                                <p>No cards with images in this pawkit.</p>
                                <p className="text-sm mt-1">Add cards with images or use a URL instead.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2 max-h-[250px] overflow-y-auto">
                                {collectionCards.map((card) => (
                                    <button
                                        key={card.id}
                                        onClick={() => setSelectedImage(card.image!)}
                                        className={cn(
                                            'relative aspect-video rounded-lg overflow-hidden border-2 transition-all',
                                            selectedImage === card.image
                                                ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30'
                                                : 'border-transparent hover:border-border-subtle'
                                        )}
                                    >
                                        <Image
                                            src={card.image!}
                                            alt=""
                                            fill
                                            sizes="150px"
                                            className="object-cover"
                                        />
                                        {selectedImage === card.image && (
                                            <div className="absolute inset-0 bg-[var(--color-accent)]/20 flex items-center justify-center">
                                                <Check className="h-6 w-6 text-white drop-shadow-md" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="url" className="mt-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="imageUrl">Image URL</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                        <Input
                                            id="imageUrl"
                                            placeholder="https://example.com/image.jpg"
                                            value={urlInput}
                                            onChange={(e) => setUrlInput(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                            </div>

                            {urlInput && (
                                <div className="relative aspect-video rounded-lg overflow-hidden bg-bg-surface-2 border border-border-subtle">
                                    <Image
                                        src={urlInput}
                                        alt="Preview"
                                        fill
                                        sizes="500px"
                                        className="object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    {hasExistingCover && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleRemoveCover}
                            disabled={isSubmitting}
                            className="sm:mr-auto text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        >
                            <X className="h-4 w-4 mr-1" />
                            Remove Cover
                        </Button>
                    )}
                    <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    {activeTab === 'adjust' ? (
                        <Button onClick={() => handleOpenChange(false)}>
                            Done
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || (activeTab === 'gallery' && !selectedImage) || (activeTab === 'url' && !urlInput.trim())}
                        >
                            {isSubmitting ? 'Saving...' : 'Set Cover'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
