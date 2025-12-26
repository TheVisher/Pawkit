'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useActiveToast, useIsEjecting, useToastStore } from '@/lib/stores/toast-store';
import { useSelectionStore } from '@/lib/stores/selection-store';
import { cn } from '@/lib/utils';
import { useOmnibar } from './use-omnibar';
import { IdleContent } from './idle-content';
import { ToastContent } from './toast-content';
import { BulkActionsContent } from './bulk-actions-content';
import type { OmnibarProps } from './types';

export function Omnibar({ isCompact }: OmnibarProps) {
  const activeToast = useActiveToast();
  const isEjecting = useIsEjecting();
  const dismissActiveToast = useToastStore((s) => s.dismissActiveToast);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const hasSelection = selectedIds.size > 0;

  const {
    mounted,
    isAddMenuOpen,
    setIsAddMenuOpen,
    quickNoteText,
    setQuickNoteText,
    isQuickNoteMode,
    setIsQuickNoteMode,
    showDiscardConfirm,
    selectedIndex,
    searchResults,
    textareaRef,
    effectivelyCompact,
    expandedHeight,
    handleSearchClick,
    handleForceExpand,
    handleAddAction,
    handleQuickNoteKeyDown,
    handleQuickNoteBlur,
    saveQuickNote,
    executeResult,
    confirmDiscard,
    cancelDiscard,
  } = useOmnibar(isCompact);

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="h-12 w-[400px] rounded-2xl bg-[var(--glass-panel-bg)] backdrop-blur-[var(--glass-blur)]" />
    );
  }

  const showToast = !!activeToast;

  return (
    <>
      <motion.div
        className={cn(
          'omnibar-container relative flex flex-col justify-start overflow-hidden',
          'bg-[var(--glass-panel-bg)] backdrop-blur-[var(--glass-blur)]',
          'border border-[var(--glass-border)]',
          'shadow-[var(--glass-shadow)]',
          'rounded-2xl'
        )}
        initial={false}
        animate={{
          width: effectivelyCompact ? 140 : 400,
          height: expandedHeight,
          scaleY: isEjecting ? 1.04 : 1,
          scaleX: isEjecting ? 0.98 : 1,
        }}
        transition={{
          width: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
          height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
          scaleY: {
            type: 'spring',
            stiffness: 500,
            damping: 15,
            mass: 0.8,
          },
          scaleX: {
            type: 'spring',
            stiffness: 500,
            damping: 15,
            mass: 0.8,
          },
        }}
        style={{ transformOrigin: 'center top' }}
      >
        <AnimatePresence mode="wait">
          {showToast ? (
            <ToastContent
              key="toast"
              toast={activeToast}
              isCompact={isCompact}
              onDismiss={dismissActiveToast}
            />
          ) : hasSelection ? (
            <BulkActionsContent
              key="bulk-actions"
              isCompact={effectivelyCompact}
            />
          ) : (
            <IdleContent
              key="idle"
              isCompact={effectivelyCompact}
              isAddMenuOpen={isAddMenuOpen}
              setIsAddMenuOpen={setIsAddMenuOpen}
              onSearchClick={handleSearchClick}
              onAddAction={handleAddAction}
              isQuickNoteMode={isQuickNoteMode}
              setIsQuickNoteMode={setIsQuickNoteMode}
              quickNoteText={quickNoteText}
              setQuickNoteText={setQuickNoteText}
              textareaRef={textareaRef}
              onQuickNoteKeyDown={handleQuickNoteKeyDown}
              onQuickNoteBlur={handleQuickNoteBlur}
              onSaveQuickNote={saveQuickNote}
              onForceExpand={handleForceExpand}
              searchResults={searchResults}
              selectedIndex={selectedIndex}
              onSelectResult={executeResult}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Discard confirmation overlay */}
      <AnimatePresence>
        {showDiscardConfirm && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancelDiscard}
          >
            <motion.div
              className={cn(
                'p-4 rounded-xl max-w-sm',
                'bg-[var(--glass-panel-bg)] backdrop-blur-[var(--glass-blur)]',
                'border border-[var(--glass-border)]',
                'shadow-[var(--glass-shadow)]'
              )}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-text-primary mb-4">Discard this quick note?</p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={cancelDiscard}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm',
                    'bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)]',
                    'text-text-secondary hover:text-text-primary',
                    'transition-colors'
                  )}
                >
                  Keep editing
                </button>
                <button
                  onClick={confirmDiscard}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm',
                    'bg-red-500/20 hover:bg-red-500/30',
                    'text-red-400 hover:text-red-300',
                    'transition-colors'
                  )}
                >
                  Discard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
