'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X, RefreshCw } from 'lucide-react';
import { useEjectedToasts, useToastStore, type ToastType } from '@/lib/stores/toast-store';
import { cn } from '@/lib/utils';

interface ToastStackProps {
  isCompact: boolean;
}

// Toast type to icon mapping
const toastIcons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

// Toast type to color mapping (using CSS variables for theme awareness)
const toastColors: Record<ToastType, string> = {
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-blue-400',
  warning: 'text-yellow-400',
};

// Toast type to border accent
const toastBorderColors: Record<ToastType, string> = {
  success: 'border-l-green-400',
  error: 'border-l-red-400',
  info: 'border-l-blue-400',
  warning: 'border-l-yellow-400',
};

// Spring configuration for the "pop out" effect
const springConfig = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 25,
  mass: 0.8,
};

// Stagger delay per toast (in seconds)
const STAGGER_DELAY = 0.08;

export function ToastStack({ isCompact }: ToastStackProps) {
  const ejectedToasts = useEjectedToasts();
  const dismissToast = useToastStore((s) => s.dismissToast);

  if (ejectedToasts.length === 0) return null;

  return (
    <div
      className={cn(
        'absolute left-1/2 -translate-x-1/2',
        'flex flex-col items-center gap-2',
        'pointer-events-none'
      )}
      style={{
        top: 56, // Below the omnibar (48px height + 8px gap)
        zIndex: -1, // Behind the omnibar
      }}
    >
      <AnimatePresence mode="popLayout">
        {ejectedToasts.map((toast, index) => {
          const Icon = toastIcons[toast.type];
          const colorClass = toastColors[toast.type];
          const borderColorClass = toastBorderColors[toast.type];

          return (
            <motion.div
              key={toast.id}
              layout
              className={cn(
                'flex items-center gap-3 px-4 py-2.5',
                'bg-[var(--glass-panel-bg)] backdrop-blur-[var(--glass-blur)]',
                'border border-[var(--glass-border)]',
                'border-l-2',
                borderColorClass,
                'rounded-xl',
                'shadow-[var(--glass-shadow)]',
                'pointer-events-auto'
              )}
              // Spring "pop out" from under the omnibar
              initial={{
                y: -48,
                opacity: 0,
                scale: 0.9,
              }}
              animate={{
                y: 0,
                opacity: Math.max(0.4, 1 - index * 0.2), // Fade out older toasts
                scale: Math.max(0.92, 1 - index * 0.03), // Slightly smaller for depth
              }}
              exit={{
                opacity: 0,
                scale: 0.85,
                y: -24,
                transition: {
                  duration: 0.2,
                  ease: 'easeIn',
                },
              }}
              transition={{
                ...springConfig,
                // Stagger delay based on index
                delay: index * STAGGER_DELAY,
                // Layout transitions use spring too
                layout: springConfig,
              }}
              style={{
                width: isCompact ? 220 : 380,
                zIndex: -index - 1,
              }}
            >
              {/* Icon with subtle animation */}
              <motion.div
                className={cn('shrink-0', colorClass)}
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 15,
                  delay: index * STAGGER_DELAY + 0.1,
                }}
              >
                <Icon className="h-5 w-5" />
              </motion.div>

              {/* Message - using CSS variable for high contrast */}
              <span
                className="flex-1 text-sm truncate"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {toast.message}
              </span>

              {/* Action Button (if provided) */}
              {toast.action && !isCompact && (
                <button
                  onClick={() => {
                    toast.action?.onClick();
                    dismissToast(toast.id);
                  }}
                  className={cn(
                    'shrink-0 px-3 py-1 rounded-lg text-xs font-medium',
                    'bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)]',
                    'transition-colors duration-150'
                  )}
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {toast.action.label}
                </button>
              )}

              {/* Dismiss Button */}
              <button
                onClick={() => dismissToast(toast.id)}
                className={cn(
                  'shrink-0 flex items-center justify-center',
                  'w-6 h-6 rounded-md',
                  'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
                  'hover:bg-[var(--glass-bg)]',
                  'transition-colors duration-150'
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
