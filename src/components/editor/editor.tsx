'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Typography from '@tiptap/extension-typography';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Bold, Italic, Code, Link as LinkIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlashCommandMenu } from './slash-command-menu';
import { AutoPhoneLink } from '@/lib/tiptap/extensions/auto-phone-link';

export interface EditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export function Editor({
  content,
  onChange,
  placeholder = "Type '/' for commands or just start writing...",
  className,
  editable = true,
}: EditorProps) {
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const lastSavedContent = useRef(content);
  const saveDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    immediatelyRender: false, // Required for SSR/Next.js to avoid hydration mismatches
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            const level = node.attrs.level;
            return `Heading ${level}`;
          }
          if (node.type.name === 'codeBlock') {
            return 'Write code...';
          }
          if (node.type.name === 'blockquote') {
            return 'Write a quote...';
          }
          return placeholder;
        },
        emptyEditorClass: 'is-editor-empty',
        emptyNodeClass: 'is-node-empty',
      }),
      Link.configure({
        openOnClick: true,
        autolink: true, // Keep for URLs - our extension handles phone/email
        protocols: ['http', 'https', 'mailto', 'tel', 'sms'],
        HTMLAttributes: {
          class: 'text-[var(--color-text-primary)] underline decoration-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer',
          rel: 'noopener noreferrer nofollow',
        },
        validate: (url) => {
          return /^(https?:\/\/|mailto:|tel:|sms:)/i.test(url);
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'not-prose',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start gap-2',
        },
      }),
      Typography,
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'tiptap-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      AutoPhoneLink,
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none min-h-[200px]',
          // Dark mode prose overrides
          'prose-invert',
          // Headings
          'prose-headings:text-[var(--color-text-primary)] prose-headings:font-semibold',
          'prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg',
          // Paragraphs
          'prose-p:text-[var(--color-text-primary)] prose-p:leading-relaxed',
          // Links
          'prose-a:text-[var(--color-accent)] prose-a:no-underline hover:prose-a:underline',
          // Code
          'prose-code:text-[var(--color-accent)] prose-code:bg-[var(--glass-bg)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none',
          'prose-pre:bg-[var(--glass-bg)] prose-pre:border prose-pre:border-[var(--glass-border)]',
          // Lists
          'prose-ul:text-[var(--color-text-primary)] prose-ol:text-[var(--color-text-primary)]',
          'prose-li:text-[var(--color-text-primary)]',
          // Blockquote
          'prose-blockquote:text-[var(--color-text-secondary)] prose-blockquote:border-l-[var(--color-accent)]',
          // Strong/em
          'prose-strong:text-[var(--color-text-primary)] prose-em:text-[var(--color-text-primary)]',
          // HR
          'prose-hr:border-[var(--glass-border)]'
        ),
      },
      handleKeyDown: (view, event) => {
        const mod = event.metaKey || event.ctrlKey;

        // Cmd+K for link
        if (mod && event.key === 'k') {
          event.preventDefault();
          window.dispatchEvent(new CustomEvent('editor-set-link'));
          return true;
        }

        // Cmd+Shift+X for strikethrough
        if (mod && event.shiftKey && event.key.toLowerCase() === 'x') {
          event.preventDefault();
          window.dispatchEvent(new CustomEvent('editor-toggle-strike'));
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor }) => {
      // Debounced save - triggers 500ms after last keystroke
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
      saveDebounceRef.current = setTimeout(() => {
        const currentContent = editor.getHTML();
        if (currentContent !== lastSavedContent.current) {
          lastSavedContent.current = currentContent;
          onChange(currentContent);
        }
      }, 500);
    },
    onBlur: ({ editor }) => {
      // Immediate save on blur (cancel any pending debounce)
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
        saveDebounceRef.current = null;
      }
      const currentContent = editor.getHTML();
      if (currentContent !== lastSavedContent.current) {
        lastSavedContent.current = currentContent;
        onChange(currentContent);
      }
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;

      if (hasSelection && editor.view.dom) {
        // Get the coordinates of the selection
        const coords = editor.view.coordsAtPos(from);
        const editorRect = editor.view.dom.getBoundingClientRect();
        
        // Estimate toolbar width (approx 280px based on buttons)
        const estimatedToolbarWidth = 280;
        let left = coords.left - editorRect.left;
        
        // Clamp to edges
        if (left + estimatedToolbarWidth > editorRect.width) {
          left = Math.max(0, editorRect.width - estimatedToolbarWidth);
        }
        
        setToolbarPosition({
          top: coords.top - editorRect.top - 45,
          left,
        });
        setShowToolbar(true);
      } else {
        setShowToolbar(false);
      }
    },
  });

  // Track the initial content for the ref
  useEffect(() => {
    lastSavedContent.current = content;
  }, []); // Only on mount - editor is source of truth after that

  // Sync content when prop changes (e.g., when switching between cards)
  useEffect(() => {
    if (editor && content !== undefined) {
      // Only update if content is different from what's in the editor
      const currentContent = editor.getHTML();
      if (content !== currentContent && content !== lastSavedContent.current) {
        editor.commands.setContent(content, { emitUpdate: false });
        lastSavedContent.current = content;
      }
    }
  }, [editor, content]);

  // Cleanup - flush pending saves and destroy editor
  useEffect(() => {
    return () => {
      // Flush any pending debounced save before unmounting
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
        saveDebounceRef.current = null;
      }
      // Save current content if it changed
      if (editor) {
        const currentContent = editor.getHTML();
        if (currentContent !== lastSavedContent.current) {
          lastSavedContent.current = currentContent;
          onChange(currentContent);
        }
      }
      editor?.destroy();
    };
  }, [editor, onChange]);

  // Hide toolbar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        // Don't hide if clicking in the editor
        if (editor?.view.dom.contains(event.target as Node)) {
          return;
        }
        setShowToolbar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  // Listen for keyboard shortcut custom events
  useEffect(() => {
    const handleSetLinkEvent = () => setLink();
    const handleToggleStrike = () => editor?.chain().focus().toggleStrike().run();
    const handleUndo = () => editor?.chain().focus().undo().run();
    const handleRedo = () => editor?.chain().focus().redo().run();

    window.addEventListener('editor-set-link', handleSetLinkEvent);
    window.addEventListener('editor-toggle-strike', handleToggleStrike);
    window.addEventListener('editor-undo', handleUndo);
    window.addEventListener('editor-redo', handleRedo);

    return () => {
      window.removeEventListener('editor-set-link', handleSetLinkEvent);
      window.removeEventListener('editor-toggle-strike', handleToggleStrike);
      window.removeEventListener('editor-undo', handleUndo);
      window.removeEventListener('editor-redo', handleRedo);
    };
  }, [setLink, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      {/* Floating Toolbar - appears on text selection */}
      {showToolbar && (
        <div
          ref={toolbarRef}
          className={cn(
            'absolute z-50 flex items-center gap-1 px-2 py-1.5 rounded-lg',
            'bg-[var(--glass-panel-bg)]',
            'backdrop-blur-[var(--glass-blur)] backdrop-saturate-[var(--glass-saturate)]',
            'border border-[var(--glass-border)]',
            'shadow-[var(--glass-shadow)]',
            'animate-in fade-in-0 zoom-in-95 duration-100'
          )}
          style={{
            top: Math.max(0, toolbarPosition.top),
            left: toolbarPosition.left,
          }}
        >
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              editor.isActive('bold')
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--color-text-primary)]'
            )}
            title="Bold (Cmd+B)"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              editor.isActive('italic')
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--color-text-primary)]'
            )}
            title="Italic (Cmd+I)"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              editor.isActive('code')
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--color-text-primary)]'
            )}
            title="Code"
          >
            <Code className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-[var(--glass-border)] mx-1" />
          <button
            onClick={setLink}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              editor.isActive('link')
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--color-text-primary)]'
            )}
            title="Link (Cmd+K)"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
          {editor.isActive('link') && (
            <button
              onClick={() => editor.chain().focus().unsetLink().run()}
              className="p-1.5 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--color-text-primary)] transition-colors"
              title="Remove link"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Slash Command Menu */}
      <SlashCommandMenu editor={editor} />

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Editor Styles */}
      <style jsx global>{`
        /* Placeholder styling for empty editor */
        .tiptap p.is-editor-empty:first-child::before {
          color: var(--color-text-muted);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        /* Placeholder styling for empty nodes */
        .tiptap .is-node-empty::before {
          color: var(--color-text-muted);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        /* Heading placeholders - inherit font-size from parent heading */
        .tiptap h1.is-node-empty::before {
          font-size: inherit;
          font-weight: 600;
          line-height: inherit;
        }
        .tiptap h2.is-node-empty::before {
          font-size: inherit;
          font-weight: 600;
          line-height: inherit;
        }
        .tiptap h3.is-node-empty::before {
          font-size: inherit;
          font-weight: 600;
          line-height: inherit;
        }

        /* Task list styling */
        .tiptap ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
        }

        .tiptap ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .tiptap ul[data-type="taskList"] li > label {
          flex-shrink: 0;
          margin-top: 0.25rem;
        }

        .tiptap ul[data-type="taskList"] li > label input[type="checkbox"] {
          appearance: none;
          width: 1rem;
          height: 1rem;
          border: 2px solid var(--glass-border);
          border-radius: 0.25rem;
          background: var(--glass-bg);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .tiptap ul[data-type="taskList"] li > label input[type="checkbox"]:checked {
          background: var(--color-accent);
          border-color: var(--color-accent);
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
          background-size: 10px;
          background-position: center;
          background-repeat: no-repeat;
        }

        .tiptap ul[data-type="taskList"] li > div {
          flex: 1;
        }

        .tiptap ul[data-type="taskList"] li[data-checked="true"] > div {
          text-decoration: line-through;
          color: var(--color-text-muted);
        }

        /* Focus ring for editor */
        .tiptap:focus {
          outline: none;
        }

        /* Code block styling */
        .tiptap pre {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          font-family: var(--font-mono);
          font-size: 0.875rem;
          overflow-x: auto;
        }

        .tiptap pre code {
          background: none;
          padding: 0;
          border-radius: 0;
        }

        /* Horizontal rule */
        .tiptap hr {
          border: none;
          border-top: 1px solid var(--glass-border);
          margin: 1.5rem 0;
        }

        /* Section headers - tighter to content below */
        .tiptap h2 {
          font-size: 0.875rem !important;
          font-weight: 600 !important;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted) !important;
          margin-top: 1.5rem !important;
          margin-bottom: 0.5rem !important;
        }

        .tiptap h2:first-child {
          margin-top: 0 !important;
        }

        /* Bullet list styling */
        .tiptap ul:not([data-type="taskList"]) {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0 0 0.5rem 0;
        }

        .tiptap ul:not([data-type="taskList"]) li {
          padding-left: 0.25rem;
          margin-bottom: 0.5rem;
        }

        .tiptap ul:not([data-type="taskList"]) li::marker {
          color: var(--color-text-muted);
        }

        /* Field label styling - clean bold labels */
        .tiptap ul:not([data-type="taskList"]) li strong:first-child {
          color: var(--color-text-secondary);
          font-weight: 500;
          margin-right: 0.25rem;
        }

        /* Nested bullet lists */
        .tiptap ul:not([data-type="taskList"]) ul {
          list-style-type: circle;
        }

        .tiptap ul:not([data-type="taskList"]) ul ul {
          list-style-type: square;
        }

        /* Numbered list styling */
        .tiptap ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .tiptap ol li {
          padding-left: 0.25rem;
        }

        .tiptap ol li::marker {
          color: var(--color-text-muted);
        }

        /* Blockquote styling */
        .tiptap blockquote {
          border-left: 3px solid var(--color-accent);
          padding-left: 1rem;
          margin: 1rem 0;
          color: var(--color-text-secondary);
          font-style: italic;
        }

        .tiptap blockquote p {
          margin: 0;
        }

        /* Table styling - minimal, clean look */
        .tiptap table {
          border-collapse: collapse;
          width: 100%;
          margin: 0.5rem 0;
          overflow: hidden;
        }

        .tiptap table th,
        .tiptap table td {
          border: none;
          padding: 0.4rem 0.75rem 0.4rem 0;
          text-align: left;
          vertical-align: top;
        }

        /* First column (labels) - fixed width for alignment across sections */
        .tiptap table td:first-child {
          width: 160px !important;
          min-width: 160px !important;
          max-width: 160px !important;
          white-space: nowrap;
          padding-right: 1rem;
          color: var(--color-text-muted);
        }

        /* Bold labels in first column */
        .tiptap table td:first-child strong {
          font-weight: 500;
          color: var(--color-text-secondary);
        }

        /* Second column (values) - takes remaining space */
        .tiptap table td:last-child {
          width: 100%;
          color: var(--color-text-primary);
          padding-left: 1rem;
        }

        .tiptap table th {
          font-weight: 600;
          color: var(--color-text-primary);
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 0.5rem;
        }

        /* Subtle row separators - always visible but very light */
        .tiptap table tr {
          border-bottom: 1px solid color-mix(in srgb, var(--glass-border) 40%, transparent);
        }

        .tiptap table tr:last-child {
          border-bottom: none;
        }

        /* Subtle vertical divider between label and value columns */
        .tiptap table td:first-child {
          border-right: 1px solid color-mix(in srgb, var(--glass-border) 30%, transparent);
        }

        /* Column resize handle */
        .tiptap .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--color-accent);
          cursor: col-resize;
          opacity: 0;
          transition: opacity 0.15s;
        }

        .tiptap table:hover .column-resize-handle {
          opacity: 1;
        }

        /* Selected cells */
        .tiptap .selectedCell {
          background: hsla(var(--accent-h) var(--accent-s) 50% / 0.15);
        }

        /* Drag handle for block elements */
        .tiptap > *:not(table) {
          position: relative;
        }

        .tiptap > p:hover::before,
        .tiptap > h1:hover::before,
        .tiptap > h2:hover::before,
        .tiptap > h3:hover::before,
        .tiptap > ul:hover::before,
        .tiptap > ol:hover::before,
        .tiptap > blockquote:hover::before,
        .tiptap > pre:hover::before {
          content: '⋮⋮';
          position: absolute;
          left: -1.5rem;
          top: 0;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          cursor: grab;
          opacity: 0.5;
          transition: opacity 0.15s;
          user-select: none;
          letter-spacing: -2px;
        }

        .tiptap > *:hover::before {
          opacity: 0.8;
        }

        .tiptap > *:active::before {
          cursor: grabbing;
        }

        /* Hide drag handle for empty paragraphs */
        .tiptap > p.is-editor-empty::before,
        .tiptap > p.is-node-empty::before {
          display: none;
        }
      `}</style>
    </div>
  );
}
