"use client";

import { useMemo, useRef, useEffect } from "react";
import Image from "next/image";
import { CardModel } from "@/lib/types";

type OrbitingCardsProps = {
  cards: CardModel[];
};

// Simple hash function to get a stable number from card ID
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function OrbitingCards({ cards }: OrbitingCardsProps) {
  // Take up to 10 cards for the orbit
  const orbitCards = useMemo(() => cards.slice(0, 10), [cards]);

  // Track animation start time for continuous animation
  const startTimeRef = useRef<number>(Date.now());

  // Reset start time only on mount
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  if (orbitCards.length === 0) return null;

  // Orbit parameters
  const radiusX = 900;
  const radiusY = 600;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Center point for orbiting cards */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: 0, height: 0 }}
      >
        {orbitCards.map((card) => {
          const thumbnail = card.image;

          // Use card ID hash for stable positioning
          const hash = hashCode(card.id);

          // Stable starting angle based on card ID (0 to 2π)
          const startAngle = (hash % 1000) / 1000 * Math.PI * 2;

          // Stable duration based on card ID (80-100 seconds)
          const duration = 80 + (hash % 20);

          // Calculate initial position for CSS custom properties
          const initialX = Math.cos(startAngle) * radiusX;
          const initialY = Math.sin(startAngle) * radiusY;
          const depth = Math.abs(Math.sin(startAngle));
          const scale = 1.2 - depth * 0.3;
          const blur = 12 + depth * 16;
          const zIndex = Math.round((1 - depth) * 10);

          return (
            <div
              key={card.id}
              className="orbit-card absolute transition-opacity duration-500"
              style={{
                // Initial position
                left: initialX,
                top: initialY,
                transform: `translate(-50%, -50%) scale(${scale})`,
                filter: `blur(${blur}px)`,
                zIndex: zIndex,
                // Animation with stable duration per card
                animation: `orbit ${duration}s linear infinite`,
                // Use negative delay based on start angle to maintain position
                animationDelay: `-${(startAngle / (Math.PI * 2)) * duration}s`,
                willChange: "transform",
                opacity: 0.8,
              }}
            >
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  width: "700px",
                  height: "480px",
                  background: "var(--bg-surface-2)",
                  boxShadow: "var(--shadow-3)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {thumbnail ? (
                  <Image
                    src={thumbnail}
                    alt={card.title || "Card"}
                    fill
                    className="object-cover"
                    sizes="700px"
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
        })}
      </div>
    </div>
  );
}
