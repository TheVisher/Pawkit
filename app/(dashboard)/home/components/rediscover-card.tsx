"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
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
        className="rounded-xl p-5"
        style={{
          background: 'var(--bg-surface-2)',
          boxShadow: 'var(--shadow-2)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <h2 className="font-medium text-sm text-foreground mb-2 flex items-center gap-2">
          <span>🔄</span> Rediscover
        </h2>
        <p className="text-sm text-muted-foreground">Nothing yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Items 2+ months old appear here</p>
      </div>
    );
  }

  // Has items
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <h2 className="font-medium text-sm text-foreground mb-2 flex items-center gap-2">
        <span>🔄</span> Rediscover
      </h2>

      <p className="text-4xl font-bold text-purple-400">{rediscoverCount}</p>
      <p className="text-sm text-muted-foreground mb-4">from 2+ months ago</p>

      <button
        onClick={handleStart}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-purple-500/20 text-purple-400 text-sm font-medium hover:bg-purple-500/30 transition-colors"
      >
        Explore <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
