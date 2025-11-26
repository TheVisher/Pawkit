/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { CardModel } from "@/lib/types";
import { useFileStore } from "@/lib/stores/file-store";
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
 * For file cards, it loads the blob from the file store and creates a fresh URL.
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const files = useFileStore((state) => state.files);

  const isFileCard = card.type === "file" || card.isFileCard;

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);

    // For regular cards, just use the stored image URL
    if (!isFileCard) {
      setImageUrl(card.image || null);
      setIsLoading(false);
      return;
    }

    // For file cards, find the file in the store
    const fileId = card.fileId;
    if (!fileId) {
      setImageUrl(null);
      setIsLoading(false);
      return;
    }

    const file = files.find((f) => f.id === fileId);
    if (!file) {
      console.warn("[CardImage] File not found in store:", fileId);
      setImageUrl(null);
      setIsLoading(false);
      return;
    }

    // Prefer thumbnail if available, otherwise use main blob for images
    const blob = file.thumbnailBlob || (file.category === "image" ? file.blob : null);

    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      setImageUrl(blobUrl);
      setIsLoading(false);

      // Cleanup: revoke blob URL when component unmounts or card changes
      return () => {
        URL.revokeObjectURL(blobUrl);
      };
    } else {
      setImageUrl(null);
      setIsLoading(false);
    }
  }, [card.id, card.fileId, card.type, card.isFileCard, card.image, isFileCard, files]);

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
        <div className="h-8 w-8 rounded-full border-2 border-gray-600 border-t-purple-500 animate-spin" />
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
 */
export function useCardImageUrl(card: CardModel | null | undefined): {
  imageUrl: string | null;
  isLoading: boolean;
  isFileCard: boolean;
} {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const files = useFileStore((state) => state.files);

  const isFileCard = card?.type === "file" || card?.isFileCard === true;

  useEffect(() => {
    if (!card) {
      setImageUrl(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (!isFileCard) {
      setImageUrl(card.image || null);
      setIsLoading(false);
      return;
    }

    const fileId = card.fileId;
    if (!fileId) {
      setImageUrl(null);
      setIsLoading(false);
      return;
    }

    const file = files.find((f) => f.id === fileId);
    if (!file) {
      setImageUrl(null);
      setIsLoading(false);
      return;
    }

    const blob = file.thumbnailBlob || (file.category === "image" ? file.blob : null);
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      setImageUrl(blobUrl);
      setIsLoading(false);

      return () => {
        URL.revokeObjectURL(blobUrl);
      };
    } else {
      setImageUrl(null);
      setIsLoading(false);
    }
  }, [card?.id, card?.fileId, card?.type, card?.isFileCard, card?.image, isFileCard, files]);

  return { imageUrl, isLoading, isFileCard };
}
