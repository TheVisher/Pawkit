'use client';

/**
 * Omnibar Hook
 * Orchestrates search, add mode, and kit mode
 */

import { useState, useEffect, useCallback } from 'react';
import { useModalStore } from '@/lib/stores/modal-store';
import { useAddMode, getAddModeHeight } from './use-add-mode';
import { useKitMode, getKitModeHeight } from './use-kit-mode';
import { useSearch, getSearchHeight } from './use-search';

export function useOmnibar(isCompact: boolean) {
  const [mounted, setMounted] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const openAddCard = useModalStore((s) => s.openAddCard);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize sub-hooks with mode change callbacks for coordination
  const search = useSearch(() => {
    addMode.closeAddMode();
    kitMode.closeKitMode();
  });

  const addMode = useAddMode(() => {
    search.closeSearch();
    kitMode.closeKitMode();
  });

  const kitMode = useKitMode(() => {
    search.closeSearch();
    addMode.closeAddMode();
  });

  // Effective compact state
  const effectivelyCompact = isCompact &&
    !search.forceExpanded &&
    !search.isQuickNoteMode &&
    !addMode.isAddMode &&
    !kitMode.isKitMode;

  // Wrapped setter that coordinates mode switching
  const setIsQuickNoteMode = useCallback((mode: boolean) => {
    if (mode) {
      // Close other modes when entering search/quick note mode
      addMode.closeAddMode();
      kitMode.closeKitMode();
    }
    search.setIsQuickNoteMode(mode);
  }, [addMode, kitMode, search]);

  // ==========================================================================
  // MODE TOGGLE HANDLERS (for UI buttons)
  // ==========================================================================

  const handleToggleAddMode = useCallback(() => {
    if (addMode.isAddMode) {
      addMode.closeAddMode();
    } else {
      addMode.openAddMode();
    }
  }, [addMode]);

  const handleToggleKitMode = useCallback(() => {
    if (kitMode.isKitMode) {
      kitMode.closeKitMode();
    } else {
      kitMode.openKitMode();
    }
  }, [kitMode]);

  const handleSearchClick = useCallback(() => {
    search.openSearch();
  }, [search]);

  const handleForceExpand = useCallback(() => {
    search.openSearch();
  }, [search]);

  // ==========================================================================
  // LEGACY ADD MENU HANDLER (for dropdown menu if still used)
  // ==========================================================================

  const handleAddAction = useCallback((action: string) => {
    switch (action) {
      case 'bookmark':
        openAddCard('bookmark');
        break;
      case 'note':
        openAddCard('note');
        break;
      case 'upload':
        console.log('Upload action - coming soon');
        break;
      case 'event':
        console.log('Event action - coming soon');
        break;
      default:
        console.log('Unknown action:', action);
    }
    setIsAddMenuOpen(false);
  }, [openAddCard]);

  // ==========================================================================
  // GLOBAL KEYBOARD SHORTCUTS
  // ==========================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        search.openSearch();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'b') {
        e.preventDefault();
        openAddCard('bookmark');
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'n') {
        e.preventDefault();
        openAddCard('note');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openAddCard, search]);

  // ==========================================================================
  // GLOBAL PASTE HANDLER
  // ==========================================================================

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused = activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl as HTMLElement)?.isContentEditable;

      if (isInputFocused) return;

      const text = e.clipboardData?.getData('text');
      if (!text) return;

      const urlPattern = /^(https?:\/\/|www\.)|^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(\/|$)/i;
      if (!urlPattern.test(text.trim())) return;

      e.preventDefault();
      search.openSearch();
      search.setQuickNoteText(text.trim());
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [search]);

  // ==========================================================================
  // HEIGHT CALCULATION
  // ==========================================================================

  const getComputedHeight = useCallback(() => {
    if (addMode.isAddMode) {
      return getAddModeHeight(true);
    }
    if (kitMode.isKitMode) {
      return getKitModeHeight(true);
    }
    return getSearchHeight(
      search.isQuickNoteMode,
      search.quickNoteText,
      search.textareaHeight,
      search.searchResults,
      search.isOnTagsPage
    );
  }, [addMode.isAddMode, kitMode.isKitMode, search]);

  // ==========================================================================
  // RETURN COMPOSED STATE
  // ==========================================================================

  return {
    // Core state
    mounted,
    effectivelyCompact,
    isAddMenuOpen,
    setIsAddMenuOpen,

    // Search state (spread)
    quickNoteText: search.quickNoteText,
    setQuickNoteText: search.setQuickNoteText,
    isQuickNoteMode: search.isQuickNoteMode,
    setIsQuickNoteMode, // Use wrapped version that coordinates modes
    showDiscardConfirm: search.showDiscardConfirm,
    forceExpanded: search.forceExpanded,
    selectedIndex: search.selectedIndex,
    searchResults: search.searchResults,
    textareaRef: search.textareaRef,
    isOnTagsPage: search.isOnTagsPage,

    // Add mode state
    isAddMode: addMode.isAddMode,
    addModeSelectedIndex: addMode.addModeSelectedIndex,

    // Kit mode state
    isKitMode: kitMode.isKitMode,
    kitModeSelectedIndex: kitMode.kitModeSelectedIndex,
    kitMenuItems: kitMode.kitMenuItems,

    // Computed
    expandedHeight: getComputedHeight(),

    // Search handlers
    handleSearchClick,
    handleForceExpand,
    handleQuickNoteKeyDown: search.handleQuickNoteKeyDown,
    handleQuickNoteBlur: search.handleQuickNoteBlur,
    saveQuickNote: search.saveQuickNote,
    executeResult: search.executeResult,
    confirmDiscard: search.confirmDiscard,
    cancelDiscard: search.cancelDiscard,

    // Add mode handlers
    handleToggleAddMode,
    handleAddModeAction: addMode.handleAddModeAction,
    handleAddAction,

    // Kit mode handlers
    handleToggleKitMode,
    handleKitModeAction: kitMode.handleKitModeAction,
  };
}
