"use client";

import { TrendingUp, Flame } from "lucide-react";

interface StatsCardProps {
  savedThisWeek: number;
  processedThisWeek: number;
  streak?: number;
}

export function StatsCard({ savedThisWeek, processedThisWeek, streak = 0 }: StatsCardProps) {
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
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-pink-500/20 flex items-center justify-center">
          <TrendingUp className="w-3.5 h-3.5 text-pink-400" />
        </div>
        <h2 className="font-semibold text-sm text-foreground">This Week</h2>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-surface-soft rounded-lg p-2.5 text-center">
          <p className="text-xl font-bold text-foreground">{savedThisWeek}</p>
          <p className="text-[10px] text-muted-foreground">Saved</p>
        </div>
        <div className="bg-surface-soft rounded-lg p-2.5 text-center">
          <p className="text-xl font-bold text-foreground">{processedThisWeek}</p>
          <p className="text-[10px] text-muted-foreground">Processed</p>
        </div>
      </div>

      {streak > 0 && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-orange-500/10">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-xs text-orange-400 font-medium">{streak}-day streak!</span>
        </div>
      )}
    </div>
  );
}
