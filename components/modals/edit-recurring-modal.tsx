"use client";

import { X, Edit3, Calendar, Repeat } from "lucide-react";
import { CalendarEvent } from "@/lib/types/calendar";

type EditRecurringModalProps = {
  open: boolean;
  onClose: () => void;
  event: CalendarEvent;
  instanceDate?: string; // The specific date of the instance being edited
  onEditThis: () => void; // Edit only this instance (create exception)
  onEditAll: () => void; // Edit entire series
};

export function EditRecurringModal({
  open,
  onClose,
  event,
  instanceDate,
  onEditThis,
  onEditAll,
}: EditRecurringModalProps) {

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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <Edit3 className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Edit Recurring Event</h2>
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
          <div className="flex items-start gap-3 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
            <Repeat className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-purple-200">This is a recurring event</p>
              <p className="text-purple-200/70 mt-1">
                Choose whether to edit just this occurrence or all events in the series.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={onEditThis}
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10
                hover:bg-white/10 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]
                transition-all duration-200 text-left group"
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                <div>
                  <p className="font-medium text-foreground">Edit this event only</p>
                  <p className="text-sm text-muted-foreground">
                    Changes will only apply to {instanceDate || event.date}
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={onEditAll}
              className="w-full p-4 rounded-xl bg-purple-500/10 border border-purple-500/30
                hover:bg-purple-500/20 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]
                transition-all duration-200 text-left group"
            >
              <div className="flex items-center gap-3">
                <Repeat className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="font-medium text-purple-200">Edit all events in series</p>
                  <p className="text-sm text-purple-200/70">
                    Changes will apply to all occurrences of this event
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Cancel button */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
