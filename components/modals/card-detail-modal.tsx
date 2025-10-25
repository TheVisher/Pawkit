"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import remarkBreaks from "remark-breaks";
import { CardModel, CollectionNode } from "@/lib/types";
import { useDataStore, extractAndSaveLinks } from "@/lib/stores/data-store";
import { localStorage } from "@/lib/services/local-storage";
import { Toast } from "@/components/ui/toast";
import { ReaderView } from "@/components/reader/reader-view";
import { RichMDEditor } from "@/components/notes/md-editor";
import { BacklinksPanel } from "@/components/notes/backlinks-panel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDemoAwareStore } from "@/lib/hooks/use-demo-aware-store";
import { extractYouTubeId, isYouTubeUrl } from "@/lib/utils/youtube";
import { FileText, Bookmark, Globe, Tag, FolderOpen, Link2, Clock, Zap, BookOpen, Sparkles, X, MoreVertical, RefreshCw, Share2, Pin, Trash2, Maximize2, Search, Tags, Edit, Eye, Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Heading1, Heading2, Heading3, Link as LinkIcon, ChevronDown } from "lucide-react";
import { findBestFuzzyMatch } from "@/lib/utils/fuzzy-match";
import { extractTags } from "@/lib/stores/data-store";
import { GlowButton } from "@/components/ui/glow-button";
import { useTrackCardView } from "@/lib/hooks/use-recent-history";
import { usePanelStore } from "@/lib/hooks/use-panel-store";

type TagsTabProps = {
  content: string;
};

function TagsTab({ content }: TagsTabProps) {
  const tags = extractTags(content);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Tag size={16} className="text-purple-400" />
        <h3 className="text-sm font-semibold text-gray-300">Tags</h3>
        <span className="text-xs text-gray-500">({tags.length})</span>
      </div>
      
      {tags.length === 0 ? (
        <p className="text-xs text-gray-500 italic">
          No tags found. Add #hashtags in your content to create tags.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="bg-purple-900/30 text-purple-300 border-purple-700/50">
              #{tag}
            </Badge>
          ))}
        </div>
      )}
      
      <div className="text-xs text-gray-500">
        <p>Tags are automatically extracted from hashtags (#tag) in your content.</p>
      </div>
    </div>
  );
}

type CardDetailModalProps = {
  card: CardModel;
  collections: CollectionNode[];
  onClose: () => void;
  onUpdate: (card: CardModel) => void;
  onDelete: () => void;
  onNavigateToCard?: (cardId: string) => void;
};

export function CardDetailModal({ card, collections, onClose, onUpdate, onDelete, onNavigateToCard }: CardDetailModalProps) {
  const { updateCard: updateCardInStore, deleteCard: deleteCardFromStore } = useDemoAwareStore();
  const dataStore = useDataStore();
  const allCards = dataStore.cards;
  const isNote = card.type === "md-note" || card.type === "text-note";
  const [isMounted, setIsMounted] = useState(false);

  // Open control panel with card details when modal opens
  const openCardDetails = usePanelStore((state) => state.openCardDetails);
  const restorePreviousContent = usePanelStore((state) => state.restorePreviousContent);

  // Get panel states for modal positioning
  const isLeftOpen = usePanelStore((state) => state.isLeftOpen);
  const leftMode = usePanelStore((state) => state.leftMode);
  const isPanelOpen = usePanelStore((state) => state.isOpen);
  const panelMode = usePanelStore((state) => state.mode);

  // Calculate modal offset based on panel states
  // Floating panels: 325px width + 16px margin on each side = 357px total space
  // Anchored panels: 325px width, flush to edge
  const leftOffset = isLeftOpen
    ? (leftMode === "floating" ? "357px" : "325px")
    : "0px";

  const rightOffset = isPanelOpen
    ? (panelMode === "floating" ? "357px" : "325px")
    : "0px";

  // Track card view for recent history
  useTrackCardView(card);

  // Track if component is mounted (for portal rendering)
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Open control panel when card modal opens
  useEffect(() => {
    openCardDetails(card.id);

    // Clean up: restore previous panel content when modal closes
    return () => {
      restorePreviousContent();
    };
  }, [card.id, openCardDetails, restorePreviousContent]);

  // Initialize data store if not already initialized
  useEffect(() => {
    if (!dataStore.isInitialized) {
      dataStore.initialize();
    }
  }, [dataStore]);

  // Extract links when modal opens if this is a note with content
  // Note: Link extraction is now handled automatically by the data store
  // when content is updated via the auto-save mechanism
  const [notes, setNotes] = useState(card.notes ?? "");
  const [content, setContent] = useState(card.content ?? "");

  // Wait for cards to load before building title map
  const [cardsReady, setCardsReady] = useState(false);

  useEffect(() => {
    if (allCards.length > 0 && !cardsReady) {
      console.log('[Wiki-Link] Cards loaded, setting ready');
      setCardsReady(true);
    }
  }, [allCards.length, cardsReady]);

  // Create a map of note titles to IDs for wiki-link resolution
  const noteTitleMap = useMemo(() => {
    if (!cardsReady) {
      console.log('[Wiki-Link] Cards not ready yet, returning empty map');
      return new Map<string, string>();
    }

    const map = new Map<string, string>();
    console.log('[Wiki-Link] Building title map from cards:', {
      totalCards: allCards.length,
      noteCards: allCards.filter(c => c.type === 'md-note' || c.type === 'text-note').length,
      notesWithTitles: allCards.filter(c => (c.type === 'md-note' || c.type === 'text-note') && c.title).length,
      allNotes: allCards.filter(c => c.type === 'md-note' || c.type === 'text-note').map(c => ({ id: c.id, title: c.title, type: c.type })),
    });

    allCards.forEach((c) => {
      if ((c.type === 'md-note' || c.type === 'text-note') && c.title) {
        map.set(c.title.toLowerCase(), c.id);
        console.log('[Wiki-Link] Added to map:', c.title.toLowerCase(), '->', c.id);
      }
    });

    console.log('[Wiki-Link] Final title map:', Array.from(map.entries()));
    return map;
  }, [allCards, cardsReady]);

  // Create a map of card titles to IDs for card reference resolution
  const cardTitleMap = useMemo(() => {
    if (!cardsReady) {
      return new Map<string, string>();
    }

    const map = new Map<string, string>();
    allCards.forEach((c) => {
      if (c.title) {
        map.set(c.title.toLowerCase(), c.id);
      }
    });
    return map;
  }, [allCards, cardsReady]);

  // Custom renderer for wiki-links
  const wikiLinkComponents = useMemo(() => ({
    code: ({ node, inline, className, children, ...props }: any) => {
      // In ReactMarkdown v10, we need to check multiple ways:
      // 1. Check if inline prop exists and is true
      // 2. Check if className contains "language-" (block code marker)
      // 3. Check if there's no className (usually inline code)
      const isInline = inline ?? !className;
      
      if (isInline) {
        return (
          <code
            className="px-2 py-1 rounded font-mono text-sm border"
            style={{
              backgroundColor: 'rgba(139, 92, 246, 0.1)', // Purple tint
              borderColor: 'rgba(139, 92, 246, 0.3)',
              color: '#c4b5fd', // Light purple
            }}
            {...props}
          >
            {children}
          </code>
        );
      }
      
      // Block code (triple backticks)
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    a: ({ node, href, children, ...props }: any) => {
      // Check if this is a wiki-link (starts with #/wiki/)
      if (href?.startsWith('#/wiki/')) {
        const linkText = href.replace('#/wiki/', '').replace(/-/g, ' ');
        
        // Check if this is a card reference: card:Title
        if (linkText.startsWith('card:')) {
          const cardTitle = linkText.substring(5).trim();
          const cardId = cardTitleMap.get(cardTitle.toLowerCase());
          
          if (cardId && onNavigateToCard) {
            return (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNavigateToCard(cardId);
                }}
                className="!text-blue-400 hover:!text-blue-300 !underline !decoration-blue-400/50 hover:!decoration-blue-300 cursor-pointer !font-bold transition-colors"
                style={{ color: '#60a5fa', textDecoration: 'underline', textDecorationColor: '#60a5fa80' }}
                {...props}
              >
                <Bookmark size={14} className="inline mr-1" />
                {children}
              </button>
            );
          } else {
            return (
              <span className="!text-gray-500 italic !underline !decoration-gray-500/30" title="Card not found" style={{ color: '#6b7280', textDecoration: 'underline' }}>
                <Bookmark size={14} className="inline mr-1" />
                {children}
              </span>
            );
          }
        }
        // Check if this is a URL reference
        else if (linkText.startsWith('http://') || linkText.startsWith('https://')) {
          const targetCard = allCards.find(c => c.url === linkText);
          
          if (targetCard && onNavigateToCard) {
            return (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNavigateToCard(targetCard.id);
                }}
                className="!text-green-400 hover:!text-green-300 !underline !decoration-green-400/50 hover:!decoration-green-300 cursor-pointer !font-bold transition-colors"
                style={{ color: '#4ade80', textDecoration: 'underline', textDecorationColor: '#4ade8080' }}
                {...props}
              >
                <Globe size={14} className="inline mr-1" />
                {children}
              </button>
            );
          } else {
            return (
              <span className="!text-gray-500 italic !underline !decoration-gray-500/30" title="URL not found" style={{ color: '#6b7280', textDecoration: 'underline' }}>
                <Globe size={14} className="inline mr-1" />
                {children}
              </span>
            );
          }
        }
        // Otherwise, treat as note/card reference
        else {
          // Use fuzzy matching to find the best match
          const notes = allCards.filter(c => 
            (c.type === 'md-note' || c.type === 'text-note') && c.title && c.title.trim() !== ''
          ) as Array<{ title: string; id: string }>;
          const cards = allCards.filter(c => c.title && c.title.trim() !== '') as Array<{ title: string; id: string }>;
          
          // Try to find a note first
          const matchedNote = findBestFuzzyMatch(linkText, notes, 0.7);
          const noteId = matchedNote?.id;
          
          // If no note found, try to find a card
          const matchedCard = !matchedNote ? findBestFuzzyMatch(linkText, cards, 0.7) : null;
          const cardId = matchedCard?.id;

          console.log('[Wiki-Link Debug]', {
            href,
            linkText,
            linkTextLower: linkText.toLowerCase(),
            noteId,
            cardId,
            hasNavigateCallback: !!onNavigateToCard,
            availableNoteTitles: Array.from(noteTitleMap.keys()),
            availableCardTitles: Array.from(cardTitleMap.keys()),
          });

          if (noteId && onNavigateToCard) {
            return (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNavigateToCard(noteId);
                }}
                className="!text-purple-400 hover:!text-purple-300 !underline !decoration-purple-400/50 hover:!decoration-purple-300 cursor-pointer !font-bold transition-colors"
                style={{ color: '#c084fc', textDecoration: 'underline', textDecorationColor: '#c084fc80' }}
                {...props}
              >
                <FileText size={14} className="inline mr-1" />
                {children}
              </button>
            );
          } else if (cardId && onNavigateToCard) {
            return (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNavigateToCard(cardId);
                }}
                className="!text-blue-400 hover:!text-blue-300 !underline !decoration-blue-400/50 hover:!decoration-blue-300 cursor-pointer !font-bold transition-colors"
                style={{ color: '#60a5fa', textDecoration: 'underline', textDecorationColor: '#60a5fa80' }}
                {...props}
              >
                <Bookmark size={14} className="inline mr-1" />
                {children}
              </button>
            );
          } else {
            // Neither note nor card found - show as broken link
            return (
              <span className="!text-gray-500 italic !underline !decoration-gray-500/30" title="Note or card not found" style={{ color: '#6b7280', textDecoration: 'underline' }}>
                <FileText size={14} className="inline mr-1" />
                {children}
              </span>
            );
          }
        }
      }

      // Regular link
      return <a href={href} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
    },
  }), [noteTitleMap, cardTitleMap, allCards, onNavigateToCard]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(card.pinned ?? false);
  const [isInDen, setIsInDen] = useState(card.inDen ?? false);
  const [isReaderExpanded, setIsReaderExpanded] = useState(false);
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [articleContent, setArticleContent] = useState(card.articleContent ?? null);
  // Bottom tab view mode: 'preview' | 'reader' | 'metadata'
  const [bottomTabMode, setBottomTabMode] = useState<'preview' | 'reader' | 'metadata'>('preview');
  const [denPawkitSlugs, setDenPawkitSlugs] = useState<Set<string>>(new Set());
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalExpanded, setIsModalExpanded] = useState(false);
  const [noteMode, setNoteMode] = useState<'edit' | 'preview'>('preview');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(card.title || "");
  const [showNoteToolbar, setShowNoteToolbar] = useState(true);
  const lastSavedNotesRef = useRef(card.notes ?? "");
  const lastSavedContentRef = useRef(card.content ?? "");
  const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Calculate note metadata for display in top bar
  const noteMetadata = useMemo(() => {
    if (!isNote) return null;
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const characters = content.length;
    const linkMatches = content.match(/\[\[([^\]]+)\]\]/g) || [];
    const linkCount = linkMatches.length;
    const tagMatches = content.match(/#([a-zA-Z0-9_-]+)/g) || [];
    const tagCount = tagMatches.length;
    return { words, characters, linkCount, tagCount };
  }, [content, isNote]);

  // Fetch Den Pawkit slugs to differentiate from regular Pawkits
  useEffect(() => {
    const fetchDenPawkits = async () => {
      try {
        const response = await fetch("/api/den/pawkits");
        if (response.ok) {
          const data = await response.json();
          const slugs = new Set<string>(
            (data.collections || []).map((c: any) => c.slug as string)
          );
          setDenPawkitSlugs(slugs);
        }
      } catch (error) {
        console.error("Failed to fetch Den Pawkits:", error);
      }
    };
    fetchDenPawkits();
  }, []);

  // Update initial values when card changes
  useEffect(() => {
    setNotes(card.notes ?? "");
    lastSavedNotesRef.current = card.notes ?? "";
  }, [card.id, card.notes]);

  useEffect(() => {
    setContent(card.content ?? "");
    lastSavedContentRef.current = card.content ?? "";
  }, [card.id, card.content]);

  useEffect(() => {
    setIsPinned(card.pinned ?? false);
  }, [card.id, card.pinned]);

  useEffect(() => {
    setArticleContent(card.articleContent ?? null);
  }, [card.id, card.articleContent]);

  useEffect(() => {
    setIsReaderExpanded(false);
    setExtracting(false);
    setBottomTabMode('preview');
    setIsModalExpanded(false);
    setIsEditingTitle(false);
    setEditedTitle(card.title || "");
    setShowNoteToolbar(true); // Reset toolbar to visible when card changes
  }, [card.id, card.title]);

  // Save on modal close to ensure nothing is lost
  const handleClose = async () => {
    // Save any pending changes before closing
    if (notes !== lastSavedNotesRef.current) {
      try {
        await updateCardInStore(card.id, { notes });
        lastSavedNotesRef.current = notes;
      } catch (error) {
        console.error('[CardDetail] Failed to save notes on close:', error);
      }
    }

    if (isNote && content !== lastSavedContentRef.current) {
      try {
        await updateCardInStore(card.id, { content });
        lastSavedContentRef.current = content;
      } catch (error) {
        console.error('[CardDetail] Failed to save content on close:', error);
        alert('Failed to save content on close: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }

    onClose();
  };

  // Close on Escape key
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, content, isNote]);

  // Debounced save notes to prevent constant re-renders
  useEffect(() => {
    // Only save if notes have changed from last saved value
    if (notes === lastSavedNotesRef.current) {
      return;
    }

    // Clear any existing timeout
    const timeoutId = setTimeout(async () => {
      try {
        // Update the store (which handles IndexedDB saving)
        await updateCardInStore(card.id, { notes });
        lastSavedNotesRef.current = notes;
      } catch (error) {
        console.error('Failed to save notes locally:', error);
      }
    }, 2000); // 2 second debounce to prevent constant saves

    return () => clearTimeout(timeoutId);
  }, [notes, card.id, card, updateCardInStore]);

  // Extract links when modal opens if this is a note with content
  useEffect(() => {
    if (!isNote || !content || !cardsReady || !allCards.length) return;

    // Trigger link extraction immediately when opening a note
    // This ensures the Links tab is populated
    const extractLinks = async () => {
      try {
        // Call extraction function directly to ensure it runs even if content hasn't changed
        await extractAndSaveLinks(card.id, content, allCards);
      } catch (error) {
        console.error('Failed to extract links on open:', error);
      }
    };

    extractLinks();
  }, [card.id, isNote, cardsReady, allCards, content]); // Include all dependencies

  // Debounced save content to prevent constant re-renders
  useEffect(() => {
    if (!isNote) return;

    // Only save if content has changed from last saved value
    if (content === lastSavedContentRef.current) {
      return;
    }

    // Clear any existing timeout
    const timeoutId = setTimeout(async () => {
      try {
        // Update the store (which handles IndexedDB saving)
        await updateCardInStore(card.id, { content });
        lastSavedContentRef.current = content;
      } catch (error) {
        console.error('[CardDetail] Failed to save content:', error);
        alert('Failed to save note content: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }, 2000); // 2 second debounce to prevent constant saves

    return () => clearTimeout(timeoutId);
  }, [content, card.id, isNote, card, updateCardInStore]);

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      // ✅ Use data store to update IndexedDB first
      await updateCardInStore(card.id, { notes });
      onUpdate({ ...card, notes });
      setToast("Notes saved");
    } catch (error) {
      console.error("Failed to save notes:", error);
      setToast("Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);

    // Update store (optimistic)
    await updateCardInStore(card.id, { pinned: newPinned });

    // Update parent component state
    onUpdate({ ...card, pinned: newPinned });

    setToast(newPinned ? "Pinned to home" : "Unpinned from home");
  };

  const handleSaveTitle = async () => {
    const trimmedTitle = editedTitle.trim();

    // If title hasn't changed, just exit edit mode
    if (trimmedTitle === card.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      // Update store
      await updateCardInStore(card.id, { title: trimmedTitle });

      // Update parent component state
      onUpdate({ ...card, title: trimmedTitle });

      setIsEditingTitle(false);
      setToast("Title updated");
    } catch (error) {
      console.error("Failed to update title:", error);
      setToast("Failed to update title");
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === "Escape") {
      setEditedTitle(card.title || "");
      setIsEditingTitle(false);
    }
  };

  // Insert markdown formatting for notes
  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = editorTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);

    setContent(newText);

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleAddToPawkit = async (slug: string) => {
    const currentCollections = card.collections || [];
    const isAlreadyIn = currentCollections.includes(slug);
    const nextCollections = isAlreadyIn
      ? currentCollections.filter((s) => s !== slug)
      : Array.from(new Set([slug, ...currentCollections]));

    const updates: { collections: string[]; inDen?: boolean } = { collections: nextCollections };

    // Check if the slug is a Den Pawkit or regular Pawkit
    const isDenPawkit = denPawkitSlugs.has(slug);

    const wasInDen = card.inDen;

    if (!isAlreadyIn) {
      // Adding to a new Pawkit
      if (isDenPawkit) {
        // Adding to Den Pawkit - ensure inDen is true
        updates.inDen = true;
      } else {
        // Adding to regular Pawkit - ensure inDen is false
        updates.inDen = false;
      }
    }

    // Update the global store (optimistic update)
    await updateCardInStore(card.id, updates);

    // Also update parent component state
    const updated = { ...card, ...updates };
    onUpdate(updated);

    // If card was in Den and is now being moved out, close the modal
    if (wasInDen && updates.inDen === false) {
      setToast("Moved out of The Den");
      // Close modal after a brief delay to show the toast
      setTimeout(() => handleClose(), 500);
      return;
    }

    setToast(isAlreadyIn ? "Removed from Pawkit" : "Added to Pawkit");
  };

  const handleExtractArticle = async () => {
    setExtracting(true);
    try {
      const response = await fetch(`/api/cards/${card.id}/extract-article`, {
        method: "POST"
      });
      if (response.ok) {
        const data = await response.json();
        setArticleContent(data.articleContent);

        // ✅ Save to IndexedDB via data store
        await updateCardInStore(card.id, { articleContent: data.articleContent });
        onUpdate({ ...card, articleContent: data.articleContent });
        setToast("Article extracted successfully");
      } else {
        const error = await response.json();
        setToast(error.message || "Failed to extract article");
      }
    } catch (error) {
      console.error("Failed to extract article:", error);
      setToast("Failed to extract article");
    } finally {
      setExtracting(false);
    }
  };

  const handleRefreshMetadata = async () => {
    setToast("Refreshing metadata...");
    try {
      const response = await fetch(`/api/cards/${card.id}/fetch-metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: card.url })
      });

      if (response.ok) {
        // Fetch the updated card to get fresh metadata
        const updatedCardRes = await fetch(`/api/cards/${card.id}`);
        if (updatedCardRes.ok) {
          const updatedCard = await updatedCardRes.json();

          // Update store
          await updateCardInStore(card.id, {
            title: updatedCard.title,
            description: updatedCard.description,
            image: updatedCard.image,
            domain: updatedCard.domain,
            metadata: updatedCard.metadata
          });

          // Update parent component
          onUpdate(updatedCard);
          setToast("Metadata refreshed successfully");
        } else {
          setToast("Failed to fetch updated metadata");
        }
      } else {
        setToast("Failed to refresh metadata");
      }
    } catch (error) {
      console.error("Failed to refresh metadata:", error);
      setToast("Failed to refresh metadata");
    }
  };

  const handleDelete = async () => {
    try {
      // ✅ Use data store for soft delete
      await deleteCardFromStore(card.id);
      onDelete();
    } catch (error) {
      console.error("Failed to delete card:", error);
      setToast("Failed to delete card");
    }
  };

  const handleMoveToDen = async () => {
    try {
      // ✅ Use data store to update IndexedDB
      const newInDen = !isInDen;
      await updateCardInStore(card.id, { inDen: newInDen });

      // Update local state immediately
      setIsInDen(newInDen);

      const updated = { ...card, inDen: newInDen };

      // Simply refresh the entire data store to get the latest state from server
      // This ensures consistency and will properly filter out Den items
      // Note: Demo mode doesn't need refresh since it's all local
      const pathname = window.location.pathname;
      if (!pathname.startsWith('/demo')) {
        const { useDataStore } = await import('@/lib/stores/data-store');
        await useDataStore.getState().refresh();
      }

      setToast(updated.inDen ? "Moved to The Den" : "Removed from The Den");

      // Close modal after moving to Den
      if (updated.inDen) {
        setTimeout(() => handleClose(), 500);
      }
    } catch (error) {
      console.error("Failed to move card:", error);
      setToast("Failed to update card");
    }
  };

  const handleSaveScheduledDate = async (date: string | null) => {
    try {
      // Update store (optimistic)
      await updateCardInStore(card.id, { scheduledDate: date });

      // Update parent component state
      const updated = { ...card, scheduledDate: date };
      onUpdate(updated);

      setToast(date ? `Scheduled for ${new Date(date).toLocaleDateString()}` : "Schedule cleared");
    } catch (error) {
      console.error("Failed to save scheduled date:", error);
      setToast("Failed to save date");
    }
  };

  // When reader is expanded, render different layout
  if (isReaderExpanded && articleContent) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-white">
          <ReaderView
            title={card.title || card.domain || card.url}
            content={articleContent}
            url={card.url}
            isExpanded={true}
            onToggleExpand={() => setIsReaderExpanded(false)}
            onClose={onClose}
          />
        </div>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </>
    );
  }

  // When note is expanded, render fullscreen view (edit or preview)
  if (isNoteExpanded && isNote) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-gray-950">
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-xl font-semibold text-gray-100">{card.title || "Untitled Note"}</h2>
              <Button
                onClick={() => setIsNoteExpanded(false)}
                variant="ghost"
                size="icon"
                title="Exit fullscreen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l6 6m0-6l-6 6m12-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-hidden p-4">
              <RichMDEditor
                content={content}
                onChange={setContent}
                placeholder="Start writing your note..."
                onNavigate={onNavigateToCard}
                customComponents={wikiLinkComponents}
              />
            </div>
          </div>
        </div>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </>
    );
  }

  if (!isMounted) return null;

  // Helper function to get shortened domain for display
  const getShortDomain = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Centered Card Content - dynamically centered over content panel */}
      <div
        className="fixed inset-0 z-[101] flex items-center justify-center p-4 md:p-8 pointer-events-none"
        style={{
          left: leftOffset,
          right: rightOffset,
          transition: "left 0.3s ease-out, right 0.3s ease-out",
        }}
      >
        <div
          className={`rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg shadow-2xl overflow-hidden pointer-events-auto relative flex flex-col ${
            isReaderExpanded || isModalExpanded
              ? "w-full h-full"
              : isYouTubeUrl(card.url)
                ? "w-full max-w-6xl max-h-[85vh]"
                : isNote
                  ? "w-full max-w-3xl h-[80vh]"
                  : "w-full max-w-4xl max-h-[90vh]"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar - For all card types */}
          <div className="border-b border-white/10 bg-white/5 backdrop-blur-sm px-6 py-4 flex items-center justify-between flex-shrink-0 relative z-10">
            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
                // Edit mode for title
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  onBlur={handleSaveTitle}
                  autoFocus
                  className="w-full text-lg font-semibold text-gray-100 bg-gray-800/50 border border-purple-500/50 rounded px-2 py-1 focus:outline-none focus:border-purple-400"
                  placeholder="Enter title..."
                />
              ) : (
                // Display mode with hover edit
                <div className="group flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-100 truncate">
                    {card.title || "Untitled"}
                  </h2>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-purple-400 transition-all flex-shrink-0 p-1"
                    title="Edit title"
                  >
                    <Edit size={16} />
                  </button>
                </div>
              )}
              {isNote && noteMetadata ? (
                // Note metadata under title (like domain for URL cards)
                <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                  <span>{noteMetadata.words} words</span>
                  <span>{noteMetadata.characters} chars</span>
                  <span>{noteMetadata.linkCount} links</span>
                  <span>{noteMetadata.tagCount} tags</span>
                </div>
              ) : (
                // Domain for URL cards with hover effects
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-purple-400 hover:underline transition-colors truncate block mt-1"
                  title={card.url}
                >
                  {getShortDomain(card.url)}
                </a>
              )}
            </div>

              <div className="flex items-center gap-2 ml-4">
                {/* Expand Button */}
                <button
                  onClick={() => setIsModalExpanded(!isModalExpanded)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title={isModalExpanded ? "Restore size" : "Expand to fill window"}
                >
                  <Maximize2 size={20} className="text-gray-400" />
                </button>

                {/* Search Button */}
                <button
                  onClick={() => setToast("Search coming soon")}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Search within content"
                >
                  <Search size={20} className="text-gray-400" />
                </button>

                {/* Tag Button */}
                <button
                  onClick={() => setToast("Tags coming soon")}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Manage tags"
                >
                  <Tags size={20} className="text-gray-400" />
                </button>

                {/* 3-Dot Menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="More options"
                  >
                    <MoreVertical size={20} className="text-gray-400" />
                  </button>
                  {isMenuOpen && (
                    <>
                      {/* Backdrop to close menu */}
                      <div
                        className="fixed inset-0 z-[300]"
                        onClick={() => setIsMenuOpen(false)}
                      />
                      {/* Dropdown Menu */}
                      <div className="absolute right-0 mt-2 w-48 rounded-lg border border-white/10 bg-gray-900 shadow-xl z-[301] overflow-hidden">
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleRefreshMetadata();
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2 transition-colors"
                        >
                          <RefreshCw size={16} />
                          Refresh Preview
                        </button>
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            navigator.clipboard.writeText(card.url);
                            setToast("Link copied to clipboard");
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2 transition-colors"
                        >
                          <Share2 size={16} />
                          Share
                        </button>
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleTogglePin();
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2 transition-colors"
                        >
                          <Pin size={16} />
                          {isPinned ? "Unpin from Home" : "Pin to Home"}
                        </button>
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleDelete();
                            handleClose();
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors border-t border-white/10"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
                {/* Close Button */}
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Close"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
          </div>

          {/* Formatting Toolbar - Only for notes in edit mode */}
          {isNote && noteMode === 'edit' && showNoteToolbar && (
            <div className="border-b border-white/10 bg-white/5 backdrop-blur-sm px-6 py-3 flex items-center gap-1 flex-wrap flex-shrink-0">
              <button
                onClick={() => insertMarkdown('**', '**')}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Bold (Cmd+B)"
              >
                <Bold size={16} className="text-gray-300" />
              </button>
              <button
                onClick={() => insertMarkdown('*', '*')}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Italic (Cmd+I)"
              >
                <Italic size={16} className="text-gray-300" />
              </button>
              <button
                onClick={() => insertMarkdown('~~', '~~')}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Strikethrough"
              >
                <Strikethrough size={16} className="text-gray-300" />
              </button>
              <div className="w-px h-6 bg-white/10 mx-1" />
              <button
                onClick={() => insertMarkdown('# ', '')}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Heading 1"
              >
                <Heading1 size={16} className="text-gray-300" />
              </button>
              <button
                onClick={() => insertMarkdown('## ', '')}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Heading 2"
              >
                <Heading2 size={16} className="text-gray-300" />
              </button>
              <button
                onClick={() => insertMarkdown('### ', '')}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Heading 3"
              >
                <Heading3 size={16} className="text-gray-300" />
              </button>
              <div className="w-px h-6 bg-white/10 mx-1" />
              <button
                onClick={() => insertMarkdown('`', '`')}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Code (Cmd+E)"
              >
                <Code size={16} className="text-gray-300" />
              </button>
              <button
                onClick={() => insertMarkdown('[', '](url)')}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Link"
              >
                <LinkIcon size={16} className="text-gray-300" />
              </button>
              <button
                onClick={() => insertMarkdown('[[', ']]')}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Wiki Link (Cmd+K)"
              >
                <Link2 size={16} className="text-gray-300" />
              </button>
              <div className="w-px h-6 bg-white/10 mx-1" />
              <button
                onClick={() => insertMarkdown('\n- ', '')}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Bullet List"
              >
                <List size={16} className="text-gray-300" />
              </button>
              <button
                onClick={() => insertMarkdown('\n1. ', '')}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Numbered List"
              >
                <ListOrdered size={16} className="text-gray-300" />
              </button>
              <button
                onClick={() => insertMarkdown('\n> ', '')}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Quote"
              >
                <Quote size={16} className="text-gray-300" />
              </button>
            </div>
          )}

          {/* Collapse Handle - Only for notes in edit mode */}
          {isNote && noteMode === 'edit' && (
            <div className="relative border-b border-white/10 flex-shrink-0">
              <button
                onClick={() => setShowNoteToolbar(!showNoteToolbar)}
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 group z-10"
                title={showNoteToolbar ? "Hide toolbar" : "Show toolbar"}
              >
                <div className="w-12 h-1.5 bg-white/10 group-hover:bg-purple-500/50 rounded-full transition-all duration-200 flex items-center justify-center">
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 group-hover:text-purple-400 transition-all duration-200 ${showNoteToolbar ? '' : 'rotate-180'}`}
                  />
                </div>
              </button>
            </div>
          )}

          {/* Card Content - Image, Reader, YouTube Player, or Note Preview/Edit */}
          <div className="relative flex-1 overflow-hidden min-h-0">
            {isNote ? (
              // Note content area
              <div className="h-full overflow-hidden p-[5px]">
                <RichMDEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Start writing your note..."
                  onNavigate={onNavigateToCard}
                  onToggleFullscreen={() => setIsNoteExpanded(true)}
                  customComponents={wikiLinkComponents}
                  mode={noteMode}
                  onModeChange={setNoteMode}
                  hideControls={true}
                  showToolbar={false}
                  textareaRef={editorTextareaRef}
                />
              </div>
            ) : isYouTubeUrl(card.url) ? (
              // YouTube video embed in main content area
              <div className="h-full flex items-center justify-center p-[5px]">
                <div className="w-full max-w-6xl">
                  <div className="relative w-full bg-black rounded-2xl overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${extractYouTubeId(card.url)}`}
                      title={card.title || "YouTube video"}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute top-0 left-0 w-full h-full border-0"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            ) : (
              // URL card content with tabs - all tabs positioned absolutely to maintain size
              <div className={`relative ${isModalExpanded ? 'h-full' : ''}`}>
                <div className={`p-[5px] ${isModalExpanded ? 'h-full' : ''} ${bottomTabMode === 'preview' ? '' : 'invisible'}`}>
                  <div className={`w-full flex items-center justify-center ${isModalExpanded ? 'h-full' : ''}`}>
                    {card.image ? (
                      <img
                        src={card.image}
                        alt={card.title || "Card preview"}
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="w-32 h-32 mx-auto bg-gray-600 rounded-lg flex items-center justify-center">
                          <span className="text-white text-4xl">🔗</span>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-300">
                          {card.title || card.domain || card.url}
                        </h3>
                      </div>
                    )}
                  </div>
                </div>

                {bottomTabMode === 'reader' && (
                  <div className="absolute inset-0 p-[5px] overflow-y-auto">
                    {articleContent ? (
                      <ReaderView
                        title={card.title || card.domain || card.url}
                        content={articleContent}
                        url={card.url}
                        isExpanded={false}
                        onToggleExpand={() => setIsReaderExpanded(true)}
                        onClose={onClose}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-4">
                          <div className="text-gray-400 mb-4">
                            <BookOpen size={48} className="mx-auto" />
                          </div>
                          <h3 className="text-xl font-semibold text-gray-300">No Article Content Yet</h3>
                          <p className="text-sm text-gray-500 max-w-md mx-auto">
                            Extract the article content for distraction-free reading
                          </p>
                          <Button
                            onClick={handleExtractArticle}
                            disabled={extracting}
                            size="lg"
                          >
                            {extracting ? (
                              <>
                                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Kit is fetching...
                              </>
                            ) : (
                              <>
                                🐕 Let Kit Fetch Article
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {bottomTabMode === 'metadata' && (
                  <div className="absolute inset-0 p-[5px] overflow-y-auto flex items-start justify-center">
                    <div className="max-w-2xl w-full space-y-6 py-8">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-4">Card Information</h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between py-2 border-b border-white/10">
                            <span className="text-gray-400">Title</span>
                            <span className="text-gray-200 text-right max-w-md truncate">{card.title || "—"}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-white/10">
                            <span className="text-gray-400">Domain</span>
                            <span className="text-gray-200">{card.domain || "—"}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-white/10">
                            <span className="text-gray-400">URL</span>
                            <a
                              href={card.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent hover:underline max-w-md truncate"
                            >
                              {card.url}
                            </a>
                          </div>
                          <div className="flex justify-between py-2 border-b border-white/10">
                            <span className="text-gray-400">Created</span>
                            <span className="text-gray-200">{new Date(card.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-white/10">
                            <span className="text-gray-400">Updated</span>
                            <span className="text-gray-200">{new Date(card.updatedAt).toLocaleString()}</span>
                          </div>
                          {card.description && (
                            <div className="py-2">
                              <span className="text-gray-400 block mb-2">Description</span>
                              <p className="text-gray-200">{card.description}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Bar - For all card types */}
          <div className="border-t border-white/10 bg-white/5 backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center justify-center gap-2 p-4">
              {isNote ? (
                // Note mode buttons
                <>
                  <Button
                    onClick={() => setNoteMode('preview')}
                    variant={noteMode === 'preview' ? 'default' : 'ghost'}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Eye size={16} />
                    Preview
                  </Button>
                  <Button
                    onClick={() => setNoteMode('edit')}
                    variant={noteMode === 'edit' ? 'default' : 'ghost'}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Edit size={16} />
                    Edit
                  </Button>
                </>
              ) : isYouTubeUrl(card.url) ? (
                // YouTube-specific info
                <div className="text-sm text-gray-400">
                  Video Player
                </div>
              ) : (
                // URL cards with tabs
                <>
                  <Button
                    onClick={() => setBottomTabMode('preview')}
                    variant={bottomTabMode === 'preview' ? 'default' : 'ghost'}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Globe size={16} />
                    Preview
                  </Button>
                  <Button
                    onClick={() => setBottomTabMode('reader')}
                    variant={bottomTabMode === 'reader' ? 'default' : 'ghost'}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <BookOpen size={16} />
                    Reader
                  </Button>
                  <Button
                    onClick={() => setBottomTabMode('metadata')}
                    variant={bottomTabMode === 'metadata' ? 'default' : 'ghost'}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Tag size={16} />
                    Metadata
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Slide-Out Sheet for Details - HIDDEN: Now using global control panel */}
      {false && (<div
        className={`fixed top-0 right-0 h-full w-full md:w-[480px] border-l border-white/10 bg-white/5 backdrop-blur-lg shadow-2xl z-[102] flex transition-transform duration-300 ${
          isDetailsOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Unified Tabs with Vertical Sidebar */}
        <Tabs defaultValue="pawkits" className="flex-1 flex min-h-0 overflow-hidden">
          {/* Vertical Tab Navigation Sidebar */}
          <TabsList className="w-16 border-r border-white/10 flex flex-col items-center py-4 gap-2 flex-shrink-0 bg-transparent rounded-none h-auto">
            <TabsTrigger
              value="pawkits"
              className="w-12 h-12 rounded-xl flex items-center justify-center border border-transparent data-[state=active]:border-accent data-[state=active]:bg-white/10 data-[state=active]:shadow-glow-accent hover:bg-white/5 transition-all"
              title="Pawkits"
            >
              <FolderOpen className="h-5 w-5" />
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="w-12 h-12 rounded-xl flex items-center justify-center border border-transparent data-[state=active]:border-accent data-[state=active]:bg-white/10 data-[state=active]:shadow-glow-accent hover:bg-white/5 transition-all"
              title="Notes"
            >
              <FileText className="h-5 w-5" />
            </TabsTrigger>
            <TabsTrigger
              value="links"
              className="w-12 h-12 rounded-xl flex items-center justify-center border border-transparent data-[state=active]:border-accent data-[state=active]:bg-white/10 data-[state=active]:shadow-glow-accent hover:bg-white/5 transition-all"
              title="Links"
            >
              <Link2 className="h-5 w-5" />
            </TabsTrigger>
            {isNote && (
              <TabsTrigger
                value="tags"
                className="w-12 h-12 rounded-xl flex items-center justify-center border border-transparent data-[state=active]:border-accent data-[state=active]:bg-white/10 data-[state=active]:shadow-glow-accent hover:bg-white/5 transition-all"
                title="Tags"
              >
                <Tag className="h-5 w-5" />
              </TabsTrigger>
            )}
            <TabsTrigger
              value="schedule"
              className="w-12 h-12 rounded-xl flex items-center justify-center border border-transparent data-[state=active]:border-accent data-[state=active]:bg-white/10 data-[state=active]:shadow-glow-accent hover:bg-white/5 transition-all"
              title="Schedule"
            >
              <Clock className="h-5 w-5" />
            </TabsTrigger>
            {!isNote && !isYouTubeUrl(card.url) && (
              <>
                <TabsTrigger
                  value="reader"
                  className="w-12 h-12 rounded-xl flex items-center justify-center border border-transparent data-[state=active]:border-accent data-[state=active]:bg-white/10 data-[state=active]:shadow-glow-accent hover:bg-white/5 transition-all"
                  title="Reader"
                >
                  <BookOpen className="h-5 w-5" />
                </TabsTrigger>
                <TabsTrigger
                  value="summary"
                  className="w-12 h-12 rounded-xl flex items-center justify-center border border-transparent data-[state=active]:border-accent data-[state=active]:bg-white/10 data-[state=active]:shadow-glow-accent hover:bg-white/5 transition-all"
                  title="Summary"
                >
                  <Sparkles className="h-5 w-5" />
                </TabsTrigger>
              </>
            )}
            <TabsTrigger
              value="actions"
              className="w-12 h-12 rounded-xl flex items-center justify-center border border-transparent data-[state=active]:border-accent data-[state=active]:bg-white/10 data-[state=active]:shadow-glow-accent hover:bg-white/5 transition-all"
              title="Actions"
            >
              <Zap className="h-5 w-5" />
            </TabsTrigger>

            {/* Close button at the bottom */}
            <div className="flex-1" />
            <button
              onClick={() => setIsDetailsOpen(false)}
              className="md:hidden w-12 h-12 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all"
              title="Hide details"
            >
              <span className="text-2xl">‹</span>
            </button>
            <button
              onClick={handleClose}
              className="w-12 h-12 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all"
              title="Close modal"
            >
              <span className="text-2xl">×</span>
            </button>
          </TabsList>

          {/* Scrollable Container for Tab Content + Metadata + Buttons */}
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
            <div className="flex-1">
              <TabsContent value="pawkits" className="p-4 mt-0 h-full">
                <PawkitsTab
                  collections={collections}
                  currentCollections={card.collections || []}
                  onSelect={handleAddToPawkit}
                />
              </TabsContent>
              <TabsContent value="notes" className="p-4 mt-0 h-full">
                <NotesTab
                  notes={notes}
                  onChange={setNotes}
                  onSave={handleSaveNotes}
                  saving={saving}
                />
              </TabsContent>
              <TabsContent value="links" className="p-4 mt-0 h-full">
                <BacklinksPanel
                  noteId={card.id}
                  onNavigate={(cardId) => {
                    console.log('[CardDetailModal] onNavigate called with cardId:', cardId);
                    if (onNavigateToCard) {
                      console.log('[CardDetailModal] Calling onNavigateToCard');
                      onNavigateToCard(cardId);
                    } else {
                      console.log('[CardDetailModal] onNavigateToCard is not defined');
                    }
                  }}
                />
              </TabsContent>
              {isNote && (
                <TabsContent value="tags" className="p-4 mt-0 h-full">
                  <TagsTab content={content} />
                </TabsContent>
              )}
              {!isYouTubeUrl(card.url) && (
                <>
                  <TabsContent value="reader" className="p-4 mt-0 h-full">
                    <ReaderTab
                      hasContent={!!articleContent}
                      onExtract={handleExtractArticle}
                      extracting={extracting}
                    />
                  </TabsContent>
                  <TabsContent value="summary" className="p-4 mt-0 h-full">
                    <SummaryTab card={card} />
                  </TabsContent>
                </>
              )}
              <TabsContent value="actions" className="p-4 mt-0 h-full">
                <ActionsTab
                  card={card}
                  onRefreshMetadata={handleRefreshMetadata}
                  isPinned={isPinned}
                  onTogglePin={handleTogglePin}
                />
              </TabsContent>
              <TabsContent value="schedule" className="p-4 mt-0 h-full">
                <ScheduleTab
                  scheduledDate={card.scheduledDate}
                  onSave={handleSaveScheduledDate}
                />
              </TabsContent>
            </div>

            {/* Metadata Section */}
            <div className="border-t border-white/10 p-3 flex-shrink-0">
              <MetadataSection card={card} />
            </div>

            {/* Den and Delete Buttons */}
            <div className="border-t border-white/10 p-3 flex-shrink-0 space-y-2">
              <GlowButton
                onClick={handleMoveToDen}
                variant="primary"
                size="md"
                className="w-full"
              >
                🏠 {isInDen ? "Remove from The Den" : "Move to The Den"}
              </GlowButton>
              <GlowButton
                onClick={handleDelete}
                variant="danger"
                size="md"
                className="w-full"
              >
                Delete Card
              </GlowButton>
            </div>
          </div>
        </Tabs>
      </div>)}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );

  return createPortal(modalContent, document.body);
}
// Pawkits Tab
type PawkitsTabProps = {
  collections: CollectionNode[];
  currentCollections: string[];
  onSelect: (slug: string) => void;
};

function PawkitsTab({ collections, currentCollections, onSelect }: PawkitsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Recursively filter collections based on search
  const filterCollections = (nodes: CollectionNode[], query: string): CollectionNode[] => {
    if (!query) return nodes;

    return nodes.reduce<CollectionNode[]>((acc, node) => {
      const matchesSearch = node.name.toLowerCase().includes(query.toLowerCase());
      const filteredChildren = filterCollections(node.children, query);

      if (matchesSearch || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren
        });
      }

      return acc;
    }, []);
  };

  const filteredCollections = filterCollections(collections, searchQuery);

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Click to add or remove this card from Pawkits
      </p>

      {/* Search input */}
      <Input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search Pawkits..."
      />

      {/* Collections list */}
      <div className="space-y-1">
        {collections.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No Pawkits available</p>
        ) : filteredCollections.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No Pawkits match your search</p>
        ) : (
          filteredCollections.map((collection) => (
            <PawkitTreeItem
              key={collection.id}
              node={collection}
              depth={0}
              currentCollections={currentCollections}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}

type PawkitTreeItemProps = {
  node: CollectionNode;
  depth: number;
  currentCollections: string[];
  onSelect: (slug: string) => void;
};

function PawkitTreeItem({ node, depth, currentCollections, onSelect }: PawkitTreeItemProps) {
  const hasChildren = node.children && node.children.length > 0;
  const paddingLeft = 16 + (depth * 16);
  const isActive = currentCollections?.includes(node.slug) || false;

  return (
    <>
      <Button
        onClick={() => onSelect(node.slug)}
        variant={isActive ? "default" : "secondary"}
        className="w-full justify-between text-left"
        style={{ paddingLeft: `${paddingLeft + 16}px` }}
      >
        <span className="flex items-center gap-2">
          📁 {node.name}
        </span>
        {isActive && <span className="text-lg">✓</span>}
      </Button>
      {hasChildren && node.children.map((child) => (
        <PawkitTreeItem
          key={child.id}
          node={child}
          depth={depth + 1}
          currentCollections={currentCollections}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

// Notes Tab
function NotesTab({
  notes,
  onChange,
  onSave,
  saving
}: {
  notes: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-3">
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add notes about this card..."
        className="w-full min-h-[200px] rounded border border-gray-800 bg-gray-900 p-3 text-sm text-gray-100 placeholder-gray-500 resize-none focus:border-accent focus:outline-none"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {saving ? "Saving..." : "Auto-saves after 2s pause"}
        </span>
        <Button
          onClick={onSave}
          disabled={saving}
          size="sm"
        >
          Save Now
        </Button>
      </div>
    </div>
  );
}

// Reader Tab
function ReaderTab({
  hasContent,
  onExtract,
  extracting
}: {
  hasContent: boolean;
  onExtract: () => void;
  extracting: boolean;
}) {
  if (hasContent) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Article content loaded. Click the expand button in the article view to read in fullscreen.
        </p>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📖</div>
          <p className="text-sm text-gray-400">Article ready to read</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Extract the article content for distraction-free reading
      </p>
      <Button
        onClick={onExtract}
        disabled={extracting}
        className="w-full"
        size="lg"
      >
        {extracting ? (
          <>
            <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Kit is fetching...
          </>
        ) : (
          <>
            🐕 Let Kit Fetch Article
          </>
        )}
      </Button>
      <div className="text-center py-8">
        <div className="text-gray-500 mb-2">
          <Bookmark size={48} />
        </div>
        <p className="text-sm text-gray-500">No article content yet</p>
      </div>
    </div>
  );
}

// Summary Tab
function SummaryTab({ card }: { card: CardModel }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        AI-powered summaries coming soon
      </p>
      {card.description && (
        <div className="rounded bg-gray-900/50 p-4">
          <h4 className="text-xs font-medium text-gray-400 mb-2">Description</h4>
          <p className="text-sm text-gray-300">{card.description}</p>
        </div>
      )}
      <div className="text-center py-8">
        <div className="text-4xl mb-2">🤖</div>
        <p className="text-sm text-gray-500">Summary feature coming soon</p>
      </div>
    </div>
  );
}

// Actions Tab
type ActionsTabProps = {
  card: CardModel;
  onRefreshMetadata: () => Promise<void>;
  isPinned: boolean;
  onTogglePin: () => void;
};

function ActionsTab({ card, onRefreshMetadata, isPinned, onTogglePin }: ActionsTabProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefreshMetadata();
    setRefreshing(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 mb-4">
        Additional actions for this card
      </p>

      {/* Pin/Unpin Button */}
      <Button
        onClick={onTogglePin}
        variant={isPinned ? "default" : "secondary"}
        className="w-full justify-start"
      >
        {isPinned ? "📌 Unpin from Home" : "📌 Pin to Home"}
      </Button>

      {/* Only show for URL cards */}
      {card.type === 'url' && (
        <Button
          variant="secondary"
          className="w-full justify-start"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? '🔄 Refreshing...' : '🔄 Refresh Metadata'}
        </Button>
      )}

      <Button variant="secondary" className="w-full justify-start">
        <Globe size={16} className="mr-2" />
        Copy Link
      </Button>
      <Button variant="secondary" className="w-full justify-start">
        📤 Share
      </Button>
      <Button variant="secondary" className="w-full justify-start">
        📋 Duplicate
      </Button>
      <div className="text-center py-8">
        <p className="text-xs text-gray-500">More actions coming soon</p>
      </div>
    </div>
  );
}

// Metadata Section
function MetadataSection({ card }: { card: CardModel }) {
  const { updateCard: updateCardInStore } = useDemoAwareStore();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(card.title || "");

  const handleSaveTitle = async () => {
    if (editedTitle.trim() === card.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      await updateCardInStore(card.id, { title: editedTitle.trim() });
      setIsEditingTitle(false);
    } catch (error) {
      console.error("Failed to update title:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveTitle();
    } else if (e.key === "Escape") {
      setEditedTitle(card.title || "");
      setIsEditingTitle(false);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-gray-500 uppercase">Details</h3>

      <div>
        {isEditingTitle ? (
          <div className="mb-1">
            <textarea
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveTitle}
              autoFocus
              rows={4}
              className="w-full text-sm font-semibold text-gray-100 bg-gray-800 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-accent resize-y"
              placeholder="Enter title..."
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-1 group">
            <h4 className="flex-1 text-sm font-semibold text-gray-100">
              {card.title || card.domain || "Untitled"}
            </h4>
            <button
              onClick={() => setIsEditingTitle(true)}
              className="text-gray-500 hover:text-gray-200 transition-colors flex-shrink-0"
              title="Edit title"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        )}
        <a
          href={card.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent hover:underline break-all"
        >
          {card.url}
        </a>
      </div>

      {card.collections && Array.isArray(card.collections) && card.collections.length > 0 && (
        <div>
          <h5 className="text-xs text-gray-500 mb-1">Pawkits</h5>
          <div className="flex flex-wrap gap-2">
            {card.collections.map((collection) => (
              <Badge key={collection} variant="secondary">
                📁 {collection}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {card.tags && card.tags.length > 0 && (
        <div>
          <h5 className="text-xs text-gray-500 mb-1">Tags</h5>
          <div className="flex flex-wrap gap-2">
            {card.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 text-xs text-gray-400">
        {card.status === "PENDING" && (
          <div className="flex justify-between">
            <span>Status</span>
            <Badge variant="secondary">Kit is Fetching</Badge>
          </div>
        )}
        {card.status === "ERROR" && (
          <div className="flex justify-between">
            <span>Status</span>
            <Badge variant="destructive">Fetch Error</Badge>
          </div>
        )}
        <div className="flex justify-between">
          <span>Domain</span>
          <span className="text-gray-300">{card.domain || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span>Created</span>
          <span className="text-gray-300">
            {new Date(card.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Updated</span>
          <span className="text-gray-300">
            {new Date(card.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// Schedule Tab
type ScheduleTabProps = {
  scheduledDate: string | null;
  onSave: (date: string | null) => void;
};

function ScheduleTab({ scheduledDate, onSave }: ScheduleTabProps) {
  const router = useRouter();
  // Convert scheduledDate (ISO string) to YYYY-MM-DD for date input
  const initialDate = scheduledDate ? scheduledDate.split('T')[0] : "";
  const [date, setDate] = useState(initialDate);

  const handleSave = () => {
    if (!date) return;
    // Convert YYYY-MM-DD to ISO datetime at noon UTC to avoid timezone issues
    const isoDate = `${date}T12:00:00.000Z`;
    onSave(isoDate);
  };

  const handleClear = () => {
    setDate("");
    onSave(null);
  };

  const handleViewOnCalendar = () => {
    router.push('/calendar');
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-200 mb-2">📅 Schedule for Calendar</h4>
        <p className="text-xs text-gray-400 mb-4">
          Assign a date to this card to display it on your calendar. Perfect for tracking release dates, reminders, or countdowns.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-300 mb-2">
          Scheduled Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded bg-gray-900 px-3 py-2 text-sm text-gray-100 border border-gray-800 focus:border-accent focus:outline-none"
        />
      </div>

      {date && (
        <div className="p-3 rounded bg-gray-900 border border-gray-800">
          <p className="text-xs text-gray-400">
            This card will appear on your calendar on{" "}
            <button
              onClick={handleViewOnCalendar}
              className="text-accent font-medium hover:underline cursor-pointer"
            >
              {(() => {
                // Parse YYYY-MM-DD as local date to avoid timezone issues
                const [year, month, day] = date.split('-').map(Number);
                return new Date(year, month - 1, day).toLocaleDateString();
              })()}
            </button>
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave} className="flex-1" disabled={!date}>
          Save Date
        </Button>
        {scheduledDate && (
          <Button onClick={handleClear} variant="outline" className="flex-1">
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
