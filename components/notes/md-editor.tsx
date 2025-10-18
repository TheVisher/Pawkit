"use client";

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import remarkBreaks from "remark-breaks";
import { useDataStore } from "@/lib/stores/data-store";

type MDEditorProps = {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onNavigate?: (noteId: string) => void;
};

export function MDEditor({ content, onChange, placeholder, onNavigate }: MDEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
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
    <div className="flex flex-col h-full">
      {/* Toggle Buttons */}
      <div className="flex gap-2 mb-3 border-b border-gray-800 pb-2">
        <button
          onClick={() => setMode("edit")}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            mode === "edit"
              ? "bg-accent text-gray-900"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          ✏️ Edit
        </button>
        <button
          onClick={() => setMode("preview")}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            mode === "preview"
              ? "bg-accent text-gray-900"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          👁️ Preview
        </button>
      </div>

      {/* Editor/Preview Area */}
      <div className="flex-1 overflow-auto">
        {mode === "edit" ? (
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Start writing in Markdown...\n\nUse [[Note Title]] to link to other notes."}
            className="w-full h-full min-h-[400px] rounded border border-gray-800 bg-gray-900 p-4 text-sm text-gray-100 placeholder-gray-500 resize-none focus:border-accent focus:outline-none font-mono"
          />
        ) : (
          <div className="prose prose-invert prose-sm max-w-none p-4 rounded border border-gray-800 bg-gray-900/50">
            {content ? (
              <ReactMarkdown
                remarkPlugins={[
                  remarkGfm,
                  remarkBreaks,
                  [remarkWikiLink, {
                    aliasDivider: '|',
                    pageResolver: (name: string) => [name.replace(/ /g, '-')],
                    hrefTemplate: (permalink: string) => `#/wiki/${permalink}`,
                  }],
                ]}
                components={components}
              >
                {content}
              </ReactMarkdown>
            ) : (
              <p className="text-gray-500 italic">Nothing to preview yet. Switch to Edit mode to start writing.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
