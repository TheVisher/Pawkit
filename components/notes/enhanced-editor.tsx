"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { extractTags } from "@/lib/utils/tag-extractor";
import { parseWikiLinks } from "@/lib/utils/wiki-link-parser";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

// Dynamically import the editor to avoid SSR issues
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false }
);

type EnhancedEditorProps = {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  height?: number;
  onSave?: () => void;
  readOnly?: boolean;
};

export function EnhancedEditor({
  content,
  onChange,
  placeholder = "Start writing in Markdown...",
  height = 500,
  onSave,
  readOnly = false
}: EnhancedEditorProps) {
  const [value, setValue] = useState(content);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const editorRef = useRef<any>(null);

  // Sync external content changes
  useEffect(() => {
    setValue(content);
  }, [content]);

  // Handle content change
  const handleChange = useCallback((newValue?: string) => {
    const val = newValue || "";
    setValue(val);
    onChange(val);
  }, [onChange]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  // Extract metadata for display
  const tags = extractTags(value);
  const wikiLinks = parseWikiLinks(value);
  const noteLinks = wikiLinks.filter(l => l.type === 'note');
  const cardLinks = wikiLinks.filter(l => l.type === 'card');

  return (
    <div className="flex flex-col h-full">
      {/* Editor Toolbar Info */}
      <div className="flex items-center justify-between mb-2 text-xs text-gray-400">
        <div className="flex gap-4">
          {tags.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-accent">#</span>
              {tags.length} tag{tags.length !== 1 ? 's' : ''}
            </span>
          )}
          {noteLinks.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-blue-400">[[</span>
              {noteLinks.length} note link{noteLinks.length !== 1 ? 's' : ''}
            </span>
          )}
          {cardLinks.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-purple-400">🔗</span>
              {cardLinks.length} card link{cardLinks.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>{value.length} characters</span>
          {onSave && (
            <button
              onClick={onSave}
              className="px-2 py-1 text-xs bg-accent/10 hover:bg-accent/20 text-accent rounded transition-colors"
            >
              Save (⌘S)
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Markdown Editor */}
      <div className="flex-1 overflow-hidden rounded-lg border border-gray-800" data-color-mode="dark">
        <MDEditor
          value={value}
          onChange={handleChange}
          height={height}
          preview={showPreview ? 'preview' : 'edit'}
          hideToolbar={readOnly}
          textareaProps={{
            placeholder,
            disabled: readOnly
          }}
          previewOptions={{
            rehypePlugins: []
          }}
          commands={[
            // Add custom commands here if needed
          ]}
        />
      </div>

      {/* Quick Help */}
      <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3">
        <span><code className="px-1 bg-gray-800 rounded">[[Note]]</code> link to note</span>
        <span><code className="px-1 bg-gray-800 rounded">[[card:Title]]</code> link to bookmark</span>
        <span><code className="px-1 bg-gray-800 rounded">#tag</code> add tag</span>
        <span><code className="px-1 bg-gray-800 rounded">**bold**</code> bold text</span>
        <span><code className="px-1 bg-gray-800 rounded">*italic*</code> italic text</span>
      </div>
    </div>
  );
}
