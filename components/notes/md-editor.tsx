"use client";

import { useState, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import remarkBreaks from "remark-breaks";
import { useDataStore } from "@/lib/stores/data-store";
import { Bold, Italic, Strikethrough, Link, Code, List, ListOrdered, Quote, Eye, Edit, Maximize2 } from "lucide-react";

type RichMDEditorProps = {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onNavigate?: (noteId: string) => void;
  onToggleFullscreen?: () => void;
  customComponents?: any; // Custom ReactMarkdown components for wiki-links
};

export function RichMDEditor({ content, onChange, placeholder, onNavigate, onToggleFullscreen, customComponents }: RichMDEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cards = useDataStore((state) => state.cards);

  // Create a map of note titles to IDs for quick lookup
  const noteTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    cards.forEach((card) => {
      if ((card.type === 'md-note' || card.type === 'text-note') && card.title) {
        map.set(card.title.toLowerCase(), card.id);
      }
    });
    return map;
  }, [cards]);

  // Insert markdown formatting
  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);

    onChange(newText);

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + before.length + selectedText.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Custom renderer for wiki-links
  const components = {
    a: ({ node, href, children, ...props }: any) => {
      // Check if this is a wiki-link (starts with #/wiki/)
      if (href?.startsWith('#/wiki/')) {
        const linkText = href.replace('#/wiki/', '').replace(/-/g, ' ');
        const noteId = noteTitleMap.get(linkText.toLowerCase());

        if (noteId && onNavigate) {
          return (
            <button
              onClick={() => onNavigate(noteId)}
              className="text-accent hover:underline cursor-pointer inline-flex items-center gap-1"
              {...props}
            >
              {children}
            </button>
          );
        } else {
          // Note doesn't exist - show as broken link
          return (
            <span className="text-gray-500 italic" title="Note not found">
              {children}
            </span>
          );
        }
      }

      // Regular link
      return <a href={href} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
    },
  };

  return (
    <div className="flex flex-col h-full bg-surface rounded-lg border border-subtle overflow-hidden">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-muted border-b border-subtle">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode("edit")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              mode === "edit"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-surface-soft"
            }`}
          >
            <Edit size={14} />
            Edit
          </button>
          <button
            onClick={() => setMode("preview")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              mode === "preview"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-surface-soft"
            }`}
          >
            <Eye size={14} />
            Preview
          </button>
        </div>
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="p-2 rounded text-muted-foreground hover:bg-surface-soft hover:text-foreground transition-colors"
            title="Toggle fullscreen"
          >
            <Maximize2 size={16} />
          </button>
        )}
      </div>

      {mode === "edit" ? (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-1 px-3 py-2 bg-surface-muted border-b border-subtle flex-wrap">
            <button
              onClick={() => insertMarkdown('**', '**')}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Bold"
            >
              <Bold size={16} />
            </button>
            <button
              onClick={() => insertMarkdown('*', '*')}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Italic"
            >
              <Italic size={16} />
            </button>
            <button
              onClick={() => insertMarkdown('~~', '~~')}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Strikethrough"
            >
              <Strikethrough size={16} />
            </button>
            <div className="w-px h-6 bg-subtle mx-1" />
            <button
              onClick={() => insertMarkdown('`', '`')}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Code"
            >
              <Code size={16} />
            </button>
            <button
              onClick={() => insertMarkdown('[', '](url)')}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Link"
            >
              <Link size={16} />
            </button>
            <div className="w-px h-6 bg-subtle mx-1" />
            <button
              onClick={() => insertMarkdown('\n- ', '')}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Bullet List"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => insertMarkdown('\n1. ', '')}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Numbered List"
            >
              <ListOrdered size={16} />
            </button>
            <button
              onClick={() => insertMarkdown('\n> ', '')}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Quote"
            >
              <Quote size={16} />
            </button>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder || "Start writing in Markdown...\n\nUse [[Note Title]] to link to other notes.\nUse #tag for hashtags.\nUse **bold** and *italic* for formatting."}
              className="w-full h-full p-4 bg-surface text-foreground font-mono text-sm resize-none focus:outline-none"
              style={{
                lineHeight: '1.6',
              }}
            />
          </div>
        </>
      ) : (
        /* Preview */
        <div className="flex-1 overflow-y-auto p-4 prose prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[
              remarkGfm,
              remarkBreaks,
              [remarkWikiLink, {
                aliasDivider: '|',
                pageResolver: (name: string) => {
                  // Preserve special syntax for card references and URLs
                  if (name.startsWith('card:') || name.startsWith('http://') || name.startsWith('https://')) {
                    return [name];
                  }
                  // Convert note titles to slugs
                  return [name.replace(/ /g, '-')];
                },
                hrefTemplate: (permalink: string) => `#/wiki/${permalink}`
              }]
            ]}
            components={customComponents || components}
          >
            {content || '*No content to preview*'}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
