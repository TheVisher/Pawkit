"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { CardModel } from "@/lib/types";
import { useFileStore } from "@/lib/stores/file-store";

type OrbitingCardsProps = {
  cards: CardModel[];
};

// Simple hash function to get a stable number from card ID
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Hook to get image URL for a card, handling both regular and file cards
function useCardImageUrl(card: CardModel): string | null {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const files = useFileStore((state) => state.files);
  const isFilesLoaded = useFileStore((state) => state.isLoaded);

  useEffect(() => {
    const isFileCard = card.type === "file" || card.isFileCard;

    // For regular cards, use the stored image URL
    if (!isFileCard) {
      setImageUrl(card.image || null);
      return;
    }

    // For file cards, get blob from file store
    if (!isFilesLoaded) {
      return;
    }

    const fileId = card.fileId;
    if (!fileId) {
      setImageUrl(null);
      return;
    }

    const file = files.find((f) => f.id === fileId);
    if (!file) {
      setImageUrl(null);
      return;
    }

    // Prefer thumbnail if available, otherwise use main blob for images
    const blob = file.thumbnailBlob || (file.category === "image" ? file.blob : null);

    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      setImageUrl(blobUrl);

      return () => {
        URL.revokeObjectURL(blobUrl);
      };
    } else {
      setImageUrl(null);
    }
  }, [card, files, isFilesLoaded]);

  return imageUrl;
}

// Individual orbit card component that can use hooks
function OrbitCard({
  card,
  index,
  totalCards,
  radiusX,
  radiusY,
}: {
  card: CardModel;
  index: number;
  totalCards: number;
  radiusX: number;
  radiusY: number;
}) {
  const thumbnail = useCardImageUrl(card);

  // Use hash for varied speed (duration between 60-100 seconds)
  const hash = hashCode(card.id);
  const duration = 60 + (hash % 40);

  // Start cards evenly distributed to prevent initial bunching
  const startAngle = (index / totalCards) * Math.PI * 2;

  // Calculate initial position
  const initialX = Math.cos(startAngle) * radiusX;
  const initialY = Math.sin(startAngle) * radiusY;
  const depth = Math.abs(Math.sin(startAngle));
  const scale = 1.2 - depth * 0.3;
  const blur = 12 + depth * 16;
  const zIndex = Math.round((1 - depth) * 10);

  return (
    <div
      className="orbit-card absolute transition-opacity duration-500"
      style={{
        // Initial position
        left: initialX,
        top: initialY,
        transform: `translate(-50%, -50%) scale(${scale})`,
        filter: `blur(${blur}px)`,
        zIndex: zIndex,
        // Animation with hash-based duration for varied speeds
        animation: `orbit ${duration}s linear infinite`,
        // Use negative delay based on start angle to maintain initial position
        animationDelay: `-${(startAngle / (Math.PI * 2)) * duration}s`,
        willChange: "transform",
      }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          width: "1400px",
          height: "960px",
          background: "var(--bg-surface-2)",
          boxShadow: "var(--shadow-3)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={card.title || "Card"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "var(--bg-surface-3)" }}
          >
            <span className="text-2xl opacity-30">
              {card.title?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function OrbitingCards({ cards }: OrbitingCardsProps) {
  // Take up to 10 cards for the orbit
  const orbitCards = useMemo(() => cards.slice(0, 10), [cards]);

  // Track animation start time for continuous animation
  const startTimeRef = useRef<number>(Date.now());

  // Ensure files are loaded
  const loadFiles = useFileStore((state) => state.loadFiles);
  const isFilesLoaded = useFileStore((state) => state.isLoaded);

  useEffect(() => {
    if (!isFilesLoaded) {
      loadFiles();
    }
  }, [isFilesLoaded, loadFiles]);

  // Reset start time only on mount
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  if (orbitCards.length === 0) return null;

  // Orbit parameters - large radius to accommodate bigger cards
  const radiusX = 1200;
  const radiusY = 800;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Center point for orbiting cards */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: 0, height: 0 }}
      >
        {orbitCards.map((card, index) => (
          <OrbitCard
            key={card.id}
            card={card}
            index={index}
            totalCards={orbitCards.length}
            radiusX={radiusX}
            radiusY={radiusY}
          />
        ))}
      </div>
    </div>
  );
}
