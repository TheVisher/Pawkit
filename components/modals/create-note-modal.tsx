"use client";

import { useState, useEffect } from "react";
import { FileText, Bookmark, Layout, ChevronRight, ChevronLeft, CalendarDays } from "lucide-react";
import { createPortal } from "react-dom";
import { CardType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { noteTemplates, NoteTemplate, getTemplatesByCategory, getTemplateById } from "@/lib/templates/note-templates";

const LAST_TEMPLATE_KEY = "pawkit-last-used-template";

type CreateNoteModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { type: CardType; title: string; content?: string; tags?: string[] }) => Promise<void>;
  dailyNoteExists?: boolean; // Whether today's daily note already exists
};

export function CreateNoteModal({ open, onClose, onConfirm, dailyNoteExists = false }: CreateNoteModalProps) {
  const [noteType, setNoteType] = useState<"md-note" | "text-note" | "daily-note">("md-note");
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // Load last used template on open
  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      const lastTemplateId = localStorage.getItem(LAST_TEMPLATE_KEY);
      if (lastTemplateId) {
        const template = getTemplateById(lastTemplateId);
        if (template) {
          setSelectedTemplate(template);
        }
      }
    }
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const handleSubmit = async () => {
    if (!title.trim() && noteType !== "daily-note") {
      setError("Title is required");
      return;
    }

    setError(null);
    try {
      // Use template content if selected
      const content = selectedTemplate ? selectedTemplate.content : "";

      // Save last used template
      if (selectedTemplate && typeof window !== 'undefined') {
        localStorage.setItem(LAST_TEMPLATE_KEY, selectedTemplate.id);
      }

      const actualType: CardType = noteType === "daily-note" ? "md-note" : noteType;
      const tags = noteType === "daily-note" ? ["daily"] : undefined;

      await onConfirm({
        type: actualType,
        title: title.trim(),
        content,
        tags
      });
      setTitle("");
      setNoteType("md-note");
      setSelectedTemplate(null);
      setShowTemplates(false);
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
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setNoteType("md-note")}
                variant={noteType === "md-note" ? "default" : "secondary"}
                className="w-full"
                size="lg"
              >
                <FileText size={16} className="mr-2" />
                Markdown
              </Button>
              <Button
                onClick={() => setNoteType("text-note")}
                variant={noteType === "text-note" ? "default" : "secondary"}
                className="w-full"
                size="lg"
              >
                <FileText size={16} className="mr-2" />
                Plain Text
              </Button>
              <Button
                onClick={() => !dailyNoteExists && setNoteType("daily-note")}
                variant={noteType === "daily-note" ? "default" : "secondary"}
                className="w-full col-span-2"
                size="lg"
                disabled={dailyNoteExists}
              >
                <CalendarDays size={16} className="mr-2" />
                {dailyNoteExists ? "Daily Note (Already Created)" : "Daily Note"}
              </Button>
            </div>
          </div>

          {/* Template Selection Toggle */}
          <div>
            <Button
              onClick={() => setShowTemplates(!showTemplates)}
              variant="outline"
              className="w-full justify-between"
              size="lg"
            >
              <div className="flex items-center gap-2">
                <Layout size={16} />
                {selectedTemplate ? (
                  <span>Template: {selectedTemplate.name}</span>
                ) : (
                  <span>Choose a Template (Optional)</span>
                )}
              </div>
              {showTemplates ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </Button>
          </div>

          {/* Template Picker */}
          {showTemplates && (
            <div className="border border-gray-700 rounded-lg p-3 bg-gray-900/40 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {/* None option */}
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setShowTemplates(false);
                  }}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    selectedTemplate === null
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-gray-700 hover:bg-gray-800/50'
                  }`}
                >
                  <div className="font-medium text-sm text-gray-100">No Template</div>
                  <div className="text-xs text-gray-400">Start with a blank note</div>
                </button>

                {/* Template options */}
                {noteTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowTemplates(false);
                    }}
                    className={`w-full text-left p-3 rounded border transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-gray-700 hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-100">{template.name}</div>
                    <div className="text-xs text-gray-400">{template.description}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {template.category} • {template.tags.map(tag => `#${tag}`).join(' ')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title Input */}
          {noteType !== "daily-note" && (
            <>
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
            </>
          )}

          {noteType === "daily-note" && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
              <p className="text-sm text-gray-300">
                Daily note will be created with today's date as the title.
              </p>
            </div>
          )}

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
