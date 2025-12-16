"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, History } from "lucide-react";
import { CardModel } from "@/lib/types";

interface RediscoverCardProps {
  rediscoverCount: number;
  rediscoverItems: CardModel[];
}

export function RediscoverCard({ rediscoverCount, rediscoverItems }: RediscoverCardProps) {
  const router = useRouter();

  const handleStart = () => {
    router.push("/library?mode=rediscover");
  };

  return (
    <div
      className="h-full rounded-xl p-3 flex flex-col min-h-0"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-2 shrink-0">
        <History className="w-3 h-3 text-purple-400" />
        <span className="text-xs font-medium text-foreground">Rediscover</span>
      </div>

      {rediscoverCount === 0 ? (
        <div className="flex-1 flex items-center">
          <div>
            <p className="text-xs text-muted-foreground">Nothing yet</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Items 2+ months old appear here</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0">
            <p className="text-2xl font-bold text-purple-400">{rediscoverCount}</p>
            <p className="text-xs text-muted-foreground">from 2+ months ago</p>
          </div>
          <button
            onClick={handleStart}
            className="shrink-0 flex items-center justify-center gap-1 py-1.5 px-3 rounded-md bg-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/30 transition-colors"
          >
            Explore <ArrowRight className="w-3 h-3" />
          </button>
        </>
      )}
    </div>
  );
}
