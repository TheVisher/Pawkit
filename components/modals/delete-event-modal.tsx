"use client";

import { useState } from "react";
import { X, Trash2, AlertTriangle, Calendar, Repeat } from "lucide-react";
import { GlowButton } from "@/components/ui/glow-button";
import { CalendarEvent } from "@/lib/types/calendar";

type DeleteEventModalProps = {
  open: boolean;
  onClose: () => void;
  event: CalendarEvent;
  instanceDate?: string; // The specific date of the instance being deleted (for recurring events)
  onDeleteThis: () => void; // Delete only this instance
  onDeleteAll: () => void; // Delete entire series
};

export function DeleteEventModal({
  open,
  onClose,
  event,
  instanceDate,
  onDeleteThis,
  onDeleteAll,
}: DeleteEventModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const isRecurring = !!event.recurrence;

  const handleDeleteThis = async () => {
    setIsLoading(true);
    try {
      await onDeleteThis();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsLoading(true);
    try {
      await onDeleteAll();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg p-6 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <Trash2 className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Delete Event</h2>
              <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                {event.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {isRecurring ? (
            <>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <Repeat className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-200">This is a recurring event</p>
                  <p className="text-yellow-200/70 mt-1">
                    Choose whether to delete just this occurrence or all events in the series.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleDeleteThis}
                  disabled={isLoading}
                  className="w-full p-4 rounded-xl bg-white/5 border border-white/10
                    hover:bg-white/10 hover:border-white/20
                    transition-all duration-200 text-left group"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Delete this event only</p>
                      <p className="text-sm text-muted-foreground">
                        Only this occurrence on {instanceDate || event.date} will be removed
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={handleDeleteAll}
                  disabled={isLoading}
                  className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/30
                    hover:bg-red-500/20 hover:border-red-500/50
                    transition-all duration-200 text-left group"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="h-5 w-5 text-red-400" />
                    <div>
                      <p className="font-medium text-red-200">Delete all events in series</p>
                      <p className="text-sm text-red-200/70">
                        All occurrences of this recurring event will be removed
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-200">Are you sure?</p>
                  <p className="text-red-200/70 mt-1">
                    This action cannot be undone. The event will be permanently deleted.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10
                    hover:bg-white/10 transition-colors text-foreground font-medium"
                >
                  Cancel
                </button>
                <GlowButton
                  onClick={handleDeleteAll}
                  variant="danger"
                  size="md"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? "Deleting..." : "Delete Event"}
                </GlowButton>
              </div>
            </>
          )}
        </div>

        {/* Cancel button for recurring events */}
        {isRecurring && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
