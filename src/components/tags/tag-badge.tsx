'use client';

import { X, Clock, Check, CalendarDays, AlertTriangle, AlertCircle, WifiOff, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTagStyle } from '@/lib/utils/tag-colors';
import { getTagName } from '@/lib/utils/tag-hierarchy';
import { type SystemTag, isReadingTimeTag, READ_TAG, SCHEDULED_TAG, DUE_TODAY_TAG, OVERDUE_TAG, CONFLICT_TAG } from '@/lib/utils/system-tags';
import { SystemTagBadge } from './system-tag-badge';
import { useTagColors } from '@/lib/contexts/tag-colors-context';

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
  /** Custom HSL color string (e.g., "270 60 50") - overrides deterministic color */
  customColor?: string;
}

/**
 * TagBadge - A colored badge for displaying tags
 *
 * Uses deterministic coloring based on tag name.
 * Colors adapt to light/dark theme via CSS variables.
 */
/**
 * Get icon for system tags (reading time, read, scheduled, etc.)
 * Returns null for regular user tags
 */
/** Privacy system tags */
const LOCAL_ONLY_TAG = 'local-only';
const PRIVATE_TAG = 'private';

/** Tags that should display as icon-only (no label text) */
const ICON_ONLY_TAGS = [LOCAL_ONLY_TAG, PRIVATE_TAG];

function getSystemTagIcon(tag: string) {
  if (isReadingTimeTag(tag)) return Clock;
  if (tag === READ_TAG) return Check;
  if (tag === SCHEDULED_TAG) return CalendarDays;
  if (tag === DUE_TODAY_TAG) return CalendarDays;
  if (tag === OVERDUE_TAG) return AlertTriangle;
  if (tag === CONFLICT_TAG) return AlertCircle;
  if (tag === LOCAL_ONLY_TAG) return WifiOff;
  if (tag === PRIVATE_TAG) return EyeOff;
  return null;
}

function isIconOnlyTag(tag: string): boolean {
  return ICON_ONLY_TAGS.includes(tag);
}

/** Privacy tags get a special neutral grey style */
function isPrivacyTag(tag: string): boolean {
  return tag === LOCAL_ONLY_TAG || tag === PRIVATE_TAG;
}

/** Neutral grey style for privacy indicator tags */
const PRIVACY_TAG_STYLE: React.CSSProperties = {
  backgroundColor: 'rgba(148, 163, 184, 0.2)', // Light grey
  color: 'rgba(255, 255, 255, 0.9)', // White icon
};

export function TagBadge({
  tag,
  size = 'sm',
  onClick,
  onRemove,
  showLeafOnly = false,
  className,
  interactive = false,
  customColor: customColorProp,
}: TagBadgeProps) {
  const displayName = showLeafOnly ? getTagName(tag) : tag;

  // Get custom color from workspace preferences if available
  const { getCustomColor } = useTagColors();
  const customColor = customColorProp ?? getCustomColor(tag);

  const Icon = getSystemTagIcon(tag);

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

  // Icon-only privacy tags get special styling
  const isPrivacy = isPrivacyTag(tag);
  const tagStyle = isPrivacy ? PRIVACY_TAG_STYLE : getTagStyle(tag, customColor);

  // Icon-only tags need square padding to look like badges
  const iconOnlySizeClasses = {
    sm: 'p-1 text-[11px]',
    md: 'p-1.5 text-xs',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-md transition-opacity',
        isIconOnlyTag(tag) ? iconOnlySizeClasses[size] : sizeClasses[size],
        interactive && 'cursor-pointer hover:opacity-80',
        onClick && 'cursor-pointer',
        className
      )}
      style={tagStyle}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {Icon && <Icon className={cn('flex-shrink-0', size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />}
      {!isIconOnlyTag(tag) && <span className="truncate max-w-[120px]">{displayName}</span>}

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
 * Supports both user tags and system tags (read, scheduled, reading time, etc.)
 */
export interface TagBadgeListProps {
  tags: string[];
  /** System-generated tags (read status, scheduled, etc.) - rendered first */
  systemTags?: SystemTag[];
  /** Maximum number of tags to show before "+N" indicator */
  maxVisible?: number;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Called when a user tag is clicked */
  onTagClick?: (tag: string) => void;
  /** Called when a system tag is clicked */
  onSystemTagClick?: (tag: SystemTag) => void;
  /** Called when a tag remove button is clicked */
  onTagRemove?: (tag: string) => void;
  /** Additional class names for the container */
  className?: string;
  /** Show only leaf names */
  showLeafOnly?: boolean;
}

export function TagBadgeList({
  tags,
  systemTags = [],
  maxVisible = 3,
  size = 'sm',
  onTagClick,
  onSystemTagClick,
  onTagRemove,
  className,
  showLeafOnly = false,
}: TagBadgeListProps) {
  // If no tags at all, return null
  if ((!tags || tags.length === 0) && systemTags.length === 0) {
    return null;
  }

  // Calculate how many user tags we can show after system tags
  const systemTagCount = systemTags.length;
  const remainingSlots = Math.max(0, maxVisible - systemTagCount);
  const visibleUserTags = tags.slice(0, remainingSlots);
  const totalTags = systemTagCount + tags.length;
  const hiddenCount = Math.max(0, totalTags - maxVisible);

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {/* System tags first (read, scheduled, reading time, etc.) */}
      {systemTags.map((systemTag) => (
        <SystemTagBadge
          key={systemTag.id}
          tag={systemTag}
          size={size}
          onClick={onSystemTagClick ? () => onSystemTagClick(systemTag) : undefined}
        />
      ))}

      {/* User tags */}
      {visibleUserTags.map((tag) => (
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

      {/* Hidden count indicator */}
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
