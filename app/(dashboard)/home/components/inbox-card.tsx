"use client";

import { useRouter } from "next/navigation";
import { Inbox, ArrowRight, Sparkles } from "lucide-react";
import { CardModel } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface InboxCardProps {
  inboxItems: CardModel[];
  inboxCount: number;
}

export function InboxCard({ inboxItems, inboxCount }: InboxCardProps) {
  const router = useRouter();

  const handleProcess = () => {
    // Navigate to library with inbox filter
    router.push("/library?filter=inbox");
  };

  // Empty inbox state
  if (inboxCount === 0) {
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
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <h2 className="font-semibold text-sm text-foreground">Inbox</h2>
        </div>

        <div className="text-center py-4">
          <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">All caught up!</p>
          <p className="text-[10px] text-muted-foreground/60">You&apos;ve organized everything</p>
        </div>
      </div>
    );
  }

  // Inbox with items
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
        <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center">
          <Inbox className="w-3 h-3 text-blue-400" />
        </div>
        <h2 className="font-semibold text-sm text-foreground">Inbox</h2>
      </div>

      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-2xl font-bold text-blue-400">{inboxCount}</span>
        <span className="text-xs text-muted-foreground">to organize</span>
      </div>

      <button
        onClick={handleProcess}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-colors"
      >
        Process <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
