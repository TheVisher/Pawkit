"use client";

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import remarkBreaks from "remark-breaks";
import MDEditor from '@uiw/react-md-editor';
import { useDataStore } from "@/lib/stores/data-store";

type RichMDEditorProps = {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onNavigate?: (noteId: string) => void;
};

export function RichMDEditor({ content, onChange, placeholder, onNavigate }: RichMDEditorProps) {
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
    <div className="flex flex-col h-full" data-color-mode="dark">
      {/* Rich Markdown Editor */}
      <div className="flex-1 overflow-hidden">
        <MDEditor
          value={content}
          onChange={(val) => onChange(val || '')}
          height={400}
          textareaProps={{
            placeholder: placeholder || "Start writing in Markdown...\n\nUse [[Note Title]] to link to other notes.\nUse #tag for hashtags.\nUse **bold** and *italic* for formatting.",
          }}
          preview="edit"
          hideToolbar={false}
        />
      </div>
    </div>
  );
}
