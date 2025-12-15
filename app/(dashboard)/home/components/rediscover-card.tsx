"use client";

import { useRouter } from "next/navigation";
import { RefreshCw, ArrowRight, Sparkles } from "lucide-react";
import { CardModel } from "@/lib/types";

interface RediscoverCardProps {
  rediscoverCount: number;
  rediscoverItems: CardModel[];
}

export function RediscoverCard({ rediscoverCount, rediscoverItems }: RediscoverCardProps) {
  const router = useRouter();

  const handleStart = () => {
    // Navigate to dig-up feature or random item
    if (rediscoverItems.length > 0) {
      const randomItem = rediscoverItems[Math.floor(Math.random() * rediscoverItems.length)];
      router.push(`/library?card=${randomItem.id}`);
    }
  };

  // Empty state - no items to rediscover yet
  if (rediscoverCount === 0) {
    return (
      <div
        className="rounded-xl p-4 h-full"
        style={{
          background: 'var(--bg-surface-2)',
          boxShadow: 'var(--shadow-2)',
          border: '1px solid var(--border-subtle)',
          borderTopColor: 'var(--border-highlight-top)',
          borderLeftColor: 'var(--border-highlight-left)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <h2 className="font-semibold text-sm text-foreground">Rediscover</h2>
        </div>

        <div className="text-center py-4">
          <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Nothing to rediscover yet</p>
          <p className="text-[10px] text-muted-foreground/60">Items saved 2+ months ago will appear here</p>
        </div>
      </div>
    );
  }

  // Has items to rediscover
  return (
    <div
      className="rounded-xl p-4 h-full"
      style={{
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
      }}
    >
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
        Revisit forgotten bookmarks and rediscover valuable content.
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
