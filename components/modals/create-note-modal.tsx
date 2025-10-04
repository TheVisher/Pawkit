"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { CardType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  if (!open || typeof document === 'undefined') return null;

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

  const modalContent = (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
              <Button
                onClick={() => setNoteType("md-note")}
                variant={noteType === "md-note" ? "default" : "secondary"}
                className="flex-1"
                size="lg"
              >
                📝 Markdown Note
              </Button>
              <Button
                onClick={() => setNoteType("text-note")}
                variant={noteType === "text-note" ? "default" : "secondary"}
                className="flex-1"
                size="lg"
              >
                📄 Plain Text Note
              </Button>
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title
            </label>
            <Input
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
              autoFocus
            />
          </div>

          {/* Generate Title Button */}
          <Button
            onClick={handleGenerateTitle}
            disabled={generating}
            variant="secondary"
            className="w-full justify-start"
          >
            {generating ? "Generating..." : "🎲 Generate Random Title"}
          </Button>

          {error && (
            <p className="text-sm text-rose-400 bg-rose-900/20 rounded px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-gray-800 p-4 flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="default"
            className="flex-1"
            size="lg"
          >
            Create Note
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
