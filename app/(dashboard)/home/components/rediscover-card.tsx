"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, ArrowRight, X } from "lucide-react";
import { CardModel } from "@/lib/types";

interface RediscoverCardProps {
  rediscoverCount: number;
  rediscoverItems: CardModel[];
}

const DISMISS_KEY = "pawkit-rediscover-dismissed";

export function RediscoverCard({ rediscoverCount, rediscoverItems }: RediscoverCardProps) {
  const router = useRouter();
  const [isDismissed, setIsDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = new Date(dismissed);
      const now = new Date();
      // Reset dismissal after 7 days
      if (now.getTime() - dismissedAt.getTime() > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(DISMISS_KEY);
      } else {
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setIsDismissed(true);
  };

  const handleStart = () => {
    // Navigate to dig-up feature or random item
    if (rediscoverItems.length > 0) {
      const randomItem = rediscoverItems[Math.floor(Math.random() * rediscoverItems.length)];
      router.push(`/library?card=${randomItem.id}`);
    }
  };

  // Don't show if dismissed or no items
  if (!mounted || isDismissed || rediscoverCount === 0) {
    return null;
  }

  return (
    <div className="rounded-xl bg-gradient-to-br from-purple-500/15 to-cyan-500/15 p-4 border border-purple-500/30 relative">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <h2 className="font-semibold text-sm text-foreground">Rediscover</h2>
      </div>

      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-3xl font-bold text-purple-400">{rediscoverCount}</span>
        <span className="text-xs text-muted-foreground">items from 2+ months ago</span>
      </div>

      <p className="text-xs text-muted-foreground/80 mb-3">
        Revisit forgotten bookmarks and rediscover valuable content from your collection.
      </p>

      <button
        onClick={handleStart}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/30 transition-colors"
      >
        Start <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
