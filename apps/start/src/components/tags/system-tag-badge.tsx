'use client';

/**
 * SystemTagBadge - A specialized badge for system-generated tags
 *
 * Unlike regular TagBadge which uses hash-based colors, SystemTagBadge
 * has predefined colors for each system tag type (read, scheduled, etc.)
 */

import { cn } from '@/lib/utils';
import { type SystemTag, SYSTEM_TAG_COLORS } from '@/lib/utils/system-tags';

export interface SystemTagBadgeProps {
  tag: SystemTag;
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
}

export function SystemTagBadge({
  tag,
  size = 'sm',
  onClick,
  className,
}: SystemTagBadgeProps) {
  const colors = SYSTEM_TAG_COLORS[tag.color];
  const Icon = tag.icon;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[11px] gap-1',
    md: 'px-2 py-1 text-xs gap-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-md transition-opacity',
        sizeClasses[size],
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <Icon className={cn('flex-shrink-0', iconSizes[size])} />
      <span className="truncate">{tag.label}</span>
    </span>
  );
}

export default SystemTagBadge;
