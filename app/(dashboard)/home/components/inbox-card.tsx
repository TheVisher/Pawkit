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
      <div className="rounded-xl border border-subtle bg-surface p-4">
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
    <div className="rounded-xl border border-subtle bg-surface p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <Inbox className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <h2 className="font-semibold text-sm text-foreground">Inbox</h2>
      </div>

      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-3xl font-bold text-blue-400">{inboxCount}</span>
        <span className="text-xs text-muted-foreground">to organize</span>
      </div>

      {/* Preview items */}
      <div className="space-y-1.5 mb-3">
        {inboxItems.slice(0, 2).map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" />
            <span className="truncate flex-1">{item.title || item.domain || item.url}</span>
            <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </span>
          </div>
        ))}
        {inboxCount > 2 && (
          <p className="text-[10px] text-muted-foreground/60 pl-3">
            +{inboxCount - 2} more
          </p>
        )}
      </div>

      <button
        onClick={handleProcess}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-colors"
      >
        Process <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
