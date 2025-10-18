"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import { CardModel, CollectionNode } from "@/lib/types";
import { useDataStore } from "@/lib/stores/data-store-v2";
import { Toast } from "@/components/ui/toast";
import { ReaderView } from "@/components/reader/reader-view";
import { MDEditor } from "@/components/notes/md-editor";
import { BacklinksPanel } from "@/components/notes/backlinks-panel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDemoAwareStore } from "@/lib/hooks/use-demo-aware-store";
import { extractYouTubeId, isYouTubeUrl } from "@/lib/utils/youtube";

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

  // Initialize data store if not already initialized
  useEffect(() => {
    if (!dataStore.isInitialized) {
      dataStore.initialize();
    }
  }, [dataStore]);

  // Extract links when modal opens if this is a note with content
  useEffect(() => {
    console.log('[Wiki-Link Modal] useEffect running', {
      isNote,
      hasContent: !!card.content,
      cardsLength: allCards.length,
      cardId: card.id,
      content: card.content?.substring(0, 100),
    });

    if (isNote && card.content && allCards.length > 0) {
      // Trigger link extraction
      console.log('[Wiki-Link] Triggering link extraction for card:', card.id);
      const updatePromise = updateCardInStore(card.id, { content: card.content });
      if (updatePromise && typeof updatePromise.catch === 'function') {
        updatePromise.catch(err => {
          console.error('[Wiki-Link] Failed to extract links:', err);
        });
      }
    } else {
      console.log('[Wiki-Link Modal] Skipping extraction because:', {
        isNote,
        hasContent: !!card.content,
        cardsLength: allCards.length,
      });
    }
  }, [card.id, isNote, card.content, allCards.length, updateCardInStore]); // Run when card or cards change
  const [notes, setNotes] = useState(card.notes ?? "");
  const [content, setContent] = useState(card.content ?? "");
  const [noteMode, setNoteMode] = useState<"preview" | "edit">("preview");

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

  // Custom renderer for wiki-links
  const wikiLinkComponents = useMemo(() => ({
    a: ({ node, href, children, ...props }: any) => {
      // Check if this is a wiki-link (starts with #/wiki/)
      if (href?.startsWith('#/wiki/')) {
        const linkText = href.replace('#/wiki/', '').replace(/-/g, ' ');
        const noteId = noteTitleMap.get(linkText.toLowerCase());

        console.log('[Wiki-Link Debug]', {
          href,
          linkText,
          linkTextLower: linkText.toLowerCase(),
          noteId,
          hasNavigateCallback: !!onNavigateToCard,
          availableTitles: Array.from(noteTitleMap.keys()),
        });

        if (noteId && onNavigateToCard) {
          return (
            <button
              onClick={() => onNavigateToCard(noteId)}
              className="!text-purple-400 hover:!text-purple-300 !underline !decoration-purple-400/50 hover:!decoration-purple-300 cursor-pointer !inline !font-bold transition-colors"
              style={{ color: '#c084fc', textDecoration: 'underline', textDecorationColor: '#c084fc80' }}
              {...props}
            >
              {children}
            </button>
          );
        } else {
          // Note doesn't exist - show as broken link
          return (
            <span className="!text-gray-500 italic !underline !decoration-gray-500/30" title="Note not found" style={{ color: '#6b7280', textDecoration: 'underline' }}>
              {children}
            </span>
          );
        }
      }

      // Regular link
      return <a href={href} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
    },
  }), [noteTitleMap, onNavigateToCard]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(card.pinned ?? false);
  const [isInDen, setIsInDen] = useState(card.inDen ?? false);
  const [isReaderExpanded, setIsReaderExpanded] = useState(false);
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [articleContent, setArticleContent] = useState(card.articleContent ?? null);
  const [denPawkitSlugs, setDenPawkitSlugs] = useState<Set<string>>(new Set());
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const isTypingNotesRef = useRef(false);
  const isTypingContentRef = useRef(false);
  const lastSavedNotesRef = useRef(card.notes ?? "");
  const lastSavedContentRef = useRef(card.content ?? "");

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
  }, [card.id]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Auto-save notes with debounce
  useEffect(() => {
    const timeout = setTimeout(async () => {
      // Only save if notes have changed from last saved value
      if (notes === lastSavedNotesRef.current) {
        return;
      }
      setSaving(true);

      // Update store (optimistic)
      await updateCardInStore(card.id, { notes });
      lastSavedNotesRef.current = notes;

      // Update parent component state
      onUpdate({ ...card, notes });
      setSaving(false);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [notes, card.id, onUpdate, updateCardInStore, card]);

  // Auto-save content with debounce (for MD/text notes)
  useEffect(() => {
    if (!isNote) return;
    const timeout = setTimeout(async () => {
      // Only save if content has changed from last saved value
      if (content === lastSavedContentRef.current) {
        return;
      }
      setSaving(true);

      // Update store (optimistic) - this triggers link extraction
      console.log('[Wiki-Link] Auto-saving content, will trigger extraction');
      await updateCardInStore(card.id, { content });
      lastSavedContentRef.current = content;

      // Update parent component state
      onUpdate({ ...card, content });
      setSaving(false);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [content, card.id, onUpdate, isNote, updateCardInStore, card]);

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
      setTimeout(() => onClose(), 500);
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
        setTimeout(() => onClose(), 500);
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
              <div className="flex items-center gap-3">
                {/* Mode Toggle */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => setNoteMode("preview")}
                    variant={noteMode === "preview" ? "default" : "outline"}
                    size="sm"
                  >
                    👁️ Preview
                  </Button>
                  <Button
                    onClick={() => setNoteMode("edit")}
                    variant={noteMode === "edit" ? "default" : "outline"}
                    size="sm"
                  >
                    ✏️ Edit
                  </Button>
                </div>
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
            </div>
            {/* Content */}
            <div className="flex-1 overflow-auto p-8">
              {noteMode === "preview" ? (
                <div className="max-w-4xl mx-auto">
                  <div className="prose prose-invert prose-lg max-w-none">
                    {content ? (
                      <ReactMarkdown
                        remarkPlugins={[
                          remarkGfm,
                          [remarkWikiLink, {
                            aliasDivider: '|',
                            pageResolver: (name: string) => [name.replace(/ /g, '-')],
                            hrefTemplate: (permalink: string) => `#/wiki/${permalink}`,
                          }],
                        ]}
                        components={{
                          ...wikiLinkComponents,
                          input: ({ node, checked, ...props }) => {
                            if (props.type === 'checkbox') {
                              return (
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  readOnly
                                  className="cursor-pointer mr-2"
                                  onClick={(e) => {
                                    const checkbox = e.currentTarget;
                                    const newChecked = !checked;

                                    // Find the text content of the parent li
                                    const li = checkbox.closest('li');
                                    if (!li) return;

                                    const text = li.textContent || '';
                                    const lines = content.split('\n');

                                    // Find the line with this exact text
                                    for (let i = 0; i < lines.length; i++) {
                                      if (lines[i].includes(text)) {
                                        if (newChecked) {
                                          lines[i] = lines[i].replace(/- \[ \]/, '- [x]');
                                        } else {
                                          lines[i] = lines[i].replace(/- \[x\]/i, '- [ ]');
                                        }
                                        setContent(lines.join('\n'));
                                        return;
                                      }
                                    }
                                  }}
                                />
                              );
                            }
                            return <input {...props} />;
                          }
                        }}
                      >
                        {content}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-gray-500 italic">No content yet. Switch to Edit mode to start writing.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto h-full">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Start writing your note..."
                    className="w-full h-full rounded border border-gray-800 bg-gray-900 p-4 text-sm text-gray-100 placeholder-gray-500 resize-none focus:border-accent focus:outline-none font-mono"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Centered Card Content */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 md:pr-[424px] pointer-events-none">
        <div
          className={`bg-gray-950 rounded-lg border border-gray-800 shadow-2xl overflow-hidden pointer-events-auto relative ${
            isReaderExpanded ? "w-full h-full flex flex-col" : isYouTubeUrl(card.url) ? "w-full max-w-6xl" : isNote ? "w-full max-w-3xl h-[80vh] flex flex-col" : "max-w-full max-h-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Details Toggle Button */}
          <button
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            className="md:hidden absolute top-4 right-4 z-10 bg-gray-800 hover:bg-gray-700 text-white rounded-full p-3 shadow-lg border border-gray-700"
            title={isDetailsOpen ? "Hide details" : "Show details"}
          >
            {isDetailsOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
          {/* Card Content - Image, Reader, YouTube Player, or Note Preview/Edit */}
          <div className={`bg-gray-900/50 relative ${isReaderExpanded || isNote ? "flex-1 flex flex-col overflow-hidden" : ""}`}>
            {isNote ? (
              <>
                {/* Header with mode toggle and expand */}
                <div className="flex-shrink-0 top-0 left-0 right-0 z-10 p-4 flex items-center justify-between border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setNoteMode("preview")}
                      variant={noteMode === "preview" ? "default" : "outline"}
                      size="sm"
                    >
                      👁️ Preview
                    </Button>
                    <Button
                      onClick={() => setNoteMode("edit")}
                      variant={noteMode === "edit" ? "default" : "outline"}
                      size="sm"
                    >
                      ✏️ Edit
                    </Button>
                  </div>
                  <Button
                    onClick={() => setIsNoteExpanded(true)}
                    variant="ghost"
                    size="icon"
                    title="Expand fullscreen"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </Button>
                </div>
                {/* Note content area */}
                <div className="flex-1 overflow-y-auto p-8 min-h-0">
                  {noteMode === "preview" ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      {content ? (
                        <ReactMarkdown
                          remarkPlugins={[
                            remarkGfm,
                            [remarkWikiLink, {
                              aliasDivider: '|',
                              pageResolver: (name: string) => [name.replace(/ /g, '-')],
                              hrefTemplate: (permalink: string) => `#/wiki/${permalink}`,
                            }],
                          ]}
                          components={{
                            ...wikiLinkComponents,
                            input: ({ node, checked, ...props }) => {
                              if (props.type === 'checkbox') {
                                return (
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    readOnly
                                    className="cursor-pointer mr-2"
                                    onClick={(e) => {
                                      const checkbox = e.currentTarget;
                                      const newChecked = !checked;

                                      // Find the text content of the parent li
                                      const li = checkbox.closest('li');
                                      if (!li) return;

                                      const text = li.textContent || '';
                                      const lines = content.split('\n');

                                      // Find the line with this exact text
                                      for (let i = 0; i < lines.length; i++) {
                                        if (lines[i].includes(text)) {
                                          if (newChecked) {
                                            lines[i] = lines[i].replace(/- \[ \]/, '- [x]');
                                          } else {
                                            lines[i] = lines[i].replace(/- \[x\]/i, '- [ ]');
                                          }
                                          setContent(lines.join('\n'));
                                          return;
                                        }
                                      }
                                    }}
                                  />
                                );
                              }
                              return <input {...props} />;
                            }
                          }}
                        >
                          {content}
                        </ReactMarkdown>
                      ) : (
                        <p className="text-gray-500 italic">No content yet. Switch to Edit mode to start writing.</p>
                      )}
                    </div>
                  ) : (
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Start writing your note..."
                      className="w-full h-full min-h-[500px] rounded border border-gray-800 bg-gray-900 p-4 text-sm text-gray-100 placeholder-gray-500 resize-none focus:border-accent focus:outline-none font-mono"
                    />
                  )}
                </div>
              </>
            ) : isYouTubeUrl(card.url) ? (
              // YouTube video embed in main content area
              <div className="p-8 flex items-center justify-center min-h-[500px]">
                <div className="w-full max-w-4xl">
                  <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${extractYouTubeId(card.url)}`}
                      title={card.title || "YouTube video"}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute top-0 left-0 w-full h-full rounded-lg border-0"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8">
                {card.image ? (
                  <img
                    src={card.image}
                    alt={card.title || "Card preview"}
                    className="max-w-full max-h-[calc(90vh-4rem)] object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-center space-y-4">
                    <img
                      src="/logo.png"
                      alt="Pawkit"
                      className="w-32 h-32 mx-auto opacity-50"
                    />
                    <h3 className="text-xl font-semibold text-gray-300">
                      {card.title || card.domain || card.url}
                    </h3>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Slide-Out Sheet for Details */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-96 bg-gray-950 border-l border-gray-800 shadow-2xl z-[60] flex flex-col transition-transform duration-300 ${
          isDetailsOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close Button */}
        <div className="border-b border-gray-800 p-4 flex items-center justify-between flex-shrink-0">
          <h2 className="font-semibold text-gray-100">Card Details</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDetailsOpen(false)}
              className="md:hidden text-gray-400 hover:text-gray-200 text-2xl leading-none"
              title="Hide details"
            >
              ‹
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 text-2xl leading-none"
              title="Close modal"
            >
              ×
            </button>
          </div>
        </div>

        {/* Unified Tabs for All Cards */}
        <Tabs defaultValue="pawkits" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Tab Navigation */}
          <TabsList className="w-full rounded-none border-b border-gray-800 bg-transparent h-auto p-1 justify-start flex-shrink-0 flex flex-wrap gap-0">
            <TabsTrigger value="pawkits" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500">
              Pawkits
            </TabsTrigger>
            <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500">
              Notes
            </TabsTrigger>
            {isNote && (
              <TabsTrigger value="links" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500">
                Links
              </TabsTrigger>
            )}
            <TabsTrigger value="schedule" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500">
              Schedule
            </TabsTrigger>
            {!isNote && !isYouTubeUrl(card.url) && (
              <>
                <TabsTrigger value="reader" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500">
                  Reader
                </TabsTrigger>
                <TabsTrigger value="summary" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500">
                  Summary
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="actions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500">
              Actions
            </TabsTrigger>
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
              {isNote && (
                <TabsContent value="links" className="p-4 mt-0 h-full">
                  <BacklinksPanel
                    noteId={card.id}
                    onNavigate={(noteId) => {
                      if (onNavigateToCard) {
                        onNavigateToCard(noteId);
                      }
                    }}
                  />
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
            <div className="border-t border-gray-800 p-3 flex-shrink-0">
              <MetadataSection card={card} />
            </div>

            {/* Den and Delete Buttons */}
            <div className="border-t border-gray-800 p-3 flex-shrink-0 space-y-2">
              <Button
                onClick={handleMoveToDen}
                variant="outline"
                className="w-full"
              >
                🏠 {isInDen ? "Remove from The Den" : "Move to The Den"}
              </Button>
              <Button
                onClick={handleDelete}
                variant="destructive"
                className="w-full"
              >
                Delete Card
              </Button>
            </div>
          </div>
        </Tabs>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
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
          {saving ? "Saving..." : "Auto-saves as you type"}
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
        <div className="text-4xl mb-2">📄</div>
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
        🔗 Copy Link
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
