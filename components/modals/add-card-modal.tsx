"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CardModel } from "@/lib/types";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { useDemoAwareStore } from "@/lib/hooks/use-demo-aware-store";
import { useToastStore } from "@/lib/stores/toast-store";
import { GlowButton } from "@/components/ui/glow-button";

export type AddCardModalProps = {
  open: boolean;
  initialUrl?: string;
  onClose: () => void;
  onCreated?: (card: CardModel) => void;
};

export function AddCardModal({ open, initialUrl, onClose, onCreated }: AddCardModalProps) {
  const { addCard: addCardToStore } = useDemoAwareStore();
  const toast = useToastStore();
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

  // Add global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.log('🔴 MODAL - Unhandled promise rejection detected:', event.reason);
      if (event.reason instanceof Error && event.reason.message === 'DUPLICATE_URL') {
        console.log('🔴 MODAL - DUPLICATE_URL in unhandled rejection!');
        event.preventDefault(); // Prevent the default error
        toast.error('This URL is already bookmarked');
        setError('This URL is already in your library');
        setLoading(false);
      } else if (event.reason instanceof Error && event.reason.message === 'DUPLICATE_URL_IN_TRASH') {
        console.log('🔴 MODAL - DUPLICATE_URL_IN_TRASH in unhandled rejection!');
        event.preventDefault(); // Prevent the default error
        toast.error('This URL is in your trash. Empty trash to add it again.');
        setError('This URL is in your trash. Go to Trash and empty it to add this URL again.');
        setLoading(false);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, [toast]);

  if (!open || typeof document === 'undefined') return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    console.log('🔴 MODAL - handleSubmit called');
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
      console.log('🔴 MODAL - About to call addCardToStore');
      console.log('🔴 MODAL - addCardToStore type:', typeof addCardToStore);
      // Wait for card creation to complete (including duplicate check)
      const result = await addCardToStore(payload);
      console.log('🔴 MODAL - addCardToStore completed, result:', result);

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

      // Success - close modal
      toast.success("Bookmark saved");
      setLoading(false);
      onClose();
    } catch (error) {
      console.log('🔴 CATCH BLOCK - Error caught:', error);
      setLoading(false);

      // Handle duplicate URL errors
      if (error instanceof Error && error.message === 'DUPLICATE_URL') {
        console.log('🔴 DUPLICATE_URL detected - calling toast.error()');
        toast.error('This URL is already bookmarked');
        console.log('🔴 toast.error() called');
        setError('This URL is already in your library');
      } else if (error instanceof Error && error.message === 'DUPLICATE_URL_IN_TRASH') {
        console.log('🔴 DUPLICATE_URL_IN_TRASH detected - calling toast.error()');
        toast.error('This URL is in your trash. Empty trash to add it again.');
        console.log('🔴 toast.error() called');
        setError('This URL is in your trash. Go to Trash and empty it to add this URL again.');
      } else {
        console.log('🔴 Other error - calling toast.error()');
        toast.error('Failed to save bookmark');
        setError('Failed to save bookmark. Please try again.');
      }
      console.log('🔴 Catch block complete');
    } finally {
      console.log('🔴 MODAL - Finally block executed');
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
  );

  return createPortal(modalContent, document.body);
}
