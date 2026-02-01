'use client';

/**
 * Search Hook
 * Handles search functionality, quick notes, and result execution
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from '@/lib/navigation';
import { format, isSameDay, startOfDay } from 'date-fns';
import { useToastStore } from '@/lib/stores/toast-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { useMutations } from '@/lib/contexts/convex-data-context';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useNonPrivateCards, useCollections } from '@/lib/contexts/convex-data-context';
import { Id } from '@/lib/types/convex';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { SEARCHABLE_ACTIONS, type SearchResults } from '../types';
import { normalizeUrl } from '@/lib/utils/url-normalizer';
import { detectTodo } from '@/lib/utils/todo-detection';
import { addTaskToContent } from '@/lib/utils/parse-task-items';
import { suggestSimilarTags, validateTag, cleanTagInput, findExistingTag } from '@/lib/utils/tag-normalizer';
import { useOmnibarClipboardStore } from '@/lib/stores/omnibar-clipboard-store';
import {
  isPlateJson,
  parseJsonContent,
  serializePlateContent,
  htmlToPlateJson,
  getContentText,
  createEmptyPlateContent,
} from '@/lib/plate/html-to-plate';
import type { Value, Descendant } from 'platejs';

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
  // Tag creation state
  pendingTagCreation: string | null;
  similarTagsWarning: string[];
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
  // Tag creation actions
  confirmTagCreation: () => void;
  cancelTagCreation: () => void;
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
  const addDraftToClipboard = useOmnibarClipboardStore((s) => s.addDraft);

  // Tag creation state
  const [pendingTagCreation, setPendingTagCreation] = useState<string | null>(null);
  const [similarTagsWarning, setSimilarTagsWarning] = useState<string[]>([]);

  // Clear similar tags warning when input changes
  useEffect(() => {
    if (pendingTagCreation && quickNoteText.trim() !== pendingTagCreation) {
      setPendingTagCreation(null);
      setSimilarTagsWarning([]);
    }
  }, [quickNoteText, pendingTagCreation]);

  // Store hooks
  const toast = useToastStore((s) => s.toast);
  const toggleLeftSidebar = useUIStore((s) => s.toggleLeftSidebar);
  const openAddCard = useModalStore((s) => s.openAddCard);
  const openCardDetail = useModalStore((s) => s.openCardDetail);
  const { createCard, updateCard } = useMutations();
  const currentWorkspace = useCurrentWorkspace();
  const cards = useNonPrivateCards();
  const collections = useCollections();

  // Derive uniqueTags from cards instead of using tag-store
  const uniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const card of cards) {
      if (card.deleted) continue;
      for (const tag of card.tags || []) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }, [cards]);

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

  // Only compute recent cards when actually in quick note mode
  // This avoids sorting 180 cards on every omnibar transition
  const recentCards = useMemo(() => {
    if (!isQuickNoteMode) return [];
    return [...cards]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [cards, isQuickNoteMode]);

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

    let matchedCards: SearchResults['cards'] = [];
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
      const normalizeSnippetText = (value: string) =>
        value.replace(/\s+/g, ' ').trim();

      const getPlainText = (content: unknown): string => {
        return getContentText(content);
      };

      const buildSnippet = (text: string, queryValue: string) => {
        const normalized = normalizeSnippetText(text);
        if (!normalized) return null;
        const lowerText = normalized.toLowerCase();
        const lowerQueryValue = queryValue.toLowerCase();
        const matchIndex = lowerText.indexOf(lowerQueryValue);
        if (matchIndex === -1) return null;

        const context = 36;
        const start = Math.max(0, matchIndex - context);
        const end = Math.min(normalized.length, matchIndex + lowerQueryValue.length + context);
        return {
          text: normalized.slice(start, end),
          matchStart: matchIndex - start,
          matchLength: lowerQueryValue.length,
          hasMatch: true,
          hasPrefix: start > 0,
          hasSuffix: end < normalized.length,
        };
      };

      const createCardSnippet = (card: (typeof cards)[number]) => {
        if (card.type === 'md-note' || card.type === 'text-note') {
          const plainText = getPlainText(card.content || '');
          const snippet = buildSnippet(plainText, lowerQuery);
          if (snippet) return snippet;
        }

        const description = card.description ?? '';
        const descriptionSnippet = buildSnippet(description, lowerQuery);
        if (descriptionSnippet) return descriptionSnippet;

        const notes = card.notes ?? '';
        const notesSnippet = buildSnippet(notes, lowerQuery);
        if (notesSnippet) return notesSnippet;

        const title = card.title ?? '';
        const titleSnippet = buildSnippet(title, lowerQuery);
        if (titleSnippet) return titleSnippet;

        const domain = card.domain ?? '';
        const domainSnippet = buildSnippet(domain, lowerQuery);
        if (domainSnippet) return domainSnippet;

        const tagMatch = card.tags?.find((tag) =>
          tag.toLowerCase().includes(lowerQuery)
        );
        if (tagMatch) {
          return buildSnippet(tagMatch, lowerQuery);
        }

        return null;
      };

      const filteredCards = cards.filter(card => {
        if (card.title?.toLowerCase().includes(lowerQuery)) return true;
        if (card.domain?.toLowerCase().includes(lowerQuery)) return true;
        if (card.tags?.some(t => t.toLowerCase().includes(lowerQuery))) return true;

        if (card.type === 'md-note' || card.type === 'text-note') {
          const plainText = getPlainText(card.content || '');
          if (plainText.toLowerCase().includes(lowerQuery)) return true;
        }

        return false;
      }).slice(0, 5);

      matchedCards = filteredCards.map((card) => ({
        ...card,
        omnibarSnippet: createCardSnippet(card) ?? undefined,
      }));

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
  }, [debouncedQuery, isQuickNoteMode, cards, collections, recentCards]);

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
    setPendingTagCreation(null);
    setSimilarTagsWarning([]);
    textareaRef.current?.blur();
    setTimeout(() => { isDiscardingRef.current = false; }, 0);
  }, []);

  const stashDraft = useCallback(() => {
    const trimmed = quickNoteText.trim();
    if (!trimmed) {
      resetSearch();
      return;
    }

    if (
      !trimmed.startsWith('/') &&
      !trimmed.startsWith('#') &&
      !trimmed.startsWith('@') &&
      !isOnTagsPage
    ) {
      addDraftToClipboard(trimmed);
    }

    isDiscardingRef.current = true;
    setIsQuickNoteMode(false);
    setSearchResults(null);
    setForceExpanded(false);
    setSelectedIndex(-1);
    setShowDiscardConfirm(false);
    setTextareaHeight(0);
    setPendingTagCreation(null);
    setSimilarTagsWarning([]);
    textareaRef.current?.blur();
    setTimeout(() => { isDiscardingRef.current = false; }, 0);
  }, [quickNoteText, resetSearch, addDraftToClipboard, isOnTagsPage]);

  const executeResult = useCallback((index: number) => {
    if (!searchResults || index < 0) return;

    let currentIdx = 0;

    if (index < currentIdx + searchResults.cards.length) {
      const card = searchResults.cards[index - currentIdx];
      openCardDetail(card._id);
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
  // ADD TO DAILY LOG (replaces quick note functionality)
  // ==========================================================================

  const saveQuickNote = useCallback(async () => {
    if (!quickNoteText.trim() || !currentWorkspace) return;

    const trimmedText = quickNoteText.trim();

    try {
      // Handle URLs - still create bookmarks as before
      if (isUrl(trimmedText)) {
        const url = normalizeUrlFn(trimmedText);
        const normalizedInput = normalizeUrl(url);

        const existingCard = cards.find((card) => {
          if (card.deleted) return false;
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
              onClick: () => openCardDetail(existingCard._id),
            },
          });
          return;
        }

        await createCard({
          workspaceId: currentWorkspace._id as Id<'workspaces'>,
          type: 'url',
          url: url,
          title: '',
          content: createEmptyPlateContent(),
          tags: [],
          pinned: false,
          isFileCard: false,
        });

        resetSearch();
        toast({ type: 'success', message: 'Bookmark added' });
        return;
      }

      // Add text to daily log instead of creating quick note
      const today = new Date();
      const timestamp = format(today, 'h:mm a');

      // Create Plate JSON entry - handle multi-line text
      const lines = trimmedText.split('\n').filter(line => line.trim());
      const entryNodes: Descendant[] = lines.map((line) => ({
        type: 'p',
        children: [
          { text: timestamp, bold: true },
          { text: ` - ${line}` },
        ],
      }));

      // Find today's daily note from the cards array
      const existingNotes = cards.filter(
        (c) =>
          c.workspaceId === currentWorkspace._id &&
          c.isDailyNote === true &&
          c.scheduledDates?.[0] != null &&
          isSameDay(new Date(c.scheduledDates[0]), today) &&
          c.deleted !== true
      );

      let dailyNote = existingNotes.length > 0
        ? existingNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
        : null;

      if (dailyNote) {
        // Prepend entry (newest at top)
        let newContent: Value;
        if (dailyNote.content && isPlateJson(dailyNote.content)) {
          // Existing content is Plate JSON - prepend new nodes
          const existingContent = parseJsonContent(dailyNote.content);
          if (existingContent) {
            newContent = serializePlateContent([...entryNodes, ...existingContent] as Value);
          } else {
            newContent = serializePlateContent(entryNodes as Value);
          }
        } else if (dailyNote.content) {
          // Existing content is HTML - convert to Plate JSON first, then prepend new entry
          const existingAsJson = htmlToPlateJson(dailyNote.content);
          newContent = serializePlateContent([...entryNodes, ...existingAsJson] as Value);
        } else {
          newContent = serializePlateContent(entryNodes as Value);
        }
        await updateCard(dailyNote._id, { content: newContent });
      } else {
        // Create new daily note with Plate JSON content
        await createCard({
          workspaceId: currentWorkspace._id as Id<'workspaces'>,
          type: 'md-note',
          url: '',
          title: format(today, 'MMMM d, yyyy'),
          content: serializePlateContent(entryNodes as Value),
          isDailyNote: true,
          scheduledDates: [startOfDay(today).toISOString()],
          tags: ['daily-note'],
          pinned: false,
          isFileCard: false,
        });
      }

      // Todo detection: if text is a task, also add to todo card
      const todoResult = detectTodo(trimmedText);
      if (todoResult.isTodo) {
        // Find existing todo card from the cards array
        const todoCardsList = cards.filter(
          (c) =>
            c.workspaceId === currentWorkspace._id &&
            c.tags?.includes('todo') &&
            c.deleted !== true
        );

        const todoCard = todoCardsList.length > 0 ? todoCardsList[0] : null;

        if (todoCard) {
          const newContent = addTaskToContent(todoCard.content || '', trimmedText);
          await updateCard(todoCard._id, { content: newContent });
        } else {
          // Create new todo card with task
          const content = addTaskToContent('', trimmedText);
          await createCard({
            workspaceId: currentWorkspace._id as Id<'workspaces'>,
            type: 'md-note',
            url: '',
            title: 'Todos',
            content,
            tags: ['todo'],
            pinned: false,
            isFileCard: false,
          });
        }

        resetSearch();
        toast({ type: 'success', message: 'Added to daily log and tasks' });
      } else {
        resetSearch();
        toast({ type: 'success', message: 'Added to daily log' });
      }
    } catch (error) {
      console.error('Failed to save:', error);
      toast({ type: 'error', message: 'Failed to save' });
    }
  }, [quickNoteText, currentWorkspace, createCard, updateCard, toast, isUrl, normalizeUrlFn, cards, openCardDetail, resetSearch]);

  // ==========================================================================
  // TAG CREATION (for tags page)
  // ==========================================================================

  const handleTagCreation = useCallback(() => {
    const tagInput = quickNoteText.trim();
    if (!tagInput) return;

    const cleaned = cleanTagInput(tagInput);

    // Validate tag
    const validationError = validateTag(cleaned);
    if (validationError) {
      toast({ type: 'error', message: validationError });
      return;
    }

    // Check if tag already exists (exact match, case-insensitive)
    const existingTag = findExistingTag(cleaned, uniqueTags);
    if (existingTag) {
      toast({ type: 'warning', message: `Tag "${existingTag}" already exists` });
      return;
    }

    // Check for similar tags
    const similarTags = suggestSimilarTags(cleaned, uniqueTags, 3);

    if (similarTags.length > 0) {
      // Show warning and wait for confirmation
      setPendingTagCreation(cleaned);
      setSimilarTagsWarning(similarTags);
      toast({
        type: 'warning',
        message: `Similar tag${similarTags.length > 1 ? 's' : ''} exist${similarTags.length === 1 ? 's' : ''}: ${similarTags.join(', ')}. Press Enter again to create anyway.`,
      });
    } else {
      // No similar tags - tags are created when added to cards, just show success
      toast({ type: 'success', message: `Tag "${cleaned}" is available for use` });
      // Clear URL filter before resetting (resetSearch sets isQuickNoteMode=false which prevents URL cleanup)
      if (isOnTagsPage) {
        router.replace('/tags', { scroll: false });
      }
      resetSearch();
    }
  }, [quickNoteText, uniqueTags, toast, resetSearch, isOnTagsPage, router]);

  const confirmTagCreation = useCallback(() => {
    if (!pendingTagCreation) return;

    // Tags are created when added to cards - just confirm availability
    toast({ type: 'success', message: `Tag "${pendingTagCreation}" is available for use` });
    // Clear URL filter before resetting
    if (isOnTagsPage) {
      router.replace('/tags', { scroll: false });
    }
    resetSearch();
  }, [pendingTagCreation, toast, resetSearch, isOnTagsPage, router]);

  const cancelTagCreation = useCallback(() => {
    setPendingTagCreation(null);
    setSimilarTagsWarning([]);
    textareaRef.current?.focus();
  }, []);

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
      } else if (isOnTagsPage && pendingTagCreation) {
        // On tags page with pending tag creation, confirm it
        confirmTagCreation();
      } else if (isOnTagsPage && quickNoteText.trim() && !quickNoteText.startsWith('/') && !quickNoteText.startsWith('#') && !quickNoteText.startsWith('@')) {
        // On tags page, try to create a tag
        handleTagCreation();
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

      // If there's a pending tag creation, cancel it first
      if (pendingTagCreation) {
        cancelTagCreation();
        return;
      }

      if (isOnTagsPage) {
        resetSearch();
        return;
      }

      if (quickNoteText.trim()) {
        stashDraft();
      } else {
        resetSearch();
      }
    }
  }, [quickNoteText, saveQuickNote, selectedIndex, totalResultsCount, executeResult, isOnTagsPage, resetSearch, pendingTagCreation, confirmTagCreation, handleTagCreation, cancelTagCreation, stashDraft]);

  const handleQuickNoteBlur = useCallback((e: React.FocusEvent) => {
    if (isDiscardingRef.current) return;

    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget?.closest('.omnibar-container')) return;

    if (isOnTagsPage) {
      resetSearch();
      return;
    }

    if (quickNoteText.trim()) {
      stashDraft();
    } else {
      resetSearch();
    }
  }, [quickNoteText, isOnTagsPage, resetSearch, stashDraft]);

  const confirmDiscard = useCallback(() => {
    stashDraft();
  }, [stashDraft]);

  const cancelDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
    textareaRef.current?.focus();
  }, []);

  const openSearch = useCallback(() => {
    onModeChange?.();
    setForceExpanded(true);
    setIsQuickNoteMode(true);
    // Focus immediately - the useEffect will also try to focus on isQuickNoteMode change
    requestAnimationFrame(() => textareaRef.current?.focus());
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
    pendingTagCreation,
    similarTagsWarning,

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
    confirmTagCreation,
    cancelTagCreation,
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
  isOnTagsPage: boolean,
  similarTagsWarning: string[] = [],
  clipboardOpen: boolean = false,
  clipboardItemsCount: number = 0
): number {
  if (!isQuickNoteMode) return 48;

  const hasTypedContent = quickNoteText.length > 0;
  const isPrefixCommand = quickNoteText.startsWith('/') || quickNoteText.startsWith('#') || quickNoteText.startsWith('@');

  let height = 48;

  if (textareaHeight > 28) {
    height += textareaHeight - 28;
  }

  // Similar tags warning on tags page (takes priority over normal tag creation hint)
  if (isOnTagsPage && similarTagsWarning.length > 0) {
    // Layout: "Similar tags exist:" row (24px) + tags row (28px) + keyboard hints row (24px) + padding (16px)
    height += 92;
    return Math.min(Math.max(48, height), 600);
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
    const isRecentMode = !hasTypedContent && !isPrefixCommand;
    // Item heights: py-3 (24px) + two text lines (~36px) = ~60px, but md:py-2 reduces to ~52px
    const itemHeight = isRecentMode ? 44 : 52;
    const headerHeight = isRecentMode ? 24 : 28;
    const tipsHeight = isRecentMode ? 40 : 52;
    const containerPadding = isRecentMode ? 12 : 16; // mt-2 + pt-2 + border

    let sectionsWithItems = 0;
    let totalItems = 0;

    if (cards.length > 0) { sectionsWithItems++; totalItems += cards.length; }
    if (collections.length > 0) { sectionsWithItems++; totalItems += collections.length; }
    if (tags && tags.length > 0) { sectionsWithItems++; totalItems += tags.length; }
    if (actions.length > 0) { sectionsWithItems++; totalItems += actions.length; }

    if (totalItems > 0) {
      height += containerPadding;
      height += (sectionsWithItems * headerHeight) + (totalItems * itemHeight);
      // Add margin between sections (mb-2 = 8px per section except last)
      if (sectionsWithItems > 1) {
        height += (sectionsWithItems - 1) * 8;
      }
    }

    if (!hasTypedContent && cards.length > 0) {
      height += tipsHeight;
    }
  }

  if (clipboardOpen && clipboardItemsCount > 0 && !hasTypedContent) {
    const itemHeight = 38;
    const headerHeight = 24;
    const containerPadding = 12;
    height += headerHeight + containerPadding + itemHeight * Math.min(clipboardItemsCount, 10);
  }

  return Math.min(Math.max(48, height), 600);
}
