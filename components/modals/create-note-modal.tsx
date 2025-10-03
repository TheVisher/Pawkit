"use client";

import { useState } from "react";
import { CardType } from "@/lib/types";

type CreateNoteModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { type: CardType; title: string; content?: string }) => Promise<void>;
};

export function CreateNoteModal({ open, onClose, onConfirm }: CreateNoteModalProps) {
  const [noteType, setNoteType] = useState<"md-note" | "text-note">("md-note");
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setError(null);
    try {
      await onConfirm({
        type: noteType,
        title: title.trim(),
        content: ""
      });
      setTitle("");
      setNoteType("md-note");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create note");
    }
  };

  const handleGenerateTitle = async () => {
    setGenerating(true);
    // Simple title generation - can be enhanced later
    const suggestions = [
      "Quick Note",
      "Meeting Notes",
      "Ideas",
      "Todo List",
      "Research",
      "Thoughts"
    ];
    const randomTitle = suggestions[Math.floor(Math.random() * suggestions.length)];
    setTitle(randomTitle + " - " + new Date().toLocaleDateString());
    setGenerating(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-950 rounded-lg border border-gray-800 shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-800 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-100">Create New Note</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Note Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Note Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setNoteType("md-note")}
                className={`flex-1 px-4 py-3 rounded text-sm font-medium transition-colors ${
                  noteType === "md-note"
                    ? "bg-accent text-gray-900"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                📝 Markdown Note
              </button>
              <button
                onClick={() => setNoteType("text-note")}
                className={`flex-1 px-4 py-3 rounded text-sm font-medium transition-colors ${
                  noteType === "text-note"
                    ? "bg-accent text-gray-900"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                📄 Plain Text Note
              </button>
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Enter note title..."
              className="w-full rounded border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-accent focus:outline-none"
              autoFocus
            />
          </div>

          {/* Generate Title Button */}
          <button
            onClick={handleGenerateTitle}
            disabled={generating}
            className="w-full text-left rounded bg-gray-800 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {generating ? "Generating..." : "🎲 Generate Random Title"}
          </button>

          {error && (
            <p className="text-sm text-rose-400 bg-rose-900/20 rounded px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-gray-800 p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded bg-gray-900 px-4 py-2.5 text-sm font-medium text-gray-100 hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 rounded bg-accent px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-accent/90 transition-colors"
          >
            Create Note
          </button>
        </div>
      </div>
    </div>
  );
}
