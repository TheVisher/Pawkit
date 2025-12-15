"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
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
        className="rounded-xl p-5"
        style={{
          background: 'var(--bg-surface-2)',
          boxShadow: 'var(--shadow-2)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <h2 className="font-medium text-sm text-foreground mb-2 flex items-center gap-2">
          <span>📥</span> Inbox
        </h2>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
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
      className="rounded-xl p-5"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <h2 className="font-medium text-sm text-foreground mb-2 flex items-center gap-2">
        <span>📥</span> Inbox
      </h2>

      <p className="text-4xl font-bold text-blue-400">{inboxCount}</p>
      <p className="text-sm text-muted-foreground mb-4">to organize</p>

      <button
        onClick={handleProcess}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors"
      >
        Process <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
