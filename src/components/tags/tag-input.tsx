'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCards } from '@/lib/contexts/convex-data-context';
import { TagBadge } from './tag-badge';
import { getTagStyle } from '@/lib/utils/tag-colors';
import {
  filterTagsByQuery,
  getCanonicalTag,
  cleanTagInput,
  validateTag,
  findExistingTag,
} from '@/lib/utils/tag-normalizer';

export interface TagInputProps {
  /** Currently selected tags */
  value: string[];
  /** Called when tags change */
  onChange: (tags: string[]) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Maximum number of tags allowed (0 = unlimited) */
  maxTags?: number;
  /** Additional class names */
  className?: string;
  /** Disable the input */
  disabled?: boolean;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Compact mode - smaller padding */
  compact?: boolean;
}

/**
 * TagInput - Combobox-style tag input with fuzzy search
 *
 * Features:
 * - Type to filter existing tags (fuzzy match)
 * - Enter to select or create new tag
 * - Show "Create [tag]" option when no exact match
 * - Selected tags as dismissible badges
 * - Keyboard navigation (arrow keys, Enter, Escape)
 * - Auto-capitalize to match existing tags
 */
export function TagInput({
  value,
  onChange,
  placeholder = 'Add tags...',
  maxTags = 0,
  className,
  disabled = false,
  autoFocus = false,
  compact = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derive unique tags from cards
  const cards = useCards();
  const uniqueTags = useMemo(
    () => [...new Set(cards.flatMap((c) => c.tags ?? []))].sort(),
    [cards]
  );

  // Filter available tags (exclude already selected)
  const availableTags = useMemo(() => {
    return uniqueTags.filter((tag) => !value.includes(tag));
  }, [uniqueTags, value]);

  // Filter tags by input query
  const filteredTags = useMemo(() => {
    return filterTagsByQuery(availableTags, inputValue, 8);
  }, [availableTags, inputValue]);

  // Check if we should show "Create" option
  const showCreateOption = useMemo(() => {
    if (!inputValue.trim()) return false;
    const cleaned = cleanTagInput(inputValue);
    if (!cleaned) return false;
    // Don't show if an exact match exists (case-insensitive)
    const existing = findExistingTag(cleaned, uniqueTags);
    return !existing;
  }, [inputValue, uniqueTags]);

  // Build list of options
  const options = useMemo(() => {
    const items: Array<{ type: 'tag' | 'create'; value: string }> = [];

    // Add filtered tags
    filteredTags.forEach((tag) => {
      items.push({ type: 'tag', value: tag });
    });

    // Add create option
    if (showCreateOption) {
      items.push({ type: 'create', value: cleanTagInput(inputValue) });
    }

    return items;
  }, [filteredTags, showCreateOption, inputValue]);

  // Selectable options (all options are selectable now)
  const selectableOptions = options;

  // Handle adding a tag
  const addTag = useCallback(
    (tag: string) => {
      const canonical = getCanonicalTag(tag, uniqueTags);
      const validationError = validateTag(canonical);

      if (validationError) {
        setError(validationError);
        return;
      }

      if (value.includes(canonical)) {
        setError('Tag already added');
        return;
      }

      if (maxTags > 0 && value.length >= maxTags) {
        setError(`Maximum ${maxTags} tags allowed`);
        return;
      }

      onChange([...value, canonical]);
      setInputValue('');
      setSelectedIndex(-1);
      setError(null);
    },
    [value, onChange, uniqueTags, maxTags]
  );

  // Handle removing a tag
  const removeTag = useCallback(
    (tag: string) => {
      onChange(value.filter((t) => t !== tag));
    },
    [value, onChange]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < selectableOptions.length - 1 ? prev + 1 : prev
          );
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;

        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < selectableOptions.length) {
            const option = selectableOptions[selectedIndex];
            addTag(option.value);
          } else if (inputValue.trim()) {
            addTag(inputValue);
          }
          break;

        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;

        case 'Backspace':
          if (!inputValue && value.length > 0) {
            // Remove last tag when backspace on empty input
            removeTag(value[value.length - 1]);
          }
          break;

        case 'Tab':
          // Allow tab to move focus, but select first option if available
          if (selectedIndex >= 0 && selectedIndex < selectableOptions.length) {
            e.preventDefault();
            const option = selectableOptions[selectedIndex];
            addTag(option.value);
          }
          break;
      }
    },
    [
      disabled,
      selectedIndex,
      selectableOptions,
      inputValue,
      value,
      addTag,
      removeTag,
    ]
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setSelectedIndex(-1);
    setError(null);
    if (!isOpen) setIsOpen(true);
  };

  // Handle focus
  const handleFocus = () => {
    setIsOpen(true);
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  // Clear error after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const canAddMore = maxTags === 0 || value.length < maxTags;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Selected tags and input */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 rounded-lg border transition-colors',
          'bg-[var(--color-bg-surface-2)] border-[var(--color-border-subtle)]',
          'focus-within:border-[var(--color-accent)] focus-within:ring-1 focus-within:ring-[var(--color-accent)]/20',
          disabled && 'opacity-50 cursor-not-allowed',
          compact ? 'px-2 py-1.5' : 'px-3 py-2'
        )}
      >
        {/* Selected tag badges */}
        {value.map((tag) => (
          <TagBadge
            key={tag}
            tag={tag}
            size={compact ? 'sm' : 'md'}
            onRemove={disabled ? undefined : () => removeTag(tag)}
          />
        ))}

        {/* Input */}
        {canAddMore && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder={value.length === 0 ? placeholder : ''}
            disabled={disabled}
            className={cn(
              'flex-1 min-w-[80px] bg-transparent border-none outline-none',
              'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
              compact ? 'text-xs' : 'text-sm'
            )}
          />
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && !disabled && options.length > 0 && (
        <div
          className={cn(
            'absolute z-50 w-full mt-1 py-1 rounded-lg border overflow-hidden',
            'bg-[var(--glass-panel-bg)] backdrop-blur-[var(--glass-blur)]',
            'border-[var(--color-border-subtle)] shadow-lg'
          )}
        >
          {options.map((option, index) => {
            const isSelected = index === selectedIndex;

            if (option.type === 'create') {
              return (
                <button
                  key="create"
                  type="button"
                  className={cn(
                    'w-full px-3 py-2 flex items-center gap-2 text-left transition-colors',
                    isSelected
                      ? 'bg-[var(--color-accent)]/10'
                      : 'hover:bg-[var(--color-bg-surface-3)]'
                  )}
                  onClick={() => addTag(option.value)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Plus className="w-4 h-4 text-[var(--color-accent)]" />
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    Create &quot;
                  </span>
                  <span
                    className="text-sm font-medium px-1.5 py-0.5 rounded"
                    style={getTagStyle(option.value)}
                  >
                    {option.value}
                  </span>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    &quot;
                  </span>
                </button>
              );
            }

            return (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'w-full px-3 py-2 flex items-center gap-2 text-left transition-colors',
                  isSelected
                    ? 'bg-[var(--color-accent)]/10'
                    : 'hover:bg-[var(--color-bg-surface-3)]'
                )}
                onClick={() => addTag(option.value)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span
                  className="text-sm font-medium px-1.5 py-0.5 rounded"
                  style={getTagStyle(option.value)}
                >
                  {option.value}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TagInput;
