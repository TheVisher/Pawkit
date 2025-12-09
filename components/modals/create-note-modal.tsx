"use client";

import { useState, useEffect } from "react";
import { FileText, Layout, ChevronDown, ChevronUp, CalendarDays, Sparkles, X } from "lucide-react";
import { createPortal } from "react-dom";
import { CardType } from "@/lib/types";
import { noteTemplates, NoteTemplate, getTemplateById } from "@/lib/templates/note-templates";

const LAST_TEMPLATE_KEY = "pawkit-last-used-template";

type CreateNoteModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { type: CardType; title: string; content?: string; tags?: string[] }) => Promise<void>;
  dailyNoteExists?: boolean; // Whether today's daily note already exists
};

// Lifted button for note type selection
function NoteTypeButton({
  selected,
  onClick,
  disabled,
  icon: Icon,
  label,
  className = "",
}: {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ElementType;
  label: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
        transition-all duration-200
        ${className}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={
        selected
          ? {
              background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
              boxShadow: 'var(--raised-shadow), 0 0 20px hsla(var(--accent-h) var(--accent-s) 50% / 0.3)',
              border: '1px solid hsla(var(--accent-h) var(--accent-s) 50% / 0.5)',
              borderTopColor: 'var(--raised-border-top)',
              color: 'var(--ds-accent)',
            }
          : {
              background: 'var(--bg-surface-1)',
              boxShadow: 'var(--inset-shadow)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }
      }
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

export function CreateNoteModal({ open, onClose, onConfirm, dailyNoteExists = false }: CreateNoteModalProps) {
  const [noteType, setNoteType] = useState<"md-note" | "text-note" | "daily-note">("md-note");
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      // Reset to default state
      setNoteType("md-note");
      setTitle("");
      setError(null);
      setShowTemplates(false);

      // Load last used template
      if (typeof window !== 'undefined') {
        const lastTemplateId = localStorage.getItem(LAST_TEMPLATE_KEY);
        if (lastTemplateId) {
          const template = getTemplateById(lastTemplateId);
          if (template) {
            setSelectedTemplate(template);
          }
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
    >
      {/* Modal Container - Raised panel */}
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface-2)',
          boxShadow: 'var(--shadow-4)',
          border: '1px solid var(--border-subtle)',
          borderTopColor: 'var(--border-highlight-top)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Create New Note
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Note Type Selection */}
          <div>
            <label
              className="block text-sm font-medium mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              Note Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <NoteTypeButton
                selected={noteType === "md-note"}
                onClick={() => setNoteType("md-note")}
                icon={FileText}
                label="Markdown"
              />
              <NoteTypeButton
                selected={noteType === "text-note"}
                onClick={() => setNoteType("text-note")}
                icon={FileText}
                label="Plain Text"
              />
              <NoteTypeButton
                selected={noteType === "daily-note"}
                onClick={() => !dailyNoteExists && setNoteType("daily-note")}
                disabled={dailyNoteExists}
                icon={CalendarDays}
                label={dailyNoteExists ? "Daily Note (Created)" : "Daily Note"}
                className="col-span-2"
              />
            </div>
          </div>

          {/* Template Selection Toggle */}
          <div>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all"
              style={{
                background: 'var(--bg-surface-1)',
                boxShadow: 'var(--inset-shadow)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <div className="flex items-center gap-2">
                <Layout size={16} />
                {selectedTemplate ? (
                  <span style={{ color: 'var(--text-primary)' }}>
                    Template: <span style={{ color: 'var(--ds-accent)' }}>{selectedTemplate.name}</span>
                  </span>
                ) : (
                  <span>Choose a Template (Optional)</span>
                )}
              </div>
              {showTemplates ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {/* Template Picker - Inset container with raised cards */}
          {showTemplates && (
            <div
              className="rounded-xl p-3 max-h-56 overflow-y-auto"
              style={{
                background: 'var(--bg-surface-1)',
                boxShadow: 'var(--inset-shadow)',
              }}
            >
              <div className="space-y-2">
                {/* None option */}
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setShowTemplates(false);
                  }}
                  className="w-full text-left p-3 rounded-lg transition-all"
                  style={
                    selectedTemplate === null
                      ? {
                          background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                          boxShadow: 'var(--raised-shadow-sm), 0 0 12px hsla(var(--accent-h) var(--accent-s) 50% / 0.2)',
                          border: '1px solid hsla(var(--accent-h) var(--accent-s) 50% / 0.4)',
                          borderTopColor: 'var(--raised-border-top)',
                        }
                      : {
                          background: 'var(--bg-surface-2)',
                          boxShadow: 'var(--raised-shadow-sm)',
                          border: '1px solid var(--border-subtle)',
                          borderTopColor: 'var(--raised-border-top)',
                        }
                  }
                >
                  <div
                    className="font-medium text-sm"
                    style={{ color: selectedTemplate === null ? 'var(--ds-accent)' : 'var(--text-primary)' }}
                  >
                    No Template
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Start with a blank note
                  </div>
                </button>

                {/* Template options */}
                {noteTemplates.map((template) => {
                  const isSelected = selectedTemplate?.id === template.id;
                  return (
                    <button
                      key={template.id}
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowTemplates(false);
                      }}
                      className="w-full text-left p-3 rounded-lg transition-all"
                      style={
                        isSelected
                          ? {
                              background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                              boxShadow: 'var(--raised-shadow-sm), 0 0 12px hsla(var(--accent-h) var(--accent-s) 50% / 0.2)',
                              border: '1px solid hsla(var(--accent-h) var(--accent-s) 50% / 0.4)',
                              borderTopColor: 'var(--raised-border-top)',
                            }
                          : {
                              background: 'var(--bg-surface-2)',
                              boxShadow: 'var(--raised-shadow-sm)',
                              border: '1px solid var(--border-subtle)',
                              borderTopColor: 'var(--raised-border-top)',
                            }
                      }
                    >
                      <div
                        className="font-medium text-sm"
                        style={{ color: isSelected ? 'var(--ds-accent)' : 'var(--text-primary)' }}
                      >
                        {template.name}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {template.description}
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {template.category} • {template.tags.map(tag => `#${tag}`).join(' ')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Title Input - Inset style */}
          {noteType !== "daily-note" && (
            <>
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
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
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl text-sm transition-all outline-none"
                  style={{
                    background: 'var(--bg-surface-1)',
                    boxShadow: 'var(--inset-shadow)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Generate Title Button */}
              <button
                onClick={handleGenerateTitle}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm transition-all"
                style={{
                  background: 'var(--bg-surface-2)',
                  boxShadow: 'var(--raised-shadow-sm)',
                  border: '1px solid var(--border-subtle)',
                  borderTopColor: 'var(--raised-border-top)',
                  color: 'var(--text-secondary)',
                  opacity: generating ? 0.6 : 1,
                }}
              >
                <Sparkles size={16} />
                {generating ? "Generating..." : "Generate Random Title"}
              </button>
            </>
          )}

          {noteType === "daily-note" && (
            <div
              className="rounded-xl p-4"
              style={{
                background: 'var(--bg-surface-1)',
                boxShadow: 'var(--inset-shadow)',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Daily note will be created with today&apos;s date as the title.
              </p>
            </div>
          )}

          {error && (
            <p
              className="text-sm rounded-xl px-4 py-3"
              style={{
                background: 'hsla(0, 70%, 50%, 0.15)',
                color: 'hsl(0, 70%, 60%)',
                border: '1px solid hsla(0, 70%, 50%, 0.3)',
              }}
            >
              {error}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className="px-6 py-4 flex gap-3"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface-1)',
          }}
        >
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'var(--bg-surface-2)',
              boxShadow: 'var(--raised-shadow-sm)',
              border: '1px solid var(--border-subtle)',
              borderTopColor: 'var(--raised-border-top)',
              color: 'var(--text-secondary)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'var(--ds-accent)',
              boxShadow: 'var(--raised-shadow), 0 0 20px hsla(var(--accent-h) var(--accent-s) 50% / 0.3)',
              border: '1px solid hsla(var(--accent-h) var(--accent-s) 70% / 0.5)',
              color: 'white',
            }}
          >
            Create Note
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
