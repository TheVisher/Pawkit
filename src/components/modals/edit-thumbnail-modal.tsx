'use client';

/**
 * Edit Thumbnail Modal
 * For editing bookmark card thumbnails via URL input
 */

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ImagePlus, Link2, X, Trash2 } from 'lucide-react';
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
import { useModalStore } from '@/lib/stores/modal-store';
import { useDataStore } from '@/lib/stores/data-store';
import { useCard } from '@/lib/hooks/use-live-data';
import { useToastStore } from '@/lib/stores/toast-store';

export function EditThumbnailModal() {
  const { isEditThumbnailOpen, editThumbnailCardId, closeEditThumbnail } = useModalStore();
  const card = useCard(editThumbnailCardId || '');
  const updateCard = useDataStore((state) => state.updateCard);
  const toast = useToastStore((s) => s.toast);

  const [urlInput, setUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isEditThumbnailOpen && card) {
      setUrlInput(card.image || '');
      setPreviewLoaded(!!card.image);
      setPreviewError(false);
    }
  }, [isEditThumbnailOpen, card]);

  // Handle URL input change
  const handleUrlChange = (value: string) => {
    setUrlInput(value);
    setPreviewError(false);
    setPreviewLoaded(false);
  };

  // Save thumbnail
  const handleSave = async () => {
    if (!editThumbnailCardId) return;

    setIsSubmitting(true);

    try {
      const newImage = urlInput.trim() || undefined;
      await updateCard(editThumbnailCardId, { image: newImage });

      toast({
        type: 'success',
        message: newImage ? 'Thumbnail updated' : 'Thumbnail removed',
      });

      closeEditThumbnail();
    } catch (err) {
      console.error('Failed to update thumbnail:', err);
      toast({
        type: 'error',
        message: 'Failed to update thumbnail',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear thumbnail
  const handleClear = () => {
    setUrlInput('');
    setPreviewLoaded(false);
    setPreviewError(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeEditThumbnail();
    }
  };

  const hasCurrentThumbnail = !!card?.image;
  const hasValidPreview = urlInput.trim() && previewLoaded && !previewError;

  return (
    <Dialog open={isEditThumbnailOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-bg-surface-1 border-border-subtle max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-accent" />
            Edit Thumbnail
          </DialogTitle>
          <DialogDescription>
            {hasCurrentThumbnail
              ? 'Update or remove the thumbnail for this bookmark'
              : 'Add a thumbnail image for this bookmark'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Thumbnail Preview */}
          {hasCurrentThumbnail && !urlInput.trim() && (
            <div className="space-y-2">
              <Label className="text-sm text-text-muted">Current Thumbnail</Label>
              <div className="relative aspect-video rounded-lg overflow-hidden bg-bg-surface-2 border border-border-subtle">
                <Image
                  src={card.image!}
                  alt="Current thumbnail"
                  fill
                  sizes="500px"
                  className="object-cover"
                />
              </div>
            </div>
          )}

          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="thumbnailUrl">Image URL</Label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                id="thumbnailUrl"
                placeholder="https://example.com/image.jpg"
                value={urlInput}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* New Image Preview */}
          {urlInput.trim() && (
            <div className="space-y-2">
              <Label className="text-sm text-text-muted">Preview</Label>
              <div className="relative aspect-video rounded-lg overflow-hidden bg-bg-surface-2 border border-border-subtle flex items-center justify-center">
                {previewError ? (
                  <div className="text-center text-text-muted">
                    <ImagePlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Failed to load image</p>
                  </div>
                ) : (
                  <>
                    <Image
                      src={urlInput}
                      alt="Thumbnail preview"
                      fill
                      sizes="500px"
                      className={`object-cover ${previewLoaded ? '' : 'opacity-0'}`}
                      onLoad={() => setPreviewLoaded(true)}
                      onError={() => setPreviewError(true)}
                    />
                    {!previewLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin h-6 w-6 border-2 border-border-subtle border-t-accent rounded-full" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {/* Clear button - only show if there's content to clear */}
          {(hasCurrentThumbnail || urlInput.trim()) && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={isSubmitting}
              className="sm:mr-auto text-red-400 hover:text-red-300 hover:bg-red-400/10"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear Thumbnail
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting || (urlInput.trim() !== '' && !previewLoaded)}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
