'use client';

/**
 * Pawkit Plate Editor
 *
 * Unified Plate-based rich text editor component.
 * Handles HTML-to-JSON migration on load and reference syncing on blur.
 */

import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plate, usePlateEditor, useEditorRef, PlateContainer, PlateContent } from 'platejs/react';
import { getEditorDOMFromHtmlString } from 'platejs/static';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { EditorKit } from '@/components/editor/editor-kit';
import {
  isPlateJson,
  isHtmlContent,
  parseJsonContent,
  createEmptyPlateContent,
} from '@/lib/plate/html-to-plate';
import { useDataStore } from '@/lib/stores/data-store';
import { useReferences } from '@/lib/hooks/use-live-data';
import { useModalStore } from '@/lib/stores/modal-store';
import { useCalendarStore } from '@/lib/stores/calendar-store';

// Simple type for editor content - matches Plate's node structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlateContent = any[];

export interface PawkitPlateEditorProps {
  /** Content can be HTML string (legacy) or JSON (Plate format) */
  content: string | PlateContent;
  /** Called with Plate JSON when content changes */
  onChange: (value: PlateContent) => void;
  /** Workspace ID - enables mention search and reference syncing */
  workspaceId?: string;
  /** Card ID - enables reference syncing for @ mentions */
  cardId?: string;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Whether the editor is editable */
  editable?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Editor variant for styling */
  variant?: 'default' | 'minimal' | 'notes';
  /** Called when user makes any edit (for tracking article edits) */
  onEdit?: () => void;
}

// Container variants
const containerVariants = cva(
  'relative w-full cursor-text select-text overflow-y-auto caret-primary selection:bg-brand/25 focus-visible:outline-none',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default: 'h-full',
        minimal: 'h-full',
        notes: 'h-full',
      },
    },
  }
);

// Editor content variants
const editorVariants = cva(
  cn(
    'group/editor',
    // Note: overflow-visible is needed for the drag handle to appear outside content bounds
    'relative w-full cursor-text select-text overflow-visible whitespace-pre-wrap break-words',
    'rounded-md ring-offset-background focus-visible:outline-none',
    // Placeholder styling
    '**:data-slate-placeholder:!top-1/2 **:data-slate-placeholder:-translate-y-1/2',
    'placeholder:text-muted-foreground/80 **:data-slate-placeholder:text-muted-foreground/80 **:data-slate-placeholder:opacity-100!',
    '[&_strong]:font-bold',
    // Prose styling for content
    'prose prose-sm max-w-none prose-invert',
    'prose-headings:text-[var(--color-text-primary)] prose-headings:font-semibold',
    'prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg',
    'prose-p:text-[var(--color-text-primary)] prose-p:leading-relaxed',
    'prose-a:text-[var(--color-accent)] prose-a:no-underline hover:prose-a:underline',
    'prose-code:text-[var(--color-accent)] prose-code:bg-[var(--glass-bg)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none',
    'prose-pre:bg-[var(--glass-bg)] prose-pre:border prose-pre:border-[var(--glass-border)]',
    'prose-ul:text-[var(--color-text-primary)] prose-ol:text-[var(--color-text-primary)]',
    'prose-li:text-[var(--color-text-primary)]',
    'prose-blockquote:text-[var(--color-text-secondary)] prose-blockquote:border-l-[var(--color-accent)]',
    'prose-strong:text-[var(--color-text-primary)] prose-em:text-[var(--color-text-primary)]',
    'prose-hr:border-[var(--glass-border)]'
  ),
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      disabled: {
        true: 'cursor-not-allowed opacity-50',
      },
      variant: {
        // px-12 provides space for the drag handle on the left
        default: 'size-full px-12 pt-0 pb-16 text-base',
        minimal: 'size-full px-8 py-2 text-base',
        // pl-10 provides space for drag handle + button, pr-2 keeps content width
        notes: 'size-full pl-10 pr-2 py-2 text-sm',
      },
    },
  }
);

/**
 * Deserialize HTML content to Plate JSON
 */
function deserializeHtmlToPlate(
  html: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any
): PlateContent {
  try {
    // Handle empty or whitespace-only HTML
    if (!html || !html.trim()) {
      return createEmptyPlateContent();
    }

    const editorNode = getEditorDOMFromHtmlString(html);

    // Handle case where getEditorDOMFromHtmlString returns null
    if (!editorNode) {
      console.warn('[PawkitPlateEditor] getEditorDOMFromHtmlString returned null for:', html.substring(0, 100));
      return createEmptyPlateContent();
    }

    const nodes = editor.api.html.deserialize({
      element: editorNode,
    });
    return nodes as PlateContent;
  } catch (error) {
    console.error('[PawkitPlateEditor] HTML deserialization failed:', error);
    return createEmptyPlateContent();
  }
}

/**
 * Inner editor component that has access to editor ref
 */
function PawkitEditorInner({
  onChange,
  workspaceId,
  cardId,
  placeholder,
  editable,
  className,
  variant,
  onEdit,
}: Omit<PawkitPlateEditorProps, 'content'>) {
  const editor = useEditorRef();
  const router = useRouter();
  const openCardDetail = useModalStore((s) => s.openCardDetail);
  const setCalendarDate = useCalendarStore((s) => s.setDate);

  // Reference sync dependencies
  const createReference = useDataStore((s) => s.createReference);
  const deleteReference = useDataStore((s) => s.deleteReference);
  const updateCard = useDataStore((s) => s.updateCard);
  const existingRefs = useReferences(cardId);

  const existingRefsRef = useRef(existingRefs);
  const hasEditedRef = useRef(false);

  // Keep existingRefs ref in sync
  useEffect(() => {
    existingRefsRef.current = existingRefs;
  }, [existingRefs]);

  // Sync references on blur
  const handleBlur = useCallback(async () => {
    if (!cardId || !workspaceId) return;

    try {
      const content = editor.children;
      const { syncReferencesFromPlateContent } = await import('@/lib/plate/mention-parser');
      await syncReferencesFromPlateContent(
        cardId,
        workspaceId,
        content,
        existingRefsRef.current,
        {
          createReference,
          deleteReference,
          updateCard,
        }
      );
    } catch (err) {
      console.error('[PawkitPlateEditor] Failed to sync references:', err);
    }
  }, [cardId, workspaceId, editor, createReference, deleteReference, updateCard]);

  return (
    <PlateContainer
      className={cn(
        'ignore-click-outside/toolbar',
        containerVariants({ variant }),
        className
      )}
    >
      <PlateContent
        className={cn(
          editorVariants({
            variant,
            disabled: !editable,
          })
        )}
        disabled={!editable}
        placeholder={placeholder}
        onBlur={handleBlur}
        disableDefaultStyles
        autoFocus={false}
      />
    </PlateContainer>
  );
}

export function PawkitPlateEditor({
  content,
  onChange,
  workspaceId,
  cardId,
  placeholder = "Type '/' for commands or just start writing...",
  editable = true,
  className,
  variant = 'default',
  onEdit,
}: PawkitPlateEditorProps) {
  // Parse initial content
  const initialValue = useMemo(() => {
    // Empty content
    if (!content) {
      return createEmptyPlateContent();
    }

    // Already Plate JSON array
    if (Array.isArray(content)) {
      return content;
    }

    // JSON string
    if (typeof content === 'string' && isPlateJson(content)) {
      const parsed = parseJsonContent(content);
      if (parsed) return parsed;
    }

    // Empty string
    if (typeof content === 'string' && !content.trim()) {
      return createEmptyPlateContent();
    }

    // HTML content - we'll handle conversion in the editor hook
    // Return null to indicate HTML needs conversion
    return null;
  }, [content]);

  // Create editor with plugins
  const editor = usePlateEditor({
    plugins: EditorKit,
    value: initialValue || createEmptyPlateContent(),
  });

  // Track if we've already converted HTML
  const hasConvertedHtml = useRef(false);

  // Track the last content we set to detect external changes
  const lastContentRef = useRef<string | null>(null);

  // Track if we've mounted - skip external content changes on first render
  const hasMountedRef = useRef(false);

  // Handle HTML conversion after editor is created
  useEffect(() => {
    if (
      !hasConvertedHtml.current &&
      initialValue === null &&
      typeof content === 'string' &&
      isHtmlContent(content)
    ) {
      hasConvertedHtml.current = true;
      const nodes = deserializeHtmlToPlate(content, editor);
      editor.tf.setValue(nodes);
      lastContentRef.current = JSON.stringify(nodes);
      // Trigger onChange to save the converted content
      onChange(nodes);
    }
  }, [content, initialValue, editor, onChange]);

  // Handle external content changes (e.g., template selection from sidebar)
  useEffect(() => {
    // Skip on first mount - initial content is already set via initialValue
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      // Set the initial ref to track future changes
      const contentString = typeof content === 'string' ? content : JSON.stringify(content);
      lastContentRef.current = contentString;
      return;
    }

    // Skip if content is the same as what we last set
    const contentString = typeof content === 'string' ? content : JSON.stringify(content);
    if (lastContentRef.current === contentString) {
      return;
    }

    // Skip empty content
    if (!content || (typeof content === 'string' && !content.trim())) {
      return;
    }

    // Skip if any input/textarea is focused to avoid stealing focus from title
    const activeElement = document.activeElement;
    const isInputFocused = activeElement?.tagName === 'TEXTAREA' ||
                           activeElement?.tagName === 'INPUT' ||
                           activeElement?.getAttribute('contenteditable') === 'true' ||
                           activeElement?.closest('[data-slate-editor]');

    if (isInputFocused) {
      // Just update the ref to avoid re-triggering, but don't setValue
      lastContentRef.current = contentString;
      return;
    }

    // Parse the new content
    let newValue: PlateContent | null = null;

    if (Array.isArray(content)) {
      newValue = content;
    } else if (typeof content === 'string') {
      if (isPlateJson(content)) {
        newValue = parseJsonContent(content);
      } else if (isHtmlContent(content)) {
        // Convert HTML to Plate JSON
        hasConvertedHtml.current = true;
        newValue = deserializeHtmlToPlate(content, editor);
      }
    }

    if (newValue && newValue.length > 0) {
      // Update the editor's content
      editor.tf.setValue(newValue);
      lastContentRef.current = JSON.stringify(newValue);
    }
  }, [content, editor]);

  // Track edits
  const hasEditedRef = useRef(false);
  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ value }: { value: any }) => {
      if (!hasEditedRef.current && onEdit) {
        hasEditedRef.current = true;
        onEdit();
      }
      // Track what we're setting to avoid re-triggering external change effect
      lastContentRef.current = JSON.stringify(value);
      onChange(value);
    },
    [onChange, onEdit]
  );

  return (
    <Plate editor={editor} onChange={handleChange}>
      <PawkitEditorInner
        onChange={onChange}
        workspaceId={workspaceId}
        cardId={cardId}
        placeholder={placeholder}
        editable={editable}
        className={className}
        variant={variant}
        onEdit={onEdit}
      />
    </Plate>
  );
}
