'use client';

import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--bg-surface-2)' }}
      >
        <Icon className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
      </div>

      <h3
        className="text-lg font-medium mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h3>

      <p
        className="text-sm text-center max-w-sm mb-6"
        style={{ color: 'var(--text-muted)' }}
      >
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
            boxShadow: 'var(--raised-shadow), 0 0 20px hsla(var(--accent-h) var(--accent-s) 50% / 0.3)',
            border: '1px solid hsla(var(--accent-h) var(--accent-s) 50% / 0.5)',
            color: 'var(--ds-accent)',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
