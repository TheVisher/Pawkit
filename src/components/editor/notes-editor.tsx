'use client';

/**
 * Notes Editor Component
 * Simplified Tiptap editor for user notes in the card detail sidebar.
 * Designed as a scratchpad for thoughts while reading/viewing content.
 *
 * Phase 5: Added @ mention support with backlinks.
 */

import { useEditor, EditorContent, Editor as TipTapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { PawkitMention } from '@/lib/tiptap/extensions/mention';
import { createMentionSuggestion } from './mention-suggestion';
import { useModalStore } from '@/lib/stores/modal-store';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { useDataStore } from '@/lib/stores/data-store';
import { useReferences } from '@/lib/hooks/use-live-data';
import { syncReferencesFromContent } from '@/lib/utils/mention-parser';

export interface NotesEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  /** Workspace ID - enables mention search */
  workspaceId?: string;
  /** Card ID - enables reference syncing for @ mentions */
  cardId?: string;
}

export function NotesEditor({
  content,
  onChange,
  placeholder = "Add your notes here...",
  className,
  editable = true,
  workspaceId,
  cardId,
}: NotesEditorProps) {
  const router = useRouter();
  const openCardDetail = useModalStore((s) => s.openCardDetail);
  const setCalendarDate = useCalendarStore((s) => s.setDate);

  // Reference sync dependencies (only used when cardId is provided)
  const createReference = useDataStore((s) => s.createReference);
  const deleteReference = useDataStore((s) => s.deleteReference);
  const updateCard = useDataStore((s) => s.updateCard);
  const existingRefs = useReferences(cardId);

  const lastSavedContent = useRef(content);
  const saveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const existingRefsRef = useRef(existingRefs);
  const syncRefsRef = useRef<((editorInstance: TipTapEditor) => Promise<void>) | null>(null);

  // Keep existingRefs ref in sync
  useEffect(() => {
    existingRefsRef.current = existingRefs;
  }, [existingRefs]);

  // Keep sync function ref in sync
  useEffect(() => {
    syncRefsRef.current = async (editorInstance: TipTapEditor) => {
      if (!cardId || !workspaceId || !editorInstance) return;

      try {
        const jsonContent = editorInstance.getJSON();
        await syncReferencesFromContent(
          cardId,
          workspaceId,
          jsonContent,
          existingRefsRef.current,
          {
            createReference,
            deleteReference,
            updateCard,
          }
        );
      } catch (err) {
        console.error('[NotesEditor] Failed to sync references:', err);
      }
    };
  }, [cardId, workspaceId, createReference, deleteReference, updateCard]);

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
        placeholder,
        emptyEditorClass: 'is-editor-empty',
        emptyNodeClass: 'is-node-empty',
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        protocols: ['http', 'https', 'mailto', 'tel'],
        HTMLAttributes: {
          class: 'text-[var(--color-accent)] underline decoration-[var(--color-accent)]/50 hover:decoration-[var(--color-accent)] cursor-pointer',
          rel: 'noopener noreferrer nofollow',
        },
        validate: (url) => {
          return /^(https?:\/\/|mailto:|tel:)/i.test(url);
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
      PawkitMention.configure({
        suggestion: createMentionSuggestion({ workspaceId }),
      }),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: cn(
          'notes-editor-content prose prose-sm max-w-none focus:outline-none min-h-[100px]',
          // Dark mode prose overrides
          'prose-invert',
          // Headings - smaller for sidebar
          'prose-headings:text-[var(--color-text-primary)] prose-headings:font-semibold',
          'prose-h1:text-lg prose-h2:text-base prose-h3:text-sm',
          // Paragraphs
          'prose-p:text-[var(--color-text-primary)] prose-p:leading-relaxed prose-p:text-sm',
          // Links
          'prose-a:text-[var(--color-accent)] prose-a:no-underline hover:prose-a:underline',
          // Code
          'prose-code:text-[var(--color-accent)] prose-code:bg-[var(--glass-bg)] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none',
          'prose-pre:bg-[var(--glass-bg)] prose-pre:border prose-pre:border-[var(--glass-border)] prose-pre:text-xs',
          // Lists
          'prose-ul:text-[var(--color-text-primary)] prose-ol:text-[var(--color-text-primary)] prose-ul:text-sm prose-ol:text-sm',
          'prose-li:text-[var(--color-text-primary)]',
          // Blockquote
          'prose-blockquote:text-[var(--color-text-secondary)] prose-blockquote:border-l-[var(--color-accent)] prose-blockquote:text-sm',
          // Strong/em
          'prose-strong:text-[var(--color-text-primary)] prose-em:text-[var(--color-text-primary)]',
          // HR
          'prose-hr:border-[var(--glass-border)]'
        ),
      },
      handleDOMEvents: {
        click: (view, event) => {
          const target = event.target as HTMLElement;
          const mentionPill = target.closest('[data-pawkit-mention]') as HTMLElement;

          if (mentionPill) {
            event.preventDefault();

            const mentionType = mentionPill.getAttribute('data-type');
            const mentionId = mentionPill.getAttribute('data-id');

            if (mentionType && mentionId) {
              // Dispatch custom event with mention data
              window.dispatchEvent(
                new CustomEvent('pawkit-mention-click', {
                  detail: { type: mentionType, id: mentionId },
                })
              );
            }
            return true; // Prevent ProseMirror from handling this click
          }
          return false;
        },
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
      // Sync references after saving (async, fire and forget)
      syncRefsRef.current?.(editor);
    },
  }, [workspaceId]); // Recreate editor when workspaceId changes to reinitialize mention extension

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

  // Handle @ mention pill clicks
  useEffect(() => {
    const handleMentionEvent = (e: Event) => {
      const { type, id } = (e as CustomEvent).detail;

      switch (type) {
        case 'card':
          openCardDetail(id);
          break;
        case 'pawkit':
          router.push(`/pawkits/${id}`);
          break;
        case 'date':
          try {
            const date = parseISO(id);
            setCalendarDate(date);
            router.push('/calendar');
          } catch {
            console.error('Invalid date format:', id);
          }
          break;
      }
    };

    window.addEventListener('pawkit-mention-click', handleMentionEvent);
    return () => window.removeEventListener('pawkit-mention-click', handleMentionEvent);
  }, [openCardDetail, router, setCalendarDate]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Editor Styles - compact styles for sidebar notes */}
      <style jsx global>{`
        /* Placeholder styling for empty editor */
        .notes-editor-content p.is-editor-empty:first-child::before {
          color: var(--color-text-muted);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
          font-style: italic;
        }

        /* Focus ring for editor */
        .notes-editor-content:focus {
          outline: none;
        }

        /* Code block styling - compact */
        .notes-editor-content pre {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          overflow-x: auto;
        }

        .notes-editor-content pre code {
          background: none;
          padding: 0;
          border-radius: 0;
        }

        /* Horizontal rule */
        .notes-editor-content hr {
          border: none;
          border-top: 1px solid var(--glass-border);
          margin: 1rem 0;
        }

        /* Bullet list styling - compact */
        .notes-editor-content ul:not([data-type="taskList"]) {
          list-style-type: disc;
          padding-left: 1.25rem;
          margin: 0.25rem 0;
        }

        .notes-editor-content ul:not([data-type="taskList"]) li {
          padding-left: 0.125rem;
          margin-bottom: 0.25rem;
        }

        .notes-editor-content ul:not([data-type="taskList"]) li::marker {
          color: var(--color-text-muted);
        }

        /* Numbered list styling - compact */
        .notes-editor-content ol {
          list-style-type: decimal;
          padding-left: 1.25rem;
          margin: 0.25rem 0;
        }

        .notes-editor-content ol li {
          padding-left: 0.125rem;
          margin-bottom: 0.25rem;
        }

        .notes-editor-content ol li::marker {
          color: var(--color-text-muted);
        }

        /* Blockquote styling - compact */
        .notes-editor-content blockquote {
          border-left: 2px solid var(--color-accent);
          padding-left: 0.75rem;
          margin: 0.5rem 0;
          color: var(--color-text-secondary);
          font-style: italic;
        }

        .notes-editor-content blockquote p {
          margin: 0;
        }

        /* Task list styling - compact */
        .notes-editor-content ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
          margin: 0.25rem 0;
        }

        .notes-editor-content ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.375rem;
          margin-bottom: 0.25rem;
        }

        .notes-editor-content ul[data-type="taskList"] li > label {
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .notes-editor-content ul[data-type="taskList"] li > label input[type="checkbox"] {
          appearance: none;
          width: 0.875rem;
          height: 0.875rem;
          border: 2px solid var(--glass-border);
          border-radius: 0.25rem;
          background: var(--glass-bg);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .notes-editor-content ul[data-type="taskList"] li > label input[type="checkbox"]:checked {
          background: var(--color-accent);
          border-color: var(--color-accent);
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
          background-size: 8px;
          background-position: center;
          background-repeat: no-repeat;
        }

        .notes-editor-content ul[data-type="taskList"] li > div {
          flex: 1;
        }

        .notes-editor-content ul[data-type="taskList"] li[data-checked="true"] > div {
          text-decoration: line-through;
          color: var(--color-text-muted);
        }

        /* Paragraph spacing - tighter */
        .notes-editor-content p {
          margin: 0.375rem 0;
        }

        .notes-editor-content p:first-child {
          margin-top: 0;
        }

        .notes-editor-content p:last-child {
          margin-bottom: 0;
        }

        /* @ Mention Pills - Compact style for sidebar */
        .notes-editor-content span[data-pawkit-mention],
        .notes-editor-content .mention-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.125rem;
          padding: 0.1rem 0.375rem;
          border-radius: 5px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          vertical-align: baseline;
        }

        .notes-editor-content span[data-pawkit-mention]:hover,
        .notes-editor-content .mention-pill:hover {
          transform: translateY(-1px);
        }

        .notes-editor-content .mention-pill-card {
          background: hsla(185 70% 42% / 0.15);
          color: hsl(185 70% 38%);
          border: 1px solid hsla(185 70% 42% / 0.25);
        }

        .notes-editor-content .mention-pill-card:hover {
          background: hsla(185 70% 42% / 0.25);
        }

        .notes-editor-content .mention-pill-pawkit {
          background: hsla(280 70% 50% / 0.15);
          color: hsl(280 70% 45%);
          border: 1px solid hsla(280 70% 50% / 0.25);
        }

        .notes-editor-content .mention-pill-pawkit:hover {
          background: hsla(280 70% 50% / 0.25);
        }

        .notes-editor-content .mention-pill-date {
          background: hsla(220 70% 50% / 0.15);
          color: hsl(220 70% 45%);
          border: 1px solid hsla(220 70% 50% / 0.25);
        }

        .notes-editor-content .mention-pill-date:hover {
          background: hsla(220 70% 50% / 0.25);
        }

        /* Deleted/broken mention state */
        .notes-editor-content .mention-deleted {
          background: hsla(0 60% 50% / 0.1);
          color: hsl(0 50% 40%);
          border: 1px solid hsla(0 60% 50% / 0.2);
          text-decoration: line-through;
          opacity: 0.7;
        }

        .notes-editor-content .mention-deleted:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
