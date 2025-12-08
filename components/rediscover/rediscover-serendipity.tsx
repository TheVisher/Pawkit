"use client";

import { useState, useEffect, useRef } from "react";
import { X, Inbox, Sparkles, ArrowLeft, Trash2 } from "lucide-react";
import { CardModel } from "@/lib/types";
import { AnimatedBackground } from "./animated-background";
import { OrbitingCards } from "./orbiting-cards";
import { useRediscoverStore } from "@/lib/hooks/rediscover-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";

// Hash function for stable card positioning (same as orbiting-cards.tsx)
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Calculate orbit position for a card ID
function getOrbitPosition(cardId: string) {
  const hash = hashCode(cardId);
  const startAngle = (hash % 1000) / 1000 * Math.PI * 2;
  // Match orbit radius from OrbitingCards
  const radiusX = 1200;
  const radiusY = 800;
  const x = Math.cos(startAngle) * radiusX;
  const y = Math.sin(startAngle) * radiusY;
  const depth = Math.abs(Math.sin(startAngle));
  const scale = 1.2 - depth * 0.3;
  return { x, y, scale };
}

// Module-level storage for panel state (persists across component lifecycle)
let savedPanelState: { leftOpen: boolean; rightOpen: boolean } | null = null;

export type RediscoverAction = "keep" | "delete";

export type RediscoverSerendipityProps = {
  currentCard: CardModel | null;
  onAction: (action: RediscoverAction, cardId: string) => void;
  onExit: () => void;
  remainingCount: number;
  orbitCards?: CardModel[]; // Cards to show orbiting (next in queue)
  // Batch info
  batchNumber: number;
  totalBatches: number;
  hasMoreBatches: boolean;
  onNextBatch: () => void;
  onStartOver: () => void;
};

export function RediscoverSerendipity({
  currentCard,
  onAction,
  onExit,
  remainingCount,
  orbitCards = [],
  batchNumber,
  totalBatches,
  hasMoreBatches,
  onNextBatch,
  onStartOver,
}: RediscoverSerendipityProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [cardTransition, setCardTransition] = useState<
    "entering" | "exiting-keep" | "exiting-forget" | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showKeptCards, setShowKeptCards] = useState(false);
  const [enteringFromOrbit, setEnteringFromOrbit] = useState<{ x: number; y: number; scale: number } | null>(null);

  // Get kept cards from store
  const keptCards = useRediscoverStore((state) => state.keptCards);
  const removeKeptCard = useRediscoverStore((state) => state.removeKeptCard);

  // Panel state management - hide sidebars in serendipity mode
  const closeLeft = usePanelStore((state) => state.closeLeft);
  const closePanel = usePanelStore((state) => state.close);
  const openLeft = usePanelStore((state) => state.openLeft);
  const open = usePanelStore((state) => state.open);

  // Hide sidebars on mount, restore on unmount
  useEffect(() => {
    // Save current state to module-level variable (only if not already saved)
    // This prevents overwriting when the component re-renders
    if (savedPanelState === null) {
      const store = usePanelStore.getState();
      savedPanelState = {
        leftOpen: store.isLeftOpen,
        rightOpen: store.isOpen,
      };
    }

    // Close both panels for immersive mode
    closeLeft();
    closePanel();

    return () => {
      // Restore previous state when exiting
      if (savedPanelState) {
        if (savedPanelState.leftOpen) {
          openLeft();
        }
        if (savedPanelState.rightOpen) {
          open();
        }
        // Clear saved state after restoring
        savedPanelState = null;
      }
    };
    // Only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Don't trigger if already processing an action
      if (isProcessing) return;
      if (!currentCard) return;

      switch (e.key.toLowerCase()) {
        case "k":
          e.preventDefault();
          handleAction("keep");
          break;
        case "f":
        case "d":
          e.preventDefault();
          handleAction("delete");
          break;
        case "escape":
          e.preventDefault();
          if (showKeptCards) {
            setShowKeptCards(false);
          } else {
            handleExit();
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCard, isProcessing, showKeptCards]);

  // Card entering animation - from orbit position to center
  useEffect(() => {
    if (currentCard) {
      // Calculate where this card was in the orbit
      const orbitPos = getOrbitPosition(currentCard.id);
      setEnteringFromOrbit(orbitPos);
      setCardTransition("entering");
      setIsProcessing(false);

      // After animation starts, clear the orbit position to animate to center
      const clearOrbitTimer = setTimeout(() => {
        setEnteringFromOrbit(null);
      }, 50); // Small delay to ensure initial position is applied

      const clearTransitionTimer = setTimeout(() => {
        setCardTransition(null);
      }, 500); // Longer transition for orbit-to-center

      return () => {
        clearTimeout(clearOrbitTimer);
        clearTimeout(clearTransitionTimer);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCard?.id]);

  const handleAction = (action: RediscoverAction) => {
    if (!currentCard || isProcessing) return;
    setIsProcessing(true);

    if (action === "keep") {
      setCardTransition("exiting-keep");
    } else if (action === "delete") {
      setCardTransition("exiting-forget");
    }

    setTimeout(() => {
      onAction(action, currentCard.id);
    }, 300);
  };

  const handleExit = () => {
    setIsExiting(true);
    setTimeout(() => {
      onExit();
    }, 300);
  };

  // Batch complete state
  if (!currentCard) {
    return (
      <div className="fixed inset-0 z-50">
        <AnimatedBackground />
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center space-y-6">
            <Sparkles size={72} style={{ color: "var(--accent)" }} />
            <h2
              className="text-3xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {hasMoreBatches ? "Batch complete!" : "All caught up!"}
            </h2>
            <p style={{ color: "var(--text-muted)" }}>
              {hasMoreBatches
                ? `Finished batch ${batchNumber} of ${totalBatches}. Ready for more?`
                : "You've reviewed all available cards."}
            </p>
            <div className="flex items-center justify-center gap-4">
              {hasMoreBatches ? (
                <button
                  onClick={onNextBatch}
                  className="px-8 py-3 rounded-full font-medium transition-all serendipity-action-btn"
                  style={{
                    background: "var(--accent)",
                    color: "white",
                    boxShadow: "var(--glow-hover)",
                  }}
                >
                  Next Batch
                </button>
              ) : (
                <button
                  onClick={onStartOver}
                  className="px-8 py-3 rounded-full font-medium transition-all serendipity-action-btn"
                  style={{
                    background: "var(--accent)",
                    color: "white",
                    boxShadow: "var(--glow-hover)",
                  }}
                >
                  Start Over
                </button>
              )}
              <button
                onClick={handleExit}
                className="px-8 py-3 rounded-full font-medium transition-all"
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "var(--text-secondary)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const thumbnail = currentCard.image;
  const cardTitle = currentCard.title || "Untitled";
  const cardUrl = currentCard.url || "";
  const domain =
    currentCard.domain || (cardUrl ? new URL(cardUrl).hostname : "");

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isExiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Orbiting Cards */}
      <OrbitingCards cards={orbitCards} />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-6 flex items-center justify-between">
        {/* Kept Cards Button */}
        <button
          onClick={() => setShowKeptCards(!showKeptCards)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
          style={{
            background: keptCards.length > 0 ? "rgba(139, 92, 246, 0.2)" : "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(12px)",
            border: keptCards.length > 0 ? "1px solid rgba(139, 92, 246, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)",
          }}
          aria-label="View kept cards"
        >
          <Inbox size={18} style={{ color: keptCards.length > 0 ? "var(--accent)" : "var(--text-secondary)" }} />
          {keptCards.length > 0 && (
            <span className="text-sm font-medium" style={{ color: "var(--accent)" }}>
              {keptCards.length}
            </span>
          )}
        </button>

        {/* Batch & Remaining Counter */}
        <div
          className="px-4 py-2 rounded-full text-sm flex items-center gap-2"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "var(--text-muted)",
          }}
        >
          <span style={{ color: "var(--text-secondary)" }}>
            Batch {batchNumber}/{totalBatches}
          </span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span>{remainingCount} left</span>
        </div>

        {/* Exit Button */}
        <button
          onClick={handleExit}
          className="p-3 rounded-xl transition-all"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
          aria-label="Exit"
        >
          <X size={20} style={{ color: "var(--text-secondary)" }} />
        </button>
      </div>

      {/* Kept Cards Panel */}
      {showKeptCards && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/50"
            onClick={() => setShowKeptCards(false)}
          />
          {/* Panel */}
          <div
            className="fixed left-0 top-0 bottom-0 z-40 w-96 flex flex-col animate-in slide-in-from-left"
            style={{
              background: "var(--bg-surface-1)",
              borderRight: "1px solid var(--border-subtle)",
            }}
          >
            {/* Header */}
            <div className="p-4 flex items-center gap-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <button
                onClick={() => setShowKeptCards(false)}
                className="p-2 rounded-lg transition-all hover:bg-white/10"
              >
                <ArrowLeft size={20} style={{ color: "var(--text-secondary)" }} />
              </button>
              <h3
                className="text-lg font-semibold flex-1"
                style={{ color: "var(--text-primary)" }}
              >
                Kept Cards ({keptCards.length})
              </h3>
            </div>

            {/* Cards List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {keptCards.length === 0 ? (
                <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                  <Inbox size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No cards kept yet</p>
                  <p className="text-sm mt-1">Press K to keep cards</p>
                </div>
              ) : (
                keptCards.map((card) => (
                  <div
                    key={card.id}
                    className="group relative rounded-xl overflow-hidden"
                    style={{
                      background: "var(--bg-surface-2)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    {/* Card thumbnail */}
                    {card.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.image}
                        alt={card.title || "Card"}
                        className="w-full h-24 object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-24 flex items-center justify-center"
                        style={{ background: "var(--bg-surface-3)" }}
                      >
                        <span className="text-2xl opacity-30">
                          {card.title?.[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                    )}
                    {/* Card title */}
                    <div className="p-3">
                      <p
                        className="text-sm font-medium line-clamp-1"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {card.title || "Untitled"}
                      </p>
                      {card.domain && (
                        <p
                          className="text-xs mt-1 line-clamp-1"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {card.domain}
                        </p>
                      )}
                    </div>
                    {/* Remove button - appears on hover */}
                    <button
                      onClick={() => removeKeptCard(card.id)}
                      className="absolute top-2 right-2 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      style={{
                        background: "rgba(0, 0, 0, 0.6)",
                        backdropFilter: "blur(4px)",
                      }}
                      title="Remove from kept"
                    >
                      <Trash2 size={14} style={{ color: "var(--text-secondary)" }} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer with exit option */}
            <div className="p-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <button
                onClick={() => {
                  setShowKeptCards(false);
                  handleExit();
                }}
                className="w-full px-4 py-3 rounded-lg text-center transition-all"
                style={{
                  background: "var(--bg-surface-2)",
                  color: "var(--text-secondary)",
                }}
              >
                Exit Rediscover
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Content - Centered Card (not constrained by buttons) */}
      <div className="relative z-10 flex items-center justify-center h-full px-4 pb-40">
        {/* Card Container */}
        <div
          className={`flex flex-col items-center space-y-3 transition-all ease-out ${
            cardTransition === "exiting-keep"
              ? "scale-110 opacity-0 duration-300"
              : cardTransition === "exiting-forget"
              ? "scale-75 opacity-0 rotate-2 duration-300"
              : enteringFromOrbit
              ? "opacity-60 duration-0" // Starting position - no transition
              : cardTransition === "entering"
              ? "opacity-100 duration-500" // Animate to center
              : "scale-100 opacity-100 duration-300"
          }`}
          style={
            enteringFromOrbit
              ? {
                  transform: `translate(${enteringFromOrbit.x}px, ${enteringFromOrbit.y}px) scale(${enteringFromOrbit.scale * 0.5})`,
                  filter: "blur(8px)",
                  transitionProperty: "none",
                }
              : cardTransition === "entering"
              ? {
                  transform: "translate(0, 0) scale(1)",
                  filter: "blur(0px)",
                  transitionProperty: "transform, filter, opacity",
                  transitionDuration: "500ms",
                  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                }
              : undefined
          }
        >
          {/* Card Image - shows at natural aspect ratio */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "var(--bg-surface-2)",
              boxShadow: "var(--shadow-3)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {thumbnail ? (
              // Use native img for natural aspect ratio
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnail}
                alt={cardTitle}
                className="block max-w-[min(600px,80vw)] max-h-[calc(100vh-280px)] w-auto h-auto min-w-[300px] min-h-[200px]"
                style={{ objectFit: "contain" }}
              />
            ) : (
              <div
                className="w-[400px] h-[300px] flex items-center justify-center"
                style={{ background: "var(--bg-surface-3)" }}
              >
                <span
                  className="text-6xl opacity-30"
                  style={{ color: "var(--text-muted)" }}
                >
                  {cardTitle[0]?.toUpperCase() || "?"}
                </span>
              </div>
            )}
          </div>

          {/* Card Title - smaller, single line, dimmer */}
          <p
            className="text-sm font-medium line-clamp-1 max-w-md text-center"
            style={{ color: "rgba(255, 255, 255, 0.6)" }}
          >
            {cardTitle}
          </p>
        </div>
      </div>

      {/* Action Buttons - anchored to bottom */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-8">
        {/* Forget Button - subtle red tint on hover */}
        <button
          onClick={() => handleAction("delete")}
          disabled={isProcessing}
          className="px-12 py-6 rounded-full font-semibold text-2xl transition-all serendipity-action-btn hover:bg-red-500/20"
          style={{
            background: "var(--accent)",
            color: "white",
            boxShadow: "var(--glow-hover)",
          }}
        >
          Forget
        </button>

        {/* Keep Button */}
        <button
          onClick={() => handleAction("keep")}
          disabled={isProcessing}
          className="px-12 py-6 rounded-full font-semibold text-2xl transition-all serendipity-action-btn"
          style={{
            background: "var(--accent)",
            color: "white",
            boxShadow: "var(--glow-hover)",
          }}
        >
          Keep
        </button>
      </div>

      {/* Keyboard hints - anchored to bottom left */}
      <div
        className="absolute bottom-6 left-6 z-20 flex flex-col gap-2 text-xs"
        style={{ color: "var(--text-disabled)" }}
      >
        <span>
          <kbd className="px-2 py-1 rounded bg-white/10 font-mono">F</kbd>{" "}
          Forget
        </span>
        <span>
          <kbd className="px-2 py-1 rounded bg-white/10 font-mono">K</kbd>{" "}
          Keep
        </span>
      </div>
    </div>
  );
}
