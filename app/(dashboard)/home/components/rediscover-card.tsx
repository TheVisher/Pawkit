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
    if (rediscoverItems.length > 0) {
      const randomItem = rediscoverItems[Math.floor(Math.random() * rediscoverItems.length)];
      router.push(`/library?card=${randomItem.id}`);
    }
  };

  // Empty state
  if (rediscoverCount === 0) {
    return (
      <div
        className="rounded-xl p-4"
        style={{
          background: 'var(--bg-surface-2)',
          boxShadow: 'var(--shadow-2)',
          border: '1px solid var(--border-subtle)',
          borderTopColor: 'var(--border-highlight-top)',
          borderLeftColor: 'var(--border-highlight-left)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-purple-500/20 flex items-center justify-center">
            <RefreshCw className="w-3 h-3 text-purple-400" />
          </div>
          <h2 className="font-semibold text-sm text-foreground">Rediscover</h2>
        </div>

        <p className="text-xs text-muted-foreground">Nothing yet</p>
        <p className="text-[10px] text-muted-foreground/60">Items 2+ months old appear here</p>
      </div>
    );
  }

  // Has items
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
        borderTopColor: 'var(--border-highlight-top)',
        borderLeftColor: 'var(--border-highlight-left)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-md bg-purple-500/20 flex items-center justify-center">
          <RefreshCw className="w-3 h-3 text-purple-400" />
        </div>
        <h2 className="font-semibold text-sm text-foreground">Rediscover</h2>
      </div>

      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-2xl font-bold text-purple-400">{rediscoverCount}</span>
        <span className="text-xs text-muted-foreground">from 2+ months ago</span>
      </div>

      <button
        onClick={handleStart}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/30 transition-colors"
      >
        Explore <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
