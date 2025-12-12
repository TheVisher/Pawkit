"use client";

import { useEffect, useState, useRef, useMemo, ReactNode, HTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import remarkBreaks from "remark-breaks";
import { CardModel, CollectionNode, ExtractedDate, NoteFolderNode } from "@/lib/types";
import { getMostRelevantDate, extractDatesFromMetadata } from "@/lib/utils/extract-dates";
import { useDataStore, extractAndSaveLinks } from "@/lib/stores/data-store";
import { localDb } from "@/lib/services/local-storage";
import { useToastStore } from "@/lib/stores/toast-store";
import { ReaderView } from "@/components/reader/reader-view";
import { RichMDEditor } from "@/components/notes/md-editor";
import { DualPaneEditor } from "@/components/notes/dual-pane-editor";
import { BacklinksPanel } from "@/components/notes/backlinks-panel";
import { AttachmentsSection } from "@/components/modals/attachments-section";
import { AttachmentsTabContent } from "@/components/modals/attachments-tab-content";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { extractYouTubeId, isYouTubeUrl } from "@/lib/utils/youtube";
import { FileText, Bookmark, Globe, Tag, FolderOpen, Folder, Link2, Clock, Zap, BookOpen, Sparkles, X, MoreVertical, RefreshCw, Share2, Pin, Trash2, Maximize2, Search, Tags, Edit, Eye, Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Heading1, Heading2, Heading3, Link as LinkIcon, ChevronDown, ImageIcon, Calendar, ChevronRight, Plus, Paperclip, Download, Info } from "lucide-react";
import { formatFileSize } from "@/lib/utils/file-utils";
import { findBestFuzzyMatch } from "@/lib/utils/fuzzy-match";
import { extractTags } from "@/lib/stores/data-store";

// ReactMarkdown code component props
interface CodeComponentProps extends HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children?: ReactNode;
}

// ReactMarkdown anchor component props
interface AnchorComponentProps extends HTMLAttributes<HTMLAnchorElement> {
  href?: string;
  children?: ReactNode;
}
import { GlowButton } from "@/components/ui/glow-button";
import { useTrackCardView } from "@/lib/hooks/use-recent-history";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { CalendarEvent } from "@/lib/types/calendar";
import { format } from "date-fns";
import { useFileStore } from "@/lib/stores/file-store";
import { FileCard, FileChip } from "@/components/files/file-card";
import { FileUploadButton } from "@/components/files/file-drop-zone";
import { FilePreviewModal } from "@/components/files/file-preview-modal";
import { StoredFile } from "@/lib/types";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { useNoteFolderStore } from "@/lib/stores/note-folder-store";
import { FolderInput } from "lucide-react";

// Dynamic imports to avoid SSR issues with pdf.js
const PdfViewer = dynamic(
  () => import("@/components/files/pdf-viewer").then((mod) => mod.PdfViewer),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><div className="animate-spin h-8 w-8 border-2 border-gray-500 border-t-accent rounded-full" /></div> }
);

const PdfReaderView = dynamic(
  () => import("@/components/files/pdf-reader-view").then((mod) => mod.PdfReaderView),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><div className="animate-spin h-8 w-8 border-2 border-gray-500 border-t-accent rounded-full" /></div> }
);

const PdfMetadataView = dynamic(
  () => import("@/components/files/pdf-metadata-view").then((mod) => mod.PdfMetadataView),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><div className="animate-spin h-8 w-8 border-2 border-gray-500 border-t-accent rounded-full" /></div> }
);

type CardDetailModalProps = {
  card: CardModel;
  collections: CollectionNode[];
  onClose: () => void;
  onUpdate: (card: CardModel) => void;
  onDelete: () => void;
  onNavigateToCard?: (cardId: string) => void;
};

export function CardDetailModal({ card, collections, onClose, onUpdate, onDelete, onNavigateToCard }: CardDetailModalProps) {
  const router = useRouter();
  const { updateCard: updateCardInStore, deleteCard: deleteCardFromStore } = useDataStore();
  const dataStore = useDataStore();
  const allCards = dataStore.cards;
  const isNote = card.type === "md-note" || card.type === "text-note";
  const isFileCard = card.type === "file";
  const [isMounted, setIsMounted] = useState(false);

  // Note folder store for folder info and move functionality
  const { getFolderById, getFolderTree, fetchFolders } = useNoteFolderStore();
  const currentFolder = isNote && card.noteFolderId ? getFolderById(card.noteFolderId) : null;

  // File card preview state - must be declared before useEffects that use them
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [filePreviewData, setFilePreviewData] = useState<StoredFile | null>(null);

  // Determine if this is a PDF file card - check MIME type from file data
  // PDF is now in "document" category, so check MIME type instead
  const isPdfFileCard = isFileCard && (
    (card.metadata as { fileMimeType?: string } | null)?.fileMimeType === "application/pdf" ||
    filePreviewData?.mimeType === "application/pdf"
  );

  const files = useFileStore((state) => state.files);
  const loadFiles = useFileStore((state) => state.loadFiles);

  // Open control panel with card details when modal opens
  const openCardDetails = usePanelStore((state) => state.openCardDetails);
  const restorePreviousContent = usePanelStore((state) => state.restorePreviousContent);

  // Panel controls for reader mode - hide sidebars when expanded
  // Use hideRight/showRight instead of close/open to preserve activeCardId
  const closeLeftPanel = usePanelStore((state) => state.closeLeft);
  const openLeftPanel = usePanelStore((state) => state.openLeft);
  const hideRightPanel = usePanelStore((state) => state.hideRight);
  const showRightPanel = usePanelStore((state) => state.showRight);
  const isLeftPanelOpen = usePanelStore((state) => state.isLeftOpen);
  const isRightPanelOpen = usePanelStore((state) => state.isOpen);

  // Track panel states before entering reader mode (to restore later)
  const [panelStatesBeforeReader, setPanelStatesBeforeReader] = useState<{
    leftOpen: boolean;
    rightOpen: boolean;
  } | null>(null);

  // Get panel states for modal positioning
  const isLeftOpen = usePanelStore((state) => state.isLeftOpen);
  const leftMode = usePanelStore((state) => state.leftMode);
  const isPanelOpen = usePanelStore((state) => state.isOpen);
  const panelMode = usePanelStore((state) => state.mode);

  // Mobile detection - modal is full-screen on mobile
  const isMobile = useIsMobile();

  // Calculate modal offset based on panel states
  // On mobile: no offsets, modal takes full screen
  // Floating panels: 325px width + 16px margin on each side = 357px total space
  // Anchored panels: 325px width, flush to edge
  const leftOffset = isMobile ? "0px" : (isLeftOpen
    ? (leftMode === "floating" ? "357px" : "325px")
    : "0px");

  const rightOffset = isMobile ? "0px" : (isPanelOpen
    ? (panelMode === "floating" ? "357px" : "325px")
    : "0px");

  // Track card view for recent history
  useTrackCardView(card);

  // Track if component is mounted (for portal rendering)
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Open control panel when card modal opens or card changes.
  // On mobile: only set activeCardId without opening the side panel
  // Do NOT restore in cleanup here, because card switches (key changes)
  // would trigger cleanup and incorrectly restore the panel.
  const setActiveCardId = usePanelStore((state) => state.setActiveCardId);
  useEffect(() => {
    if (isMobile) {
      // On mobile, just set the active card ID without opening the right panel
      setActiveCardId(card.id);
    } else {
      // On desktop, open the control panel with card details
      openCardDetails(card.id);
    }
  }, [card.id, isMobile, openCardDetails, setActiveCardId]);

  // Initialize data store if not already initialized
  useEffect(() => {
    if (!dataStore.isInitialized) {
      dataStore.initialize();
    }
  }, [dataStore]);

  // Load original file for file cards
  useEffect(() => {
    if (isFileCard && card.fileId) {
      // Load files if not already loaded
      loadFiles();
    }
  }, [isFileCard, card.fileId, loadFiles]);

  // Set file preview URL when files are loaded
  useEffect(() => {
    if (isFileCard && card.fileId && files.length > 0) {
      const storedFile = files.find((f) => f.id === card.fileId);
      if (storedFile?.blob) {
        const url = URL.createObjectURL(storedFile.blob);
        setFilePreviewUrl(url);
        setFilePreviewData(storedFile);
        return () => URL.revokeObjectURL(url);
      }
    }
    return undefined;
  }, [isFileCard, card.fileId, files]);

  // Extract links when modal opens if this is a note with content
  // Note: Link extraction is now handled automatically by the data store
  // when content is updated via the auto-save mechanism
  const [notes, setNotes] = useState(card.notes ?? "");
  const [content, setContent] = useState(card.content ?? "");

  // Wait for cards to load before building title map
  const [cardsReady, setCardsReady] = useState(false);

  useEffect(() => {
    if (allCards.length > 0 && !cardsReady) {
      setCardsReady(true);
    }
  }, [allCards.length, cardsReady]);

  // Create a map of note titles to IDs for wiki-link resolution
  const noteTitleMap = useMemo(() => {
    if (!cardsReady) {
      return new Map<string, string>();
    }

    const map = new Map<string, string>();
    allCards.forEach((c) => {
      if ((c.type === 'md-note' || c.type === 'text-note') && c.title) {
        map.set(c.title.toLowerCase(), c.id);
      }
    });

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
  const wikiLinkComponents: Components = useMemo(() => ({
    code: ({ inline, className, children, ...props }: CodeComponentProps) => {
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
              backgroundColor: 'var(--ds-accent-muted)', // Accent tint
              borderColor: 'var(--ds-accent)',
              color: 'var(--ds-accent)', // Accent color
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
    a: ({ href, children, ...props }: AnchorComponentProps) => {
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

          if (noteId && onNavigateToCard) {
            return (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNavigateToCard(noteId);
                }}
                className="!text-accent hover:!text-accent !underline !decoration-accent/50 hover:!decoration-accent cursor-pointer !font-bold transition-colors"
                style={{ color: '#c084fc', textDecoration: 'underline', textDecorationColor: '#c084fc80' }}
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
  }), [cardTitleMap, allCards, onNavigateToCard]);
  const [saving, setSaving] = useState(false);
  const toast = useToastStore();
  const [isPinned, setIsPinned] = useState(card.pinned ?? false);
  const [isInDen, setIsInDen] = useState(card.collections?.includes('the-den') ?? false);
  const [isReaderExpanded, setIsReaderExpanded] = useState(false);
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [articleContent, setArticleContent] = useState(card.articleContent ?? null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState(card.summary ?? null);
  const [summaryType, setSummaryType] = useState<'concise' | 'detailed' | null>(card.summaryType ?? null);
  const [showSummaryOptions, setShowSummaryOptions] = useState(false);

  // Modal resize state with localStorage persistence
  const [modalSize, setModalSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pawkit-modal-size');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return { width: 896, height: 720 };
        }
      }
    }
    return { width: 896, height: 720 }; // Default ~max-w-4xl
  });
  const [isResizing, setIsResizing] = useState(false);

  // Bottom tab view mode: 'preview' | 'reader' | 'info'
  const [bottomTabMode, setBottomTabMode] = useState<'preview' | 'reader' | 'info' | 'attachments'>('preview');

  // Auto-expand to fullscreen when Reader tab is selected for PDF files
  useEffect(() => {
    if (bottomTabMode === 'reader' && isPdfFileCard && card.fileId) {
      setIsReaderExpanded(true);
    }
  }, [bottomTabMode, isPdfFileCard, card.fileId]);

  // Hide sidebars when entering reader mode, restore when exiting
  useEffect(() => {
    if (isReaderExpanded) {
      // Store current panel states before hiding
      setPanelStatesBeforeReader({
        leftOpen: isLeftPanelOpen,
        rightOpen: isRightPanelOpen,
      });
      // Hide both panels (use hideRight to preserve activeCardId)
      closeLeftPanel();
      hideRightPanel();
    } else if (panelStatesBeforeReader) {
      // Restore panels to their previous states
      if (panelStatesBeforeReader.leftOpen) {
        openLeftPanel();
      }
      if (panelStatesBeforeReader.rightOpen) {
        showRightPanel();
      }
      setPanelStatesBeforeReader(null);
    }
  }, [isReaderExpanded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key handler for reader mode
  useEffect(() => {
    if (!isReaderExpanded) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsReaderExpanded(false);
        setBottomTabMode('preview');
      }
    };

    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [isReaderExpanded]);

  // Check for attachments
  const attachments = useMemo(
    () => files.filter((f) => f.cardId === card.id && !f.deleted),
    [files, card.id]
  );
  const hasAttachments = attachments.length > 0;
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalExpanded, setIsModalExpanded] = useState(false);
  const [isThumbnailModalOpen, setIsThumbnailModalOpen] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(card.image || "");
  const [thumbnailPreviewError, setThumbnailPreviewError] = useState(false);
  const [thumbnailPreviewLoaded, setThumbnailPreviewLoaded] = useState(false);

  const [noteMode, setNoteMode] = useState<'edit' | 'preview'>('preview');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(card.title || "");
  const [showNoteToolbar, setShowNoteToolbar] = useState(true);
  const lastSavedNotesRef = useRef(card.notes ?? "");
  const lastSavedContentRef = useRef(card.content ?? "");
  const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);

  // Get event store for calendar integration
  const { events, addEvent } = useEventStore();

  // Check if this card already has a linked calendar event
  const linkedCalendarEvent = useMemo(() => {
    return events.find(e => e.source?.type === 'card' && e.source?.cardId === card.id);
  }, [events, card.id]);

  // Extract release date from metadata on-the-fly
  const extractedReleaseDate = useMemo(() => {
    // First check if dates were already stored on the card
    if (card.extractedDates && card.extractedDates.length > 0) {
      return getMostRelevantDate(card.extractedDates);
    }
    // Otherwise, extract from metadata
    if (card.metadata && card.type === 'url') {
      const extractedDates = extractDatesFromMetadata(card.metadata as Record<string, unknown>);
      if (extractedDates.length > 0) {
        return getMostRelevantDate(extractedDates);
      }
    }
    return null;
  }, [card.extractedDates, card.metadata, card.type, card.id]);

  // Helper to get color for date type
  const getDateTypeColor = (type: string): string => {
    switch (type) {
      case 'release': return '#9333ea'; // Purple for releases
      case 'event': return '#3b82f6';   // Blue for events
      case 'deadline': return '#ef4444'; // Red for deadlines
      default: return '#9333ea';
    }
  };

  // Handle adding to calendar
  const handleAddToCalendar = async () => {
    if (!extractedReleaseDate) return;
    setIsAddingToCalendar(true);

    try {
      await addEvent({
        title: card.title || card.domain || 'Saved Link',
        date: extractedReleaseDate.date,
        endDate: extractedReleaseDate.endDate || null,
        isAllDay: true,
        description: card.description || undefined,
        url: card.url || undefined,
        color: getDateTypeColor(extractedReleaseDate.type),
        source: {
          type: 'card',
          cardId: card.id,
        },
      });

      toast.success('Added to calendar!');
    } catch (error) {
      console.error('Failed to add to calendar:', error);
      toast.error('Failed to add to calendar');
    } finally {
      setIsAddingToCalendar(false);
    }
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string): string => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return format(date, 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

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

  // Update initial values when card changes
  useEffect(() => {
    setNotes(card.notes ?? "");
    lastSavedNotesRef.current = card.notes ?? "";
  }, [card.id, card.notes]);

  useEffect(() => {
    setContent(card.content ?? "");
    lastSavedContentRef.current = card.content ?? "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]); // Removed card.content to prevent cursor jumping when typing

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
    setIsInDen(card.collections?.includes('the-den') ?? false);
    setIsPinned(card.pinned ?? false);
    setArticleContent(card.articleContent ?? null);
    setNotes(card.notes ?? "");
    setContent(card.content ?? "");
    lastSavedNotesRef.current = card.notes ?? "";
    lastSavedContentRef.current = card.content ?? "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id, card.title]);

  // Save on modal close to ensure nothing is lost
  const handleClose = async () => {
    // Save any pending changes before closing
    if (notes !== lastSavedNotesRef.current) {
      try {
        await updateCardInStore(card.id, { notes });
        lastSavedNotesRef.current = notes;
      } catch (error) {
      }
    }

    if (isNote && content !== lastSavedContentRef.current) {
      try {
        await updateCardInStore(card.id, { content });
        lastSavedContentRef.current = content;
      } catch (error) {
        alert('Failed to save content on close: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }

    onClose();

    // Only restore previous panel content on an actual close action
    // (not during card switches).
    try {
      restorePreviousContent();
    } catch (err) {
      // no-op safeguard
    }
  };

  // Note: ESC key handling is managed by the keyboard shortcuts hook in layout.tsx
  // This provides proper priority: autocomplete → modal → right panel → left panel

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
      toast.success("Notes saved");
    } catch (error) {
      toast.error("Failed to save notes");
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

    toast.success(newPinned ? "Pinned to home" : "Unpinned from home");
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
      toast.success("Title updated");
    } catch (error) {
      toast.error("Failed to update title");
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

    // Update the global store (optimistic update)
    await updateCardInStore(card.id, { collections: nextCollections });

    // Also update parent component state
    const updated = { ...card, collections: nextCollections };
    onUpdate(updated);

    // If card was in Den and is now being moved out, close the modal
    const wasInDen = card.collections?.includes('the-den');
    const nowInDen = nextCollections.includes('the-den');
    if (wasInDen && !nowInDen) {
      toast.success("Moved out of The Den");
      // Close modal after a brief delay to show the toast
      setTimeout(() => handleClose(), 500);
      return;
    }

    toast.success(isAlreadyIn ? "Removed from Pawkit" : "Added to Pawkit");
  };

  // Handle moving note to folder
  const handleMoveToFolder = async (folderId: string | null) => {
    if (!isNote) return;

    await updateCardInStore(card.id, { noteFolderId: folderId });
    const updated = { ...card, noteFolderId: folderId };
    onUpdate(updated);

    if (folderId) {
      const folder = getFolderById(folderId);
      toast.success(`Moved to ${folder?.name || 'folder'}`);
    } else {
      toast.success("Removed from folder");
    }
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
        toast.success("Article extracted successfully");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to extract article");
      }
    } catch (error) {
      toast.error("Failed to extract article");
    } finally {
      setExtracting(false);
    }
  };

  const handleGenerateSummary = async (type: 'concise' | 'detailed') => {
    setIsSummarizing(true);
    setShowSummaryOptions(false);
    try {
      // Determine content to summarize based on card type
      let contentToSummarize = '';

      if (card.type === 'url') {
        // URL cards: prefer articleContent, fallback to description + title
        contentToSummarize = articleContent || card.articleContent || '';
        if (!contentToSummarize) {
          contentToSummarize = [card.title, card.description].filter(Boolean).join('\n\n');
        }
      } else if (card.type === 'md-note' || card.type === 'text-note') {
        // Notes: use content
        contentToSummarize = card.content || '';
      } else if (card.type === 'file') {
        // File cards: use filename + metadata description
        contentToSummarize = [card.title, card.description].filter(Boolean).join('\n\n');
      }

      if (!contentToSummarize.trim()) {
        toast.error("No content available to summarize");
        return;
      }

      const response = await fetch(`/api/cards/${card.id}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contentToSummarize, type })
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        setSummaryType(type);
        await updateCardInStore(card.id, { summary: data.summary, summaryType: type });
        onUpdate({ ...card, summary: data.summary, summaryType: type });
        toast.success("Summary generated");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to generate summary");
      }
    } catch (error) {
      toast.error("Failed to generate summary");
    } finally {
      setIsSummarizing(false);
    }
  };

  // Modal resize handler
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = modalSize.width;
    const startHeight = modalSize.height;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(400, Math.min(startWidth + (e.clientX - startX), window.innerWidth - 100));
      const newHeight = Math.max(300, Math.min(startHeight + (e.clientY - startY), window.innerHeight - 100));
      setModalSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Persist to localStorage
      const finalSize = {
        width: Math.max(400, Math.min(startWidth + (window.event as MouseEvent)?.clientX - startX || 0, window.innerWidth - 100)),
        height: Math.max(300, Math.min(startHeight + (window.event as MouseEvent)?.clientY - startY || 0, window.innerHeight - 100))
      };
      localStorage.setItem('pawkit-modal-size', JSON.stringify(modalSize));
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleRefreshMetadata = async () => {
    toast.info("Refreshing metadata...");
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
          toast.success("Metadata refreshed successfully");
        } else {
          toast.error("Failed to fetch updated metadata");
        }
      } else {
        toast.error("Failed to refresh metadata");
      }
    } catch (error) {
      toast.error("Failed to refresh metadata");
    }
  };

  const handleDelete = async () => {
    try {
      // ✅ Use data store for soft delete
      await deleteCardFromStore(card.id);
      toast.success("Card deleted");
      onDelete();
    } catch (error) {
      toast.error("Failed to delete card");
    }
  };

  const handleMoveToDen = async () => {
    try {
      const newInDen = !isInDen;
      const currentCollections = card.collections || [];

      // Add or remove 'the-den' from collections
      const nextCollections = newInDen
        ? Array.from(new Set([...currentCollections, 'the-den']))
        : currentCollections.filter(slug => slug !== 'the-den');

      // Update the data store
      await updateCardInStore(card.id, { collections: nextCollections });

      // Update local state immediately
      setIsInDen(newInDen);

      const updated = { ...card, collections: nextCollections };

      // Simply refresh the entire data store to get the latest state from server
      // This ensures consistency and will properly filter out Den items
      const { useDataStore } = await import('@/lib/stores/data-store');
      await useDataStore.getState().refresh();

      toast.success(newInDen ? "Moved to The Den" : "Removed from The Den");

      // Close modal after moving to Den
      if (newInDen) {
        setTimeout(() => handleClose(), 500);
      }
    } catch (error) {
      toast.error("Failed to update card");
    }
  };

  const handleSaveScheduledDate = async (date: string | null) => {
    try {
      // Update store (optimistic)
      await updateCardInStore(card.id, { scheduledDate: date });

      // Update parent component state
      const updated = { ...card, scheduledDate: date };
      onUpdate(updated);

      toast.success(date ? `Scheduled for ${new Date(date).toLocaleDateString()}` : "Schedule cleared");
    } catch (error) {
      toast.error("Failed to save date");
    }
  };

  const handleOpenThumbnailModal = () => {
    setThumbnailUrl(card.image || "");
    setThumbnailPreviewError(false);
    setThumbnailPreviewLoaded(!!card.image);
    setIsThumbnailModalOpen(true);
  };

  const handleSaveThumbnail = async () => {
    try {
      const newImage = thumbnailUrl.trim() || null;
      await updateCardInStore(card.id, { image: newImage });
      onUpdate({ ...card, image: newImage });
      toast.success(newImage ? "Thumbnail updated" : "Thumbnail removed");
      setIsThumbnailModalOpen(false);
    } catch (error) {
      toast.error("Failed to update thumbnail");
    }
  };

  const handleRemoveThumbnail = async () => {
    setThumbnailUrl("");
    setThumbnailPreviewError(false);
    setThumbnailPreviewLoaded(false);
  };

  // When reader is expanded, render different layout
  // For PDF file cards
  if (isReaderExpanded && isPdfFileCard && card.fileId) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-[#faf8f3]">
          <PdfReaderView
            fileId={card.fileId}
            title={card.title || filePreviewData?.filename || "PDF Document"}
            isExpanded={true}
            onToggleExpand={() => setIsReaderExpanded(false)}
            onClose={onClose}
          />
        </div>
      </>
    );
  }

  // For article content
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
      </>
    );
  }

  // When note is expanded, render dual-pane editor
  if (isNoteExpanded && isNote) {
    return (
      <DualPaneEditor
        card={{
          id: card.id,
          title: card.title || "Untitled Note",
          content: content,
          type: card.type,
        }}
        onClose={() => setIsNoteExpanded(false)}
        onSave={(newContent) => {
          setContent(newContent);
        }}
        onNavigate={onNavigateToCard}
      />
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
        className="fixed inset-0 z-[100] bg-black/70"
        onClick={handleClose}
      />

      {/* Centered Card Content - dynamically centered over content panel */}
      <div
        className={`fixed inset-0 z-[101] flex items-center justify-center pointer-events-none ${
          isMobile ? "p-0" : "p-4 md:p-8"
        }`}
        style={{
          left: leftOffset,
          right: rightOffset,
          transition: "left 0.3s ease-out, right 0.3s ease-out",
        }}
      >
        <div
          className={`${isMobile ? "rounded-none" : "rounded-2xl"} overflow-hidden pointer-events-auto relative flex flex-col ${
            isMobile || isReaderExpanded || isModalExpanded ? "w-full h-full" : ""
          } ${isResizing ? "select-none" : ""}`}
          style={{
            width: isMobile || isReaderExpanded || isModalExpanded ? '100%' : `${modalSize.width}px`,
            height: isMobile || isReaderExpanded || isModalExpanded ? '100%' : `${modalSize.height}px`,
            maxWidth: isMobile || isReaderExpanded || isModalExpanded ? '100%' : '95vw',
            maxHeight: isMobile || isReaderExpanded || isModalExpanded ? '100%' : '95vh',
            background: 'var(--bg-surface-1)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-3)',
            backdropFilter: 'blur(16px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar - For all card types */}
          <div
            className="px-6 py-4 flex items-center justify-between flex-shrink-0 relative z-10"
            style={{
              background: 'var(--bg-surface-2)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
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
                  className="w-full text-lg font-semibold text-gray-100 bg-gray-800/50 border border-accent/50 rounded px-2 py-1 focus:outline-none focus:border-accent"
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
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-accent transition-all flex-shrink-0 p-1"
                    title="Edit title"
                  >
                    <Edit size={16} />
                  </button>
                </div>
              )}
              {isNote && noteMetadata ? (
                // Note metadata under title (like domain for URL cards)
                <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                  {currentFolder ? (
                    <span className="flex items-center gap-1">
                      <Folder size={12} className="text-accent" />
                      {currentFolder.name}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 opacity-50">
                      <FileText size={12} />
                      Unfiled
                    </span>
                  )}
                  <span>·</span>
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
                  className="text-sm text-gray-400 hover:text-accent hover:underline transition-colors truncate block mt-1"
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
                  onClick={() => toast.info("Search coming soon")}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Search within content"
                >
                  <Search size={20} className="text-gray-400" />
                </button>

                {/* Tag Button */}
                <button
                  onClick={() => toast.info("Tags coming soon")}
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
                            toast.success("Link copied to clipboard");
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
                        {!isNote && (
                          <button
                            onClick={() => {
                              setIsMenuOpen(false);
                              handleOpenThumbnailModal();
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2 transition-colors"
                          >
                            <ImageIcon size={16} />
                            Set Thumbnail
                          </button>
                        )}
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
            <div
              className="px-6 py-3 flex items-center gap-1 flex-wrap flex-shrink-0"
              style={{
                background: 'var(--bg-surface-2)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
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
                <div className="w-12 h-1.5 bg-white/10 group-hover:bg-accent/50 rounded-full transition-all duration-200 flex items-center justify-center">
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 group-hover:text-accent transition-all duration-200 ${showNoteToolbar ? '' : 'rotate-180'}`}
                  />
                </div>
              </button>
            </div>
          )}

          {/* Card Content - Image, Reader, YouTube Player, or Note Preview/Edit */}
          <div className="relative flex-1 overflow-auto min-h-0">
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
            ) : isFileCard ? (
              // File card content with tabs - similar structure to URL cards
              <div className="relative h-full">
                {/* Preview tab content */}
                <div className={`h-full flex items-center justify-center p-[5px] ${bottomTabMode === 'preview' ? '' : 'invisible'}`}>
                  {filePreviewData ? (
                    <div className="w-full h-full flex items-center justify-center">
                      {filePreviewData.category === "image" && filePreviewUrl && (
                        <img
                          src={filePreviewUrl}
                          alt={filePreviewData.filename}
                          className="max-w-full max-h-full object-contain rounded-lg"
                        />
                      )}
                      {filePreviewData.mimeType === "application/pdf" && filePreviewUrl && (
                        <div className="w-full h-full rounded-lg overflow-hidden">
                          <PdfViewer
                            url={filePreviewUrl}
                            filename={filePreviewData.filename}
                            onDownload={() => {
                              const a = document.createElement("a");
                              a.href = filePreviewUrl;
                              a.download = filePreviewData.filename;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }}
                          />
                        </div>
                      )}
                      {filePreviewData.category === "video" && filePreviewUrl && (
                        <video
                          src={filePreviewUrl}
                          controls
                          className="max-w-full max-h-full rounded-lg"
                        >
                          Your browser does not support video playback.
                        </video>
                      )}
                      {filePreviewData.category === "audio" && filePreviewUrl && (
                        <div className="flex flex-col items-center gap-6 p-8 bg-surface rounded-xl">
                          <div className="w-24 h-24 flex items-center justify-center rounded-full bg-accent/20">
                            <span className="text-4xl">🎵</span>
                          </div>
                          <div className="text-center">
                            <h4 className="text-lg font-medium text-foreground">
                              {filePreviewData.filename}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(filePreviewData.size)}
                            </p>
                          </div>
                          <audio src={filePreviewUrl} controls className="w-full max-w-md">
                            Your browser does not support audio playback.
                          </audio>
                        </div>
                      )}
                      {(filePreviewData.category === "document" || filePreviewData.category === "other") && filePreviewData.mimeType !== "application/pdf" && (
                        <div className="flex flex-col items-center gap-6 p-8 bg-surface rounded-xl">
                          <div className="w-24 h-24 flex items-center justify-center rounded-full bg-gray-600/20">
                            <FileText className="w-12 h-12 text-gray-400" />
                          </div>
                          <div className="text-center">
                            <h4 className="text-lg font-medium text-foreground">
                              {filePreviewData.filename}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-4">
                              {formatFileSize(filePreviewData.size)}
                            </p>
                            <p className="text-sm text-gray-400 mb-4">
                              Preview not available for this file type
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              if (filePreviewUrl) {
                                const a = document.createElement("a");
                                a.href = filePreviewUrl;
                                a.download = filePreviewData.filename;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              }
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            Download to View
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="w-32 h-32 mx-auto bg-gray-600 rounded-lg flex items-center justify-center animate-pulse">
                        <FileText className="w-12 h-12 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-300">
                        Loading file...
                      </h3>
                    </div>
                  )}
                </div>

                {/* Reader tab content for file cards */}
                {bottomTabMode === 'reader' && (
                  <div className="absolute inset-0 p-[5px] overflow-y-auto">
                    {isPdfFileCard && card.fileId ? (
                      <PdfReaderView
                        fileId={card.fileId}
                        title={card.title || filePreviewData?.filename || "PDF Document"}
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
                          <h3 className="text-xl font-semibold text-gray-300">Reader Not Available</h3>
                          <p className="text-sm text-gray-500 max-w-md mx-auto">
                            Reader mode is only available for PDF files.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Info tab content for file cards */}
                {bottomTabMode === 'info' && (
                  <div className="absolute inset-0 p-[5px] overflow-y-auto flex items-start justify-center">
                    {isPdfFileCard && card.fileId ? (
                      <PdfMetadataView fileId={card.fileId} />
                    ) : (
                      <div className="max-w-2xl w-full space-y-6 py-8">
                        <div>
                          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>File Information</h3>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Filename</span>
                              <span className="text-right max-w-md truncate" style={{ color: 'var(--text-primary)' }}>{filePreviewData?.filename || card.title || "—"}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Type</span>
                              <span style={{ color: 'var(--text-primary)' }}>{filePreviewData?.category || "—"}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Size</span>
                              <span style={{ color: 'var(--text-primary)' }}>{filePreviewData?.size ? formatFileSize(filePreviewData.size) : "—"}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>MIME Type</span>
                              <span style={{ color: 'var(--text-primary)' }}>{filePreviewData?.mimeType || "—"}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Created</span>
                              <span style={{ color: 'var(--text-primary)' }}>{new Date(card.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Updated</span>
                              <span style={{ color: 'var(--text-primary)' }}>{new Date(card.updatedAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* AI Summary Section */}
                        <div className="p-4 rounded-xl" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Sparkles size={16} style={{ color: 'var(--ds-accent)' }} />
                              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>AI Summary</span>
                              {summaryType && (
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface-3)', color: 'var(--text-muted)' }}>
                                  {summaryType === 'concise' ? '⚡ Concise' : '📝 Detailed'}
                                </span>
                              )}
                            </div>
                            {summary && (
                              <div className="relative">
                                <button
                                  onClick={() => setShowSummaryOptions(!showSummaryOptions)}
                                  disabled={isSummarizing}
                                  className="text-xs px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                                  style={{
                                    color: 'var(--text-secondary)',
                                    background: 'var(--bg-surface-3)',
                                  }}
                                >
                                  <RefreshCw size={12} className={isSummarizing ? 'animate-spin' : ''} />
                                  Regenerate
                                </button>
                                {showSummaryOptions && !isSummarizing && (
                                  <div
                                    className="absolute top-full mt-1 right-0 rounded-lg overflow-hidden z-50"
                                    style={{
                                      background: 'var(--bg-surface-3)',
                                      border: '1px solid var(--border-subtle)',
                                      boxShadow: 'var(--shadow-3)',
                                    }}
                                  >
                                    <button
                                      onClick={() => handleGenerateSummary('concise')}
                                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors"
                                      style={{ color: 'var(--text-primary)' }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                      <Zap size={12} /> Concise
                                    </button>
                                    <button
                                      onClick={() => handleGenerateSummary('detailed')}
                                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors"
                                      style={{ color: 'var(--text-primary)' }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                      <FileText size={12} /> Detailed
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {summary ? (
                            <div className="text-sm leading-relaxed prose prose-sm max-w-none" style={{ color: 'var(--text-primary)' }}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {summary}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                                Generate an AI summary of this content
                              </p>
                              <div className="relative inline-block">
                                <button
                                  onClick={() => setShowSummaryOptions(!showSummaryOptions)}
                                  disabled={isSummarizing}
                                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
                                  style={{
                                    background: 'var(--ds-accent)',
                                    color: 'white',
                                  }}
                                >
                                  {isSummarizing ? (
                                    <>
                                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                      Kit is summarizing...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles size={16} />
                                      Generate Summary
                                    </>
                                  )}
                                </button>
                                {showSummaryOptions && !isSummarizing && (
                                  <div
                                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-lg overflow-hidden z-50"
                                    style={{
                                      background: 'var(--bg-surface-3)',
                                      border: '1px solid var(--border-subtle)',
                                      boxShadow: 'var(--shadow-3)',
                                    }}
                                  >
                                    <button
                                      onClick={() => handleGenerateSummary('concise')}
                                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors whitespace-nowrap"
                                      style={{ color: 'var(--text-primary)' }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                      <Zap size={14} /> Concise
                                    </button>
                                    <button
                                      onClick={() => handleGenerateSummary('detailed')}
                                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors whitespace-nowrap"
                                      style={{ color: 'var(--text-primary)' }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                      <FileText size={14} /> Detailed
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
              <div className="relative h-full">
                <div className={`p-4 h-full flex items-center justify-center ${bottomTabMode === 'preview' ? '' : 'invisible'}`}>
                  {card.image ? (
                    <img
                      src={card.image}
                      alt={card.title || "Card preview"}
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="w-32 h-32 mx-auto rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-surface-3)' }}>
                        <span className="text-4xl">🔗</span>
                      </div>
                      <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {card.title || card.domain || card.url}
                      </h3>
                    </div>
                  )}
                </div>

                {bottomTabMode === 'reader' && (
                  <div className="absolute inset-0 p-[5px] overflow-y-auto">
                    {/* PDF file card - show PDF reader */}
                    {isPdfFileCard && card.fileId ? (
                      <PdfReaderView
                        fileId={card.fileId}
                        title={card.title || filePreviewData?.filename || "PDF Document"}
                        isExpanded={false}
                        onToggleExpand={() => setIsReaderExpanded(true)}
                        onClose={onClose}
                      />
                    ) : articleContent ? (
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
                          <div className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                            <BookOpen size={48} className="mx-auto" />
                          </div>
                          <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>No Article Content Yet</h3>
                          <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
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

                {bottomTabMode === 'info' && (
                  <div className="absolute inset-0 p-[5px] overflow-y-auto flex items-start justify-center">
                    {/* PDF file card - show PDF info */}
                    {isPdfFileCard && card.fileId ? (
                      <PdfMetadataView fileId={card.fileId} />
                    ) : (
                      <div className="max-w-2xl w-full space-y-6 py-8">
                        <div>
                          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Card Information</h3>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Title</span>
                              <span className="text-right max-w-md truncate" style={{ color: 'var(--text-primary)' }}>{card.title || "—"}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Domain</span>
                              <span style={{ color: 'var(--text-primary)' }}>{card.domain || "—"}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>URL</span>
                              <a
                                href={card.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:underline max-w-md truncate"
                              >
                                {card.url}
                              </a>
                            </div>
                            <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Created</span>
                              <span style={{ color: 'var(--text-primary)' }}>{new Date(card.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Updated</span>
                              <span style={{ color: 'var(--text-primary)' }}>{new Date(card.updatedAt).toLocaleString()}</span>
                            </div>
                            {card.description && (
                              <div className="py-2">
                                <span className="block mb-2" style={{ color: 'var(--text-secondary)' }}>Description</span>
                                <p style={{ color: 'var(--text-primary)' }}>{card.description}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Release Date / Calendar Section */}
                        {(linkedCalendarEvent || extractedReleaseDate) && (
                          <div className="p-4 rounded-xl bg-accent/10 border border-accent/30">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                                  <Calendar size={20} className="text-accent" />
                                </div>
                                <div>
                                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    {linkedCalendarEvent ? 'On Calendar' : (extractedReleaseDate?.label || 'Release Date')}
                                  </span>
                                  <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    {linkedCalendarEvent
                                      ? formatDateDisplay(linkedCalendarEvent.date)
                                      : extractedReleaseDate ? formatDateDisplay(extractedReleaseDate.date) : ''}
                                  </div>
                                </div>
                              </div>
                              {linkedCalendarEvent ? (
                                <button
                                  onClick={() => router.push(`/calendar?date=${linkedCalendarEvent.date}`)}
                                  className="px-4 py-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 hover:text-accent-hover transition-colors text-sm font-medium flex items-center gap-2"
                                >
                                  View on Calendar
                                  <ChevronRight size={16} />
                                </button>
                              ) : extractedReleaseDate ? (
                                <button
                                  onClick={handleAddToCalendar}
                                  disabled={isAddingToCalendar}
                                  className="px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                                >
                                  <Plus size={16} />
                                  {isAddingToCalendar ? 'Adding...' : 'Add to Calendar'}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        )}

                        {/* AI Summary Section */}
                        <div className="p-4 rounded-xl" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Sparkles size={16} style={{ color: 'var(--ds-accent)' }} />
                              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>AI Summary</span>
                              {summaryType && (
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface-3)', color: 'var(--text-muted)' }}>
                                  {summaryType === 'concise' ? '⚡ Concise' : '📝 Detailed'}
                                </span>
                              )}
                            </div>
                            {summary && (
                              <div className="relative">
                                <button
                                  onClick={() => setShowSummaryOptions(!showSummaryOptions)}
                                  disabled={isSummarizing}
                                  className="text-xs px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                                  style={{
                                    color: 'var(--text-secondary)',
                                    background: 'var(--bg-surface-3)',
                                  }}
                                >
                                  <RefreshCw size={12} className={isSummarizing ? 'animate-spin' : ''} />
                                  Regenerate
                                </button>
                                {showSummaryOptions && !isSummarizing && (
                                  <div
                                    className="absolute top-full mt-1 right-0 rounded-lg overflow-hidden z-50"
                                    style={{
                                      background: 'var(--bg-surface-3)',
                                      border: '1px solid var(--border-subtle)',
                                      boxShadow: 'var(--shadow-3)',
                                    }}
                                  >
                                    <button
                                      onClick={() => handleGenerateSummary('concise')}
                                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors"
                                      style={{ color: 'var(--text-primary)' }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                      <Zap size={12} /> Concise
                                    </button>
                                    <button
                                      onClick={() => handleGenerateSummary('detailed')}
                                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors"
                                      style={{ color: 'var(--text-primary)' }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                      <FileText size={12} /> Detailed
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {summary ? (
                            <div className="text-sm leading-relaxed prose prose-sm max-w-none" style={{ color: 'var(--text-primary)' }}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {summary}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                                Generate an AI summary of this content
                              </p>
                              <div className="relative inline-block">
                                <button
                                  onClick={() => setShowSummaryOptions(!showSummaryOptions)}
                                  disabled={isSummarizing}
                                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
                                  style={{
                                    background: 'var(--ds-accent)',
                                    color: 'white',
                                  }}
                                >
                                  {isSummarizing ? (
                                    <>
                                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                      Kit is summarizing...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles size={16} />
                                      Generate Summary
                                    </>
                                  )}
                                </button>
                                {showSummaryOptions && !isSummarizing && (
                                  <div
                                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-lg overflow-hidden z-50"
                                    style={{
                                      background: 'var(--bg-surface-3)',
                                      border: '1px solid var(--border-subtle)',
                                      boxShadow: 'var(--shadow-3)',
                                    }}
                                  >
                                    <button
                                      onClick={() => handleGenerateSummary('concise')}
                                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors whitespace-nowrap"
                                      style={{ color: 'var(--text-primary)' }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                      <Zap size={14} /> Concise
                                    </button>
                                    <button
                                      onClick={() => handleGenerateSummary('detailed')}
                                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors whitespace-nowrap"
                                      style={{ color: 'var(--text-primary)' }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                      <FileText size={14} /> Detailed
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {bottomTabMode === 'attachments' && hasAttachments && (
                  <div className="absolute inset-0 overflow-hidden">
                    <AttachmentsTabContent cardId={card.id} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Bar - For all card types */}
          <div
            className="flex-shrink-0"
            style={{
              background: 'var(--bg-surface-2)',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-center gap-2 p-4">
              {isNote ? (
                // Note mode buttons - segmented pill control
                (() => {
                  const noteTabOptions = [
                    { value: 'preview' as const, label: 'Preview', icon: Eye },
                    { value: 'edit' as const, label: 'Edit', icon: Edit },
                  ];
                  const numOptions = noteTabOptions.length;
                  const selectedIndex = noteMode === 'preview' ? 0 : -1; // Edit opens expanded view

                  return (
                    <div
                      className="relative rounded-full"
                      style={{
                        background: 'var(--bg-surface-1)',
                        boxShadow: 'var(--slider-inset)',
                        border: 'var(--inset-border)',
                        borderBottomColor: 'var(--slider-inset-border-bottom)',
                        padding: '4px',
                      }}
                    >
                      {/* Sliding indicator - only show when preview is selected */}
                      {selectedIndex >= 0 && (
                        <div
                          className="absolute rounded-full transition-all duration-300 ease-out pointer-events-none"
                          style={{
                            width: `calc((100% - 8px) / ${numOptions})`,
                            height: 'calc(100% - 8px)',
                            top: '4px',
                            left: `calc(4px + (${selectedIndex} * ((100% - 8px) / ${numOptions})))`,
                            background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                            boxShadow: 'var(--raised-shadow-sm)',
                            border: '1px solid transparent',
                            borderTopColor: 'var(--raised-border-top)',
                          }}
                        />
                      )}
                      {/* Tab buttons */}
                      <div className="relative flex">
                        {noteTabOptions.map((option, index) => {
                          const Icon = option.icon;
                          const isSelected = index === selectedIndex;
                          return (
                            <button
                              key={option.value}
                              onClick={() => {
                                if (option.value === 'edit') {
                                  setIsNoteExpanded(true);
                                } else {
                                  setNoteMode(option.value);
                                }
                              }}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-colors duration-200 z-10 text-sm font-medium"
                              style={{
                                color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                              }}
                            >
                              <Icon size={14} />
                              <span>{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              ) : isYouTubeUrl(card.url) ? (
                // YouTube-specific info
                <div className="text-sm text-gray-400">
                  Video Player
                </div>
              ) : (
                // URL cards with tabs - segmented pill control with sliding indicator
                (() => {
                  const tabOptions = [
                    { value: 'preview' as const, label: 'Preview', icon: Globe },
                    { value: 'reader' as const, label: 'Reader', icon: BookOpen },
                    { value: 'info' as const, label: 'Info', icon: Info },
                    ...(hasAttachments ? [{ value: 'attachments' as const, label: `Files (${attachments.length})`, icon: Paperclip }] : []),
                  ];
                  const numOptions = tabOptions.length;
                  const selectedIndex = tabOptions.findIndex(opt => opt.value === bottomTabMode);

                  return (
                    <div
                      className="relative rounded-full"
                      style={{
                        background: 'var(--bg-surface-1)',
                        boxShadow: 'var(--slider-inset)',
                        border: 'var(--inset-border)',
                        borderBottomColor: 'var(--slider-inset-border-bottom)',
                        padding: '4px',
                      }}
                    >
                      {/* Sliding indicator */}
                      <div
                        className="absolute rounded-full transition-all duration-300 ease-out pointer-events-none"
                        style={{
                          width: `calc((100% - 8px) / ${numOptions})`,
                          height: 'calc(100% - 8px)',
                          top: '4px',
                          left: `calc(4px + (${selectedIndex} * ((100% - 8px) / ${numOptions})))`,
                          background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                          boxShadow: 'var(--raised-shadow-sm)',
                          border: '1px solid transparent',
                          borderTopColor: 'var(--raised-border-top)',
                        }}
                      />
                      {/* Tab buttons */}
                      <div className="relative flex">
                        {tabOptions.map((option) => {
                          const Icon = option.icon;
                          const isSelected = bottomTabMode === option.value;
                          return (
                            <button
                              key={option.value}
                              onClick={() => setBottomTabMode(option.value)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-colors duration-200 z-10 text-sm font-medium"
                              style={{
                                color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                              }}
                            >
                              <Icon size={14} />
                              <span>{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          {/* Resize Handle - only show on desktop when not expanded */}
          {!isMobile && !isReaderExpanded && !isModalExpanded && (
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 opacity-50 hover:opacity-100 transition-opacity"
              onMouseDown={handleResizeStart}
              style={{
                background: 'linear-gradient(135deg, transparent 50%, var(--text-muted) 50%)',
                borderRadius: '0 0 12px 0',
              }}
            />
          )}
        </div>
      </div>

      {/* Thumbnail Modal */}
      {isThumbnailModalOpen && (
        <>
          {/* Modal Backdrop */}
          <div
            className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm"
            onClick={() => setIsThumbnailModalOpen(false)}
          />
          {/* Modal Content */}
          <div className="fixed inset-0 z-[401] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-gray-100">Set Thumbnail</h3>
                <button
                  onClick={() => setIsThumbnailModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Image URL
                  </label>
                  <Input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => {
                      setThumbnailUrl(e.target.value);
                      setThumbnailPreviewError(false);
                      setThumbnailPreviewLoaded(false);
                    }}
                    placeholder="https://example.com/image.jpg"
                    className="bg-gray-800 border-gray-700"
                  />
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Preview
                  </label>
                  <div className="relative aspect-video rounded-lg bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center">
                    {thumbnailUrl.trim() ? (
                      <>
                        {thumbnailPreviewError ? (
                          <div className="text-center text-gray-500">
                            <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Failed to load image</p>
                          </div>
                        ) : (
                          <img
                            src={thumbnailUrl}
                            alt="Thumbnail preview"
                            className={`max-w-full max-h-full object-contain ${thumbnailPreviewLoaded ? '' : 'opacity-0'}`}
                            onLoad={() => setThumbnailPreviewLoaded(true)}
                            onError={() => setThumbnailPreviewError(true)}
                          />
                        )}
                        {!thumbnailPreviewLoaded && !thumbnailPreviewError && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-spin h-6 w-6 border-2 border-gray-500 border-t-accent rounded-full" />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center text-gray-500">
                        <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Enter a URL to preview</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remove thumbnail link */}
                {card.image && (
                  <button
                    onClick={handleRemoveThumbnail}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    Remove thumbnail
                  </button>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
                <Button
                  variant="ghost"
                  onClick={() => setIsThumbnailModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveThumbnail}
                  disabled={thumbnailUrl.trim() !== "" && !thumbnailPreviewLoaded}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}
