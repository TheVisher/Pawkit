'use client';

/**
 * Search Hook
 * Handles search functionality, quick notes, and result execution
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useToastStore } from '@/lib/stores/toast-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { useDataStore } from '@/lib/stores/data-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { SEARCHABLE_ACTIONS, type SearchResults } from '../types';
import { normalizeUrl } from '@/lib/utils/url-normalizer';

export interface SearchState {
  quickNoteText: string;
  isQuickNoteMode: boolean;
  showDiscardConfirm: boolean;
  forceExpanded: boolean;
  selectedIndex: number;
  searchResults: SearchResults | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  textareaHeight: number;
  isOnTagsPage: boolean;
}

export interface SearchActions {
  setQuickNoteText: (text: string) => void;
  setIsQuickNoteMode: (mode: boolean) => void;
  openSearch: () => void;
  closeSearch: () => void;
  resetSearch: () => void;
  handleQuickNoteKeyDown: (e: React.KeyboardEvent) => void;
  handleQuickNoteBlur: (e: React.FocusEvent) => void;
  saveQuickNote: () => Promise<void>;
  executeResult: (index: number) => void;
  confirmDiscard: () => void;
  cancelDiscard: () => void;
}

export function useSearch(onModeChange?: () => void): SearchState & SearchActions {
  const router = useRouter();
  const pathname = usePathname();

  // State
  const [quickNoteText, setQuickNoteText] = useState('');
  const [isQuickNoteMode, setIsQuickNoteMode] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [forceExpanded, setForceExpanded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [textareaHeight, setTextareaHeight] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDiscardingRef = useRef(false);

  // Store hooks
  const toast = useToastStore((s) => s.toast);
  const toggleLeftSidebar = useUIStore((s) => s.toggleLeftSidebar);
  const openAddCard = useModalStore((s) => s.openAddCard);
  const openCardDetail = useModalStore((s) => s.openCardDetail);
  const createCard = useDataStore((s) => s.createCard);
  const cards = useDataStore((s) => s.cards);
  const collections = useDataStore((s) => s.collections);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  // Debounce search query
  const debouncedQuery = useDebounce(quickNoteText, 150);
  const isOnTagsPage = pathname === '/tags';

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxTextareaHeight = 160;
      const actualHeight = Math.min(scrollHeight, maxTextareaHeight);
      textareaRef.current.style.height = `${actualHeight}px`;
      setTextareaHeight(actualHeight);
      textareaRef.current.style.overflowY = scrollHeight > maxTextareaHeight ? 'auto' : 'hidden';
    }
  }, [quickNoteText]);

  // Focus textarea when entering quick note mode
  useEffect(() => {
    if (isQuickNoteMode && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isQuickNoteMode]);

  // Auto-collapse on scroll
  useEffect(() => {
    if (!forceExpanded) return;

    const handleScroll = () => {
      const isFocused = document.activeElement === textareaRef.current;
      if (!quickNoteText.trim() && !isFocused) {
        resetSearch();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [forceExpanded, quickNoteText]);

  // Auto-collapse after 5 seconds of inactivity
  useEffect(() => {
    if (!forceExpanded || quickNoteText.trim()) return;

    const timer = setTimeout(() => {
      const isFocused = document.activeElement === textareaRef.current;
      if (!quickNoteText.trim() && !isFocused) {
        resetSearch();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [forceExpanded, quickNoteText]);

  // Global click-outside handler
  useEffect(() => {
    if (!isQuickNoteMode || quickNoteText.trim()) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.omnibar-container')) return;
      if (target.closest('[role="menu"]')) return;

      resetSearch();
    };

    window.addEventListener('click', handleClickOutside, true);
    return () => window.removeEventListener('click', handleClickOutside, true);
  }, [isQuickNoteMode, quickNoteText]);

  // Global escape handler for closing
  useEffect(() => {
    if (!isQuickNoteMode || quickNoteText.trim() || showDiscardConfirm) return;

    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.activeElement === textareaRef.current) return;

      e.preventDefault();
      resetSearch();
    };

    window.addEventListener('keydown', handleGlobalEscape);
    return () => window.removeEventListener('keydown', handleGlobalEscape);
  }, [isQuickNoteMode, quickNoteText, showDiscardConfirm]);

  // Global escape handler for discard dialog
  useEffect(() => {
    if (!showDiscardConfirm) return;

    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        confirmDiscard();
      }
    };

    window.addEventListener('keydown', handleGlobalEscape);
    return () => window.removeEventListener('keydown', handleGlobalEscape);
  }, [showDiscardConfirm]);

  // ==========================================================================
  // SEARCH LOGIC
  // ==========================================================================

  const stripHtml = useCallback((html: string): string => {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }, []);

  const recentCards = useMemo(() => {
    return [...cards]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [cards]);

  // Search effect
  useEffect(() => {
    if (!isQuickNoteMode) {
      setSearchResults(null);
      setSelectedIndex(-1);
      return;
    }

    const query = debouncedQuery.trim();

    if (!query) {
      setSearchResults({
        cards: recentCards,
        collections: [],
        actions: [],
      });
      setSelectedIndex(-1);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const isCommandMode = query.startsWith('/');
    const isTagMode = query.startsWith('#');
    const isCollectionMode = query.startsWith('@');
    const searchQuery = isCommandMode || isTagMode || isCollectionMode
      ? query.slice(1).toLowerCase()
      : lowerQuery;

    let matchedCards: typeof cards = [];
    let matchedCollections: typeof collections = [];
    let matchedActions: typeof SEARCHABLE_ACTIONS = [];
    let matchedTags: string[] = [];

    if (isCommandMode) {
      matchedActions = SEARCHABLE_ACTIONS.filter(action =>
        action.label.toLowerCase().includes(searchQuery) ||
        action.keywords.some(kw => kw.includes(searchQuery))
      ).slice(0, 5);
    } else if (isTagMode) {
      const allTags = [...new Set(cards.flatMap(c => c.tags || []))];
      matchedTags = allTags.filter(t => t.toLowerCase().includes(searchQuery)).slice(0, 5);

      if (matchedTags.length > 0) {
        matchedCards = cards.filter(card =>
          card.tags?.some(t => matchedTags.includes(t))
        ).slice(0, 5);
      }
    } else if (isCollectionMode) {
      matchedCollections = collections.filter(col =>
        col.name.toLowerCase().includes(searchQuery)
      ).slice(0, 5);
    } else {
      matchedCards = cards.filter(card => {
        if (card.title?.toLowerCase().includes(lowerQuery)) return true;
        if (card.domain?.toLowerCase().includes(lowerQuery)) return true;
        if (card.tags?.some(t => t.toLowerCase().includes(lowerQuery))) return true;

        if (card.type === 'md-note' || card.type === 'text-note' || card.type === 'quick-note') {
          const plainText = stripHtml(card.content || '');
          if (plainText.toLowerCase().includes(lowerQuery)) return true;
        }

        return false;
      }).slice(0, 5);

      matchedCollections = collections.filter(col =>
        col.name.toLowerCase().includes(lowerQuery)
      ).slice(0, 3);

      matchedActions = SEARCHABLE_ACTIONS.filter(action =>
        action.label.toLowerCase().includes(lowerQuery) ||
        action.keywords.some(kw => kw.includes(lowerQuery))
      ).slice(0, 3);
    }

    setSearchResults({
      cards: matchedCards,
      collections: matchedCollections,
      actions: matchedActions,
      tags: matchedTags,
    });
    setSelectedIndex(-1);
  }, [debouncedQuery, isQuickNoteMode, cards, collections, recentCards, stripHtml]);

  // Context-aware filtering for /tags page
  useEffect(() => {
    if (!isOnTagsPage || !isQuickNoteMode) return;

    const query = debouncedQuery.trim();
    if (query.startsWith('/') || query.startsWith('#') || query.startsWith('@')) return;

    if (query) {
      router.replace(`/tags?q=${encodeURIComponent(query)}`, { scroll: false });
    } else {
      router.replace('/tags', { scroll: false });
    }
  }, [debouncedQuery, isOnTagsPage, isQuickNoteMode, router]);

  const totalResultsCount = useMemo(() => {
    if (!searchResults) return 0;
    return (
      searchResults.cards.length +
      searchResults.collections.length +
      searchResults.actions.length +
      (searchResults.tags?.length || 0)
    );
  }, [searchResults]);

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const executeAction = useCallback((actionStr: string) => {
    if (actionStr.startsWith('navigate:')) {
      router.push(actionStr.replace('navigate:', ''));
    } else if (actionStr === 'toggle-theme') {
      document.documentElement.classList.toggle('light');
    } else if (actionStr === 'toggle-sidebar') {
      toggleLeftSidebar();
    } else if (actionStr === 'note') {
      openAddCard('note');
    } else if (actionStr === 'bookmark') {
      openAddCard('bookmark');
    } else if (actionStr === 'create-pawkit') {
      console.log('Create pawkit');
    }
  }, [router, toggleLeftSidebar, openAddCard]);

  const resetSearch = useCallback(() => {
    isDiscardingRef.current = true;
    setQuickNoteText('');
    setIsQuickNoteMode(false);
    setSearchResults(null);
    setForceExpanded(false);
    setSelectedIndex(-1);
    setShowDiscardConfirm(false);
    setTextareaHeight(0);
    textareaRef.current?.blur();
    setTimeout(() => { isDiscardingRef.current = false; }, 0);
  }, []);

  const executeResult = useCallback((index: number) => {
    if (!searchResults || index < 0) return;

    let currentIdx = 0;

    if (index < currentIdx + searchResults.cards.length) {
      const card = searchResults.cards[index - currentIdx];
      openCardDetail(card.id);
      resetSearch();
      return;
    }
    currentIdx += searchResults.cards.length;

    if (index < currentIdx + searchResults.collections.length) {
      const collection = searchResults.collections[index - currentIdx];
      router.push(`/pawkits/${collection.slug}`);
      resetSearch();
      return;
    }
    currentIdx += searchResults.collections.length;

    if (searchResults.tags && index < currentIdx + searchResults.tags.length) {
      const tag = searchResults.tags[index - currentIdx];
      router.push(`/library?tag=${encodeURIComponent(tag)}`);
      resetSearch();
      return;
    }
    currentIdx += searchResults.tags?.length || 0;

    if (index < currentIdx + searchResults.actions.length) {
      const action = searchResults.actions[index - currentIdx];
      executeAction(action.action);
      resetSearch();
      return;
    }
  }, [searchResults, openCardDetail, router, executeAction, resetSearch]);

  // ==========================================================================
  // URL HELPERS
  // ==========================================================================

  const isUrl = useCallback((text: string): boolean => {
    const trimmed = text.trim();
    return /^(https?:\/\/|www\.)/i.test(trimmed) ||
           /^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(\/|$)/i.test(trimmed);
  }, []);

  const normalizeUrlFn = useCallback((text: string): string => {
    const trimmed = text.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
    return `https://${trimmed}`;
  }, []);

  // ==========================================================================
  // SAVE QUICK NOTE
  // ==========================================================================

  const saveQuickNote = useCallback(async () => {
    if (!quickNoteText.trim() || !currentWorkspace) return;

    const trimmedText = quickNoteText.trim();

    try {
      if (isUrl(trimmedText)) {
        const url = normalizeUrlFn(trimmedText);
        const normalizedInput = normalizeUrl(url);

        const existingCard = cards.find((card) => {
          if (card._deleted) return false;
          if (card.type !== 'url') return false;
          if (!card.url) return false;
          return normalizeUrl(card.url) === normalizedInput;
        });

        if (existingCard) {
          toast({
            type: 'warning',
            message: 'This URL is already saved',
            action: {
              label: 'View existing',
              onClick: () => openCardDetail(existingCard.id),
            },
          });
          return;
        }

        await createCard({
          workspaceId: currentWorkspace.id,
          type: 'url',
          url: url,
          title: '',
          content: '',
          tags: [],
          collections: [],
          pinned: false,
          isFileCard: false,
          status: 'PENDING',
        });

        resetSearch();
        toast({ type: 'success', message: 'Bookmark added' });
        return;
      }

      await createCard({
        workspaceId: currentWorkspace.id,
        type: 'quick-note',
        url: '',
        title: trimmedText.slice(0, 50) + (trimmedText.length > 50 ? '...' : ''),
        content: `<p>${trimmedText.replace(/\n/g, '</p><p>')}</p>`,
        tags: [],
        collections: [],
        pinned: false,
        isFileCard: false,
        status: 'READY',
      });

      resetSearch();
      toast({ type: 'success', message: 'Quick note saved' });
    } catch (error) {
      console.error('Failed to save:', error);
      toast({ type: 'error', message: 'Failed to save' });
    }
  }, [quickNoteText, currentWorkspace, createCard, toast, isUrl, normalizeUrlFn, cards, openCardDetail, resetSearch]);

  // ==========================================================================
  // KEYBOARD HANDLERS
  // ==========================================================================

  const handleQuickNoteKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (totalResultsCount > 0) {
        setSelectedIndex(prev => prev < totalResultsCount - 1 ? prev + 1 : prev);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (selectedIndex >= 0 && totalResultsCount > 0) {
        executeResult(selectedIndex);
      } else if (isOnTagsPage) {
        resetSearch();
      } else if (quickNoteText.trim() && !quickNoteText.startsWith('/') && !quickNoteText.startsWith('#') && !quickNoteText.startsWith('@')) {
        saveQuickNote();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();

      if (isOnTagsPage) {
        resetSearch();
        return;
      }

      if (showDiscardConfirm) {
        confirmDiscard();
      } else if (quickNoteText.trim()) {
        setShowDiscardConfirm(true);
      } else {
        resetSearch();
      }
    }
  }, [quickNoteText, saveQuickNote, showDiscardConfirm, selectedIndex, totalResultsCount, executeResult, isOnTagsPage, resetSearch]);

  const handleQuickNoteBlur = useCallback((e: React.FocusEvent) => {
    if (isDiscardingRef.current) return;

    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget?.closest('.omnibar-container')) return;

    if (isOnTagsPage) {
      resetSearch();
      return;
    }

    if (quickNoteText.trim()) {
      setShowDiscardConfirm(true);
    } else {
      resetSearch();
    }
  }, [quickNoteText, isOnTagsPage, resetSearch]);

  const confirmDiscard = useCallback(() => {
    resetSearch();
  }, [resetSearch]);

  const cancelDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
    textareaRef.current?.focus();
  }, []);

  const openSearch = useCallback(() => {
    onModeChange?.();
    setForceExpanded(true);
    setIsQuickNoteMode(true);
    setTimeout(() => textareaRef.current?.focus(), 300);
  }, [onModeChange]);

  const closeSearch = useCallback(() => {
    resetSearch();
  }, [resetSearch]);

  return {
    // State
    quickNoteText,
    isQuickNoteMode,
    showDiscardConfirm,
    forceExpanded,
    selectedIndex,
    searchResults,
    textareaRef,
    textareaHeight,
    isOnTagsPage,

    // Actions
    setQuickNoteText,
    setIsQuickNoteMode,
    openSearch,
    closeSearch,
    resetSearch,
    handleQuickNoteKeyDown,
    handleQuickNoteBlur,
    saveQuickNote,
    executeResult,
    confirmDiscard,
    cancelDiscard,
  };
}

/**
 * Calculate height for search/quick note mode
 */
export function getSearchHeight(
  isQuickNoteMode: boolean,
  quickNoteText: string,
  textareaHeight: number,
  searchResults: SearchResults | null,
  isOnTagsPage: boolean
): number {
  if (!isQuickNoteMode) return 48;

  const hasTypedContent = quickNoteText.length > 0;
  const isPrefixCommand = quickNoteText.startsWith('/') || quickNoteText.startsWith('#') || quickNoteText.startsWith('@');

  let height = 48;

  if (textareaHeight > 28) {
    height += textareaHeight - 28;
  }

  if (isOnTagsPage && hasTypedContent && !isPrefixCommand) {
    height += 36;
    return Math.min(Math.max(48, height), 600);
  }

  if (hasTypedContent && !isPrefixCommand) {
    height += 40;
  }

  if (searchResults && isQuickNoteMode) {
    const { cards, collections, actions, tags } = searchResults;
    const itemHeight = 44;
    const headerHeight = 28;
    const tipsHeight = 48;

    let sectionsWithItems = 0;
    let totalItems = 0;

    if (cards.length > 0) { sectionsWithItems++; totalItems += cards.length; }
    if (collections.length > 0) { sectionsWithItems++; totalItems += collections.length; }
    if (tags && tags.length > 0) { sectionsWithItems++; totalItems += tags.length; }
    if (actions.length > 0) { sectionsWithItems++; totalItems += actions.length; }

    if (totalItems > 0) {
      height += 16;
      height += (sectionsWithItems * headerHeight) + (totalItems * itemHeight);
    }

    if (!hasTypedContent && cards.length > 0) {
      height += tipsHeight;
    }
  }

  return Math.min(Math.max(48, height), 600);
}
