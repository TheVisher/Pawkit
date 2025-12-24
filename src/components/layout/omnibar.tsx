'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  X,
  Link2,
  FileText,
  StickyNote,
  Upload,
  Calendar,
  MessageCircle,
  Globe,
  FolderPlus,
  Home,
  Library,
  Moon,
  PanelLeft,
  Hash,
  Folder,
} from 'lucide-react';
import { useActiveToast, useIsEjecting, useToastStore, type ToastType } from '@/lib/stores/toast-store';
import { useCommandPalette, useUIStore } from '@/lib/stores/ui-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { useDataStore } from '@/lib/stores/data-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { cn } from '@/lib/utils';
import type { LocalCard, LocalCollection } from '@/lib/db';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// =============================================================================
// TYPES
// =============================================================================

interface SearchableAction {
  id: string;
  label: string;
  icon: typeof FileText;
  shortcut?: string;
  keywords: string[];
  action: string;
}

interface SearchResults {
  cards: LocalCard[];
  collections: LocalCollection[];
  actions: SearchableAction[];
  tags?: string[];
}

// =============================================================================
// SEARCHABLE ACTIONS
// =============================================================================

const SEARCHABLE_ACTIONS: SearchableAction[] = [
  // Creation
  { id: 'new-note', label: 'New Note', icon: FileText, shortcut: '⌘⇧N',
    keywords: ['create', 'note', 'markdown', 'write', 'new'], action: 'note' },
  { id: 'new-bookmark', label: 'New Bookmark', icon: Link2, shortcut: '⌘⇧B',
    keywords: ['create', 'bookmark', 'url', 'link', 'save', 'new'], action: 'bookmark' },
  { id: 'new-collection', label: 'New Pawkit', icon: FolderPlus,
    keywords: ['create', 'collection', 'pawkit', 'folder', 'organize', 'new'], action: 'create-pawkit' },

  // Navigation - include route names as keywords for direct /command access
  { id: 'goto-library', label: 'Go to Library', icon: Library,
    keywords: ['library', 'view', 'all', 'cards', 'browse', 'bookmarks', 'notes'], action: 'navigate:/library' },
  { id: 'goto-calendar', label: 'Go to Calendar', icon: Calendar,
    keywords: ['calendar', 'view', 'schedule', 'events', 'date', 'dates'], action: 'navigate:/calendar' },
  { id: 'goto-home', label: 'Go to Home', icon: Home,
    keywords: ['home', 'view', 'dashboard', 'main', 'start'], action: 'navigate:/home' },
  { id: 'goto-pawkits', label: 'Go to Pawkits', icon: Folder,
    keywords: ['pawkits', 'collections', 'folders', 'organize'], action: 'navigate:/pawkits' },

  // Settings/UI
  { id: 'toggle-theme', label: 'Toggle Theme', icon: Moon,
    keywords: ['theme', 'dark', 'light', 'mode', 'color', 'appearance'], action: 'toggle-theme' },
  { id: 'toggle-sidebar', label: 'Toggle Sidebar', icon: PanelLeft,
    keywords: ['sidebar', 'panel', 'hide', 'show', 'left', 'menu'], action: 'toggle-sidebar' },
];

interface OmnibarProps {
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

// Add menu items
const addMenuItems = [
  { icon: Link2, label: 'Add Bookmark', action: 'bookmark', shortcut: '⌘⇧B' },
  { icon: FileText, label: 'New Note', action: 'note', shortcut: '⌘⇧N' },
  { icon: StickyNote, label: 'Quick Note', action: 'quick-note' },
  { icon: Upload, label: 'Upload File', action: 'upload' },
  { icon: Calendar, label: 'New Event', action: 'event' },
];

export function Omnibar({ isCompact }: OmnibarProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [isQuickNoteMode, setIsQuickNoteMode] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [forceExpanded, setForceExpanded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDiscardingRef = useRef(false);

  // Effective compact state - can be overridden by forceExpanded or active quick note mode
  const effectivelyCompact = isCompact && !forceExpanded && !isQuickNoteMode;

  const activeToast = useActiveToast();
  const isEjecting = useIsEjecting();
  const dismissActiveToast = useToastStore((s) => s.dismissActiveToast);
  const toast = useToastStore((s) => s.toast);
  const { toggle: toggleCommandPalette } = useCommandPalette();
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

  // Track actual textarea height for omnibar expansion
  const [textareaHeight, setTextareaHeight] = useState(0);

  // Auto-resize textarea and track height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxTextareaHeight = 160; // Max height before scrolling
      const actualHeight = Math.min(scrollHeight, maxTextareaHeight);
      textareaRef.current.style.height = `${actualHeight}px`;
      setTextareaHeight(actualHeight);

      // Enable scrolling if content exceeds max
      textareaRef.current.style.overflowY = scrollHeight > maxTextareaHeight ? 'auto' : 'hidden';
    }
  }, [quickNoteText]);

  // Focus textarea when entering quick note mode
  useEffect(() => {
    if (isQuickNoteMode && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isQuickNoteMode]);

  // Auto-collapse on scroll when force expanded (if no content and not focused)
  useEffect(() => {
    if (!forceExpanded) return;

    const handleScroll = () => {
      // Only collapse if there's no content AND the textarea is not focused
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

  // Auto-collapse after 5 seconds of inactivity (if no content and not focused)
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

  // Global click-outside handler for closing omnibar
  // This catches clicks even before the textarea is focused (during animation)
  useEffect(() => {
    if (!isQuickNoteMode || quickNoteText.trim()) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking inside the omnibar
      if (target.closest('.omnibar-container')) return;
      // Don't close if clicking on a dropdown menu item
      if (target.closest('[role="menu"]')) return;

      // Close omnibar
      setIsQuickNoteMode(false);
      setForceExpanded(false);
      setSearchResults(null);
      setSelectedIndex(-1);
    };

    // Use capture phase to catch clicks before blur
    window.addEventListener('click', handleClickOutside, true);
    return () => window.removeEventListener('click', handleClickOutside, true);
  }, [isQuickNoteMode, quickNoteText]);

  // Global escape handler for closing omnibar when textarea not focused
  // This works even during animation before focus is established
  useEffect(() => {
    if (!isQuickNoteMode || quickNoteText.trim() || showDiscardConfirm) return;

    const handleGlobalEscapeForClose = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Only handle if textarea is not focused (textarea has its own handler)
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

  // Helper to strip HTML for content search
  const stripHtml = useCallback((html: string): string => {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }, []);

  // Get recent cards (for empty state)
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

    // Empty state - show recent items
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

    // Detect prefix mode
    const isCommandMode = query.startsWith('/');
    const isTagMode = query.startsWith('#');
    const isCollectionMode = query.startsWith('@');
    const searchQuery = isCommandMode || isTagMode || isCollectionMode
      ? query.slice(1).toLowerCase()
      : lowerQuery;

    let matchedCards: LocalCard[] = [];
    let matchedCollections: LocalCollection[] = [];
    let matchedActions: SearchableAction[] = [];
    let matchedTags: string[] = [];

    if (isCommandMode) {
      // Command mode: search actions only
      matchedActions = SEARCHABLE_ACTIONS.filter(action =>
        action.label.toLowerCase().includes(searchQuery) ||
        action.keywords.some(kw => kw.includes(searchQuery))
      ).slice(0, 5);
    } else if (isTagMode) {
      // Tag mode: search tags and show cards with matching tags
      const allTags = [...new Set(cards.flatMap(c => c.tags || []))];
      matchedTags = allTags.filter(t => t.toLowerCase().includes(searchQuery)).slice(0, 5);

      // Also show cards that have any of the matched tags
      if (matchedTags.length > 0) {
        matchedCards = cards.filter(card =>
          card.tags?.some(t => matchedTags.includes(t))
        ).slice(0, 5);
      }
    } else if (isCollectionMode) {
      // Collection mode: search collections only
      matchedCollections = collections.filter(col =>
        col.name.toLowerCase().includes(searchQuery)
      ).slice(0, 5);
    } else {
      // Default mode: search everything
      matchedCards = cards.filter(card => {
        if (card.title?.toLowerCase().includes(lowerQuery)) return true;
        if (card.domain?.toLowerCase().includes(lowerQuery)) return true;
        if (card.tags?.some(t => t.toLowerCase().includes(lowerQuery))) return true;

        // Search note content
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

  // Calculate total results count
  const totalResultsCount = useMemo(() => {
    if (!searchResults) return 0;
    return (
      searchResults.cards.length +
      searchResults.collections.length +
      searchResults.actions.length +
      (searchResults.tags?.length || 0)
    );
  }, [searchResults]);

  // Execute action by string
  const executeAction = useCallback((actionStr: string) => {
    if (actionStr.startsWith('navigate:')) {
      const path = actionStr.replace('navigate:', '');
      router.push(path);
    } else if (actionStr === 'toggle-theme') {
      // TODO: Implement theme toggle
      document.documentElement.classList.toggle('light');
    } else if (actionStr === 'toggle-sidebar') {
      toggleLeftSidebar();
    } else if (actionStr === 'note') {
      openAddCard('note');
    } else if (actionStr === 'bookmark') {
      openAddCard('bookmark');
    } else if (actionStr === 'create-pawkit') {
      // TODO: Implement create pawkit
      console.log('Create pawkit');
    }
  }, [router, toggleLeftSidebar, openAddCard]);

  // Execute selected result
  const executeResult = useCallback((index: number) => {
    if (!searchResults || index < 0) return;

    // Helper to reset state and blur
    const resetAndBlur = () => {
      // Set ref to prevent blur handler from showing discard confirm
      // (blur fires before React applies state updates, so quickNoteText would still have old value)
      isDiscardingRef.current = true;
      setQuickNoteText('');
      setIsQuickNoteMode(false);
      setSearchResults(null);
      setForceExpanded(false);
      textareaRef.current?.blur();
      setTimeout(() => { isDiscardingRef.current = false; }, 0);
    };

    let currentIdx = 0;

    // Cards
    if (index < currentIdx + searchResults.cards.length) {
      const card = searchResults.cards[index - currentIdx];
      openCardDetail(card.id);
      resetAndBlur();
      return;
    }
    currentIdx += searchResults.cards.length;

    // Collections
    if (index < currentIdx + searchResults.collections.length) {
      const collection = searchResults.collections[index - currentIdx];
      router.push(`/pawkits/${collection.slug}`);
      resetAndBlur();
      return;
    }
    currentIdx += searchResults.collections.length;

    // Tags - navigate to library with tag filter
    if (searchResults.tags && index < currentIdx + searchResults.tags.length) {
      const tag = searchResults.tags[index - currentIdx];
      router.push(`/library?tag=${encodeURIComponent(tag)}`);
      resetAndBlur();
      return;
    }
    currentIdx += searchResults.tags?.length || 0;

    // Actions
    if (index < currentIdx + searchResults.actions.length) {
      const action = searchResults.actions[index - currentIdx];
      executeAction(action.action);
      resetAndBlur();
      return;
    }
  }, [searchResults, openCardDetail, router, executeAction]);

  // Calculate expanded height based on actual textarea height and search results
  const getExpandedHeight = useCallback(() => {
    if (!isQuickNoteMode) return 48;

    const hasTypedContent = quickNoteText.length > 0;
    const isPrefixCommand = quickNoteText.startsWith('/') || quickNoteText.startsWith('#') || quickNoteText.startsWith('@');

    // Base: top padding + input row height
    let height = 48;

    // Add extra height for multi-line textarea content
    if (textareaHeight > 28) {
      height += textareaHeight - 28;
    }

    // Hints row shows when: has content AND not a prefix command
    // This matches the render condition: showHints = hasContent && !isSearchMode
    if (hasTypedContent && !isPrefixCommand) {
      height += 40; // hints row with padding and border
    }

    // Search results section
    if (searchResults && isQuickNoteMode) {
      const { cards, collections, actions, tags } = searchResults;
      const itemHeight = 44; // py-2 (8px each) + content (~28px)
      const headerHeight = 28; // py-1 + text + margin
      const tipsHeight = 48; // py-2 + border-t + mt-2

      // Count sections with items
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
        height += 16; // divider (mt-2 pt-2 border-t)
        height += (sectionsWithItems * headerHeight) + (totalItems * itemHeight);
      }

      // Tips row for empty state (when no query but focused)
      if (!hasTypedContent && cards.length > 0) {
        height += tipsHeight;
      }
    }

    // Cap max height - allow up to 600px before scrolling
    return Math.min(Math.max(48, height), 600);
  }, [isQuickNoteMode, quickNoteText, textareaHeight, searchResults]);

  // Helper to detect if text is a URL
  const isUrl = useCallback((text: string): boolean => {
    const trimmed = text.trim();
    // Check for common URL patterns
    return /^(https?:\/\/|www\.)/i.test(trimmed) ||
           /^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(\/|$)/i.test(trimmed);
  }, []);

  // Helper to normalize URL (add https:// if missing)
  const normalizeUrl = useCallback((text: string): string => {
    const trimmed = text.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
    return `https://${trimmed}`;
  }, []);

  const saveQuickNote = useCallback(async () => {
    if (!quickNoteText.trim() || !currentWorkspace) return;

    const trimmedText = quickNoteText.trim();

    try {
      // Check if it's a URL - create bookmark instead of quick note
      if (isUrl(trimmedText)) {
        const url = normalizeUrl(trimmedText);

        await createCard({
          workspaceId: currentWorkspace.id,
          type: 'url',
          url: url,
          title: '', // Will be fetched by scraper
          content: '',
          tags: [],
          collections: [],
          pinned: false,
          isFileCard: false,
          status: 'PENDING', // Pending scrape
        });

        // Reset state
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

      // Not a URL - create quick note
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

      // Reset state first so omnibar closes
      setQuickNoteText('');
      setIsQuickNoteMode(false);
      setTextareaHeight(0);
      setForceExpanded(false);

      // Show success toast
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
  }, [quickNoteText, currentWorkspace, createCard, toast, isUrl, normalizeUrl]);

  const handleQuickNoteKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Arrow down - navigate results
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (totalResultsCount > 0) {
        setSelectedIndex(prev => prev < totalResultsCount - 1 ? prev + 1 : prev);
      }
      return;
    }

    // Arrow up - navigate results
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
      return;
    }

    // Enter - execute selected or save quick note
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (selectedIndex >= 0 && totalResultsCount > 0) {
        // Execute selected result
        executeResult(selectedIndex);
      } else if (quickNoteText.trim() && !quickNoteText.startsWith('/') && !quickNoteText.startsWith('#') && !quickNoteText.startsWith('@')) {
        // Save as quick note (only if not using prefix commands)
        saveQuickNote();
      }
      return;
    }

    // Escape to cancel - double escape to force discard
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      // Also stop the native event from bubbling to window
      e.nativeEvent.stopImmediatePropagation();

      if (showDiscardConfirm) {
        // Second escape - confirm discard
        isDiscardingRef.current = true;
        setQuickNoteText('');
        setIsQuickNoteMode(false);
        setShowDiscardConfirm(false);
        setTextareaHeight(0);
        setForceExpanded(false);
        setSearchResults(null);
        setSelectedIndex(-1);
        // Blur to fully reset
        (e.target as HTMLTextAreaElement)?.blur();
        setTimeout(() => { isDiscardingRef.current = false; }, 0);
      } else if (quickNoteText.trim()) {
        // First escape with content - show confirmation
        setShowDiscardConfirm(true);
      } else {
        // No content - just close everything (including recents)
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
  }, [quickNoteText, saveQuickNote, showDiscardConfirm, selectedIndex, totalResultsCount, searchResults, executeResult]);

  const handleQuickNoteBlur = useCallback((e: React.FocusEvent) => {
    // Don't run blur logic if we're in the middle of discarding
    if (isDiscardingRef.current) return;

    // Don't close if clicking within the omnibar or on discard confirm
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget?.closest('.omnibar-container')) return;

    if (quickNoteText.trim()) {
      setShowDiscardConfirm(true);
    } else {
      // No content - close everything
      setIsQuickNoteMode(false);
      setForceExpanded(false);
      setSearchResults(null);
      setSelectedIndex(-1);
    }
  }, [quickNoteText]);

  const confirmDiscard = useCallback(() => {
    isDiscardingRef.current = true;
    setQuickNoteText('');
    setIsQuickNoteMode(false);
    setShowDiscardConfirm(false);
    setTextareaHeight(0);
    setForceExpanded(false);
    textareaRef.current?.blur();
    // Reset flag after blur event has fired
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
        // Second escape - confirm discard
        isDiscardingRef.current = true;
        setQuickNoteText('');
        setIsQuickNoteMode(false);
        setShowDiscardConfirm(false);
        setTextareaHeight(0);
        setForceExpanded(false);
        // Blur the textarea to fully reset
        textareaRef.current?.blur();
        setTimeout(() => { isDiscardingRef.current = false; }, 0);
      }
    };

    window.addEventListener('keydown', handleGlobalEscape);
    return () => window.removeEventListener('keydown', handleGlobalEscape);
  }, [showDiscardConfirm]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K to focus omnibar search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setForceExpanded(true);
        setIsQuickNoteMode(true);
        // Need 300ms+ to wait for AnimatePresence exit (200ms) + enter animation start
        setTimeout(() => textareaRef.current?.focus(), 300);
      }
      // ⌘⇧B to add bookmark
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'b') {
        e.preventDefault();
        openAddCard('bookmark');
      }
      // ⌘⇧N to add note
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'n') {
        e.preventDefault();
        openAddCard('note');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openAddCard]);

  // Global paste event for quick bookmarking
  // When not focused on an input, paste URL directly into omnibar
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Don't intercept if user is focused on an input/textarea/contenteditable
      const activeEl = document.activeElement;
      const isInputFocused = activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl as HTMLElement)?.isContentEditable;

      if (isInputFocused) return;

      // Get pasted text
      const text = e.clipboardData?.getData('text');
      if (!text) return;

      // Check if it's a URL
      const urlPattern = /^(https?:\/\/|www\.)|^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(\/|$)/i;
      if (!urlPattern.test(text.trim())) return;

      // It's a URL! Prevent default and paste into omnibar
      e.preventDefault();

      // Expand omnibar and set the URL
      setForceExpanded(true);
      setIsQuickNoteMode(true);
      setQuickNoteText(text.trim());

      // Focus the textarea after animation
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // Move cursor to end
          textareaRef.current.selectionStart = textareaRef.current.value.length;
          textareaRef.current.selectionEnd = textareaRef.current.value.length;
        }
      }, 300);
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const handleSearchClick = () => {
    setForceExpanded(true);
    setIsQuickNoteMode(true);
    // Need 300ms+ to wait for AnimatePresence exit (200ms) + enter animation start
    setTimeout(() => textareaRef.current?.focus(), 300);
  };

  const handleAddAction = (action: string) => {
    switch (action) {
      case 'bookmark':
        openAddCard('bookmark');
        break;
      case 'note':
      case 'quick-note':
        openAddCard('note');
        break;
      case 'upload':
        // TODO: Implement file upload
        console.log('Upload action - coming soon');
        break;
      case 'event':
        // TODO: Implement event creation
        console.log('Event action - coming soon');
        break;
      default:
        console.log('Unknown action:', action);
    }
    setIsAddMenuOpen(false);
  };

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="h-12 w-[400px] rounded-2xl bg-[var(--glass-panel-bg)] backdrop-blur-[var(--glass-blur)]" />
    );
  }

  const showToast = !!activeToast;
  const expandedHeight = getExpandedHeight();

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
          // Elastic "bounce" when ejecting a toast
          scaleY: isEjecting ? 1.04 : 1,
          scaleX: isEjecting ? 0.98 : 1,
        }}
        transition={{
          width: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
          height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
          // Elastic spring for the "push through" effect
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
              onForceExpand={() => {
                setForceExpanded(true);
                setIsQuickNoteMode(true);
                // Need 300ms+ to wait for AnimatePresence exit (200ms) + enter animation start
                setTimeout(() => textareaRef.current?.focus(), 300);
              }}
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

// =============================================================================
// IDLE CONTENT (Search/Actions)
// =============================================================================

interface IdleContentProps {
  isCompact: boolean;
  isAddMenuOpen: boolean;
  setIsAddMenuOpen: (open: boolean) => void;
  onSearchClick: () => void;
  onAddAction: (action: string) => void;
  isQuickNoteMode: boolean;
  setIsQuickNoteMode: (open: boolean) => void;
  quickNoteText: string;
  setQuickNoteText: (text: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onQuickNoteKeyDown: (e: React.KeyboardEvent) => void;
  onQuickNoteBlur: (e: React.FocusEvent) => void;
  onSaveQuickNote: () => void;
  onForceExpand: () => void;
  searchResults: SearchResults | null;
  selectedIndex: number;
  onSelectResult: (index: number) => void;
}

function IdleContent({
  isCompact,
  isAddMenuOpen,
  setIsAddMenuOpen,
  onSearchClick,
  onAddAction,
  isQuickNoteMode,
  setIsQuickNoteMode,
  quickNoteText,
  setQuickNoteText,
  textareaRef,
  onQuickNoteKeyDown,
  onQuickNoteBlur,
  onSaveQuickNote,
  onForceExpand,
  searchResults,
  selectedIndex,
  onSelectResult,
}: IdleContentProps) {
  const hasContent = quickNoteText.length > 0;

  // Check if search results are showing
  const hasSearchResults = searchResults && (
    searchResults.cards.length > 0 ||
    searchResults.collections.length > 0 ||
    (searchResults.tags?.length || 0) > 0 ||
    searchResults.actions.length > 0
  );
  const isExpanded = hasContent || (isQuickNoteMode && hasSearchResults);
  const showEmptyState = isQuickNoteMode && !hasContent && searchResults && searchResults.cards.length > 0;

  // Calculate index offsets for each section
  const getGlobalIndex = (section: 'cards' | 'collections' | 'tags' | 'actions', localIndex: number): number => {
    if (!searchResults) return -1;
    let offset = 0;
    if (section === 'cards') return offset + localIndex;
    offset += searchResults.cards.length;
    if (section === 'collections') return offset + localIndex;
    offset += searchResults.collections.length;
    if (section === 'tags') return offset + localIndex;
    offset += searchResults.tags?.length || 0;
    if (section === 'actions') return offset + localIndex;
    return -1;
  };

  const isSelected = (section: 'cards' | 'collections' | 'tags' | 'actions', localIndex: number): boolean => {
    return getGlobalIndex(section, localIndex) === selectedIndex;
  };

  return (
    <motion.div
      className="flex flex-col w-full h-full px-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* Top Row: Plus Button + Search + Chat
          Always uses items-start with pt-1, buttons get h-10 = centered in 48px baseline
          This ensures consistent positioning whether content expands or not */}
      <div className="flex w-full shrink-0 items-start pt-1">
        {/* Plus Button - h-10 (40px) + pt-1 (4px) = centered in 48px row */}
        <DropdownMenu open={isAddMenuOpen} onOpenChange={setIsAddMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center justify-center shrink-0',
                'w-10 h-10 rounded-xl',
                'text-text-muted hover:text-text-primary',
                'hover:bg-[var(--glass-bg)] active:bg-[var(--glass-bg-hover)]',
                'transition-colors duration-150'
              )}
            >
              <Plus className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-56"
          >
            {addMenuItems.map((item) => (
              <DropdownMenuItem
                key={item.action}
                onClick={() => onAddAction(item.action)}
                className="flex items-center gap-3 text-text-secondary hover:text-text-primary focus:bg-[var(--glass-bg)]"
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <kbd className="text-xs text-text-muted">{item.shortcut}</kbd>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <AnimatePresence mode="wait">
          {isCompact && !isQuickNoteMode ? (
            <CompactButtons key="compact" onSearchClick={onSearchClick} onForceExpand={onForceExpand} />
          ) : (
            <ExpandedContent
              key="expanded"
              onSearchClick={onSearchClick}
              isQuickNoteMode={isQuickNoteMode}
              setIsQuickNoteMode={setIsQuickNoteMode}
              quickNoteText={quickNoteText}
              setQuickNoteText={setQuickNoteText}
              textareaRef={textareaRef}
              onQuickNoteKeyDown={onQuickNoteKeyDown}
              onQuickNoteBlur={onQuickNoteBlur}
              onSaveQuickNote={onSaveQuickNote}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Search Results - Full Width */}
      {isQuickNoteMode && hasSearchResults && (
        <div className="flex-1 overflow-y-auto mt-2 border-t border-[var(--glass-border)] pt-2">
          {/* Cards Section */}
          {searchResults.cards.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1 text-[11px] font-medium text-text-muted uppercase tracking-wider">
                {showEmptyState ? 'Recent' : 'Cards'}
              </div>
              {searchResults.cards.map((card, idx) => (
                <button
                  key={card.id}
                  onClick={() => onSelectResult(getGlobalIndex('cards', idx))}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
                    'transition-colors duration-100',
                    isSelected('cards', idx)
                      ? 'bg-[var(--color-accent)]/20 text-text-primary'
                      : 'hover:bg-[var(--glass-bg)] text-text-secondary hover:text-text-primary'
                  )}
                >
                  {card.type === 'url' ? (
                    <Globe className="h-4 w-4 shrink-0 text-text-muted" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-text-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm">{card.title || 'Untitled'}</div>
                    {card.domain && (
                      <div className="text-xs text-text-muted truncate">{card.domain}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Collections Section */}
          {searchResults.collections.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1 text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Pawkits
              </div>
              {searchResults.collections.map((col, idx) => (
                <button
                  key={col.id}
                  onClick={() => onSelectResult(getGlobalIndex('collections', idx))}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
                    'transition-colors duration-100',
                    isSelected('collections', idx)
                      ? 'bg-[var(--color-accent)]/20 text-text-primary'
                      : 'hover:bg-[var(--glass-bg)] text-text-secondary hover:text-text-primary'
                  )}
                >
                  <Folder className="h-4 w-4 shrink-0 text-text-muted" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm">{col.name}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Tags Section */}
          {searchResults.tags && searchResults.tags.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1 text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Tags
              </div>
              {searchResults.tags.map((tag, idx) => (
                <button
                  key={tag}
                  onClick={() => onSelectResult(getGlobalIndex('tags', idx))}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
                    'transition-colors duration-100',
                    isSelected('tags', idx)
                      ? 'bg-[var(--color-accent)]/20 text-text-primary'
                      : 'hover:bg-[var(--glass-bg)] text-text-secondary hover:text-text-primary'
                  )}
                >
                  <Hash className="h-4 w-4 shrink-0 text-text-muted" />
                  <div className="truncate text-sm">{tag}</div>
                </button>
              ))}
            </div>
          )}

          {/* Actions Section */}
          {searchResults.actions.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1 text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Actions
              </div>
              {searchResults.actions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => onSelectResult(getGlobalIndex('actions', idx))}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
                      'transition-colors duration-100',
                      isSelected('actions', idx)
                        ? 'bg-[var(--color-accent)]/20 text-text-primary'
                        : 'hover:bg-[var(--glass-bg)] text-text-secondary hover:text-text-primary'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-text-muted" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm">{action.label}</div>
                    </div>
                    {action.shortcut && (
                      <kbd className="text-xs text-text-muted shrink-0">{action.shortcut}</kbd>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Tips row for empty state */}
          {showEmptyState && (
            <div className="px-3 py-2 text-xs text-text-muted flex items-center gap-4 border-t border-[var(--glass-border)] mt-2">
              <span><kbd className="px-1.5 py-0.5 bg-[var(--glass-bg)] rounded text-[10px]">/</kbd> commands</span>
              <span><kbd className="px-1.5 py-0.5 bg-[var(--glass-bg)] rounded text-[10px]">#</kbd> tags</span>
              <span><kbd className="px-1.5 py-0.5 bg-[var(--glass-bg)] rounded text-[10px]">@</kbd> pawkits</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// =============================================================================
// EXPANDED CONTENT (Full search bar)
// =============================================================================

interface ExpandedContentProps {
  onSearchClick: () => void;
  isQuickNoteMode: boolean;
  setIsQuickNoteMode: (open: boolean) => void;
  quickNoteText: string;
  setQuickNoteText: (text: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onQuickNoteKeyDown: (e: React.KeyboardEvent) => void;
  onQuickNoteBlur: (e: React.FocusEvent) => void;
  onSaveQuickNote: () => void;
}

function ExpandedContent({
  onSearchClick,
  isQuickNoteMode,
  setIsQuickNoteMode,
  quickNoteText,
  setQuickNoteText,
  textareaRef,
  onQuickNoteKeyDown,
  onQuickNoteBlur,
  onSaveQuickNote,
}: ExpandedContentProps) {
  const hasContent = quickNoteText.length > 0;
  const isSearchMode = quickNoteText.startsWith('/') || quickNoteText.startsWith('#') || quickNoteText.startsWith('@');
  const showHints = hasContent && !isSearchMode;

  return (
    <motion.div
      className={cn(
        "flex flex-1 min-w-0",
        // When no content: h-10 to match button height, centered items
        // When has content: items-start so textarea can grow downward
        hasContent ? "items-start" : "items-center h-10"
      )}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
    >
      {/* Input Area */}
      <div className={cn(
        "flex-1 min-w-0 flex",
        hasContent
          ? "flex-col pt-1.5 pb-1 pr-2"
          : "items-center h-10 px-3 gap-2 rounded-xl hover:bg-[var(--glass-bg)] transition-colors duration-150 cursor-text"
      )}>
        {/* Icon - only show when no content */}
        {!hasContent && <Search className="h-4 w-4 shrink-0 text-text-muted" />}

        <textarea
          ref={textareaRef}
          value={quickNoteText}
          onChange={(e) => setQuickNoteText(e.target.value)}
          onKeyDown={onQuickNoteKeyDown}
          onBlur={onQuickNoteBlur}
          placeholder="Search or quick note..."
          className={cn(
            'bg-transparent text-sm resize-none',
            'placeholder:text-text-muted',
            'focus:outline-none',
            'scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]',
            hasContent
              ? 'w-full text-text-primary min-h-[28px] leading-snug'
              : 'flex-1 text-text-muted leading-[40px] py-0'
          )}
          style={{ scrollbarWidth: 'none', verticalAlign: 'middle' }}
          rows={1}
          onFocus={() => setIsQuickNoteMode(true)}
        />

        {/* Hints - only show for quick notes (not search) */}
        {showHints && (
          <div
            className="flex items-center justify-between mt-1.5 pt-1.5 text-xs border-t border-[var(--glass-border)]"
            style={{
              background: 'linear-gradient(to top, var(--glass-panel-bg) 0%, transparent 100%)',
            }}
          >
            <span className="text-text-muted">⏎ save · ⇧⏎ new line · esc cancel</span>
            <button
              onClick={onSaveQuickNote}
              className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] ml-2 font-medium"
            >
              Save
            </button>
          </div>
        )}
      </div>

      {/* Kit Chat Button - only show when no content */}
      {!hasContent && (
        <button
          className={cn(
            'flex items-center justify-center shrink-0',
            'w-10 h-10 rounded-xl',
            'text-text-muted hover:text-text-primary',
            'hover:bg-[var(--glass-bg)] active:bg-[var(--glass-bg-hover)]',
            'transition-colors duration-150'
          )}
          title="Kit Chat (coming soon)"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}
    </motion.div>
  );
}

// =============================================================================
// COMPACT BUTTONS (Icon only)
// =============================================================================

interface CompactButtonsProps {
  onSearchClick: () => void;
  onForceExpand: () => void;
}

function CompactButtons({ onSearchClick, onForceExpand }: CompactButtonsProps) {
  const handleClick = () => {
    onForceExpand();
  };

  return (
    <motion.div
      className="flex items-center justify-center flex-1 h-10 gap-1"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      {/* Search Button - expands omnibar */}
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center justify-center',
          'w-10 h-10 rounded-xl',
          'text-text-muted hover:text-text-primary',
          'hover:bg-[var(--glass-bg)] active:bg-[var(--glass-bg-hover)]',
          'transition-colors duration-150'
        )}
        title="Search (⌘K)"
      >
        <Search className="h-5 w-5" />
      </button>

      {/* Kit Chat Button */}
      <button
        className={cn(
          'flex items-center justify-center',
          'w-10 h-10 rounded-xl',
          'text-text-muted hover:text-text-primary',
          'hover:bg-[var(--glass-bg)] active:bg-[var(--glass-bg-hover)]',
          'transition-colors duration-150'
        )}
        title="Kit Chat (coming soon)"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </motion.div>
  );
}

// =============================================================================
// TOAST CONTENT
// =============================================================================

interface ToastContentProps {
  toast: NonNullable<ReturnType<typeof useActiveToast>>;
  isCompact: boolean;
  onDismiss: () => void;
}

function ToastContent({ toast, isCompact, onDismiss }: ToastContentProps) {
  const Icon = toastIcons[toast.type];
  const colorClass = toastColors[toast.type];

  return (
    <motion.div
      className="flex items-center w-full h-full px-3 gap-3"
      initial={{ opacity: 0, scale: 0.85, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -4 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 20,
        mass: 0.8,
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
