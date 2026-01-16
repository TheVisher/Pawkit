'use client';

/**
 * Card Photo Picker Modal
 * For uploading contact photos via file picker, URL, or clipboard paste
 *
 * Images are compressed and uploaded to Supabase Storage for efficient storage.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';
import { ImagePlus, Link2, X, Check, MoveVertical, Palette, Upload, Loader2 } from 'lucide-react';
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
import { useDataStore } from '@/lib/stores/data-store';
import { useCard } from '@/lib/hooks/use-live-data';
import { useToastStore } from '@/lib/stores/toast-store';
import { cn } from '@/lib/utils';
import { GRADIENT_PRESETS } from './card-detail/contact-photo-header';
import { uploadToSupabase } from '@/lib/metadata/image-persistence';

// Image compression options
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5, // Max 500KB
  maxWidthOrHeight: 1920, // Max dimension
  useWebWorker: true,
};

// Convert file to data URL (for preview only, not for storage)
async function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function CardPhotoPickerModal() {
  const { isCardPhotoPickerOpen, cardPhotoCardId, closeCardPhotoPicker } = useModalStore();
  const card = useCard(cardPhotoCardId || '');
  const updateCard = useDataStore((state) => state.updateCard);
  const toast = useToastStore((s) => s.toast);

  const [urlInput, setUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null); // Supabase URL
  const [imageError, setImageError] = useState(false);

  // Adjust settings
  const [imagePosition, setImagePosition] = useState(50);
  const [gradientColor, setGradientColor] = useState(GRADIENT_PRESETS[0]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isCardPhotoPickerOpen && card) {
      setPreviewImage(card.image || null);
      setUploadedImageUrl(null); // Reset - will use card.image if exists
      setUrlInput('');
      setActiveTab(card.image ? 'adjust' : 'upload');
      setImagePosition(card.headerImagePosition ?? 50);
      setGradientColor(card.headerGradientColor || GRADIENT_PRESETS[0]);
      setImageError(false);
      setIsUploading(false);
    }
  }, [isCardPhotoPickerOpen, card]);

  // Handle file selection - compress and upload to Supabase Storage
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cardPhotoCardId) return;

    setIsUploading(true);

    try {
      // Show preview immediately using data URL
      const dataUrl = await fileToDataUrl(file);
      setPreviewImage(dataUrl);
      setActiveTab('adjust');

      // Compress the image
      const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);
      console.log(`[PhotoPicker] Compressed ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);

      // Upload to Supabase Storage
      const supabaseUrl = await uploadToSupabase(
        cardPhotoCardId,
        compressedFile,
        compressedFile.type || 'image/jpeg'
      );

      if (supabaseUrl) {
        setUploadedImageUrl(supabaseUrl);
        toast({ type: 'success', message: 'Image uploaded' });
      } else {
        toast({ type: 'error', message: 'Failed to upload image' });
      }
    } catch (err) {
      console.error('Failed to process file:', err);
      toast({ type: 'error', message: 'Failed to process image' });
    } finally {
      setIsUploading(false);
    }
  }, [cardPhotoCardId, toast]);

  // Handle paste from clipboard - compress and upload to Supabase Storage
  useEffect(() => {
    if (!isCardPhotoPickerOpen || !cardPhotoCardId) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            setIsUploading(true);
            try {
              // Show preview immediately
              const dataUrl = await fileToDataUrl(blob);
              setPreviewImage(dataUrl);
              setActiveTab('adjust');
              toast({ type: 'success', message: 'Image pasted from clipboard' });

              // Compress and upload to Supabase
              const compressedBlob = await imageCompression(blob, COMPRESSION_OPTIONS);
              console.log(`[PhotoPicker] Compressed pasted image: ${(blob.size / 1024).toFixed(0)}KB → ${(compressedBlob.size / 1024).toFixed(0)}KB`);

              const supabaseUrl = await uploadToSupabase(
                cardPhotoCardId,
                compressedBlob,
                compressedBlob.type || 'image/jpeg'
              );

              if (supabaseUrl) {
                setUploadedImageUrl(supabaseUrl);
              } else {
                toast({ type: 'error', message: 'Failed to upload image' });
              }
            } catch (err) {
              console.error('Failed to process pasted image:', err);
              toast({ type: 'error', message: 'Failed to process pasted image' });
            } finally {
              setIsUploading(false);
            }
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isCardPhotoPickerOpen, cardPhotoCardId, toast]);

  // Handle URL input
  const handleUrlSubmit = useCallback(() => {
    const url = urlInput.trim();
    if (url) {
      setPreviewImage(url);
      setActiveTab('adjust');
    }
  }, [urlInput]);

  // Save changes - use Supabase URL if available, otherwise keep existing URL
  const handleSubmit = async () => {
    if (!cardPhotoCardId) return;

    setIsSubmitting(true);

    try {
      // Priority: uploadedImageUrl (new upload) > urlInput (external URL) > existing card.image
      let finalImageUrl: string | undefined;

      if (uploadedImageUrl) {
        // New file was uploaded to Supabase
        finalImageUrl = uploadedImageUrl;
      } else if (urlInput.trim() && previewImage === urlInput.trim()) {
        // User entered an external URL
        finalImageUrl = urlInput.trim();
      } else if (previewImage && !previewImage.startsWith('data:')) {
        // Existing URL (not a data URL)
        finalImageUrl = previewImage;
      } else if (previewImage) {
        // Fallback: if somehow we still have a data URL, use it (shouldn't happen)
        console.warn('[PhotoPicker] Saving data URL - this should not happen');
        finalImageUrl = previewImage;
      }

      await updateCard(cardPhotoCardId, {
        image: finalImageUrl,
        headerImagePosition: imagePosition,
        headerGradientColor: gradientColor,
      });

      toast({
        type: 'success',
        message: finalImageUrl ? 'Photo updated' : 'Photo removed',
      });

      closeCardPhotoPicker();
    } catch (err) {
      console.error('Failed to update photo:', err);
      toast({
        type: 'error',
        message: 'Failed to update photo',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove photo
  const handleRemovePhoto = async () => {
    if (!cardPhotoCardId) return;

    setIsSubmitting(true);

    try {
      await updateCard(cardPhotoCardId, {
        image: undefined,
        headerImagePosition: undefined,
        headerGradientColor: undefined,
      });

      toast({
        type: 'success',
        message: 'Photo removed',
      });

      closeCardPhotoPicker();
    } catch (err) {
      console.error('Failed to remove photo:', err);
      toast({
        type: 'error',
        message: 'Failed to remove photo',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeCardPhotoPicker();
    }
  };

  const hasExistingPhoto = !!card?.image;
  const hasPreview = !!previewImage && !imageError;

  return (
    <Dialog open={isCardPhotoPickerOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-bg-surface-1 border-border-subtle max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-accent" />
            {hasExistingPhoto ? 'Edit Contact Photo' : 'Add Contact Photo'}
          </DialogTitle>
          <DialogDescription>
            {hasExistingPhoto
              ? 'Adjust your photo or upload a new one'
              : 'Upload a photo for this contact'
            }
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={cn('grid w-full', hasPreview ? 'grid-cols-3' : 'grid-cols-2')}>
            {hasPreview && <TabsTrigger value="adjust">Adjust</TabsTrigger>}
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
          </TabsList>

          {/* Adjust Tab - only when preview exists */}
          {hasPreview && (
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
                {/* Uploading overlay */}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              {/* Upload status */}
              {isUploading && (
                <p className="text-xs text-text-muted text-center">Uploading...</p>
              )}
              {uploadedImageUrl && !isUploading && (
                <p className="text-xs text-green-500 text-center">✓ Uploaded to cloud</p>
              )}

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

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {hasExistingPhoto && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRemovePhoto}
              disabled={isSubmitting || isUploading}
              className="sm:mr-auto text-red-400 hover:text-red-300 hover:bg-red-400/10"
            >
              <X className="h-4 w-4 mr-1" />
              Remove Photo
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          {activeTab === 'adjust' ? (
            <Button onClick={handleSubmit} disabled={isSubmitting || isUploading || !hasPreview}>
              {isSubmitting ? 'Saving...' : isUploading ? 'Uploading...' : 'Save'}
            </Button>
          ) : (
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
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
