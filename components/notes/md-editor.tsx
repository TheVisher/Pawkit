"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MDEditorProps = {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
};

export function MDEditor({ content, onChange, placeholder }: MDEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");

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
            placeholder={placeholder || "Start writing in Markdown..."}
            className="w-full h-full min-h-[400px] rounded border border-gray-800 bg-gray-900 p-4 text-sm text-gray-100 placeholder-gray-500 resize-none focus:border-accent focus:outline-none font-mono"
          />
        ) : (
          <div className="prose prose-invert prose-sm max-w-none p-4 rounded border border-gray-800 bg-gray-900/50">
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            ) : (
              <p className="text-gray-500 italic">Nothing to preview yet. Switch to Edit mode to start writing.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
