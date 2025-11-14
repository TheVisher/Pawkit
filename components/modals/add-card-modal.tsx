"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CardModel } from "@/lib/types";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { useDemoAwareStore } from "@/lib/hooks/use-demo-aware-store";
import { GlowButton } from "@/components/ui/glow-button";
import { useToast } from "@/lib/hooks/use-toast";
import { ToastContainer } from "@/components/ui/toast";

export type AddCardModalProps = {
  open: boolean;
  initialUrl?: string;
  onClose: () => void;
  onCreated?: (card: CardModel) => void;
};

export function AddCardModal({ open, initialUrl, onClose, onCreated }: AddCardModalProps) {
  const { addCard: addCardToStore } = useDemoAwareStore();
  const { toasts, dismissToast, error: showErrorToast } = useToast();
  const [url, setUrl] = useState(initialUrl ?? "");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [collections, setCollections] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoFetchMetadata = useSettingsStore((state) => state.autoFetchMetadata);
  const previewServiceUrl = useSettingsStore((state) => state.previewServiceUrl);

  useEffect(() => {
    if (open) {
      setUrl(initialUrl ?? "");
      setTitle("");
      setNotes("");
      setTags("");
      setCollections("");
      setError(null);
    }
  }, [open, initialUrl]);

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

  if (!open || typeof document === 'undefined') return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      url,
      type: 'url' as const,
      title: title || undefined,
      notes: notes || undefined,
      tags: tags ? tags.split(",").map((tag) => tag.trim()).filter(Boolean) : undefined,
      collections: collections
        ? collections.split(",").map((value) => value.trim()).filter(Boolean)
        : undefined
    };

    try {
      // Create card - will throw error if duplicate URL detected
      await addCardToStore(payload);

      // Call onCreated callback (with temporary card data)
      onCreated?.({
        id: 'temp',
        url,
        title: title || null,
        notes: notes || null,
        content: null,
        type: 'url',
        status: 'PENDING',
        collections: payload.collections || [],
        tags: payload.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
        deletedAt: null,
        pinned: false,
        domain: null,
        image: null,
        description: null,
        articleContent: null,
        metadata: undefined,
        inDen: false,
        encryptedContent: null,
        scheduledDate: null
      });

      setLoading(false);
      onClose();
    } catch (error) {
      setLoading(false);

      // Handle duplicate URL error
      if (error instanceof Error && error.message.startsWith('DUPLICATE_URL:')) {
        showErrorToast('This URL is already bookmarked');
        setError('This URL is already bookmarked');
        return;
      }

      // Handle other errors
      showErrorToast('Failed to add card. Please try again.');
      setError('Failed to add card. Please try again.');
    }

    // Note: The store handles server sync and metadata fetch in background
  };

  const modalContent = (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg shadow-lg p-6"
          onClick={(event) => event.stopPropagation()}
        >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Add Card</h2>
          <GlowButton type="button" variant="primary" size="sm" onClick={onClose}>
            Close
          </GlowButton>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <label className="mb-1 block text-xs text-gray-500" htmlFor="url">
              URL
            </label>
            <input
              id="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className="w-full rounded-lg border border-subtle bg-surface-muted p-2 text-foreground"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border border-subtle bg-surface-muted p-2 text-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="modal-scrollbar w-full rounded-lg border border-subtle bg-surface-muted p-2 text-foreground"
              rows={4}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500" htmlFor="tags">
              Tags (comma separated)
            </label>
            <input
              id="tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              className="w-full rounded-lg border border-subtle bg-surface-muted p-2 text-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500" htmlFor="collections">
              Collections (comma separated slugs)
            </label>
            <input
              id="collections"
              value={collections}
              onChange={(event) => setCollections(event.target.value)}
              className="w-full rounded-lg border border-subtle bg-surface-muted p-2 text-foreground"
            />
          </div>
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <GlowButton type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
          {loading ? "Saving…" : "Save"}
        </GlowButton>
        </form>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );

  return createPortal(modalContent, document.body);
}
