'use client';

/**
 * Universal Image Picker Modal
 * Consolidated modal for:
 * - 'thumbnail' mode: Edit bookmark card thumbnails (URL + upload)
 * - 'contact' mode: Edit contact photos with positioning and header color
 * - 'new-card' mode: Create a new image card from file upload or URL
 *
 * Images are compressed and uploaded to Convex Storage (not stored as Base64).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from '@/components/ui/image';
import imageCompression from 'browser-image-compression';
import { ImagePlus, Link2, X, MoveVertical, Palette, Upload, Loader2, Trash2 } from 'lucide-react';
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
import { useModalStore } from '@/lib/stores/modal-store';
import { useMutations, useCardById } from '@/lib/contexts/convex-data-context';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { cn } from '@/lib/utils';
import { GRADIENT_PRESETS } from './card-detail/contact-photo-header';
import { uploadToConvex } from '@/lib/metadata/image-persistence';
import { createEmptyPlateContent } from '@/lib/plate/html-to-plate';

// Image compression options
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,          // Max 500KB
  maxWidthOrHeight: 1920,  // Max dimension
  useWebWorker: true,
};

/**
 * Compress and upload an image file to Convex Storage
 * Returns the public URL of the uploaded image
 */
async function compressAndUploadImage(
  cardId: string,
  file: File | Blob,
  onProgress?: (message: string) => void
): Promise<string | null> {
  try {
    onProgress?.('Compressing image...');

    // Convert Blob to File if needed (for compression library)
    const fileToCompress = file instanceof File
      ? file
      : new File([file], 'image.jpg', { type: file.type || 'image/jpeg' });

    // Compress the image
    const compressedFile = await imageCompression(fileToCompress, COMPRESSION_OPTIONS);
    console.log('[ImagePicker] Compressed:', {
      original: `${(file.size / 1024).toFixed(1)}KB`,
      compressed: `${(compressedFile.size / 1024).toFixed(1)}KB`,
    });

    onProgress?.('Uploading to storage...');

    // Upload to Convex Storage
    const url = await uploadToConvex(cardId, compressedFile, compressedFile.type);

    if (!url) {
      throw new Error('Failed to upload image');
    }

    return url;
  } catch (error) {
    console.error('[ImagePicker] Upload failed:', error);
    return null;
  }
}

// Convert file to data URL (only used for preview, not storage)
async function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function CardPhotoPickerModal() {
  const {
    isImagePickerOpen,
    imagePickerCardId,
    imagePickerMode,
    closeImagePicker
  } = useModalStore();

  const card = useCardById(imagePickerCardId as any);
  const { updateCard, createCard } = useMutations();
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const triggerMuuriLayout = useUIStore((state) => state.triggerMuuriLayout);
  const toast = useToastStore((s) => s.toast);

  const [urlInput, setUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);

  // Track pending file for upload (not yet uploaded to storage)
  // When set, this file needs to be uploaded on save
  const [pendingFile, setPendingFile] = useState<File | Blob | null>(null);

  // Adjust settings (contact mode only)
  const [imagePosition, setImagePosition] = useState(50);
  const [gradientColor, setGradientColor] = useState(GRADIENT_PRESETS[0]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived state
  const mode = imagePickerMode;
  const isContactMode = mode === 'contact';
  const isThumbnailMode = mode === 'thumbnail';
  const isNewCardMode = mode === 'new-card';

  // Reset form when modal opens
  useEffect(() => {
    if (isImagePickerOpen) {
      if (isNewCardMode) {
        // New card mode - start fresh
        setPreviewImage(null);
        setUrlInput('');
        setActiveTab('upload');
        setImagePosition(50);
        setGradientColor(GRADIENT_PRESETS[0]);
        setImageError(false);
        setPendingFile(null);
        setUploadProgress(null);
        setPreviewLoaded(false);
      } else if (card) {
        // Existing card mode
        setPreviewImage(card.image || null);
        setUrlInput('');
        // In contact mode, start on adjust if there's an image
        // In thumbnail mode, start on URL tab if there's no image
        if (isContactMode) {
          setActiveTab(card.image ? 'adjust' : 'upload');
        } else {
          setActiveTab('upload');
        }
        setImagePosition(card.headerImagePosition ?? 50);
        setGradientColor(card.headerGradientColor || GRADIENT_PRESETS[0]);
        setImageError(false);
        setPendingFile(null);
        setUploadProgress(null);
        setPreviewLoaded(!!card.image);
      }
    }
  }, [isImagePickerOpen, card, isContactMode, isNewCardMode]);

  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Generate preview for display
      const dataUrl = await fileToDataUrl(file);
      setPreviewImage(dataUrl);
      setPreviewLoaded(true);
      // Store file for upload on save
      setPendingFile(file);
      // In contact mode, switch to adjust tab; in other modes stay on upload
      if (isContactMode) {
        setActiveTab('adjust');
      }
    } catch (err) {
      console.error('Failed to read file:', err);
      toast({ type: 'error', message: 'Failed to read image file' });
    }
  }, [toast, isContactMode]);

  // Handle paste from clipboard
  useEffect(() => {
    if (!isImagePickerOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            try {
              // Generate preview for display
              const dataUrl = await fileToDataUrl(blob);
              setPreviewImage(dataUrl);
              setPreviewLoaded(true);
              // Store blob for upload on save
              setPendingFile(blob);
              if (isContactMode) {
                setActiveTab('adjust');
              }
              toast({ type: 'success', message: 'Image pasted from clipboard' });
            } catch (err) {
              console.error('Failed to read pasted image:', err);
              toast({ type: 'error', message: 'Failed to read pasted image' });
            }
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isImagePickerOpen, toast, isContactMode]);

  // Handle URL input
  const handleUrlSubmit = useCallback(() => {
    const url = urlInput.trim();
    if (url) {
      setPreviewImage(url);
      setPreviewLoaded(false); // Will be set to true when image loads
      // Clear pending file since we're using a URL directly
      setPendingFile(null);
      if (isContactMode) {
        setActiveTab('adjust');
      }
    }
  }, [urlInput, isContactMode]);

  // Handle URL change (for thumbnail mode live preview)
  const handleUrlChange = (value: string) => {
    setUrlInput(value);
    setPreviewLoaded(false);
    setImageError(false);
  };

  // Save changes for existing card (thumbnail and contact modes)
  const handleSaveExisting = async () => {
    if (!imagePickerCardId) return;

    setIsSubmitting(true);
    setUploadProgress(null);

    try {
      let finalImageUrl = previewImage;

      // If we have a pending file, upload it to Supabase Storage
      if (pendingFile) {
        const uploadedUrl = await compressAndUploadImage(
          imagePickerCardId,
          pendingFile,
          setUploadProgress
        );

        if (!uploadedUrl) {
          toast({
            type: 'error',
            message: 'Failed to upload image. Please try again.',
          });
          setIsSubmitting(false);
          setUploadProgress(null);
          return;
        }

        finalImageUrl = uploadedUrl;
      }

      // Determine what to update based on mode
      if (isContactMode) {
        // Contact mode: update image, position, and gradient
        await updateCard(imagePickerCardId, {
          image: finalImageUrl || undefined,
          headerImagePosition: imagePosition,
          headerGradientColor: gradientColor,
        });
      } else {
        // Thumbnail mode: just update the image
        const hadImage = !!card?.image;
        const willHaveImage = !!finalImageUrl;

        await updateCard(imagePickerCardId, { image: finalImageUrl || undefined });

        // Trigger Muuri relayout if image was added or removed
        if (hadImage !== willHaveImage) {
          setTimeout(() => {
            triggerMuuriLayout();
          }, 100);
        }
      }

      toast({
        type: 'success',
        message: finalImageUrl ? (isContactMode ? 'Photo updated' : 'Thumbnail updated') : (isContactMode ? 'Photo removed' : 'Thumbnail removed'),
      });

      closeImagePicker();
    } catch (err) {
      console.error('Failed to update image:', err);
      toast({
        type: 'error',
        message: `Failed to update ${isContactMode ? 'photo' : 'thumbnail'}`,
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  // Create new image card (new-card mode)
  const handleCreateNewCard = async () => {
    if (!currentWorkspace) {
      toast({ type: 'error', message: 'No workspace selected' });
      return;
    }

    if (!previewImage && !pendingFile && !urlInput.trim()) {
      toast({ type: 'error', message: 'Please select or enter an image' });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(null);

    try {
      let finalImageUrl: string | null = null;
      let title = 'Image';

      // IMPORTANT: Upload image FIRST before creating the card
      // This prevents a race condition where the card syncs before the image URL is set
      if (pendingFile) {
        title = pendingFile instanceof File ? pendingFile.name : 'Image';

        // Generate a temporary ID for the upload path (just used for filename)
        const tempId = crypto.randomUUID();

        finalImageUrl = await compressAndUploadImage(
          tempId,
          pendingFile,
          setUploadProgress
        );

        if (!finalImageUrl) {
          toast({
            type: 'error',
            message: 'Failed to upload image. Please try again.',
          });
          setIsSubmitting(false);
          setUploadProgress(null);
          return;
        }
      } else if (urlInput.trim()) {
        // Using URL directly
        finalImageUrl = urlInput.trim();
        // Try to extract filename from URL
        try {
          const urlPath = new URL(urlInput.trim()).pathname;
          const filename = urlPath.split('/').pop();
          if (filename) title = filename;
        } catch {
          // Keep default title
        }
      }

      // Now create the card with the image URL already set
      // This ensures the card is created atomically with its image
      await createCard({
        workspaceId: currentWorkspace._id,
        type: 'file',
        url: '',
        title,
        content: createEmptyPlateContent(),
        tags: [],
        pinned: false,
        status: 'READY',
        isFileCard: true,
        image: finalImageUrl || undefined,
      });

      toast({
        type: 'success',
        message: 'Image card created',
      });

      closeImagePicker();
    } catch (err) {
      console.error('Failed to create image card:', err);
      toast({
        type: 'error',
        message: 'Failed to create image card',
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  // Main save handler
  const handleSubmit = async () => {
    if (isNewCardMode) {
      await handleCreateNewCard();
    } else {
      await handleSaveExisting();
    }
  };

  // Remove photo (contact mode) / Clear thumbnail (thumbnail mode)
  const handleRemovePhoto = async () => {
    if (!imagePickerCardId) return;

    setIsSubmitting(true);

    try {
      if (isContactMode) {
        await updateCard(imagePickerCardId, {
          image: undefined,
          headerImagePosition: undefined,
          headerGradientColor: undefined,
        });
      } else {
        const hadImage = !!card?.image;
        await updateCard(imagePickerCardId, { image: undefined });
        if (hadImage) {
          setTimeout(() => {
            triggerMuuriLayout();
          }, 100);
        }
      }

      toast({
        type: 'success',
        message: isContactMode ? 'Photo removed' : 'Thumbnail removed',
      });

      closeImagePicker();
    } catch (err) {
      console.error('Failed to remove photo:', err);
      toast({
        type: 'error',
        message: `Failed to remove ${isContactMode ? 'photo' : 'thumbnail'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear current selection (thumbnail mode)
  const handleClear = () => {
    setUrlInput('');
    setPreviewImage(null);
    setPreviewLoaded(false);
    setImageError(false);
    setPendingFile(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeImagePicker();
    }
  };

  // Computed states
  const hasExistingPhoto = !!card?.image;
  const hasPreview = !!previewImage && !imageError;
  const hasValidPreview = (previewImage || urlInput.trim()) && previewLoaded && !imageError;

  // Title and description based on mode
  const getTitle = () => {
    if (isNewCardMode) return 'Upload Image';
    if (isContactMode) return hasExistingPhoto ? 'Edit Contact Photo' : 'Add Contact Photo';
    return 'Edit Thumbnail';
  };

  const getDescription = () => {
    if (isNewCardMode) return 'Create a new image card from a file or URL';
    if (isContactMode) {
      return hasExistingPhoto
        ? 'Adjust your photo or upload a new one'
        : 'Upload a photo for this contact';
    }
    return hasExistingPhoto
      ? 'Update or remove the thumbnail for this bookmark'
      : 'Add a thumbnail image for this bookmark';
  };

  // Determine which tabs to show based on mode
  const showAdjustTab = isContactMode && hasPreview;
  const tabCount = showAdjustTab ? 3 : 2;

  return (
    <Dialog open={isImagePickerOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-bg-surface-1 border-border-subtle max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-accent" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isContactMode ? (
          // Contact Mode: Tabs with Adjust, Upload, URL
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={cn('grid w-full', showAdjustTab ? 'grid-cols-3' : 'grid-cols-2')}>
              {showAdjustTab && <TabsTrigger value="adjust">Adjust</TabsTrigger>}
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="url">URL</TabsTrigger>
            </TabsList>

            {/* Adjust Tab - only when preview exists (contact mode) */}
            {showAdjustTab && (
              <TabsContent value="adjust" className="mt-4 space-y-4">
                {/* Preview */}
                <div className="relative aspect-square w-32 mx-auto rounded-2xl overflow-hidden border-2 border-border-subtle">
                  <Image
                    src={previewImage!}
                    alt="Preview"
                    fill
                    sizes="128px"
                    className="object-cover"
                    style={{ objectPosition: `center ${imagePosition}%` }}
                    onError={() => setImageError(true)}
                  />
                </div>

                {/* Position Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-sm">
                      <MoveVertical className="h-4 w-4 text-text-muted" />
                      Image Position
                    </Label>
                    <span className="text-xs text-text-muted">{imagePosition}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={imagePosition}
                    onChange={(e) => setImagePosition(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${imagePosition}%, var(--color-bg-surface-3) ${imagePosition}%, var(--color-bg-surface-3) 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>Top</span>
                    <span>Bottom</span>
                  </div>
                </div>

                {/* Gradient Color */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Palette className="h-4 w-4 text-text-muted" />
                    Header Color
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {GRADIENT_PRESETS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setGradientColor(color)}
                        className={cn(
                          'w-8 h-8 rounded-full transition-all',
                          'ring-2 ring-offset-2 ring-offset-bg-surface-1',
                          gradientColor === color
                            ? 'ring-white scale-110'
                            : 'ring-transparent hover:scale-105'
                        )}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Upload Tab */}
            <TabsContent value="upload" className="mt-4">
              <div className="space-y-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'w-full py-8 border-2 border-dashed rounded-xl',
                    'flex flex-col items-center gap-2',
                    'text-text-muted hover:text-text-primary',
                    'hover:border-accent hover:bg-accent/5',
                    'transition-colors duration-200'
                  )}
                >
                  <Upload className="h-8 w-8" />
                  <span className="font-medium">Click to upload</span>
                  <span className="text-xs">or paste from clipboard (Ctrl+V)</span>
                </button>

                <p className="text-xs text-text-muted text-center">
                  Supports JPG, PNG, GIF, WebP
                </p>
              </div>
            </TabsContent>

            {/* URL Tab */}
            <TabsContent value="url" className="mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                      <Input
                        id="imageUrl"
                        placeholder="https://example.com/photo.jpg"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                        className="pl-9"
                      />
                    </div>
                    <Button
                      onClick={handleUrlSubmit}
                      disabled={!urlInput.trim()}
                    >
                      Load
                    </Button>
                  </div>
                </div>

                {urlInput && (
                  <div className="relative aspect-square w-32 mx-auto rounded-2xl overflow-hidden bg-bg-surface-2 border border-border-subtle">
                    <Image
                      src={urlInput}
                      alt="Preview"
                      fill
                      sizes="128px"
                      className="object-cover"
                      onError={() => {
                        toast({ type: 'error', message: 'Failed to load image from URL' });
                      }}
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          // Thumbnail Mode and New Card Mode: Simpler layout with tabs
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="url">URL</TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload" className="mt-4">
              <div className="space-y-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'w-full py-8 border-2 border-dashed rounded-xl',
                    'flex flex-col items-center gap-2',
                    'text-text-muted hover:text-text-primary',
                    'hover:border-accent hover:bg-accent/5',
                    'transition-colors duration-200'
                  )}
                >
                  <Upload className="h-8 w-8" />
                  <span className="font-medium">Click to upload</span>
                  <span className="text-xs">or paste from clipboard (Ctrl+V)</span>
                </button>

                {/* Preview for uploaded file */}
                {pendingFile && previewImage && (
                  <div className="space-y-2">
                    <Label className="text-sm text-text-muted">Preview</Label>
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-bg-surface-2 border border-border-subtle">
                      <Image
                        src={previewImage}
                        alt="Upload preview"
                        fill
                        sizes="500px"
                        className="object-cover"
                        onError={() => setImageError(true)}
                      />
                    </div>
                  </div>
                )}

                <p className="text-xs text-text-muted text-center">
                  Supports JPG, PNG, GIF, WebP
                </p>
              </div>
            </TabsContent>

            {/* URL Tab */}
            <TabsContent value="url" className="mt-4">
              <div className="space-y-4 py-4">
                {/* Current Thumbnail Preview (only for existing cards) */}
                {!isNewCardMode && hasExistingPhoto && !urlInput.trim() && !pendingFile && (
                  <div className="space-y-2">
                    <Label className="text-sm text-text-muted">Current Thumbnail</Label>
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-bg-surface-2 border border-border-subtle">
                      <Image
                        src={card!.image!}
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
                      {imageError ? (
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
                            onError={() => setImageError(true)}
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
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {/* Remove/Clear button */}
          {isContactMode && hasExistingPhoto && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRemovePhoto}
              disabled={isSubmitting}
              className="sm:mr-auto text-red-400 hover:text-red-300 hover:bg-red-400/10"
            >
              <X className="h-4 w-4 mr-1" />
              Remove Photo
            </Button>
          )}
          {isThumbnailMode && (hasExistingPhoto || urlInput.trim() || pendingFile) && (
            <Button
              type="button"
              variant="outline"
              onClick={hasExistingPhoto && !urlInput.trim() && !pendingFile ? handleRemovePhoto : handleClear}
              disabled={isSubmitting}
              className="sm:mr-auto text-red-400 hover:text-red-300 hover:bg-red-400/10"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {hasExistingPhoto && !urlInput.trim() && !pendingFile ? 'Remove Thumbnail' : 'Clear'}
            </Button>
          )}

          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>

          {isContactMode && activeTab === 'adjust' ? (
            <Button onClick={handleSubmit} disabled={isSubmitting || !hasPreview}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadProgress || 'Saving...'}
                </>
              ) : (
                'Save'
              )}
            </Button>
          ) : isContactMode ? (
            <Button
              onClick={() => {
                if (activeTab === 'url' && urlInput.trim()) {
                  handleUrlSubmit();
                }
              }}
              disabled={activeTab === 'url' && !urlInput.trim()}
            >
              Continue
            </Button>
          ) : (
            // Thumbnail mode and New Card mode
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (activeTab === 'url' && urlInput.trim() !== '' && !previewLoaded) || (!pendingFile && !urlInput.trim() && isNewCardMode)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadProgress || 'Saving...'}
                </>
              ) : isNewCardMode ? (
                'Create Card'
              ) : (
                'Save'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
