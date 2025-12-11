/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { CardModel } from "@/lib/types";
import { useFileStore } from "@/lib/stores/file-store";
import { useCachedImage } from "@/lib/hooks/use-cached-image";
import { Bookmark, ImageIcon } from "lucide-react";

interface CardImageProps {
  card: CardModel;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
  showFallback?: boolean;
  loading?: "lazy" | "eager";
  style?: React.CSSProperties;
}

/**
 * Smart card image component that handles both regular cards and file cards.
 *
 * For regular cards: Uses the image cache to load from IndexedDB if available,
 * otherwise fetches from network and caches for next time. This dramatically
 * improves load times on slow connections.
 *
 * For file cards: Loads the blob from the file store and creates a fresh URL.
 * Blob URLs are temporary and don't persist across page reloads.
 */
export function CardImage({
  card,
  alt,
  className = "",
  fallbackClassName = "",
  onLoad,
  onError,
  showFallback = true,
  loading = "lazy",
  style,
}: CardImageProps) {
  const [fileCardUrl, setFileCardUrl] = useState<string | null>(null);
  const [isFileLoading, setIsFileLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const files = useFileStore((state) => state.files);
  const isFilesLoaded = useFileStore((state) => state.isLoaded);
  const loadFiles = useFileStore((state) => state.loadFiles);

  const isFileCard = card.type === "file" || card.isFileCard;

  // Use cached image hook for regular (non-file) cards
  const {
    src: cachedSrc,
    isLoading: isCacheLoading,
  } = useCachedImage(!isFileCard ? card.image : null);

  // Ensure files are loaded from IndexedDB for file cards
  useEffect(() => {
    if (isFileCard && !isFilesLoaded) {
      loadFiles();
    }
  }, [isFileCard, isFilesLoaded, loadFiles]);

  // Handle file card image loading
  useEffect(() => {
    if (!isFileCard) {
      setFileCardUrl(null);
      setIsFileLoading(false);
      return;
    }

    setHasError(false);

    // For file cards, wait for files to be loaded
    if (!isFilesLoaded) {
      setIsFileLoading(true);
      return;
    }

    // Find the file in the store
    const fileId = card.fileId;
    if (!fileId) {
      setFileCardUrl(null);
      setIsFileLoading(false);
      return;
    }

    const file = files.find((f) => f.id === fileId);
    if (!file) {
      console.warn("[CardImage] File not found in store:", fileId);
      setFileCardUrl(null);
      setIsFileLoading(false);
      return;
    }

    // Prefer thumbnail if available, otherwise use main blob for images
    const blob = file.thumbnailBlob || (file.category === "image" ? file.blob : null);

    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      setFileCardUrl(blobUrl);
      setIsFileLoading(false);

      // Cleanup: revoke blob URL when component unmounts or card changes
      return () => {
        URL.revokeObjectURL(blobUrl);
      };
    } else {
      setFileCardUrl(null);
      setIsFileLoading(false);
    }
  }, [card.id, card.fileId, card.type, card.isFileCard, isFileCard, files, isFilesLoaded]);

  // Determine final image URL and loading state
  const imageUrl = isFileCard ? fileCardUrl : cachedSrc;
  const isLocalLoading = isFileCard ? isFileLoading : isCacheLoading;

  // Compute loading state
  const isLoading = (isFileCard && !isFilesLoaded) || isLocalLoading;

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const handleLoad = () => {
    onLoad?.();
  };

  // Loading state for file cards
  if (isLoading && isFileCard) {
    return (
      <div className={`flex items-center justify-center bg-surface-soft ${fallbackClassName}`}>
        <div className="h-8 w-8 rounded-full border-2 border-gray-600 border-t-accent animate-spin" />
      </div>
    );
  }

  // No image available or error
  if (!imageUrl || hasError) {
    if (!showFallback) return null;
    return (
      <div className={`flex items-center justify-center bg-surface-soft ${fallbackClassName}`}>
        {isFileCard ? (
          <ImageIcon className="h-12 w-12 text-gray-500" />
        ) : (
          <Bookmark className="h-12 w-12 text-gray-500" />
        )}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt || card.title || card.url || ""}
      className={className}
      loading={loading}
      style={style}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}

/**
 * Hook version for more flexibility - works with CardModel
 *
 * For regular cards: Uses image cache for fast loading from IndexedDB
 * For file cards: Loads blob from file store
 */
export function useCardImageUrl(card: CardModel | null | undefined): {
  imageUrl: string | null;
  isLoading: boolean;
  isFileCard: boolean;
} {
  const [fileCardUrl, setFileCardUrl] = useState<string | null>(null);
  const [isFileLoading, setIsFileLoading] = useState(true);
  const files = useFileStore((state) => state.files);
  const isFilesLoaded = useFileStore((state) => state.isLoaded);
  const loadFiles = useFileStore((state) => state.loadFiles);

  const isFileCard = card?.type === "file" || card?.isFileCard === true;

  // Use cached image hook for regular (non-file) cards
  const {
    src: cachedSrc,
    isLoading: isCacheLoading,
  } = useCachedImage(!isFileCard ? card?.image : null);

  // Ensure files are loaded from IndexedDB for file cards
  useEffect(() => {
    if (isFileCard && !isFilesLoaded) {
      loadFiles();
    }
  }, [isFileCard, isFilesLoaded, loadFiles]);

  // Handle file card image loading
  useEffect(() => {
    if (!card || !isFileCard) {
      setFileCardUrl(null);
      setIsFileLoading(false);
      return;
    }

    // For file cards, wait for files to be loaded
    if (!isFilesLoaded) {
      setIsFileLoading(true);
      return;
    }

    setIsFileLoading(true);

    const fileId = card.fileId;
    if (!fileId) {
      setFileCardUrl(null);
      setIsFileLoading(false);
      return;
    }

    const file = files.find((f) => f.id === fileId);
    if (!file) {
      console.warn("[useCardImageUrl] File not found in store:", fileId, "Files loaded:", files.length);
      setFileCardUrl(null);
      setIsFileLoading(false);
      return;
    }

    const blob = file.thumbnailBlob || (file.category === "image" ? file.blob : null);
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      setFileCardUrl(blobUrl);
      setIsFileLoading(false);

      return () => {
        URL.revokeObjectURL(blobUrl);
      };
    } else {
      setFileCardUrl(null);
      setIsFileLoading(false);
    }
  }, [card?.id, card?.fileId, card?.type, card?.isFileCard, isFileCard, files, isFilesLoaded]);

  // Determine final image URL and loading state
  const imageUrl = isFileCard ? fileCardUrl : cachedSrc;
  const isLocalLoading = isFileCard ? isFileLoading : isCacheLoading;

  // isLoading = files not loaded yet (for file cards) OR local state is loading
  const isLoading = (isFileCard && !isFilesLoaded) || isLocalLoading;

  return { imageUrl, isLoading, isFileCard };
}
