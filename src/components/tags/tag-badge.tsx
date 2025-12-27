'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTagColor, getTagStyle } from '@/lib/utils/tag-colors';
import { getTagName } from '@/lib/utils/tag-hierarchy';

export interface TagBadgeProps {
  /** The full tag path (e.g., "dev/react") */
  tag: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Called when the badge is clicked */
  onClick?: () => void;
  /** Called when the remove button is clicked */
  onRemove?: () => void;
  /** Show only the leaf name (e.g., "react" instead of "dev/react") */
  showLeafOnly?: boolean;
  /** Additional class names */
  className?: string;
  /** Whether the badge is interactive (shows hover state) */
  interactive?: boolean;
}

/**
 * TagBadge - A colored badge for displaying tags
 *
 * Uses deterministic coloring based on tag name.
 * Colors adapt to light/dark theme via CSS variables.
 */
export function TagBadge({
  tag,
  size = 'sm',
  onClick,
  onRemove,
  showLeafOnly = false,
  className,
  interactive = false,
}: TagBadgeProps) {
  const displayName = showLeafOnly ? getTagName(tag) : tag;
  const colors = getTagColor(tag);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
  };

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[11px] gap-1',
    md: 'px-2 py-1 text-xs gap-1.5',
  };

  const removeButtonClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-md transition-opacity',
        sizeClasses[size],
        interactive && 'cursor-pointer hover:opacity-80',
        onClick && 'cursor-pointer',
        className
      )}
      style={getTagStyle(tag)}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span className="truncate max-w-[120px]">{displayName}</span>

      {onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className={cn(
            'flex-shrink-0 rounded-sm opacity-70 hover:opacity-100 transition-opacity',
            'hover:bg-black/10 dark:hover:bg-white/10',
            removeButtonClasses[size]
          )}
          aria-label={`Remove ${tag} tag`}
        >
          <X className="w-full h-full" />
        </button>
      )}
    </span>
  );
}

/**
 * TagBadgeList - Display a list of tag badges with optional overflow
 */
export interface TagBadgeListProps {
  tags: string[];
  /** Maximum number of tags to show before "+N" indicator */
  maxVisible?: number;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Called when a tag is clicked */
  onTagClick?: (tag: string) => void;
  /** Called when a tag remove button is clicked */
  onTagRemove?: (tag: string) => void;
  /** Additional class names for the container */
  className?: string;
  /** Show only leaf names */
  showLeafOnly?: boolean;
}

export function TagBadgeList({
  tags,
  maxVisible = 3,
  size = 'sm',
  onTagClick,
  onTagRemove,
  className,
  showLeafOnly = false,
}: TagBadgeListProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {visibleTags.map((tag) => (
        <TagBadge
          key={tag}
          tag={tag}
          size={size}
          onClick={onTagClick ? () => onTagClick(tag) : undefined}
          onRemove={onTagRemove ? () => onTagRemove(tag) : undefined}
          showLeafOnly={showLeafOnly}
          interactive={!!onTagClick}
        />
      ))}

      {hiddenCount > 0 && (
        <span
          className={cn(
            'text-[var(--color-text-muted)] font-medium',
            size === 'sm' ? 'text-[11px]' : 'text-xs'
          )}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

export default TagBadge;
