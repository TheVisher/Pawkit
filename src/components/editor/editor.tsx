'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Typography from '@tiptap/extension-typography';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bold, Italic, Code, Link as LinkIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlashCommandMenu } from './slash-command-menu';

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
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[var(--color-accent)] underline hover:text-[var(--color-accent-hover)]',
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
    },
    onUpdate: () => {
      // Don't call onChange here - we'll handle saving on blur
    },
    onBlur: ({ editor }) => {
      const currentContent = editor.getHTML();
      // Only save if content actually changed
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

        setToolbarPosition({
          top: coords.top - editorRect.top - 45,
          left: coords.left - editorRect.left,
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

  // Cleanup
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

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

        /* Heading placeholders - line-height matches heading styles for cursor alignment */
        .tiptap h1.is-node-empty::before {
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 1.2;
        }
        .tiptap h2.is-node-empty::before {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.3;
        }
        .tiptap h3.is-node-empty::before {
          font-size: 1.1rem;
          font-weight: 600;
          line-height: 1.4;
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
        }

        .tiptap ul[data-type="taskList"] li > label input[type="checkbox"]:checked::after {
          content: '\\2713';
          display: block;
          color: white;
          font-size: 0.75rem;
          text-align: center;
          line-height: 0.85rem;
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
      `}</style>
    </div>
  );
}
