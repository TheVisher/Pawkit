"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Inbox, TrendingUp } from "lucide-react";
import { CardModel } from "@/lib/types";

interface InboxStatsCardProps {
  inboxItems: CardModel[];
  inboxCount: number;
  savedThisWeek: number;
  processedThisWeek: number;
}

export function InboxStatsCard({
  inboxItems,
  inboxCount,
  savedThisWeek,
  processedThisWeek,
}: InboxStatsCardProps) {
  const router = useRouter();

  const handleProcess = () => {
    router.push("/library?filter=inbox");
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
      {/* Two inner panels side by side */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* Inbox Panel */}
        <div className="bg-surface-soft rounded-lg p-3 flex flex-col min-h-0">
          <div className="flex items-center gap-1.5 mb-2 shrink-0">
            <Inbox className="w-3 h-3 text-blue-400" />
            <span className="text-xs font-medium text-foreground">Inbox</span>
          </div>

          {inboxCount === 0 ? (
            <div className="flex-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">All caught up!</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0">
                <p className="text-2xl font-bold text-blue-400">{inboxCount}</p>
                <p className="text-xs text-muted-foreground">to organize</p>
              </div>
              <button
                onClick={handleProcess}
                className="shrink-0 flex items-center justify-center gap-1 py-1.5 px-3 rounded-md bg-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-colors"
              >
                Process <ArrowRight className="w-3 h-3" />
              </button>
            </>
          )}
        </div>

        {/* This Week Stats Panel */}
        <div className="bg-surface-soft rounded-lg p-3 flex flex-col min-h-0">
          <div className="flex items-center gap-1.5 mb-2 shrink-0">
            <TrendingUp className="w-3 h-3 text-pink-400" />
            <span className="text-xs font-medium text-foreground">This Week</span>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-2 min-h-0">
            <div className="text-center flex flex-col justify-center">
              <p className="text-2xl font-bold text-foreground">{savedThisWeek}</p>
              <p className="text-[10px] text-muted-foreground">Saved</p>
            </div>
            <div className="text-center flex flex-col justify-center">
              <p className="text-2xl font-bold text-foreground">{processedThisWeek}</p>
              <p className="text-[10px] text-muted-foreground">Processed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
