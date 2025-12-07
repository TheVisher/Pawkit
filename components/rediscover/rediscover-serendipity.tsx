"use client";

import { useState, useEffect } from "react";
import { X, Menu } from "lucide-react";
import { CardModel } from "@/lib/types";
import Image from "next/image";
import { AnimatedBackground } from "./animated-background";
import { OrbitingCards } from "./orbiting-cards";
import { useRediscoverStore } from "@/lib/hooks/rediscover-store";

export type RediscoverAction = "keep" | "delete" | "add-to-pawkit";

export type RediscoverSerendipityProps = {
  currentCard: CardModel | null;
  onAction: (action: RediscoverAction, cardId: string) => void;
  onExit: () => void;
  remainingCount: number;
  orbitCards?: CardModel[]; // Cards to show orbiting (next in queue)
};

export function RediscoverSerendipity({
  currentCard,
  onAction,
  onExit,
  remainingCount,
  orbitCards = [],
}: RediscoverSerendipityProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [cardTransition, setCardTransition] = useState<
    "entering" | "exiting-keep" | "exiting-forget" | "exiting-add" | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { setStyle } = useRediscoverStore();

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
        case "a":
          e.preventDefault();
          handleAction("add-to-pawkit");
          break;
        case "escape":
          e.preventDefault();
          if (showMenu) {
            setShowMenu(false);
          } else {
            handleExit();
          }
          break;
        case "m":
          e.preventDefault();
          setShowMenu(!showMenu);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCard, isProcessing, showMenu]);

  // Card entering animation
  useEffect(() => {
    if (currentCard) {
      setCardTransition("entering");
      setIsProcessing(false);
      const timer = setTimeout(() => setCardTransition(null), 300);
      return () => clearTimeout(timer);
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
    } else if (action === "add-to-pawkit") {
      setCardTransition("exiting-add");
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

  // All done state
  if (!currentCard) {
    return (
      <div className="fixed inset-0 z-50">
        <AnimatedBackground />
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center space-y-6">
            <div className="text-7xl">✨</div>
            <h2
              className="text-3xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              All caught up!
            </h2>
            <p style={{ color: "var(--text-muted)" }}>
              You&apos;ve reviewed all available cards.
            </p>
            <button
              onClick={handleExit}
              className="px-8 py-3 rounded-full font-medium transition-all serendipity-action-btn"
              style={{
                background: "var(--accent)",
                color: "white",
                boxShadow: "var(--glow-hover)",
              }}
            >
              Back to Library
            </button>
          </div>
        </div>
      </div>
    );
  }

  const thumbnail = currentCard.image || currentCard.thumbnail;
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
        {/* Menu Button */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-3 rounded-xl transition-all"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
          aria-label="Menu"
        >
          <Menu size={20} style={{ color: "var(--text-secondary)" }} />
        </button>

        {/* Remaining Counter */}
        <div
          className="px-4 py-2 rounded-full text-sm"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "var(--text-muted)",
          }}
        >
          {remainingCount} remaining
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

      {/* Slide-out Menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/50"
            onClick={() => setShowMenu(false)}
          />
          {/* Menu Panel */}
          <div
            className="fixed left-0 top-0 bottom-0 z-40 w-80 p-6 space-y-6 animate-in slide-in-from-left"
            style={{
              background: "var(--bg-surface-1)",
              borderRight: "1px solid var(--border-subtle)",
            }}
          >
            <h3
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Options
            </h3>
            <button
              onClick={() => {
                setStyle("classic");
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 rounded-lg text-left transition-all"
              style={{
                background: "var(--bg-surface-2)",
                color: "var(--text-secondary)",
              }}
            >
              Switch to Classic View
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                handleExit();
              }}
              className="w-full px-4 py-3 rounded-lg text-left transition-all"
              style={{
                background: "var(--bg-surface-2)",
                color: "var(--text-secondary)",
              }}
            >
              Exit Rediscover
            </button>
          </div>
        </>
      )}

      {/* Main Content - Centered Card */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
        {/* Card Container */}
        <div
          className={`w-full max-w-lg space-y-6 transition-all duration-300 ease-out ${
            cardTransition === "entering"
              ? "scale-90 opacity-0"
              : cardTransition === "exiting-keep"
              ? "scale-110 opacity-0"
              : cardTransition === "exiting-forget"
              ? "scale-75 opacity-0 rotate-2"
              : cardTransition === "exiting-add"
              ? "-translate-y-16 scale-105 opacity-0"
              : "scale-100 opacity-100"
          }`}
        >
          {/* Card Image */}
          <div
            className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden"
            style={{
              background: "var(--bg-surface-2)",
              boxShadow: "var(--shadow-3)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {thumbnail ? (
              <Image
                src={thumbnail}
                alt={cardTitle}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
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

          {/* Card Title */}
          <div className="text-center space-y-2">
            <h2
              className="text-2xl font-semibold line-clamp-2"
              style={{ color: "var(--text-primary)" }}
            >
              {cardTitle}
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {domain}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 flex flex-col items-center gap-4">
          {/* Main Actions */}
          <div className="flex items-center gap-6">
            {/* Forget Button */}
            <button
              onClick={() => handleAction("delete")}
              disabled={isProcessing}
              className="px-8 py-4 rounded-full font-medium text-lg transition-all serendipity-action-btn"
              style={{
                background: "var(--bg-surface-2)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              Forget
            </button>

            {/* Keep Button */}
            <button
              onClick={() => handleAction("keep")}
              disabled={isProcessing}
              className="px-8 py-4 rounded-full font-medium text-lg transition-all serendipity-action-btn"
              style={{
                background: "var(--accent)",
                color: "white",
                boxShadow: "var(--glow-hover)",
              }}
            >
              Keep
            </button>
          </div>

          {/* Subtle Add to Pawkit link */}
          <button
            onClick={() => handleAction("add-to-pawkit")}
            disabled={isProcessing}
            className="text-sm transition-all hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            + Add to Pawkit
          </button>

          {/* Keyboard hints */}
          <div
            className="flex items-center gap-4 mt-4 text-xs"
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
            <span>
              <kbd className="px-2 py-1 rounded bg-white/10 font-mono">A</kbd>{" "}
              Add to Pawkit
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
