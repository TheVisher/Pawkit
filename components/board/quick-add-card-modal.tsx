"use client";

import { FormEvent, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useDataStore } from "@/lib/stores/data-store";
import { useToastStore } from "@/lib/stores/toast-store";
import { GlowButton } from "@/components/ui/glow-button";
import { X } from "lucide-react";

export interface QuickAddCardModalProps {
  open: boolean;
  onClose: () => void;
  collectionSlug: string;
  statusTag: string;
  columnLabel: string;
}

export function QuickAddCardModal({
  open,
  onClose,
  collectionSlug,
  statusTag,
  columnLabel
}: QuickAddCardModalProps) {
  const { addCard } = useDataStore();
  const toast = useToastStore();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setNotes("");
      // Focus input after modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (open) {
      window.addEventListener("keydown", handleKey);
    }
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;

    setLoading(true);

    try {
      await addCard({
        title: title.trim(),
        notes: notes.trim() || undefined,
        type: "text-note",
        url: `note://${Date.now()}`, // Generate a unique URL for notes
        collections: [collectionSlug],
        tags: statusTag !== "uncategorized" ? [statusTag] : [],
        status: "READY"
      });

      toast.success(`Card added to ${columnLabel}`);
      onClose();
    } catch (error) {
      toast.error("Failed to create card");
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-surface/95 backdrop-blur-lg shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Add Card</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adding to <span className="text-accent font-medium">{columnLabel}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="card-title">
              Title *
            </label>
            <input
              ref={inputRef}
              id="card-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full rounded-lg border border-subtle bg-surface-soft px-3 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/50"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="card-notes">
              Notes <span className="text-muted-foreground/50">(optional)</span>
            </label>
            <textarea
              id="card-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add details, context, or description..."
              className="w-full rounded-lg border border-subtle bg-surface-soft px-3 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              rows={3}
              disabled={loading}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <GlowButton
            type="submit"
            variant="primary"
            size="md"
            className="flex-1"
            disabled={loading || !title.trim()}
          >
            {loading ? "Creating..." : "Create Card"}
          </GlowButton>
        </div>
      </form>
    </div>
  );

  return createPortal(modalContent, document.body);
}
