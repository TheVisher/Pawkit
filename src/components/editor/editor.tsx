'use client';

import { useEditor, EditorContent, Editor as TipTapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Typography from '@tiptap/extension-typography';
import Highlight from '@tiptap/extension-highlight';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import GlobalDragHandle from 'tiptap-extension-global-drag-handle';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { parseISO } from 'date-fns';
import {
  Bold,
  Italic,
  Code,
  Link as LinkIcon,
  X,
  Trash2,
  Palette,
  Highlighter,
  Plus,
  Minus,
  Rows3,
  Columns3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlashCommandMenu } from './slash-command-menu';
import { TableControls } from './table-controls';
import { AutoPhoneLink } from '@/lib/tiptap/extensions/auto-phone-link';
import { PawkitMention } from '@/lib/tiptap/extensions/mention';
import { PawkitCodeBlock } from '@/lib/tiptap/extensions/code-block-lowlight';
import { PawkitImage } from '@/lib/tiptap/extensions/image';
import { createMentionSuggestion } from './mention-suggestion';
import { Callout } from '@/lib/tiptap/extensions/callout';
import { Toggle } from '@/lib/tiptap/extensions/toggle';
import { LinkPopover } from './link-popover';
import { useModalStore } from '@/lib/stores/modal-store';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { useDataStore } from '@/lib/stores/data-store';
import { useReferences } from '@/lib/hooks/use-live-data';
import { syncReferencesFromContent } from '@/lib/utils/mention-parser';
import { copyAsMarkdown } from '@/lib/tiptap/markdown';
import { useToastStore } from '@/lib/stores/toast-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface EditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  workspaceId?: string;
  /** Card ID - when provided, enables reference syncing for @ mentions */
  cardId?: string;
}

export function Editor({
  content,
  onChange,
  placeholder = "Type '/' for commands or just start writing...",
  className,
  editable = true,
  workspaceId,
  cardId,
}: EditorProps) {
  const router = useRouter();
  const openCardDetail = useModalStore((s) => s.openCardDetail);
  const setCalendarDate = useCalendarStore((s) => s.setDate);
  const toast = useToastStore((s) => s.toast);

  // Reference sync dependencies (only used when cardId is provided)
  const createReference = useDataStore((s) => s.createReference);
  const deleteReference = useDataStore((s) => s.deleteReference);
  const updateCard = useDataStore((s) => s.updateCard);
  const existingRefs = useReferences(cardId);

  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [isInTable, setIsInTable] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkPopoverPosition, setLinkPopoverPosition] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const highlightPickerRef = useRef<HTMLDivElement>(null);
  const lastSavedContent = useRef(content);
  // Store selection for highlight/link operations (needed when dropdown opens)
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);

  // Reset all picker/popover states
  const resetPickerStates = useCallback(() => {
    setShowColorPicker(false);
    setShowHighlightPicker(false);
    setShowLinkPopover(false);
    savedSelectionRef.current = null;
  }, []);

  // Get/set last used highlight color from localStorage
  const getLastHighlightColor = useCallback(() => {
    if (typeof window === 'undefined') return '#fef08a';
    return localStorage.getItem('pawkit-last-highlight-color') || '#fef08a';
  }, []);

  const setLastHighlightColor = useCallback((color: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pawkit-last-highlight-color', color);
    }
  }, []);

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
        console.error('[Editor] Failed to sync references:', err);
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
        // Disable codeBlock - we use PawkitCodeBlock with syntax highlighting instead
        codeBlock: false,
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
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
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
      GlobalDragHandle.configure({
        dragHandleWidth: 1000, // Large value to detect hover across full row
        scrollTreshold: 100,
      }),
      PawkitMention.configure({
        suggestion: createMentionSuggestion({ workspaceId }),
      }),
      Callout,
      Toggle,
      PawkitCodeBlock,
      PawkitImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'tiptap-image',
        },
      }),
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

        // Cmd+Shift+H for highlight with last used color
        if (mod && event.shiftKey && event.key.toLowerCase() === 'h') {
          event.preventDefault();
          window.dispatchEvent(new CustomEvent('editor-toggle-highlight'));
          return true;
        }

        // Cmd+Shift+C for copy as Markdown
        if (mod && event.shiftKey && event.key.toLowerCase() === 'c') {
          event.preventDefault();
          window.dispatchEvent(new CustomEvent('editor-copy-as-markdown'));
          return true;
        }

        // Mod+Shift+Backspace to delete table when inside one
        if (mod && event.shiftKey && event.key === 'Backspace') {
          const { $from } = view.state.selection;
          // Check if we're inside a table by looking for tableCell in ancestors
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === 'table') {
              event.preventDefault();
              window.dispatchEvent(new CustomEvent('editor-delete-table'));
              return true;
            }
          }
        }

        return false;
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
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;
      const inTable = editor.isActive('table');

      // Track if cursor is in a table
      setIsInTable(inTable);

      // Show toolbar on text selection OR when in a table (for table controls)
      if ((hasSelection || inTable) && editor.view.dom) {
        // Get the coordinates of the selection/cursor
        const coords = editor.view.coordsAtPos(from);
        const editorRect = editor.view.dom.getBoundingClientRect();

        // Use viewport coordinates for fixed positioning (portal)
        const estimatedToolbarWidth = 400; // Wide enough for all table controls
        let left = coords.left;
        let top = coords.top - 50; // Position above selection

        // Clamp to viewport edges
        if (left + estimatedToolbarWidth > window.innerWidth - 16) {
          left = window.innerWidth - estimatedToolbarWidth - 16;
        }
        if (left < 16) left = 16;
        if (top < 16) top = coords.top + 30; // Flip below if too close to top

        setToolbarPosition({ top, left });
        setShowToolbar(true);
      } else {
        setShowToolbar(false);
        resetPickerStates();
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
        resetPickerStates();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editor, resetPickerStates]);

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

  const setLink = useCallback(() => {
    if (!editor) return;

    // Save the current selection
    const { from, to } = editor.state.selection;
    savedSelectionRef.current = { from, to };

    // Get position from selection coordinates
    const popoverWidth = 280;
    let top = 100;
    let left = (window.innerWidth - popoverWidth) / 2;

    // Try to get position from toolbar first (if visible)
    if (toolbarRef.current && showToolbar) {
      const rect = toolbarRef.current.getBoundingClientRect();
      top = rect.bottom + 8;
      left = rect.left;
    } else {
      // Fallback: use selection coordinates from the editor
      try {
        const coords = editor.view.coordsAtPos(from);
        const editorRect = editor.view.dom.getBoundingClientRect();
        top = coords.bottom + 8;
        left = coords.left;
      } catch {
        // If coords fail, use center of viewport
      }
    }

    // Ensure popover doesn't go off-screen
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    left = Math.max(8, left);
    top = Math.max(8, top);

    setLinkPopoverPosition({ top, left });
    setShowLinkPopover(true);
  }, [editor, showToolbar]);

  const closeLinkPopover = useCallback(() => {
    setShowLinkPopover(false);
    // Restore selection after closing
    if (editor && savedSelectionRef.current) {
      const { from, to } = savedSelectionRef.current;
      editor.chain().focus().setTextSelection({ from, to }).run();
      savedSelectionRef.current = null;
    }
  }, [editor]);

  // Delete table handler
  const deleteTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().deleteTable().run();
  }, [editor]);

  // Color picker colors
  const textColors = [
    { label: 'Default', value: null },
    { label: 'Red', value: '#ef4444' },
    { label: 'Orange', value: '#f97316' },
    { label: 'Green', value: '#22c55e' },
    { label: 'Blue', value: '#3b82f6' },
    { label: 'Purple', value: '#a855f7' },
    { label: 'Gray', value: '#6b7280' },
  ];

  const setTextColor = useCallback((color: string | null) => {
    if (!editor) return;
    if (color === null) {
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().setColor(color).run();
    }
    setShowColorPicker(false);
  }, [editor]);

  // Highlight colors
  const highlightColors = [
    { label: 'Yellow', value: '#fef08a' },
    { label: 'Green', value: '#bbf7d0' },
    { label: 'Blue', value: '#bfdbfe' },
    { label: 'Pink', value: '#fbcfe8' },
    { label: 'Orange', value: '#fed7aa' },
  ];

  // Save selection when opening highlight picker
  const openHighlightPicker = useCallback(() => {
    if (!editor) return;
    // Save the current selection before dropdown opens
    const { from, to } = editor.state.selection;
    savedSelectionRef.current = { from, to };
    setShowHighlightPicker(true);
  }, [editor]);

  // Apply highlight with specific color
  const applyHighlight = useCallback((color: string) => {
    if (!editor) return;
    // Restore selection if saved
    if (savedSelectionRef.current) {
      const { from, to } = savedSelectionRef.current;
      editor.chain().focus().setTextSelection({ from, to }).setHighlight({ color }).run();
      savedSelectionRef.current = null;
    } else {
      editor.chain().focus().setHighlight({ color }).run();
    }
    setLastHighlightColor(color);
    setShowHighlightPicker(false);
  }, [editor, setLastHighlightColor]);

  // Remove highlight
  const removeHighlight = useCallback(() => {
    if (!editor) return;
    // Restore selection if saved
    if (savedSelectionRef.current) {
      const { from, to } = savedSelectionRef.current;
      editor.chain().focus().setTextSelection({ from, to }).unsetHighlight().run();
      savedSelectionRef.current = null;
    } else {
      editor.chain().focus().unsetHighlight().run();
    }
    setShowHighlightPicker(false);
  }, [editor]);

  // Toggle highlight with last used color (for keyboard shortcut)
  const toggleHighlight = useCallback(() => {
    if (!editor) return;
    const lastColor = getLastHighlightColor();

    if (editor.isActive('highlight')) {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().setHighlight({ color: lastColor }).run();
    }
  }, [editor, getLastHighlightColor]);

  // Copy content as Markdown to clipboard
  const handleCopyAsMarkdown = useCallback(async () => {
    if (!editor) return;
    try {
      await copyAsMarkdown(editor);
      toast({ type: 'success', message: 'Copied as Markdown' });
    } catch (error) {
      console.error('Failed to copy as Markdown:', error);
      toast({ type: 'error', message: 'Failed to copy' });
    }
  }, [editor, toast]);

  // Listen for keyboard shortcut custom events
  useEffect(() => {
    const handleSetLinkEvent = () => setLink();
    const handleToggleStrike = () => editor?.chain().focus().toggleStrike().run();
    const handleToggleHighlight = () => toggleHighlight();
    const handleUndo = () => editor?.chain().focus().undo().run();
    const handleRedo = () => editor?.chain().focus().redo().run();
    const handleDeleteTable = () => deleteTable();
    const handleCopyMarkdown = () => handleCopyAsMarkdown();

    window.addEventListener('editor-set-link', handleSetLinkEvent);
    window.addEventListener('editor-toggle-strike', handleToggleStrike);
    window.addEventListener('editor-toggle-highlight', handleToggleHighlight);
    window.addEventListener('editor-undo', handleUndo);
    window.addEventListener('editor-redo', handleRedo);
    window.addEventListener('editor-delete-table', handleDeleteTable);
    window.addEventListener('editor-copy-as-markdown', handleCopyMarkdown);

    return () => {
      window.removeEventListener('editor-set-link', handleSetLinkEvent);
      window.removeEventListener('editor-toggle-strike', handleToggleStrike);
      window.removeEventListener('editor-toggle-highlight', handleToggleHighlight);
      window.removeEventListener('editor-undo', handleUndo);
      window.removeEventListener('editor-redo', handleRedo);
      window.removeEventListener('editor-delete-table', handleDeleteTable);
      window.removeEventListener('editor-copy-as-markdown', handleCopyMarkdown);
    };
  }, [setLink, editor, deleteTable, toggleHighlight, handleCopyAsMarkdown]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      {/* Floating Toolbar - appears on text selection */}
      {showToolbar && typeof document !== 'undefined' && createPortal(
        <div
          ref={toolbarRef}
          className={cn(
            'fixed z-[9999] flex items-center gap-1 px-2 py-1.5 rounded-lg',
            'bg-[var(--glass-panel-bg)]',
            'backdrop-blur-[var(--glass-blur)] backdrop-saturate-[var(--glass-saturate)]',
            'border border-[var(--glass-border)]',
            'shadow-[var(--glass-shadow)]',
            'animate-in fade-in-0 zoom-in-95 duration-100'
          )}
          style={{
            top: toolbarPosition.top,
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
                    <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                editor.isActive('textStyle')
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--color-text-primary)]'
              )}
              title="Text Color"
            >
              <Palette className="h-4 w-4" />
            </button>
            {showColorPicker && (
              <div
                ref={colorPickerRef}
                className={cn(
                  'absolute top-full mt-1 left-0 z-50',
                  'bg-[var(--glass-panel-bg)]',
                  'backdrop-blur-[var(--glass-blur)] backdrop-saturate-[var(--glass-saturate)]',
                  'border border-[var(--glass-border)]',
                  'shadow-[var(--glass-shadow)]',
                  'rounded-lg p-2',
                  'animate-in fade-in-0 zoom-in-95 duration-100',
                  'min-w-[140px]'
                )}
              >
                <div className="flex flex-col gap-1">
                  {textColors.map((color) => (
                    <button
                      key={color.label}
                      onClick={() => setTextColor(color.value)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-md',
                        'text-sm text-left transition-colors',
                        'hover:bg-[var(--glass-bg)]'
                      )}
                    >
                      <div
                        className="w-4 h-4 rounded border border-[var(--glass-border)]"
                        style={{
                          backgroundColor: color.value || 'var(--color-text-primary)',
                        }}
                      />
                      <span className="text-[var(--color-text-primary)]">{color.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Highlight - simple inline picker to avoid focus issues */}
          <div className="relative">
            <button
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent focus loss
                if (!showHighlightPicker) {
                  openHighlightPicker();
                } else {
                  setShowHighlightPicker(false);
                }
              }}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                editor.isActive('highlight')
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--color-text-primary)]'
              )}
              title="Highlight (Cmd+Shift+H)"
            >
              <Highlighter className="h-4 w-4" />
            </button>
            {showHighlightPicker && (
              <div
                className={cn(
                  'absolute top-full left-0 mt-1 p-2 rounded-lg z-50',
                  'bg-[var(--glass-panel-bg)]',
                  'backdrop-blur-[var(--glass-blur)]',
                  'border border-[var(--glass-border)]',
                  'shadow-lg'
                )}
                onMouseDown={(e) => e.preventDefault()} // Prevent focus loss when clicking inside
              >
                <div className="flex gap-1">
                  {highlightColors.map((color) => (
                    <button
                      key={color.value}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        applyHighlight(color.value);
                      }}
                      className="w-6 h-6 rounded border border-[var(--glass-border)] hover:scale-110 transition-transform"
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                  {editor.isActive('highlight') && (
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeHighlight();
                      }}
                      className="w-6 h-6 rounded border border-[var(--glass-border)] hover:scale-110 transition-transform flex items-center justify-center text-xs"
                      title="Remove highlight"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
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
          {/* Table controls - inline when in table */}
          {isInTable && (
            <>
              <div className="w-px h-4 bg-[var(--glass-border)] mx-1" />
              <button
                onClick={() => editor.chain().focus().addRowBefore().run()}
                className="p-1.5 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--color-text-primary)] transition-colors"
                title="Add row above"
              >
                <Rows3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="p-1.5 rounded-md text-[var(--color-text-secondary)] hover:bg-green-500/20 hover:text-green-400 transition-colors"
                title="Add row below"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().deleteRow().run()}
                className="p-1.5 rounded-md text-[var(--color-text-secondary)] hover:bg-red-500/20 hover:text-red-400 transition-colors"
                title="Delete row"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="w-px h-4 bg-[var(--glass-border)] mx-1" />
              <button
                onClick={() => editor.chain().focus().addColumnBefore().run()}
                className="p-1.5 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--color-text-primary)] transition-colors"
                title="Add column left"
              >
                <Columns3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="p-1.5 rounded-md text-[var(--color-text-secondary)] hover:bg-green-500/20 hover:text-green-400 transition-colors"
                title="Add column right"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().deleteColumn().run()}
                className="p-1.5 rounded-md text-[var(--color-text-secondary)] hover:bg-red-500/20 hover:text-red-400 transition-colors"
                title="Delete column"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="w-px h-4 bg-[var(--glass-border)] mx-1" />
              <button
                onClick={deleteTable}
                className="p-1.5 rounded-md text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                title="Delete table"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>,
        document.body
      )}

      {/* Slash Command Menu */}
      <SlashCommandMenu editor={editor} />

      {/* Table Controls - Notion-style add/remove row/column buttons */}
      <TableControls editor={editor} />

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Link Popover */}
      <LinkPopover
        editor={editor}
        isOpen={showLinkPopover}
        onClose={closeLinkPopover}
        position={linkPopoverPosition}
        savedSelection={savedSelectionRef.current}
      />

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

        /* Table wrapper for horizontal scroll */
        .tiptap .tableWrapper {
          overflow-x: auto;
          margin: 0.5rem 0;
          max-width: 100%;
          scrollbar-width: thin;
          scrollbar-color: var(--glass-border) transparent;
        }

        .tiptap .tableWrapper::-webkit-scrollbar {
          height: 6px;
        }

        .tiptap .tableWrapper::-webkit-scrollbar-track {
          background: transparent;
        }

        .tiptap .tableWrapper::-webkit-scrollbar-thumb {
          background: var(--glass-border);
          border-radius: 3px;
        }

        .tiptap .tableWrapper::-webkit-scrollbar-thumb:hover {
          background: var(--color-text-tertiary);
        }

        /* Table styling - supports any number of columns with resizing */
        .tiptap table {
          border-collapse: collapse;
          table-layout: fixed;
          width: max-content;
          min-width: 100%;
        }

        .tiptap table th,
        .tiptap table td {
          border: 1px solid color-mix(in srgb, var(--glass-border) 50%, transparent);
          padding: 0.5rem 0.75rem;
          text-align: left;
          vertical-align: top;
          min-width: 100px;
          width: 150px;
          color: var(--color-text-primary);
          position: relative;
          box-sizing: border-box;
          overflow: hidden;
        }

        .tiptap table th {
          font-weight: 600;
          color: var(--color-text-primary);
          background: color-mix(in srgb, var(--glass-bg) 50%, transparent);
        }

        /* Subtle row hover */
        .tiptap table tr:hover td {
          background: color-mix(in srgb, var(--glass-bg) 30%, transparent);
        }

        /* Column resize handle - TipTap creates this element */
        .tiptap .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: -2px;
          width: 4px;
          background: var(--color-accent);
          cursor: col-resize;
          z-index: 20;
        }

        /* Resize cursor when table is being resized */
        .tiptap.resize-cursor {
          cursor: col-resize;
        }

        /* Selected cells */
        .tiptap .selectedCell {
          background: hsla(var(--accent-h) var(--accent-s) 50% / 0.15);
        }

        /* Table positioning for toolbar */
        .tiptap table {
          position: relative;
        }

        /* Editor left padding for drag handle */
        .tiptap {
          padding-left: 1.75rem;
        }

        /* Global drag handle styling */
        .drag-handle {
          position: fixed;
          width: 1.5rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 0.25rem;
          cursor: grab;
          opacity: 0;
          transition: opacity 0.15s, background 0.15s;
          user-select: none;
          z-index: 50;
        }

        .drag-handle::after {
          content: '⋮⋮';
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: -2px;
          color: var(--color-text-muted);
        }

        .drag-handle:hover {
          opacity: 1 !important;
          background: var(--glass-panel-bg);
        }

        .drag-handle:hover::after {
          color: var(--color-text-primary);
        }

        .drag-handle:active {
          cursor: grabbing;
        }

        /* Show drag handle when hovering in editor */
        .ProseMirror:hover .drag-handle,
        .tiptap:hover .drag-handle {
          opacity: 0.7;
        }

        /* @ Mention Pills - Squircle style */
        .tiptap span[data-pawkit-mention],
        .tiptap .mention-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.125rem 0.5rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          vertical-align: baseline;
        }

        .tiptap span[data-pawkit-mention]:hover,
        .tiptap .mention-pill:hover {
          transform: translateY(-1px);
        }

        .tiptap .mention-pill-card {
          background: hsla(185 70% 42% / 0.15);
          color: hsl(185 70% 38%);
          border: 1px solid hsla(185 70% 42% / 0.25);
        }

        .tiptap .mention-pill-card:hover {
          background: hsla(185 70% 42% / 0.25);
        }

        .tiptap .mention-pill-pawkit {
          background: hsla(280 70% 50% / 0.15);
          color: hsl(280 70% 45%);
          border: 1px solid hsla(280 70% 50% / 0.25);
        }

        .tiptap .mention-pill-pawkit:hover {
          background: hsla(280 70% 50% / 0.25);
        }

        .tiptap .mention-pill-date {
          background: hsla(220 70% 50% / 0.15);
          color: hsl(220 70% 45%);
          border: 1px solid hsla(220 70% 50% / 0.25);
        }

        .tiptap .mention-pill-date:hover {
          background: hsla(220 70% 50% / 0.25);
        }

        /* Deleted/broken mention state */
        .tiptap .mention-deleted {
          background: hsla(0 60% 50% / 0.1);
          color: hsl(0 50% 40%);
          border: 1px solid hsla(0 60% 50% / 0.2);
          text-decoration: line-through;
          opacity: 0.7;
        }

        .tiptap .mention-deleted:hover {
          opacity: 1;
        }

        /* Highlight styling - multicolor support */
        .tiptap mark {
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          color: #1a1a1a !important;
          background-color: #fef08a; /* Default yellow if no color specified */
        }

        /* Ensure inline styles from TipTap work */
        .tiptap mark[style] {
          background-color: unset; /* Let inline style take over */
        }

        /* Data-color attribute support */
        .tiptap mark[data-color="#fef08a"] { background-color: #fef08a !important; }
        .tiptap mark[data-color="#bbf7d0"] { background-color: #bbf7d0 !important; }
        .tiptap mark[data-color="#bfdbfe"] { background-color: #bfdbfe !important; }
        .tiptap mark[data-color="#fbcfe8"] { background-color: #fbcfe8 !important; }
        .tiptap mark[data-color="#fed7aa"] { background-color: #fed7aa !important; }

        /* Toggle block styling */
        .tiptap .toggle-wrapper {
          margin: 0.5rem 0;
        }

        .tiptap .toggle {
          border: 1px solid var(--glass-border);
          border-radius: 0.5rem;
          background: var(--glass-bg);
          overflow: hidden;
        }

        .tiptap .toggle-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          user-select: none;
        }

        .tiptap .toggle-chevron-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 0.25rem;
          border: none;
          background: transparent;
          cursor: pointer;
          transition: background-color 0.15s ease;
          flex-shrink: 0;
        }

        .tiptap .toggle-chevron-btn:hover {
          background: var(--color-bg-surface-2);
        }

        .tiptap .toggle-chevron {
          color: var(--color-text-muted);
          transition: transform 0.2s ease;
        }

        .tiptap .toggle-chevron.open {
          transform: rotate(90deg);
        }

        .tiptap .toggle-summary {
          flex: 1;
          font-weight: 500;
          color: var(--color-text-primary);
        }

        .tiptap .toggle-summary-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-weight: 500;
          color: var(--color-text-primary);
          font-size: inherit;
        }

        .tiptap .toggle-content {
          padding: 0 1rem 0.75rem 2.5rem;
        }

        /* Callout block styling */
        .tiptap .callout-wrapper {
          margin: 0.5rem 0;
        }

        .tiptap .callout {
          display: flex;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          border: 1px solid;
        }

        .tiptap .callout[data-type="info"] {
          background: hsla(210 100% 50% / 0.1);
          border-color: hsla(210 100% 50% / 0.3);
        }

        .tiptap .callout[data-type="warning"] {
          background: hsla(45 100% 50% / 0.1);
          border-color: hsla(45 100% 50% / 0.3);
        }

        .tiptap .callout[data-type="tip"] {
          background: hsla(142 70% 45% / 0.1);
          border-color: hsla(142 70% 45% / 0.3);
        }

        .tiptap .callout[data-type="danger"] {
          background: hsla(0 70% 50% / 0.1);
          border-color: hsla(0 70% 50% / 0.3);
        }

        .tiptap .callout[data-type="note"] {
          background: hsla(270 70% 50% / 0.1);
          border-color: hsla(270 70% 50% / 0.3);
        }

        .tiptap .callout-icon {
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .tiptap .callout-content {
          flex: 1;
          min-width: 0;
        }
      `}</style>
    </div>
  );
}
