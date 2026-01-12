'use client';

/**
 * Article Editor Component
 * Simplified Tiptap editor for editing extracted article content.
 * Based on the main Editor but without slash commands, mentions, or drag handles.
 *
 * Phase 4: Added highlighting capability and "Create note from selection" feature.
 */

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Typography from '@tiptap/extension-typography';
import Highlight from '@tiptap/extension-highlight';
import { Highlighter, StickyNote } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores/ui-store';

export interface ArticleEditorProps {
  content: string;
  onChange: (html: string) => void;
  onEdit?: () => void; // Called when user makes any edit
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export function ArticleEditor({
  content,
  onChange,
  onEdit,
  placeholder = "No content extracted. You can add your own notes here...",
  className,
  editable = true,
}: ArticleEditorProps) {
  const lastSavedContent = useRef(content);
  const saveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const hasEditedRef = useRef(false);

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
        autolink: true,
        protocols: ['http', 'https', 'mailto', 'tel'],
        HTMLAttributes: {
          class: 'text-[var(--color-accent)] underline decoration-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer',
          rel: 'noopener noreferrer nofollow',
        },
        validate: (url) => {
          return /^(https?:\/\/|mailto:|tel:)/i.test(url);
        },
      }),
      Typography,
      Highlight.configure({
        HTMLAttributes: {
          class: 'article-highlight',
        },
      }),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: cn(
          'article-editor-content prose prose-sm max-w-none focus:outline-none min-h-[200px]',
          // Dark mode prose overrides - matching article reader styles
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
    onUpdate: ({ editor }) => {
      // Track that the user has edited
      if (!hasEditedRef.current) {
        hasEditedRef.current = true;
        onEdit?.();
      }

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
  });

  // Track the initial content for the ref
  useEffect(() => {
    lastSavedContent.current = content;
    hasEditedRef.current = false;
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

  // UI store for create note from selection - use individual selectors to avoid infinite loop
  const setCardDetailTab = useUIStore((s) => s.setCardDetailTab);
  const setPendingNoteText = useUIStore((s) => s.setPendingNoteText);

  // Handle Cmd+K for link
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

  // Toggle highlight on selection
  const toggleHighlight = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleHighlight().run();
  }, [editor]);

  // Create note from selection
  const createNoteFromSelection = useCallback(() => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');

    if (selectedText.trim()) {
      // Format as blockquote with timestamp
      const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      const noteText = `<blockquote><p>"${selectedText.trim()}"</p></blockquote><p><em>Highlighted on ${timestamp}</em></p><p></p>`;

      // Set the pending note text and switch to notes tab
      setPendingNoteText(noteText);
      setCardDetailTab('notes');
    }
  }, [editor, setPendingNoteText, setCardDetailTab]);

  // Listen for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'k') {
        e.preventDefault();
        setLink();
      }
      // Cmd+Shift+H for highlight
      if (mod && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        toggleHighlight();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setLink, toggleHighlight]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      {/* Selection Bubble Menu */}
      <BubbleMenu
        editor={editor}
        options={{
          placement: 'top',
        }}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[var(--glass-bg-solid)] backdrop-blur-xl border border-[var(--glass-border)] shadow-lg"
      >
        {/* Highlight Button */}
        <button
          onClick={toggleHighlight}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all',
            editor.isActive('highlight')
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
          )}
          title="Toggle highlight (Cmd+Shift+H)"
        >
          <Highlighter className="h-3.5 w-3.5" />
          <span>Highlight</span>
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--glass-border)]" />

        {/* Create Note Button */}
        <button
          onClick={createNoteFromSelection}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md text-text-secondary hover:text-text-primary hover:bg-white/10 transition-all"
          title="Create note from selection"
        >
          <StickyNote className="h-3.5 w-3.5" />
          <span>Add to Notes</span>
        </button>
      </BubbleMenu>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Editor Styles - subset of main editor styles for article content */}
      <style jsx global>{`
        /* Placeholder styling for empty editor */
        .article-editor-content p.is-editor-empty:first-child::before {
          color: var(--color-text-muted);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        /* Placeholder styling for empty nodes */
        .article-editor-content .is-node-empty::before {
          color: var(--color-text-muted);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        /* Focus ring for editor */
        .article-editor-content:focus {
          outline: none;
        }

        /* Code block styling */
        .article-editor-content pre {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          font-family: var(--font-mono);
          font-size: 0.875rem;
          overflow-x: auto;
        }

        .article-editor-content pre code {
          background: none;
          padding: 0;
          border-radius: 0;
        }

        /* Horizontal rule */
        .article-editor-content hr {
          border: none;
          border-top: 1px solid var(--glass-border);
          margin: 1.5rem 0;
        }

        /* Bullet list styling */
        .article-editor-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .article-editor-content ul li {
          padding-left: 0.25rem;
          margin-bottom: 0.5rem;
        }

        .article-editor-content ul li::marker {
          color: var(--color-text-muted);
        }

        /* Numbered list styling */
        .article-editor-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .article-editor-content ol li {
          padding-left: 0.25rem;
        }

        .article-editor-content ol li::marker {
          color: var(--color-text-muted);
        }

        /* Blockquote styling */
        .article-editor-content blockquote {
          border-left: 3px solid var(--color-accent);
          padding-left: 1rem;
          margin: 1rem 0;
          color: var(--color-text-secondary);
          font-style: italic;
        }

        .article-editor-content blockquote p {
          margin: 0;
        }

        /* Highlight styling - subtle yellow/gold background */
        .article-editor-content .article-highlight,
        .article-editor-content mark {
          background-color: rgba(251, 191, 36, 0.3); /* amber-400 with opacity */
          border-radius: 0.125rem;
          padding: 0.125rem 0;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
        }

        /* Slightly brighter highlight on hover for interactivity */
        .article-editor-content .article-highlight:hover,
        .article-editor-content mark:hover {
          background-color: rgba(251, 191, 36, 0.45);
        }
      `}</style>
    </div>
  );
}
