"use client";

import { useState } from "react";

type ReaderViewProps = {
  title: string;
  content: string;
  url: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
};

export function ReaderView({ title, content, url, isExpanded, onToggleExpand, onClose }: ReaderViewProps) {
  return (
    <div className={`flex flex-col h-full ${isExpanded ? "bg-[#fefefe]" : ""}`}>
      {/* Header - only show in expanded mode */}
      {isExpanded && (
        <div className="border-b border-gray-200 bg-white px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleExpand}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              title="Exit fullscreen"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900 truncate max-w-2xl">
              {title}
            </h1>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            title="Close"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Article Content */}
      <div className={`flex-1 overflow-y-auto ${isExpanded ? "px-8 py-12" : "p-6"}`}>
        <article className="mx-auto max-w-[680px]">
          {/* Title - show in non-expanded mode */}
          {!isExpanded && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
                {title}
              </h1>
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-200">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-gray-900 hover:underline truncate"
                >
                  {url}
                </a>
                {!isExpanded && (
                  <button
                    onClick={onToggleExpand}
                    className="ml-auto text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                    title="Expand to fullscreen"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" />
                    </svg>
                    Expand
                  </button>
                )}
              </div>
            </>
          )}

          {/* Article Body */}
          <div
            className="reader-content prose prose-lg prose-gray max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </article>
      </div>
    </div>
  );
}

// CSS for the reader content - add this to your globals.css
/*
.reader-content {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 20px;
  line-height: 1.7;
  color: #1a1a1a;
}

.reader-content h1,
.reader-content h2,
.reader-content h3,
.reader-content h4,
.reader-content h5,
.reader-content h6 {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-weight: 700;
  color: #000;
  margin-top: 2em;
  margin-bottom: 0.75em;
  line-height: 1.3;
}

.reader-content h1 { font-size: 2em; }
.reader-content h2 { font-size: 1.5em; }
.reader-content h3 { font-size: 1.25em; }

.reader-content p {
  margin-bottom: 1.5em;
}

.reader-content a {
  color: #0066cc;
  text-decoration: none;
  border-bottom: 1px solid #0066cc33;
}

.reader-content a:hover {
  border-bottom-color: #0066cc;
}

.reader-content img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 2em 0;
}

.reader-content blockquote {
  border-left: 4px solid #e0e0e0;
  padding-left: 1.5em;
  margin: 2em 0;
  font-style: italic;
  color: #555;
}

.reader-content pre {
  background: #f5f5f5;
  border-radius: 4px;
  padding: 1em;
  overflow-x: auto;
  font-size: 0.9em;
}

.reader-content code {
  background: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
}

.reader-content ul,
.reader-content ol {
  margin: 1.5em 0;
  padding-left: 2em;
}

.reader-content li {
  margin-bottom: 0.5em;
}
*/
