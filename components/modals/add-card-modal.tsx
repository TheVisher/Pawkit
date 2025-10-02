"use client";

import { FormEvent, useEffect, useState } from "react";
import { CardModel } from "@/lib/types";
import { useSettingsStore } from "@/lib/hooks/settings-store";

export type AddCardModalProps = {
  open: boolean;
  initialUrl?: string;
  onClose: () => void;
  onCreated?: (card: CardModel) => void;
};

export function AddCardModal({ open, initialUrl, onClose, onCreated }: AddCardModalProps) {
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

  if (!open) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const payload = {
      url,
      title: title || undefined,
      notes: notes || undefined,
      tags: tags ? tags.split(",").map((tag) => tag.trim()).filter(Boolean) : undefined,
      collections: collections
        ? collections.split(",").map((value) => value.trim()).filter(Boolean)
        : undefined
    };

    // Create card immediately
    const response = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.message || "Failed to create card");
      setLoading(false);
      return;
    }

    const card = await response.json();
    onCreated?.(card);
    setLoading(false);
    onClose();

    // Always trigger background metadata fetch (fire and forget)
    fetch(`/api/cards/${card.id}/fetch-metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: card.url, previewServiceUrl })
    }).catch(() => {
      // Silently fail - card is already created
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" role="dialog" aria-modal="true">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded bg-gray-950 p-6 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100">Add Card</h2>
          <button type="button" className="rounded bg-gray-800 px-2 py-1 text-sm" onClick={onClose}>
            Close
          </button>
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
              className="w-full rounded border border-gray-800 bg-gray-900 p-2"
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
              className="w-full rounded border border-gray-800 bg-gray-900 p-2"
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
              className="w-full rounded border border-gray-800 bg-gray-900 p-2"
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
              className="w-full rounded border border-gray-800 bg-gray-900 p-2"
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
              className="w-full rounded border border-gray-800 bg-gray-900 p-2"
            />
          </div>
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <button type="submit" className="w-full rounded bg-accent py-2 text-sm font-medium text-gray-950" disabled={loading}>
          {loading ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
