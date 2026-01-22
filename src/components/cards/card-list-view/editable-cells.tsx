'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TagBadgeList } from '@/components/tags/tag-badge';
import { TagInput } from '@/components/tags/tag-input';
import { getSystemTagsForCard, type SystemTag } from '@/lib/utils/system-tags';
import { checkSupertagAddition, applyTemplate } from '@/lib/utils/template-applicator';
import type { Card } from '@/lib/types/convex';

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
  card: Card;
  onSave: (cardId: string, field: string, value: string[] | string) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onTagClick?: (tag: string) => void;
  onSystemTagClick?: (tag: SystemTag) => void;
}

export function EditableTagsCell({
  card,
  onSave,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onTagClick,
  onSystemTagClick,
}: EditableTagsCellProps) {
  const tags = card.tags || [];
  const cardId = card._id;
  const systemTags = getSystemTagsForCard(card);
  const [localTags, setLocalTags] = useState(tags);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync local tags when props change
  useEffect(() => {
    setLocalTags(tags);
  }, [tags]);

  // Handle tag changes from TagInput
  const handleTagsChange = (newTags: string[]) => {
    setLocalTags(newTags);
    onSave(cardId, 'tags', newTags);

    // Check if a supertag was added and apply template if card is empty
    const result = checkSupertagAddition(tags, newTags, card.content);
    if (result.shouldApply && result.template) {
      // Auto-apply template to empty card
      const newContent = applyTemplate(card.content, result.template);
      onSave(cardId, 'content', newContent);
    } else if (result.needsPrompt && result.template) {
      // For cards with content, show a confirmation
      const confirmed = window.confirm(
        `Apply ${result.supertagName} template? This will replace your existing content.`
      );
      if (confirmed) {
        onSave(cardId, 'content', result.template);
      }
    }
  };

  // Handle click outside to close
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onCancelEdit();
      }
    };

    // Delay adding the listener to avoid immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, onCancelEdit]);

  // Handle escape key
  useEffect(() => {
    if (!isEditing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancelEdit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, onCancelEdit]);

  if (isEditing) {
    return (
      <div
        ref={containerRef}
        className="relative min-w-[200px]"
        onClick={(e) => e.stopPropagation()}
      >
        <TagInput
          value={localTags}
          onChange={handleTagsChange}
          placeholder="Add tags..."
          compact
          autoFocus
        />
      </div>
    );
  }

  // Show tags section if we have any tags (system or user)
  const hasTags = systemTags.length > 0 || tags.length > 0;

  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartEdit();
      }}
      className="cursor-text min-h-[24px] flex items-center"
      title="Double-click to edit"
    >
      {hasTags ? (
        <TagBadgeList
          tags={tags}
          systemTags={systemTags}
          maxVisible={3}
          size="sm"
          showLeafOnly
          onTagClick={onTagClick}
          onSystemTagClick={onSystemTagClick}
        />
      ) : (
        <span className="text-sm text-[var(--color-text-muted)]">-</span>
      )}
    </div>
  );
}
