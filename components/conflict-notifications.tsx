"use client";

import { useConflictStore } from "@/lib/stores/conflict-store";
import { X, AlertTriangle } from "lucide-react";

export function ConflictNotifications() {
  const conflicts = useConflictStore((state) => state.conflicts);
  const removeConflict = useConflictStore((state) => state.removeConflict);

  if (conflicts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {conflicts.map((conflict) => (
        <div
          key={conflict.id}
          className="flex items-start gap-3 rounded-lg border border-orange-500/50 bg-orange-950/90 p-4 shadow-lg backdrop-blur-sm"
        >
          <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-orange-100">Sync Conflict</p>
            <p className="text-sm text-orange-200/80 mt-1">{conflict.message}</p>
          </div>
          <button
            onClick={() => removeConflict(conflict.id)}
            className="text-orange-300 hover:text-orange-100 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
