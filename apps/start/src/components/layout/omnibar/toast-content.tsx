'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveToast } from '@/lib/stores/toast-store';
import { toastIcons, toastColors } from './types';

interface ToastContentProps {
  toast: NonNullable<ReturnType<typeof useActiveToast>>;
  isCompact: boolean;
  onDismiss: () => void;
}

export function ToastContent({ toast, isCompact, onDismiss }: ToastContentProps) {
  const Icon = toastIcons[toast.type];
  const colorClass = toastColors[toast.type];

  return (
    <motion.div
      className="absolute inset-0 flex items-center w-full h-full px-3 gap-3"
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{
        duration: 0.15,
        ease: 'easeOut',
      }}
    >
      {/* Icon */}
      <div className={cn('shrink-0', colorClass)}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Message */}
      <span
        className={cn(
          'flex-1 text-sm text-text-primary truncate',
          isCompact && 'text-xs'
        )}
      >
        {toast.message}
      </span>

      {/* Action Button (if provided) */}
      {toast.action && !isCompact && (
        <button
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
          className={cn(
            'shrink-0 px-3 py-1 rounded-lg text-xs font-medium',
            'bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)]',
            'text-text-primary',
            'transition-colors duration-150'
          )}
        >
          {toast.action.label}
        </button>
      )}

      {/* Dismiss Button */}
      <button
        onClick={onDismiss}
        className={cn(
          'shrink-0 flex items-center justify-center',
          'w-7 h-7 rounded-lg',
          'text-text-muted hover:text-text-primary',
          'hover:bg-[var(--glass-bg)]',
          'transition-colors duration-150'
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
