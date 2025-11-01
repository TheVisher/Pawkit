"use client";

import { useState, useEffect } from "react";
import { X, Heart, Trash2 } from "lucide-react";
import { CardModel } from "@/lib/types";
import Image from "next/image";

export type RediscoverAction = "keep" | "delete";

export type RediscoverModeProps = {
  currentCard: CardModel | null;
  onAction: (action: RediscoverAction, cardId: string) => void;
  onExit: () => void;
  remainingCount: number;
};

export function RediscoverMode({ currentCard, onAction, onExit, remainingCount }: RediscoverModeProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [cardTransition, setCardTransition] = useState<"entering" | "exiting-keep" | "exiting-delete" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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
        case "d":
          e.preventDefault();
          handleAction("delete");
          break;
        case "escape":
          e.preventDefault();
          handleExit();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentCard, isProcessing]);

  // Card entering animation
  useEffect(() => {
    if (currentCard) {
      setCardTransition("entering");
      setIsProcessing(false); // Reset processing state when new card appears
      const timer = setTimeout(() => setCardTransition(null), 300);
      return () => clearTimeout(timer);
    }
  }, [currentCard?.id]);

  const handleAction = (action: RediscoverAction) => {
    if (!currentCard || isProcessing) return;

    // Set processing state to prevent rapid actions
    setIsProcessing(true);

    // Set exit animation based on action
    if (action === "keep") {
      setCardTransition("exiting-keep");
    } else if (action === "delete") {
      setCardTransition("exiting-delete");
    }

    // Wait for animation then trigger action
    setTimeout(() => {
      onAction(action, currentCard.id);
      setCardTransition(null);
      // Processing state will be reset when new card appears
    }, 300);
  };

  const handleExit = () => {
    setIsExiting(true);
    setTimeout(() => {
      onExit();
    }, 300);
  };

  if (!currentCard) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <h2 className="text-2xl font-semibold text-foreground">All done!</h2>
          <p className="text-muted-foreground">You&apos;ve reviewed all available cards.</p>
          <button
            onClick={handleExit}
            className="px-6 py-3 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  // Get card thumbnail or placeholder
  const thumbnail = currentCard.image || "/placeholder-card.png";
  const cardTitle = currentCard.title || "Untitled";
  const cardUrl = currentCard.url || "";
  const domain = currentCard.domain || (cardUrl ? new URL(cardUrl).hostname : "");

  return (
    <div className={`fixed inset-0 flex items-center justify-center transition-opacity duration-300 ${isExiting ? "opacity-0" : "opacity-100"}`}>
      {/* Exit Button */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={handleExit}
          className="p-2 rounded-lg bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-all hover:border-white/20 text-muted-foreground hover:text-foreground"
          aria-label="Exit Rediscover mode"
        >
          <X size={20} />
        </button>
      </div>

      {/* Remaining Counter */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
        <div className="px-4 py-2 rounded-full bg-white/5 backdrop-blur-lg border border-white/10 text-sm text-muted-foreground">
          {remainingCount} remaining
        </div>
      </div>

      {/* Card Display - Centered vertically with equal spacing */}
      <div
        className={`w-full max-w-3xl px-8 space-y-6 transition-all duration-300 ${
          cardTransition === "entering"
            ? "translate-x-full opacity-0"
            : cardTransition === "exiting-keep"
            ? "-translate-x-full opacity-0"
            : cardTransition === "exiting-delete"
            ? "scale-95 opacity-0"
            : "translate-x-0 opacity-100"
        }`}
      >
        {/* Card Thumbnail */}
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-white/5 backdrop-blur-lg border border-white/10 shadow-2xl">
          <Image
            src={thumbnail}
            alt={cardTitle}
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        {/* Card Info */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">{cardTitle}</h2>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>{domain}</span>
            {cardUrl && (
              <>
                <span>•</span>
                <a
                  href={cardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent transition-colors underline"
                >
                  View original
                </a>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 pt-6">
          {/* Delete Button - Left */}
          <ActionButton
            icon={Trash2}
            label="Delete"
            shortcut="D"
            onClick={() => handleAction("delete")}
            variant="danger"
          />

          {/* Keep Button - Right */}
          <ActionButton
            icon={Heart}
            label="Keep"
            shortcut="K"
            onClick={() => handleAction("keep")}
            variant="primary"
          />
        </div>
      </div>
    </div>
  );
}

// Action Button Component
type ActionButtonProps = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  shortcut?: string;
  onClick: () => void;
  variant?: "default" | "primary" | "danger" | "muted";
};

function ActionButton({ icon: Icon, label, shortcut, onClick, variant = "default" }: ActionButtonProps) {
  const variantClasses: Record<NonNullable<ActionButtonProps["variant"]>, string> = {
    default: "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-foreground",
    primary: "bg-accent/20 border-accent/30 hover:bg-accent/30 hover:border-accent/50 text-accent-foreground hover:shadow-lg hover:shadow-accent/20",
    danger: "bg-red-500/20 border-red-500/30 hover:bg-red-500/30 hover:border-red-500/50 text-red-200 hover:shadow-lg hover:shadow-red-500/20",
    muted: "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-muted-foreground",
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-3 w-48 h-36 rounded-2xl backdrop-blur-lg border-2 transition-all group ${variantClasses[variant]}`}
    >
      <Icon size={32} />
      <div className="flex flex-col items-center gap-2">
        <span className="text-lg font-semibold whitespace-nowrap">{label}</span>
        {shortcut && (
          <kbd className="px-3 py-1 rounded bg-white/10 font-mono text-sm opacity-70 group-hover:opacity-100 transition-opacity">
            {shortcut}
          </kbd>
        )}
      </div>
    </button>
  );
}
