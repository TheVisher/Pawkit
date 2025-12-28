'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useToastStore } from '@/lib/stores/toast-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { useDataStore } from '@/lib/stores/data-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { SEARCHABLE_ACTIONS, addMenuItems, type SearchResults } from './types';
import { normalizeUrl } from '@/lib/utils/url-normalizer';

export function useOmnibar(isCompact: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [addModeSelectedIndex, setAddModeSelectedIndex] = useState(-1);
  const [isKitMode, setIsKitMode] = useState(false);
  const [kitModeSelectedIndex, setKitModeSelectedIndex] = useState(-1);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [isQuickNoteMode, setIsQuickNoteMode] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [forceExpanded, setForceExpanded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [textareaHeight, setTextareaHeight] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDiscardingRef = useRef(false);

  // Effective compact state
  const effectivelyCompact = isCompact && !forceExpanded && !isQuickNoteMode && !isAddMode && !isKitMode;

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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-resize textarea and track height
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
        setForceExpanded(false);
        setIsQuickNoteMode(false);
        setSearchResults(null);
        setSelectedIndex(-1);
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
        setForceExpanded(false);
        setIsQuickNoteMode(false);
        setSearchResults(null);
        setSelectedIndex(-1);
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

      setIsQuickNoteMode(false);
      setForceExpanded(false);
      setSearchResults(null);
      setSelectedIndex(-1);
    };

    window.addEventListener('click', handleClickOutside, true);
    return () => window.removeEventListener('click', handleClickOutside, true);
  }, [isQuickNoteMode, quickNoteText]);

  // Click-outside handler for add mode
  useEffect(() => {
    if (!isAddMode) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.omnibar-container')) return;

      setIsAddMode(false);
      setAddModeSelectedIndex(-1);
    };

    window.addEventListener('click', handleClickOutside, true);
    return () => window.removeEventListener('click', handleClickOutside, true);
  }, [isAddMode]);

  // Escape handler for add mode
  useEffect(() => {
    if (!isAddMode) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsAddMode(false);
        setAddModeSelectedIndex(-1);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isAddMode]);

  // ==========================================================================
  // KIT MODE CLICK-OUTSIDE & ESCAPE HANDLERS
  // ==========================================================================

  // Click-outside handler for kit mode
  useEffect(() => {
    if (!isKitMode) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.omnibar-container')) return;

      setIsKitMode(false);
      setKitModeSelectedIndex(-1);
    };

    window.addEventListener('click', handleClickOutside, true);
    return () => window.removeEventListener('click', handleClickOutside, true);
  }, [isKitMode]);

  // Escape handler for kit mode
  useEffect(() => {
    if (!isKitMode) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsKitMode(false);
        setKitModeSelectedIndex(-1);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isKitMode]);

  // Global escape handler for closing omnibar
  useEffect(() => {
    if (!isQuickNoteMode || quickNoteText.trim() || showDiscardConfirm) return;

    const handleGlobalEscapeForClose = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.activeElement === textareaRef.current) return;

      e.preventDefault();
      setIsQuickNoteMode(false);
      setForceExpanded(false);
      setSearchResults(null);
      setSelectedIndex(-1);
    };

    window.addEventListener('keydown', handleGlobalEscapeForClose);
    return () => window.removeEventListener('keydown', handleGlobalEscapeForClose);
  }, [isQuickNoteMode, quickNoteText, showDiscardConfirm]);

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
  // When on /tags and typing, update URL with query param for filtering
  const isOnTagsPage = pathname === '/tags';

  useEffect(() => {
    if (!isOnTagsPage || !isQuickNoteMode) return;

    const query = debouncedQuery.trim();

    // Skip if it's a command prefix
    if (query.startsWith('/') || query.startsWith('#') || query.startsWith('@')) return;

    // Update URL with filter query
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
      const path = actionStr.replace('navigate:', '');
      router.push(path);
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

  const executeResult = useCallback((index: number) => {
    if (!searchResults || index < 0) return;

    const resetAndBlur = () => {
      isDiscardingRef.current = true;
      setQuickNoteText('');
      setIsQuickNoteMode(false);
      setSearchResults(null);
      setForceExpanded(false);
      textareaRef.current?.blur();
      setTimeout(() => { isDiscardingRef.current = false; }, 0);
    };

    let currentIdx = 0;

    if (index < currentIdx + searchResults.cards.length) {
      const card = searchResults.cards[index - currentIdx];
      openCardDetail(card.id);
      resetAndBlur();
      return;
    }
    currentIdx += searchResults.cards.length;

    if (index < currentIdx + searchResults.collections.length) {
      const collection = searchResults.collections[index - currentIdx];
      router.push(`/pawkits/${collection.slug}`);
      resetAndBlur();
      return;
    }
    currentIdx += searchResults.collections.length;

    if (searchResults.tags && index < currentIdx + searchResults.tags.length) {
      const tag = searchResults.tags[index - currentIdx];
      router.push(`/library?tag=${encodeURIComponent(tag)}`);
      resetAndBlur();
      return;
    }
    currentIdx += searchResults.tags?.length || 0;

    if (index < currentIdx + searchResults.actions.length) {
      const action = searchResults.actions[index - currentIdx];
      executeAction(action.action);
      resetAndBlur();
      return;
    }
  }, [searchResults, openCardDetail, router, executeAction]);

  // ==========================================================================
  // HEIGHT CALCULATION
  // ==========================================================================

  const getExpandedHeight = useCallback(() => {
    if (!isQuickNoteMode) return 48;

    const hasTypedContent = quickNoteText.length > 0;
    const isPrefixCommand = quickNoteText.startsWith('/') || quickNoteText.startsWith('#') || quickNoteText.startsWith('@');

    let height = 48;

    if (textareaHeight > 28) {
      height += textareaHeight - 28;
    }

    // On tags page, show a simpler UI with just "Filtering tags..." text
    if (isOnTagsPage && hasTypedContent && !isPrefixCommand) {
      height += 36; // Just enough for "Filtering tags..." text
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

      if (cards.length > 0) {
        sectionsWithItems++;
        totalItems += cards.length;
      }
      if (collections.length > 0) {
        sectionsWithItems++;
        totalItems += collections.length;
      }
      if (tags && tags.length > 0) {
        sectionsWithItems++;
        totalItems += tags.length;
      }
      if (actions.length > 0) {
        sectionsWithItems++;
        totalItems += actions.length;
      }

      if (totalItems > 0) {
        height += 16;
        height += (sectionsWithItems * headerHeight) + (totalItems * itemHeight);
      }

      if (!hasTypedContent && cards.length > 0) {
        height += tipsHeight;
      }
    }

    return Math.min(Math.max(48, height), 600);
  }, [isQuickNoteMode, quickNoteText, textareaHeight, searchResults, isOnTagsPage]);

  // ==========================================================================
  // ADD MODE HEIGHT CALCULATION
  // ==========================================================================

  const getAddModeHeight = useCallback(() => {
    if (!isAddMode) return 48;

    const baseHeight = 48;
    const headerHeight = 28;
    const itemHeight = 44;
    const itemCount = addMenuItems.length;

    // Base + header + items + padding
    return baseHeight + 16 + headerHeight + (itemCount * itemHeight);
  }, [isAddMode]);

  // ==========================================================================
  // KIT MODE HEIGHT CALCULATION
  // ==========================================================================

  // Kit menu items - placeholder for now, will be replaced with actual chat history
  const kitMenuItems = [
    { id: 'new-chat', label: 'New Chat', icon: 'plus' },
    { id: 'recent-1', label: 'How do I organize my bookmarks?', icon: 'message' },
    { id: 'recent-2', label: 'Summarize my saved articles', icon: 'message' },
    { id: 'recent-3', label: 'Find recipes I saved last week', icon: 'message' },
  ];

  const getKitModeHeight = useCallback(() => {
    if (!isKitMode) return 48;

    const baseHeight = 48;
    const headerHeight = 28;
    const itemHeight = 44;
    const itemCount = kitMenuItems.length;

    // Base + header + items + padding
    return baseHeight + 16 + headerHeight + (itemCount * itemHeight);
  }, [isKitMode, kitMenuItems.length]);

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

        // Check for duplicate URL
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

        setQuickNoteText('');
        setIsQuickNoteMode(false);
        setTextareaHeight(0);
        setForceExpanded(false);

        toast({
          type: 'success',
          message: 'Bookmark added',
        });
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

      setQuickNoteText('');
      setIsQuickNoteMode(false);
      setTextareaHeight(0);
      setForceExpanded(false);

      toast({
        type: 'success',
        message: 'Quick note saved',
      });
    } catch (error) {
      console.error('Failed to save:', error);
      toast({
        type: 'error',
        message: 'Failed to save',
      });
    }
  }, [quickNoteText, currentWorkspace, createCard, toast, isUrl, normalizeUrlFn, cards, openCardDetail]);

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
        // On tags page, Enter just closes - filter is already in URL
        isDiscardingRef.current = true;
        setIsQuickNoteMode(false);
        setQuickNoteText('');
        setForceExpanded(false);
        setSearchResults(null);
        setSelectedIndex(-1);
        (e.target as HTMLTextAreaElement)?.blur();
        setTimeout(() => { isDiscardingRef.current = false; }, 0);
      } else if (quickNoteText.trim() && !quickNoteText.startsWith('/') && !quickNoteText.startsWith('#') && !quickNoteText.startsWith('@')) {
        saveQuickNote();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();

      // On tags page, just close without discard confirm
      if (isOnTagsPage) {
        isDiscardingRef.current = true;
        setIsQuickNoteMode(false);
        setQuickNoteText('');
        setForceExpanded(false);
        setSearchResults(null);
        setSelectedIndex(-1);
        (e.target as HTMLTextAreaElement)?.blur();
        setTimeout(() => { isDiscardingRef.current = false; }, 0);
        return;
      }

      if (showDiscardConfirm) {
        isDiscardingRef.current = true;
        setQuickNoteText('');
        setIsQuickNoteMode(false);
        setShowDiscardConfirm(false);
        setTextareaHeight(0);
        setForceExpanded(false);
        setSearchResults(null);
        setSelectedIndex(-1);
        (e.target as HTMLTextAreaElement)?.blur();
        setTimeout(() => { isDiscardingRef.current = false; }, 0);
      } else if (quickNoteText.trim()) {
        setShowDiscardConfirm(true);
      } else {
        isDiscardingRef.current = true;
        setIsQuickNoteMode(false);
        setQuickNoteText('');
        setForceExpanded(false);
        setSearchResults(null);
        setSelectedIndex(-1);
        (e.target as HTMLTextAreaElement)?.blur();
        setTimeout(() => { isDiscardingRef.current = false; }, 0);
      }
    }
  }, [quickNoteText, saveQuickNote, showDiscardConfirm, selectedIndex, totalResultsCount, executeResult, isOnTagsPage]);

  const handleQuickNoteBlur = useCallback((e: React.FocusEvent) => {
    if (isDiscardingRef.current) return;

    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget?.closest('.omnibar-container')) return;

    // On tags page, don't show discard - just close (filter stays in URL)
    if (isOnTagsPage) {
      setIsQuickNoteMode(false);
      setForceExpanded(false);
      setSearchResults(null);
      setSelectedIndex(-1);
      setQuickNoteText('');
      return;
    }

    if (quickNoteText.trim()) {
      setShowDiscardConfirm(true);
    } else {
      setIsQuickNoteMode(false);
      setForceExpanded(false);
      setSearchResults(null);
      setSelectedIndex(-1);
    }
  }, [quickNoteText, isOnTagsPage]);

  const confirmDiscard = useCallback(() => {
    isDiscardingRef.current = true;
    setQuickNoteText('');
    setIsQuickNoteMode(false);
    setShowDiscardConfirm(false);
    setTextareaHeight(0);
    setForceExpanded(false);
    textareaRef.current?.blur();
    setTimeout(() => { isDiscardingRef.current = false; }, 0);
  }, []);

  const cancelDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
    textareaRef.current?.focus();
  }, []);

  // Global escape handler for discard dialog
  useEffect(() => {
    if (!showDiscardConfirm) return;

    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        isDiscardingRef.current = true;
        setQuickNoteText('');
        setIsQuickNoteMode(false);
        setShowDiscardConfirm(false);
        setTextareaHeight(0);
        setForceExpanded(false);
        textareaRef.current?.blur();
        setTimeout(() => { isDiscardingRef.current = false; }, 0);
      }
    };

    window.addEventListener('keydown', handleGlobalEscape);
    return () => window.removeEventListener('keydown', handleGlobalEscape);
  }, [showDiscardConfirm]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setForceExpanded(true);
        setIsQuickNoteMode(true);
        setTimeout(() => textareaRef.current?.focus(), 300);
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
  }, [openAddCard]);

  // Global paste event for quick bookmarking
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

      setForceExpanded(true);
      setIsQuickNoteMode(true);
      setQuickNoteText(text.trim());

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = textareaRef.current.value.length;
          textareaRef.current.selectionEnd = textareaRef.current.value.length;
        }
      }, 300);
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  // ==========================================================================
  // ADD MODE HANDLERS
  // ==========================================================================

  const handleToggleAddMode = useCallback(() => {
    if (isAddMode) {
      setIsAddMode(false);
      setAddModeSelectedIndex(-1);
    } else {
      // Close other modes if open
      setIsQuickNoteMode(false);
      setForceExpanded(false);
      setSearchResults(null);
      setSelectedIndex(-1);
      setIsKitMode(false);
      setKitModeSelectedIndex(-1);
      setIsAddMode(true);
      setAddModeSelectedIndex(-1);
    }
  }, [isAddMode]);

  const handleAddModeKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isAddMode) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAddModeSelectedIndex(prev =>
        prev < addMenuItems.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAddModeSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && addModeSelectedIndex >= 0) {
      e.preventDefault();
      const item = addMenuItems[addModeSelectedIndex];
      if (item) {
        handleAddModeAction(item.action);
      }
    }
  }, [isAddMode, addModeSelectedIndex]);

  // Add mode keyboard listener
  useEffect(() => {
    if (!isAddMode) return;
    window.addEventListener('keydown', handleAddModeKeyDown);
    return () => window.removeEventListener('keydown', handleAddModeKeyDown);
  }, [isAddMode, handleAddModeKeyDown]);

  const handleAddModeAction = useCallback((action: string) => {
    switch (action) {
      case 'bookmark':
        openAddCard('bookmark');
        break;
      case 'note':
      case 'quick-note':
        openAddCard('note');
        break;
      case 'upload':
        console.log('Upload action - coming soon');
        break;
      case 'event':
        console.log('Event action - coming soon');
        break;
      case 'tag':
        router.push('/tags?create=true');
        break;
      default:
        console.log('Unknown action:', action);
    }
    // Close add mode after action
    setIsAddMode(false);
    setAddModeSelectedIndex(-1);
  }, [openAddCard, router]);

  // ==========================================================================
  // KIT MODE HANDLERS
  // ==========================================================================

  const handleToggleKitMode = useCallback(() => {
    if (isKitMode) {
      setIsKitMode(false);
      setKitModeSelectedIndex(-1);
    } else {
      // Close other modes if open
      setIsQuickNoteMode(false);
      setForceExpanded(false);
      setSearchResults(null);
      setSelectedIndex(-1);
      setIsAddMode(false);
      setAddModeSelectedIndex(-1);
      setIsKitMode(true);
      setKitModeSelectedIndex(-1);
    }
  }, [isKitMode]);

  const handleKitModeKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isKitMode) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setKitModeSelectedIndex(prev =>
        prev < kitMenuItems.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setKitModeSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && kitModeSelectedIndex >= 0) {
      e.preventDefault();
      const item = kitMenuItems[kitModeSelectedIndex];
      if (item) {
        handleKitModeAction(item.id);
      }
    }
  }, [isKitMode, kitModeSelectedIndex, kitMenuItems]);

  // Kit mode keyboard listener
  useEffect(() => {
    if (!isKitMode) return;
    window.addEventListener('keydown', handleKitModeKeyDown);
    return () => window.removeEventListener('keydown', handleKitModeKeyDown);
  }, [isKitMode, handleKitModeKeyDown]);

  const handleKitModeAction = useCallback((actionId: string) => {
    switch (actionId) {
      case 'new-chat':
        console.log('Starting new Kit chat - coming soon');
        break;
      default:
        // Recent chat clicked
        console.log('Opening chat:', actionId, '- coming soon');
    }
    // Close kit mode after action
    setIsKitMode(false);
    setKitModeSelectedIndex(-1);
  }, []);

  // ==========================================================================
  // UI HANDLERS
  // ==========================================================================

  const handleSearchClick = useCallback(() => {
    // Close add mode and kit mode if open
    setIsAddMode(false);
    setAddModeSelectedIndex(-1);
    setIsKitMode(false);
    setKitModeSelectedIndex(-1);
    setForceExpanded(true);
    setIsQuickNoteMode(true);
    setTimeout(() => textareaRef.current?.focus(), 300);
  }, []);

  const handleForceExpand = useCallback(() => {
    // Close add mode and kit mode if open
    setIsAddMode(false);
    setAddModeSelectedIndex(-1);
    setIsKitMode(false);
    setKitModeSelectedIndex(-1);
    setForceExpanded(true);
    setIsQuickNoteMode(true);
    setTimeout(() => textareaRef.current?.focus(), 300);
  }, []);

  const handleAddAction = useCallback((action: string) => {
    switch (action) {
      case 'bookmark':
        openAddCard('bookmark');
        break;
      case 'note':
      case 'quick-note':
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

  // Calculate the appropriate height based on current mode
  const getComputedHeight = () => {
    if (isAddMode) return getAddModeHeight();
    if (isKitMode) return getKitModeHeight();
    return getExpandedHeight();
  };

  return {
    // State
    mounted,
    isAddMenuOpen,
    setIsAddMenuOpen,
    quickNoteText,
    setQuickNoteText,
    isQuickNoteMode,
    setIsQuickNoteMode,
    showDiscardConfirm,
    forceExpanded,
    selectedIndex,
    searchResults,
    textareaRef,
    effectivelyCompact,

    // Add Mode State
    isAddMode,
    addModeSelectedIndex,

    // Kit Mode State
    isKitMode,
    kitModeSelectedIndex,
    kitMenuItems,

    // Context awareness
    isOnTagsPage,

    // Computed
    expandedHeight: getComputedHeight(),

    // Handlers
    handleSearchClick,
    handleForceExpand,
    handleAddAction,
    handleQuickNoteKeyDown,
    handleQuickNoteBlur,
    saveQuickNote,
    executeResult,
    confirmDiscard,
    cancelDiscard,

    // Add Mode Handlers
    handleToggleAddMode,
    handleAddModeAction,

    // Kit Mode Handlers
    handleToggleKitMode,
    handleKitModeAction,
  };
}
