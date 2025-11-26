"use client";

import { useEffect, useState, useRef, useMemo, ReactNode, HTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import remarkBreaks from "remark-breaks";
import { CardModel, CollectionNode, ExtractedDate } from "@/lib/types";
import { getMostRelevantDate, extractDatesFromMetadata } from "@/lib/utils/extract-dates";
import { useDataStore, extractAndSaveLinks } from "@/lib/stores/data-store";
import { localDb } from "@/lib/services/local-storage";
import { useToastStore } from "@/lib/stores/toast-store";
import { ReaderView } from "@/components/reader/reader-view";
import { RichMDEditor } from "@/components/notes/md-editor";
import { BacklinksPanel } from "@/components/notes/backlinks-panel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDemoAwareStore } from "@/lib/hooks/use-demo-aware-store";
import { extractYouTubeId, isYouTubeUrl } from "@/lib/utils/youtube";
import { FileText, Bookmark, Globe, Tag, FolderOpen, Folder, Link2, Clock, Zap, BookOpen, Sparkles, X, MoreVertical, RefreshCw, Share2, Pin, Trash2, Maximize2, Search, Tags, Edit, Eye, Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Heading1, Heading2, Heading3, Link as LinkIcon, ChevronDown, ImageIcon, Calendar, ChevronRight, Plus, Paperclip } from "lucide-react";
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

type AttachmentsTabProps = {
  cardId: string;
};

function AttachmentsTab({ cardId }: AttachmentsTabProps) {
  const [previewFile, setPreviewFile] = useState<StoredFile | null>(null);
  const files = useFileStore((state) => state.getFilesByCardId(cardId));
  const allFiles = useFileStore((state) => state.files);
  const attachFileToCard = useFileStore((state) => state.attachFileToCard);
  const detachFileFromCard = useFileStore((state) => state.detachFileFromCard);

  // Get files attached to this card
  const attachedFiles = files;

  // Get preview file index for navigation
  const currentIndex = previewFile
    ? attachedFiles.findIndex((f) => f.id === previewFile.id)
    : -1;

  const handleFilesUploaded = (fileIds: string[]) => {
    // Files uploaded via FileUploadButton with cardId are already attached
  };

  const handleDetach = async (fileId: string) => {
    await detachFileFromCard(fileId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip size={16} className="text-accent" />
          <h3 className="text-sm font-semibold text-gray-300">Attachments</h3>
          <span className="text-xs text-gray-500">({attachedFiles.length})</span>
        </div>
        <FileUploadButton
          cardId={cardId}
          onFilesUploaded={handleFilesUploaded}
          variant="compact"
        />
      </div>

      {attachedFiles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/30 p-6 text-center">
          <Paperclip className="h-8 w-8 mx-auto mb-2 text-gray-600" />
          <p className="text-sm text-gray-400">No attachments yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Upload files to attach them to this card
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachedFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              layout="list"
              onClick={() => setPreviewFile(file)}
              onPreview={() => setPreviewFile(file)}
            />
          ))}
        </div>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onNext={
          currentIndex < attachedFiles.length - 1
            ? () => setPreviewFile(attachedFiles[currentIndex + 1])
            : undefined
        }
        onPrevious={
          currentIndex > 0
            ? () => setPreviewFile(attachedFiles[currentIndex - 1])
            : undefined
        }
        hasNext={currentIndex < attachedFiles.length - 1}
        hasPrevious={currentIndex > 0}
      />
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
  const router = useRouter();
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

  // Open control panel when card modal opens or card changes.
  // Do NOT restore in cleanup here, because card switches (key changes)
  // would trigger cleanup and incorrectly restore the panel.
  useEffect(() => {
    openCardDetails(card.id);
  }, [card.id, openCardDetails]);

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
                className="!text-purple-400 hover:!text-purple-300 !underline !decoration-purple-400/50 hover:!decoration-purple-300 cursor-pointer !font-bold transition-colors"
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
  // Bottom tab view mode: 'preview' | 'reader' | 'metadata'
  const [bottomTabMode, setBottomTabMode] = useState<'preview' | 'reader' | 'metadata'>('preview');
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
      // Note: Demo mode doesn't need refresh since it's all local
      const pathname = window.location.pathname;
      if (!pathname.startsWith('/demo')) {
        const { useDataStore } = await import('@/lib/stores/data-store');
        await useDataStore.getState().refresh();
      }

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
                      className="max-w-full max-h-[calc(90vh-180px)] object-contain rounded-lg"
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

                      {/* Release Date / Calendar Section */}
                      {(linkedCalendarEvent || extractedReleaseDate) && (
                        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                <Calendar size={20} className="text-purple-400" />
                              </div>
                              <div>
                                <span className="text-sm text-gray-400">
                                  {linkedCalendarEvent ? 'On Calendar' : (extractedReleaseDate?.label || 'Release Date')}
                                </span>
                                <div className="text-lg font-semibold text-white">
                                  {linkedCalendarEvent
                                    ? formatDateDisplay(linkedCalendarEvent.date)
                                    : extractedReleaseDate ? formatDateDisplay(extractedReleaseDate.date) : ''}
                                </div>
                              </div>
                            </div>
                            {linkedCalendarEvent ? (
                              <button
                                onClick={() => router.push(`/calendar?date=${linkedCalendarEvent.date}`)}
                                className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 hover:text-purple-200 transition-colors text-sm font-medium flex items-center gap-2"
                              >
                                View on Calendar
                                <ChevronRight size={16} />
                              </button>
                            ) : extractedReleaseDate ? (
                              <button
                                onClick={handleAddToCalendar}
                                disabled={isAddingToCalendar}
                                className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                              >
                                <Plus size={16} />
                                {isAddingToCalendar ? 'Adding...' : 'Add to Calendar'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      )}
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
            <TabsTrigger
              value="attachments"
              className="w-12 h-12 rounded-xl flex items-center justify-center border border-transparent data-[state=active]:border-accent data-[state=active]:bg-white/10 data-[state=active]:shadow-glow-accent hover:bg-white/5 transition-all"
              title="Attachments"
            >
              <Paperclip className="h-5 w-5" />
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
                    if (onNavigateToCard) {
                      onNavigateToCard(cardId);
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
                  cardId={card.id}
                  scheduledDate={card.scheduledDate}
                  onSave={handleSaveScheduledDate}
                />
              </TabsContent>
              <TabsContent value="attachments" className="p-4 mt-0 h-full">
                <AttachmentsTab cardId={card.id} />
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
          <Folder className="h-4 w-4 text-purple-400" />
          {node.name}
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

// Helper to get color for date type
function getColorForDateType(type: ExtractedDate['type']): string {
  switch (type) {
    case 'release':
      return '#f97316'; // Orange for releases
    case 'event':
      return '#8b5cf6'; // Purple for events
    case 'deadline':
      return '#ef4444'; // Red for deadlines
    case 'published':
      return '#3b82f6'; // Blue for published
    default:
      return '#8b5cf6'; // Default purple
  }
}

// Metadata Section
function MetadataSection({ card }: { card: CardModel }) {
  const router = useRouter();
  const { updateCard: updateCardInStore } = useDemoAwareStore();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(card.title || "");
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);

  // Get event store to check for existing events and add new ones
  const { events, addEvent } = useEventStore();

  // Check if this card already has a calendar event
  const linkedEvent = useMemo(() => {
    return events.find(e => e.source?.type === 'card' && e.source?.cardId === card.id);
  }, [events, card.id]);

  // Get the most relevant extracted date - extract on-the-fly from metadata
  const relevantDate = useMemo(() => {
    // First check if dates were already extracted and stored on the card
    if (card.extractedDates && card.extractedDates.length > 0) {
      return getMostRelevantDate(card.extractedDates);
    }
    // Otherwise, extract from metadata on-the-fly
    if (card.metadata && card.type === 'url') {
      const extractedDates = extractDatesFromMetadata(card.metadata as Record<string, unknown>);
      if (extractedDates.length > 0) {
        return getMostRelevantDate(extractedDates);
      }
    }
    return null;
  }, [card.extractedDates, card.metadata, card.type]);

  const handleAddToCalendar = async () => {
    if (!relevantDate) return;
    setIsAddingToCalendar(true);

    try {
      await addEvent({
        title: card.title || card.domain || 'Saved Link',
        date: relevantDate.date,
        endDate: relevantDate.endDate || null,
        isAllDay: true,
        description: card.description || undefined,
        url: card.url || undefined,
        color: getColorForDateType(relevantDate.type),
        source: {
          type: 'card',
          cardId: card.id,
        },
      });

      useToastStore.getState().success('Added to calendar!');
    } catch (error) {
      console.error('Failed to add to calendar:', error);
      useToastStore.getState().error('Failed to add to calendar');
    } finally {
      setIsAddingToCalendar(false);
    }
  };

  const handleViewOnCalendar = (dateStr: string) => {
    router.push(`/calendar?date=${dateStr}`);
  };

  const formatDateForDisplay = (dateStr: string): string => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return format(date, 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const handleSaveTitle = async () => {
    if (editedTitle.trim() === card.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      await updateCardInStore(card.id, { title: editedTitle.trim() });
      setIsEditingTitle(false);
    } catch (error) {
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
              <Badge key={collection} variant="secondary" className="flex items-center gap-1.5">
                <Folder className="h-3 w-3 text-purple-400" />
                {collection}
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

      {/* Release Date / Calendar Event Section */}
      {(linkedEvent || relevantDate) && (
        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-purple-400" />
              <span className="text-xs text-gray-400">
                {linkedEvent ? 'On Calendar' : (relevantDate?.label || 'Release Date')}
              </span>
            </div>
            {linkedEvent ? (
              <button
                onClick={() => handleViewOnCalendar(linkedEvent.date)}
                className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 transition-colors"
              >
                <span>{formatDateForDisplay(linkedEvent.date)}</span>
                <span className="text-purple-400">→</span>
              </button>
            ) : relevantDate ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-300">{formatDateForDisplay(relevantDate.date)}</span>
                <button
                  onClick={handleAddToCalendar}
                  disabled={isAddingToCalendar}
                  className="px-2 py-0.5 text-xs font-medium rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 hover:text-purple-200 transition-colors border border-purple-500/30 disabled:opacity-50"
                >
                  {isAddingToCalendar ? '...' : '+ Add'}
                </button>
              </div>
            ) : null}
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
  cardId: string;
  scheduledDate: string | null;
  onSave: (date: string | null) => void;
};

function ScheduleTab({ cardId, scheduledDate, onSave }: ScheduleTabProps) {
  const router = useRouter();
  // Convert scheduledDate (ISO string) to YYYY-MM-DD for date input
  const initialDate = scheduledDate ? scheduledDate.split('T')[0] : "";
  const [date, setDate] = useState(initialDate);

  // Get calendar events associated with this card
  const calendarEvents = useEventStore((state) => state.getEventsByCardId(cardId));

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

  const handleViewEventOnCalendar = (eventDate: string) => {
    // Navigate to calendar with the specific date
    router.push(`/calendar?date=${eventDate}`);
  };

  const formatEventDate = (dateStr: string): string => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      return format(new Date(year, month - 1, day), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendar Events Section - Show if card has been added to calendar */}
      {calendarEvents.length > 0 && (
        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-purple-400" />
            <h4 className="text-sm font-medium text-purple-300">On Your Calendar</h4>
          </div>
          <div className="space-y-2">
            {calendarEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-300">{event.title}</span>
                <button
                  onClick={() => handleViewEventOnCalendar(event.date)}
                  className="text-purple-400 hover:text-purple-300 hover:underline"
                >
                  {formatEventDate(event.date)}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium text-gray-200 mb-2">Schedule for Calendar</h4>
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
