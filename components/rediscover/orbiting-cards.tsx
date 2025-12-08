"use client";

import { useMemo, useRef, useEffect } from "react";
import { CardModel } from "@/lib/types";

type OrbitingCardsProps = {
  cards: CardModel[];
};

export function OrbitingCards({ cards }: OrbitingCardsProps) {
  // Take up to 8 cards for the orbit (reduced to prevent overcrowding)
  const orbitCards = useMemo(() => cards.slice(0, 8), [cards]);

  // Track animation start time for continuous animation
  const startTimeRef = useRef<number>(Date.now());

  // Reset start time only on mount
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  if (orbitCards.length === 0) return null;

  // Orbit parameters - large radius to accommodate bigger cards
  const radiusX = 1200;
  const radiusY = 800;

  // Distribute cards evenly around the orbit based on their index
  const angleStep = (Math.PI * 2) / orbitCards.length;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Center point for orbiting cards */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: 0, height: 0 }}
      >
        {orbitCards.map((card, index) => {
          const thumbnail = card.image;

          // Evenly distribute cards around the orbit
          const startAngle = index * angleStep;

          // Vary duration slightly per card (80-95 seconds)
          const duration = 80 + (index * 2);

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
              className="orbit-card absolute"
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
        })}
      </div>
    </div>
  );
}
