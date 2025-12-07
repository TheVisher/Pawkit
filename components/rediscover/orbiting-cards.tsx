"use client";

import { useMemo } from "react";
import Image from "next/image";
import { CardModel } from "@/lib/types";

type OrbitingCardsProps = {
  cards: CardModel[];
  centerX?: number;
  centerY?: number;
};

// Each card position in the orbit
type OrbitPosition = {
  x: number;
  y: number;
  scale: number;
  blur: number;
  zIndex: number;
  delay: number;
  duration: number; // Varied orbit duration for each card
};

export function OrbitingCards({ cards }: OrbitingCardsProps) {
  // Take up to 10 cards for the orbit (more cards for fuller effect)
  const orbitCards = useMemo(() => cards.slice(0, 10), [cards]);

  // Calculate positions for each card on an elliptical orbit
  const positions = useMemo(() => {
    const positions: OrbitPosition[] = [];
    const count = orbitCards.length;

    for (let i = 0; i < count; i++) {
      // Distribute cards evenly around the orbit
      const angle = (i / count) * 2 * Math.PI;

      // Elliptical orbit - wider horizontally, larger to fit bigger cards
      const radiusX = 650; // horizontal radius (increased for huge cards)
      const radiusY = 450; // vertical radius (increased for huge cards)

      const x = Math.cos(angle) * radiusX;
      const y = Math.sin(angle) * radiusY;

      // Cards at top/bottom (y extreme) are "further" - smaller and more blurred
      // Cards at sides (x extreme) are "closer" - larger and less blurred
      const depth = Math.abs(Math.sin(angle)); // 0 = sides, 1 = top/bottom

      // Even bigger cards: 1.0 at sides, 0.7 at top/bottom
      const scale = 1.0 - depth * 0.3;
      // More blur: base 4px + up to 10px more based on depth
      const blur = 4 + depth * 10;
      const zIndex = Math.round((1 - depth) * 10); // Higher z at sides

      // Stagger animation start times (longer stagger for slower feel)
      const delay = i * 8; // 8 second stagger between cards

      // Varied orbit duration: 80-100 seconds (some cards slightly faster/slower)
      // This creates the overtaking effect where cards pass each other
      const duration = 85 + (i % 3) * 8 - (i % 2) * 5; // Varies between ~80-96s

      positions.push({ x, y, scale, blur, zIndex, delay, duration });
    }

    return positions;
  }, [orbitCards.length]);

  if (orbitCards.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Center point for orbiting cards */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: 0, height: 0 }}
      >
        {orbitCards.map((card, index) => {
          const pos = positions[index];
          const thumbnail = card.image;

          return (
            <div
              key={card.id}
              className="orbit-card absolute"
              style={{
                // Position relative to center
                left: pos.x,
                top: pos.y,
                // Transform for centering the card on its position
                transform: `translate(-50%, -50%) scale(${pos.scale})`,
                // Depth effects
                filter: pos.blur > 0 ? `blur(${pos.blur}px)` : undefined,
                zIndex: pos.zIndex,
                // Animation - varied duration for overtaking effect
                animation: `orbit ${pos.duration}s linear infinite`,
                animationDelay: `-${pos.delay}s`,
                // Smooth transitions
                willChange: "transform",
              }}
            >
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  width: "480px",
                  height: "320px",
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
                    sizes="480px"
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
