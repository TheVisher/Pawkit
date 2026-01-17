'use client';

/**
 * Toggle NodeView Component
 *
 * Renders collapsible/expandable toggle blocks with an editable summary header.
 * Content is hidden when collapsed, shown when expanded.
 */

import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ToggleNodeView({ node, updateAttributes }: NodeViewProps) {
  const open = node.attrs.open as boolean;
  const summary = node.attrs.summary as string;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(summary);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const toggleOpen = () => {
    updateAttributes({ open: !open });
  };

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const finishEditing = () => {
    setIsEditing(false);
    if (editValue.trim() !== summary) {
      updateAttributes({ summary: editValue.trim() || 'Toggle' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEditing();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditValue(summary);
      setIsEditing(false);
    }
  };

  return (
    <NodeViewWrapper className="toggle-wrapper">
      <div
        className="toggle"
        data-toggle=""
        data-open={open ? 'true' : 'false'}
        data-summary={summary}
      >
        {/* Header with chevron and editable summary */}
        <div className="toggle-header">
          <button
            type="button"
            onClick={toggleOpen}
            className="toggle-chevron-btn"
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            <ChevronRight
              className={cn('toggle-chevron', 'h-4 w-4 transition-transform', {
                open: open,
              })}
            />
          </button>
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={finishEditing}
              onKeyDown={handleKeyDown}
              className="toggle-summary-input"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="toggle-summary"
              onDoubleClick={startEditing}
            >
              {summary}
            </span>
          )}
        </div>

        {/* Content - hidden when collapsed */}
        {open && (
          <div className="toggle-content">
            <NodeViewContent />
          </div>
        )}
      </div>

      {/* Styles for toggle content */}
      <style jsx global>{`
        .toggle-content > * {
          margin: 0;
        }

        .toggle-content > * + * {
          margin-top: 0.5rem;
        }

        .toggle-content p.is-editor-empty:first-child::before {
          color: var(--color-text-muted);
          content: 'Type something...';
          float: left;
          height: 0;
          pointer-events: none;
        }

        /* Prevent nested toggles from having extra padding */
        .toggle .toggle {
          margin: 0.5rem 0;
        }
      `}</style>
    </NodeViewWrapper>
  );
}

export default ToggleNodeView;
