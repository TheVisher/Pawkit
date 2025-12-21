'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
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

// Toast type to color mapping
const toastColors: Record<ToastType, string> = {
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-blue-400',
  warning: 'text-yellow-400',
};

export function ToastStack({ isCompact }: ToastStackProps) {
  const ejectedToasts = useEjectedToasts();
  const dismissToast = useToastStore((s) => s.dismissToast);

  if (ejectedToasts.length === 0) return null;

  return (
    <div
      className={cn(
        'absolute left-1/2 -translate-x-1/2',
        'flex flex-col items-center gap-2',
        'pointer-events-none',
        'z-[-1]' // Behind the omnibar
      )}
      style={{ top: 56 }} // Below the omnibar (48px height + 8px gap)
    >
      <AnimatePresence mode="popLayout">
        {ejectedToasts.map((toast, index) => {
          const Icon = toastIcons[toast.type];
          const colorClass = toastColors[toast.type];

          return (
            <motion.div
              key={toast.id}
              className={cn(
                'flex items-center gap-3 px-4 py-2',
                'bg-[hsl(0_0%_10%/0.90)] backdrop-blur-xl',
                'border border-white/10',
                'rounded-xl',
                'shadow-[0_4px_12px_hsl(0_0%_0%/0.4)]',
                'pointer-events-auto'
              )}
              initial={{
                y: -60,
                opacity: 0,
                scale: 1,
              }}
              animate={{
                y: 0,
                opacity: 1 - index * 0.15, // Fade out older toasts
                scale: 1 - index * 0.02, // Slightly smaller for depth
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
                y: -20,
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
                mass: 1,
              }}
              style={{
                width: isCompact ? 200 : 360,
                zIndex: -index - 1,
              }}
              layout
            >
              {/* Icon */}
              <div className={cn('shrink-0', colorClass)}>
                <Icon className="h-4 w-4" />
              </div>

              {/* Message */}
              <span className="flex-1 text-sm text-text-primary truncate">
                {toast.message}
              </span>

              {/* Dismiss Button */}
              <button
                onClick={() => dismissToast(toast.id)}
                className={cn(
                  'shrink-0 flex items-center justify-center',
                  'w-6 h-6 rounded-md',
                  'text-text-muted hover:text-text-primary',
                  'hover:bg-white/10',
                  'transition-colors duration-150'
                )}
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
