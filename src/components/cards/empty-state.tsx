'use client';

import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-zinc-500" />
      </div>

      <h3 className="text-lg font-medium text-zinc-100 mb-2">{title}</h3>

      <p className="text-sm text-zinc-400 text-center max-w-sm mb-6">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
