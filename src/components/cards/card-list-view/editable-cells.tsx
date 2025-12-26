'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// EDITABLE CELL
// =============================================================================

interface EditableCellProps {
  value: string;
  cardId: string;
  field: string;
  onSave: (cardId: string, field: string, value: string) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  placeholder?: string;
  multiline?: boolean;
}

export function EditableCell({
  value,
  cardId,
  field,
  onSave,
  isEditing,
  onStartEdit,
  onCancelEdit,
  placeholder = '-',
  multiline = false,
}: EditableCellProps) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue !== value) {
      onSave(cardId, field, editValue);
    }
    onCancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditValue(value);
      onCancelEdit();
    }
  };

  if (isEditing) {
    const inputClasses = 'w-full bg-transparent border border-[var(--color-accent)] rounded px-2 py-1 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]';

    return multiline ? (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn(inputClasses, 'resize-none h-16')}
        onClick={(e) => e.stopPropagation()}
      />
    ) : (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={inputClasses}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartEdit();
      }}
      className="text-sm text-[var(--color-text-muted)] truncate block cursor-text hover:text-[var(--color-text-secondary)]"
      title="Double-click to edit"
    >
      {value || placeholder}
    </span>
  );
}

// =============================================================================
// EDITABLE TAGS CELL
// =============================================================================

interface EditableTagsCellProps {
  tags: string[];
  cardId: string;
  onSave: (cardId: string, field: string, value: string[]) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}

export function EditableTagsCell({
  tags,
  cardId,
  onSave,
  isEditing,
  onStartEdit,
  onCancelEdit,
}: EditableTagsCellProps) {
  const [editValue, setEditValue] = useState(tags.join(', '));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(tags.join(', '));
  }, [tags]);

  const handleSave = () => {
    const newTags = editValue
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    onSave(cardId, 'tags', newTags);
    onCancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditValue(tags.join(', '));
      onCancelEdit();
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder="tag1, tag2, tag3"
        className="w-full bg-transparent border border-[var(--color-accent)] rounded px-2 py-1 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartEdit();
      }}
      className="flex flex-wrap gap-1 cursor-text"
      title="Double-click to edit"
    >
      {tags.length > 0 ? (
        tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="text-xs text-[var(--color-text-muted)] bg-[var(--bg-surface-3)] px-2 py-0.5 rounded"
          >
            {tag}
          </span>
        ))
      ) : (
        <span className="text-sm text-[var(--color-text-muted)]">-</span>
      )}
      {tags.length > 2 && (
        <span className="text-xs text-[var(--color-text-muted)]">+{tags.length - 2}</span>
      )}
    </div>
  );
}
