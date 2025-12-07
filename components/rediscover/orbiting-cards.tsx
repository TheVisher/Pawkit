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
};

export function OrbitingCards({ cards }: OrbitingCardsProps) {
  // Take up to 6 cards for the orbit
  const orbitCards = useMemo(() => cards.slice(0, 6), [cards]);

  // Calculate positions for each card on an elliptical orbit
  const positions = useMemo(() => {
    const positions: OrbitPosition[] = [];
    const count = orbitCards.length;

    for (let i = 0; i < count; i++) {
      // Distribute cards evenly around the orbit
      const angle = (i / count) * 2 * Math.PI;

      // Elliptical orbit - wider horizontally, larger to fit bigger cards
      const radiusX = 500; // horizontal radius (increased)
      const radiusY = 350; // vertical radius (increased)

      const x = Math.cos(angle) * radiusX;
      const y = Math.sin(angle) * radiusY;

      // Cards at top/bottom (y extreme) are "further" - smaller and more blurred
      // Cards at sides (x extreme) are "closer" - larger and less blurred
      const depth = Math.abs(Math.sin(angle)); // 0 = sides, 1 = top/bottom

      // MUCH bigger cards: 0.9 at sides, 0.6 at top/bottom
      const scale = 0.9 - depth * 0.3;
      // More blur: base 4px + up to 10px more based on depth
      const blur = 4 + depth * 10;
      const zIndex = Math.round((1 - depth) * 10); // Higher z at sides

      // Stagger animation start times (longer stagger for slower feel)
      const delay = i * 10; // 10 second stagger between cards

      positions.push({ x, y, scale, blur, zIndex, delay });
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
                // Animation - SLOW 90 second orbit
                animation: `orbit 90s linear infinite`,
                animationDelay: `-${pos.delay}s`,
                // Smooth transitions
                willChange: "transform",
              }}
            >
              <div
                className="w-72 h-48 rounded-2xl overflow-hidden"
                style={{
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
                    sizes="288px"
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
