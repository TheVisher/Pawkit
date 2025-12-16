"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Inbox } from "lucide-react";
import { CardModel } from "@/lib/types";

interface InboxCardProps {
  inboxItems: CardModel[];
  inboxCount: number;
}

export function InboxCard({ inboxItems, inboxCount }: InboxCardProps) {
  const router = useRouter();

  const handleProcess = () => {
    router.push("/library?filter=inbox");
  };

  // Empty inbox state
  if (inboxCount === 0) {
    return (
      <div
        className="h-full rounded-xl p-4 flex flex-col min-h-0"
        style={{
          background: 'var(--bg-surface-2)',
          boxShadow: 'var(--shadow-2)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <h2 className="font-medium text-sm text-foreground mb-2 flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Inbox className="w-3 h-3 text-blue-400" />
          </div>
          Inbox
        </h2>
        <div className="flex-1 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm text-muted-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground/60">You&apos;ve organized everything</p>
          </div>
        </div>
      </div>
    );
  }

  // Inbox with items
  return (
    <div
      className="h-full rounded-xl p-4 flex flex-col min-h-0"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <h2 className="font-medium text-sm text-foreground mb-2 flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <Inbox className="w-3 h-3 text-blue-400" />
        </div>
        Inbox
      </h2>

      <div className="flex-1 min-h-0">
        <p className="text-3xl font-bold text-blue-400">{inboxCount}</p>
        <p className="text-sm text-muted-foreground">to organize</p>
      </div>

      <button
        onClick={handleProcess}
        className="shrink-0 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors"
      >
        Process <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
