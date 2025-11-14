"use client";

import { useState, useEffect } from "react";
import { X, Calendar } from "lucide-react";
import { useDataStore } from "@/lib/stores/data-store";
import { GlowButton } from "@/components/ui/glow-button";

type AddEventModalProps = {
  open: boolean;
  onClose: () => void;
  scheduledDate: Date;
};

export function AddEventModal({ open, onClose, scheduledDate }: AddEventModalProps) {
  const { addCard } = useDataStore();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setUrl("");
      setIsLoading(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    setIsLoading(true);

    try {
      const scheduledDateStr = scheduledDate.toISOString();

      await addCard({
        type: 'url',
        title: title.trim(),
        url: url.trim() || undefined,
        scheduledDate: scheduledDateStr,
        tags: [],
        collections: []
      });

      onClose();
    } catch (error) {
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Calendar className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Add Event</h2>
              <p className="text-sm text-muted-foreground">
                {scheduledDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Input */}
          <div>
            <label htmlFor="event-title" className="block text-sm font-medium text-foreground mb-2">
              Event Title *
            </label>
            <input
              id="event-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Concert, Movie Release, Deadline..."
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
                text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                transition-all"
              autoFocus
              required
            />
          </div>

          {/* URL Input (Optional) */}
          <div>
            <label htmlFor="event-url" className="block text-sm font-medium text-foreground mb-2">
              URL (optional)
            </label>
            <input
              id="event-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
                text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10
                hover:bg-white/10 transition-colors text-foreground font-medium"
            >
              Cancel
            </button>
            <GlowButton
              type="submit"
              variant="primary"
              size="md"
              disabled={!title.trim() || isLoading}
              className="flex-1"
            >
              {isLoading ? "Adding..." : "Add Event"}
            </GlowButton>
          </div>
        </form>
      </div>
    </div>
  );
}
