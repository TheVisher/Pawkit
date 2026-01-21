'use client';

import * as React from 'react';
import { StickyNoteIcon } from 'lucide-react';
import { useEditorRef } from 'platejs/react';
import type { Value } from 'platejs';

import { useUIStore } from '@/lib/stores/ui-store';
import { plateToHtml } from '@/lib/plate/html-to-plate';
import { ToolbarButton } from './toolbar';

/**
 * Toolbar button to add selected text to the card's notes sidebar.
 * Converts the selection to HTML and passes it via pendingNoteText store.
 */
export function AddToNotesToolbarButton() {
  const editor = useEditorRef();
  const setPendingNoteText = useUIStore((s) => s.setPendingNoteText);

  const handleClick = React.useCallback(() => {
    // Get the selected fragment
    const fragment = editor.api.getFragment();
    if (!fragment || fragment.length === 0) return;

    // Serialize the fragment to HTML for the notes panel to process
    // The CardDetailsPanel will convert this HTML to Plate JSON and wrap in blockquote
    const html = plateToHtml(fragment as Value);

    if (html && html.trim()) {
      setPendingNoteText(html);
    }
  }, [editor, setPendingNoteText]);

  return (
    <ToolbarButton onClick={handleClick} tooltip="Add to Notes">
      <StickyNoteIcon />
    </ToolbarButton>
  );
}
