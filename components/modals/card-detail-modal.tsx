"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CardModel, CollectionNode } from "@/lib/types";
import { Toast } from "@/components/ui/toast";
import { ReaderView } from "@/components/reader/reader-view";
import { MDEditor } from "@/components/notes/md-editor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDataStore } from "@/lib/stores/data-store";
import { extractYouTubeId, isYouTubeUrl } from "@/lib/utils/youtube";

type Tab = "pawkits" | "pin" | "notes" | "summary" | "reader" | "actions" | "content" | "schedule";

type CardDetailModalProps = {
  card: CardModel;
  collections: CollectionNode[];
  onClose: () => void;
  onUpdate: (card: CardModel) => void;
  onDelete: () => void;
};

export function CardDetailModal({ card, collections, onClose, onUpdate, onDelete }: CardDetailModalProps) {
  const updateCardInStore = useDataStore(state => state.updateCard);
  const isNote = card.type === "md-note" || card.type === "text-note";
  const [activeTab, setActiveTab] = useState<Tab>("pawkits");
  const [notes, setNotes] = useState(card.notes ?? "");
  const [content, setContent] = useState(card.content ?? "");
  const [noteMode, setNoteMode] = useState<"preview" | "edit">("preview");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(card.pinned ?? false);
  const [isReaderExpanded, setIsReaderExpanded] = useState(false);
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [articleContent, setArticleContent] = useState(card.articleContent ?? null);
  const [denPawkitSlugs, setDenPawkitSlugs] = useState<Set<string>>(new Set());
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

      // Update store (optimistic)
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
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes })
      });
      if (response.ok) {
        const updated = await response.json();
        onUpdate(updated);
        setToast("Notes saved");
      }
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
        const updated = { ...card, articleContent: data.articleContent };
        onUpdate(updated);
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
      const response = await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
      if (response.ok) {
        onDelete();
      } else {
        setToast("Failed to delete card");
      }
    } catch (error) {
      console.error("Failed to delete card:", error);
      setToast("Failed to delete card");
    }
  };

  const handleMoveToDen = async () => {
    try {
      const endpoint = card.inDen ? `/api/cards/${card.id}/remove-from-den` : `/api/cards/${card.id}/move-to-den`;
      const response = await fetch(endpoint, { method: "PATCH" });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Den API error:", errorText);
        setToast("Failed to update card");
        return;
      }

      const updated = await response.json();

      // Simply refresh the entire data store to get the latest state from server
      // This ensures consistency and will properly filter out Den items
      await useDataStore.getState().refresh();

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
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ node, ...props }) => (
                            <a {...props} target="_blank" rel="noopener noreferrer" />
                          ),
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
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className={`bg-gray-950 rounded-lg border border-gray-800 shadow-2xl w-full h-[90vh] overflow-hidden flex ${
            isReaderExpanded ? "max-w-[95vw]" : "max-w-6xl"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left Panel - Image, Reader, or Note Preview/Edit */}
          <div className="flex-1 flex flex-col bg-gray-900/50 relative">
            {isNote ? (
              <>
                {/* Header with mode toggle and expand */}
                <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
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
                <div className="flex-1 overflow-auto p-8 pt-20">
                  {noteMode === "preview" ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      {content ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ node, ...props }) => (
                              <a {...props} target="_blank" rel="noopener noreferrer" />
                            ),
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
            ) : activeTab === "reader" && articleContent ? (
              <ReaderView
                title={card.title || card.domain || card.url}
                content={articleContent}
                url={card.url}
                isExpanded={false}
                onToggleExpand={() => setIsReaderExpanded(true)}
                onClose={onClose}
              />
            ) : isYouTubeUrl(card.url) ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-4xl aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(card.url)}`}
                    title={card.title || "YouTube video"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full rounded-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
                {card.image ? (
                  <img
                    src={card.image}
                    alt={card.title || "Card preview"}
                    className="max-w-full max-h-full object-contain rounded"
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

          {/* Right Sidebar */}
          <div className="w-96 border-l border-gray-800 flex flex-col min-h-0">
            {/* Header with Close Button */}
            <div className="border-b border-gray-800 p-4 flex items-center justify-between flex-shrink-0">
              <h2 className="font-semibold text-gray-100">Card Details</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-200 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-800 px-4 flex gap-1 overflow-x-auto flex-shrink-0">
              <TabButton
                active={activeTab === "pawkits"}
                onClick={() => setActiveTab("pawkits")}
                label="Pawkits"
              />
              <TabButton
                active={activeTab === "pin"}
                onClick={() => setActiveTab("pin")}
                label="Pin"
              />
              <TabButton
                active={activeTab === "notes"}
                onClick={() => setActiveTab("notes")}
                label="Notes"
              />
              <TabButton
                active={activeTab === "schedule"}
                onClick={() => setActiveTab("schedule")}
                label="Schedule"
              />
              {!isNote && (
                <>
                  <TabButton
                    active={activeTab === "reader"}
                    onClick={() => setActiveTab("reader")}
                    label="Reader"
                  />
                  <TabButton
                    active={activeTab === "summary"}
                    onClick={() => setActiveTab("summary")}
                    label="Summary"
                  />
                </>
              )}
              <TabButton
                active={activeTab === "actions"}
                onClick={() => setActiveTab("actions")}
                label="Actions"
              />
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 modal-scrollbar">
              {activeTab === "pawkits" && (
                <PawkitsTab
                  collections={collections}
                  currentCollections={card.collections || []}
                  onSelect={handleAddToPawkit}
                />
              )}
              {activeTab === "pin" && (
                <PinTab isPinned={isPinned} onToggle={handleTogglePin} />
              )}
              {activeTab === "notes" && (
                <NotesTab
                  notes={notes}
                  onChange={setNotes}
                  onSave={handleSaveNotes}
                  saving={saving}
                />
              )}
              {activeTab === "reader" && (
                <ReaderTab
                  hasContent={!!articleContent}
                  onExtract={handleExtractArticle}
                  extracting={extracting}
                />
              )}
              {activeTab === "summary" && <SummaryTab card={card} />}
              {activeTab === "actions" && <ActionsTab card={card} onRefreshMetadata={handleRefreshMetadata} />}
              {activeTab === "schedule" && (
                <ScheduleTab
                  scheduledDate={card.scheduledDate}
                  onSave={handleSaveScheduledDate}
                />
              )}
            </div>

            {/* Metadata Section - Anchored Above Delete Button */}
            <div className="border-t border-gray-800 p-4 flex-shrink-0">
              <MetadataSection card={card} />
            </div>

            {/* Den and Delete Buttons at Bottom */}
            <div className="border-t border-gray-800 p-4 flex-shrink-0 space-y-2">
              <Button
                onClick={handleMoveToDen}
                variant="outline"
                className="w-full"
              >
                🏠 {card.inDen ? "Remove from The Den" : "Move to The Den"}
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
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}

// Tab Button Component
function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-gray-400 hover:text-gray-200"
      }`}
    >
      {label}
    </button>
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

// Pin Tab
function PinTab({ isPinned, onToggle }: { isPinned: boolean; onToggle: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Pin this card to quick access on your home page
      </p>
      <Button
        onClick={onToggle}
        variant={isPinned ? "default" : "secondary"}
        className="w-full"
        size="lg"
      >
        {isPinned ? "📌 Pinned" : "Pin to Home"}
      </Button>
      {isPinned && (
        <p className="text-xs text-gray-500 text-center">
          This card appears in your home page quick access
        </p>
      )}
    </div>
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
};

function ActionsTab({ card, onRefreshMetadata }: ActionsTabProps) {
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
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-gray-500 uppercase">Details</h3>

      <div>
        <h4 className="text-lg font-semibold text-gray-100 mb-1">
          {card.title || card.domain || "Untitled"}
        </h4>
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
              {new Date(date).toLocaleDateString()}
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
