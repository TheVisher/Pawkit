"use client";

import { useState, useRef, useEffect, useCallback, useMemo, ReactNode, HTMLAttributes } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import remarkBreaks from "remark-breaks";
import { useDataStore } from "@/lib/stores/data-store";
import { noteTemplates, NoteTemplate } from "@/lib/templates/note-templates";
import {
  X,
  Bold,
  Italic,
  Strikethrough,
  Link,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Layout,
  Columns,
  FileText,
  Eye,
  Edit3,
  Bookmark,
  Globe,
  RefreshCw,
  Check,
  Clock,
  GripVertical,
  Save,
} from "lucide-react";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";

// Storage key for divider position
const DIVIDER_POSITION_KEY = "pawkit-dual-pane-divider-pos";
const VIEW_MODE_KEY = "pawkit-dual-pane-view-mode";

// View modes
type ViewMode = "split" | "edit" | "preview";

// ReactMarkdown component props
interface CodeComponentProps extends HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children?: ReactNode;
}

interface AnchorComponentProps extends HTMLAttributes<HTMLAnchorElement> {
  href?: string;
  children?: ReactNode;
}

// Fuzzy search for autocomplete
function fuzzySearch(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  if (textLower === queryLower) return 1000;
  if (textLower.startsWith(queryLower)) return 900;
  if (textLower.includes(queryLower)) return 500;
  let queryIndex = 0;
  let matchScore = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      matchScore += (100 - i);
      queryIndex++;
    }
  }
  return queryIndex === queryLower.length ? matchScore : 0;
}

interface DualPaneEditorProps {
  card: {
    id: string;
    title: string;
    content?: string;
    type: string;
  };
  onClose: () => void;
  onSave: (content: string) => void;
  onNavigate?: (noteId: string) => void;
}

export function DualPaneEditor({ card, onClose, onSave, onNavigate }: DualPaneEditorProps) {
  // Mobile detection - on mobile, split view is disabled
  const isMobile = useIsMobile();

  // State
  const [content, setContent] = useState(card.content || "");
  const [title, setTitle] = useState(card.title || "");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(VIEW_MODE_KEY) as ViewMode;
      // Default to edit mode, don't use split as default
      return saved || "edit";
    }
    return "edit";
  });

  // Force to edit mode on mobile if split is selected
  useEffect(() => {
    if (isMobile && viewMode === "split") {
      setViewMode("edit");
    }
  }, [isMobile, viewMode]);
  const [dividerPosition, setDividerPosition] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(DIVIDER_POSITION_KEY);
      return saved ? parseFloat(saved) : 50;
    }
    return 50;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [showTemplates, setShowTemplates] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef(card.content || "");
  const lastSavedTitleRef = useRef(card.title || "");

  // Data store
  const cards = useDataStore((state) => state.cards);
  const updateCard = useDataStore((state) => state.updateCard);

  // Wiki-link autocomplete state
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState("");
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [wikiLinkStartPos, setWikiLinkStartPos] = useState<number | null>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const justClosedRef = useRef(false);

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Save view mode preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    }
  }, [viewMode]);

  // Track unsaved changes (no auto-save during editing to avoid re-render issues)
  useEffect(() => {
    if (content === lastSavedContentRef.current && title === lastSavedTitleRef.current) {
      setSaveStatus("saved");
    } else {
      setSaveStatus("unsaved");
    }
  }, [content, title]);

  // Save function - called on close
  const saveChanges = useCallback(async () => {
    if (content === lastSavedContentRef.current && title === lastSavedTitleRef.current) {
      return; // Nothing to save
    }

    setSaveStatus("saving");
    try {
      await updateCard(card.id, { content, title });
      lastSavedContentRef.current = content;
      lastSavedTitleRef.current = title;
      onSave(content);
      setSaveStatus("saved");
    } catch (error) {
      console.error("[DualPaneEditor] Save failed:", error);
      setSaveStatus("unsaved");
    }
  }, [content, title, card.id, updateCard, onSave]);

  // Handle close - save before closing
  const handleClose = useCallback(async () => {
    await saveChanges();
    onClose();
  }, [saveChanges, onClose]);

  // Metadata calculation
  const metadata = useMemo(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const characters = content.length;
    const linkMatches = content.match(/\[\[([^\]]+)\]\]/g) || [];
    return { words, characters, linkCount: linkMatches.length };
  }, [content]);

  // Note title map for wiki-links
  const noteTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    cards.forEach((c) => {
      if ((c.type === "md-note" || c.type === "text-note") && c.title) {
        map.set(c.title.toLowerCase(), c.id);
      }
    });
    return map;
  }, [cards]);

  // Card title map for card references
  const cardTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    cards.forEach((c) => {
      if (c.title) {
        map.set(c.title.toLowerCase(), c.id);
      }
    });
    return map;
  }, [cards]);

  // All notes for autocomplete
  const allNotes = useMemo(() => {
    return cards
      .filter((c) => c.title && !c.collections?.includes("the-den"))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [cards]);

  // Autocomplete suggestions
  const autocompleteSuggestions = useMemo(() => {
    if (!autocompleteQuery) {
      return allNotes.slice(0, 10);
    }
    const scored = allNotes
      .map((note) => ({ note, score: fuzzySearch(autocompleteQuery, note.title || "") }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 10).map((item) => item.note);
  }, [autocompleteQuery, allNotes]);

  // Close autocomplete when no suggestions
  useEffect(() => {
    if (autocompleteOpen && autocompleteSuggestions.length === 0) {
      setAutocompleteOpen(false);
      setWikiLinkStartPos(null);
    }
  }, [autocompleteOpen, autocompleteSuggestions.length]);

  // Divider drag handling
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const startX = e.clientX;
    const startPos = dividerPosition;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const delta = e.clientX - startX;
      const deltaPercent = (delta / containerWidth) * 100;
      const newPos = Math.min(80, Math.max(20, startPos + deltaPercent));
      setDividerPosition(newPos);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      // Save position
      localStorage.setItem(DIVIDER_POSITION_KEY, String(dividerPosition));
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [dividerPosition]);

  // Double-click to reset divider
  const handleDividerDoubleClick = useCallback(() => {
    setDividerPosition(50);
    localStorage.setItem(DIVIDER_POSITION_KEY, "50");
  }, []);

  // Insert markdown formatting
  const insertMarkdown = useCallback((before: string, after: string = "", openAutocomplete: boolean = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);

    setContent(newText);

    setTimeout(() => {
      textarea.focus();
      const newPosition = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newPosition, newPosition);

      if (openAutocomplete && before === "[[" && after === "]]") {
        setWikiLinkStartPos(start);
        setAutocompleteQuery("");
        setSelectedIndex(0);
        setAutocompleteOpen(true);

        const textareaRect = textarea.getBoundingClientRect();
        const lineHeight = 1.6 * 14;
        const textBeforeCursor = newText.substring(0, start);
        const lines = textBeforeCursor.split("\n");
        const currentLine = lines.length - 1;
        const top = textareaRect.top + currentLine * lineHeight + lineHeight * 2 + 4;
        const left = textareaRect.left + 16;
        setAutocompletePosition({ top, left });
      }
    }, 0);
  }, [content]);

  // Insert template
  const insertTemplate = useCallback((template: NoteTemplate) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const newText = content.substring(0, start) + template.content + content.substring(start);
    setContent(newText);
    setShowTemplates(false);

    setTimeout(() => {
      textarea.focus();
      const newPosition = start + template.content.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  }, [content]);

  // Insert autocomplete suggestion
  const insertAutocompleteSuggestion = useCallback((noteTitle: string) => {
    const textarea = textareaRef.current;
    if (!textarea || wikiLinkStartPos === null) return;

    const currentPos = textarea.selectionStart;
    const before = content.substring(0, wikiLinkStartPos);
    let after = content.substring(currentPos);

    if (after.startsWith("]]")) {
      after = after.substring(2);
    }

    const newText = before + `[[${noteTitle}]]` + after;
    setContent(newText);
    setAutocompleteOpen(false);
    setWikiLinkStartPos(null);
    setAutocompleteQuery("");

    setTimeout(() => {
      textarea.focus();
      const newPosition = wikiLinkStartPos + noteTitle.length + 4;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  }, [content, wikiLinkStartPos]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close (if autocomplete not open)
      if (e.key === "Escape") {
        if (autocompleteOpen) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          setAutocompleteOpen(false);
          setWikiLinkStartPos(null);
          setAutocompleteQuery("");
          justClosedRef.current = true;
          setTimeout(() => {
            justClosedRef.current = false;
          }, 100);
          return;
        }
        handleClose();
        return;
      }

      // Cmd+\ to toggle split mode (desktop only)
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        // On mobile, toggle between edit and preview instead
        if (isMobile) {
          setViewMode((prev) => (prev === "edit" ? "preview" : "edit"));
        } else {
          setViewMode((prev) => (prev === "split" ? "edit" : "split"));
        }
        return;
      }

      // Cmd+S to save
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveChanges();
        return;
      }

      // Autocomplete navigation
      if (autocompleteOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % autocompleteSuggestions.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + autocompleteSuggestions.length) % autocompleteSuggestions.length);
          return;
        }
        if (e.key === "Enter" && autocompleteSuggestions.length > 0) {
          e.preventDefault();
          const selected = autocompleteSuggestions[selectedIndex];
          if (selected?.title) {
            insertAutocompleteSuggestion(selected.title);
          }
          return;
        }
      }

      // Only handle formatting shortcuts in edit mode
      if (!textareaRef.current?.matches(":focus")) return;

      if (e.metaKey || e.ctrlKey) {
        if (e.shiftKey && e.key.toLowerCase() === "t") {
          e.preventDefault();
          setShowTemplates((prev) => !prev);
          return;
        }

        e.preventDefault();
        switch (e.key.toLowerCase()) {
          case "b":
            insertMarkdown("**", "**");
            break;
          case "i":
            insertMarkdown("*", "*");
            break;
          case "k":
            insertMarkdown("[[", "]]", true);
            break;
          case "e":
            insertMarkdown("`", "`");
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [autocompleteOpen, autocompleteSuggestions, selectedIndex, insertMarkdown, insertAutocompleteSuggestion, handleClose, saveChanges, isMobile]);

  // Detect [[ for autocomplete
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPos);
    const lastTwoChars = textBeforeCursor.slice(-2);

    if (lastTwoChars === "[[" && !autocompleteOpen && !justClosedRef.current) {
      const wikiLinkStart = cursorPos - 2;
      setWikiLinkStartPos(wikiLinkStart);
      setAutocompleteQuery("");
      setSelectedIndex(0);
      setAutocompleteOpen(true);

      const textareaRect = textarea.getBoundingClientRect();
      const lineHeight = 1.6 * 14;
      const lines = textBeforeCursor.split("\n");
      const currentLine = lines.length - 1;
      const top = textareaRect.top + currentLine * lineHeight + lineHeight * 2 + 4;
      const left = textareaRect.left + 16;
      setAutocompletePosition({ top, left });
    } else if (wikiLinkStartPos !== null && cursorPos > wikiLinkStartPos && autocompleteOpen) {
      const query = content.substring(wikiLinkStartPos + 2, cursorPos);
      if (query.includes("]]") || query.includes("\n")) {
        setAutocompleteOpen(false);
        setWikiLinkStartPos(null);
        setAutocompleteQuery("");
      } else {
        setAutocompleteQuery(query);
        setSelectedIndex(0);
      }
    } else if (wikiLinkStartPos !== null && cursorPos <= wikiLinkStartPos && autocompleteOpen) {
      setAutocompleteOpen(false);
      setWikiLinkStartPos(null);
      setAutocompleteQuery("");
    }
  }, [content, wikiLinkStartPos, autocompleteOpen]);

  // Scroll selected autocomplete item into view
  useEffect(() => {
    if (autocompleteOpen && autocompleteRef.current) {
      const container = autocompleteRef.current;
      const selectedButton = container.querySelectorAll("button")[selectedIndex];
      if (selectedButton) {
        selectedButton.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex, autocompleteOpen]);

  // ReactMarkdown components for wiki-links
  const markdownComponents: Components = useMemo(() => ({
    code: ({ inline, className, children, ...props }: CodeComponentProps) => {
      const isInline = inline ?? !className;
      if (isInline) {
        return (
          <code
            className="px-2 py-1 rounded font-mono text-sm border"
            style={{
              backgroundColor: "rgba(139, 92, 246, 0.1)",
              borderColor: "rgba(139, 92, 246, 0.3)",
              color: "#c4b5fd",
            }}
            {...props}
          >
            {children}
          </code>
        );
      }
      return <code className={className} {...props}>{children}</code>;
    },
    a: ({ href, children, ...props }: AnchorComponentProps) => {
      if (href?.startsWith("#/wiki/")) {
        const linkText = href.replace("#/wiki/", "").replace(/-/g, " ");

        if (linkText.startsWith("card:")) {
          const cardTitle = linkText.substring(5).trim();
          const cardId = cardTitleMap.get(cardTitle.toLowerCase());
          if (cardId && onNavigate) {
            return (
              <button
                onClick={() => onNavigate(cardId)}
                className="!text-blue-400 hover:!text-blue-300 !underline cursor-pointer !font-bold transition-colors inline-flex items-center gap-1"
              >
                <Bookmark size={14} />
                {children}
              </button>
            );
          }
          return (
            <span className="text-gray-500 italic inline-flex items-center gap-1" title="Card not found">
              <Bookmark size={14} />
              {children}
            </span>
          );
        }

        if (linkText.startsWith("http://") || linkText.startsWith("https://")) {
          return (
            <a
              href={linkText}
              target="_blank"
              rel="noopener noreferrer"
              className="!text-green-400 hover:!text-green-300 !underline cursor-pointer !font-bold transition-colors inline-flex items-center gap-1"
              {...props}
            >
              <Globe size={14} />
              {children}
            </a>
          );
        }

        const noteId = noteTitleMap.get(linkText.toLowerCase());
        if (noteId && onNavigate) {
          return (
            <button
              onClick={() => onNavigate(noteId)}
              className="!text-purple-400 hover:!text-purple-300 !underline cursor-pointer !font-bold transition-colors inline-flex items-center gap-1"
            >
              <FileText size={14} />
              {children}
            </button>
          );
        }
        return (
          <span className="text-gray-500 italic inline-flex items-center gap-1" title="Note not found">
            <FileText size={14} />
            {children}
          </span>
        );
      }
      return (
        <a href={href} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      );
    },
  }), [cardTitleMap, noteTitleMap, onNavigate]);

  // Memoized toolbar JSX to prevent re-renders
  const toolbarElement = useMemo(() => (
    <div className="flex items-center gap-1 px-3 py-2 bg-white/5 border-b border-white/10 flex-wrap">
      <button onClick={() => insertMarkdown("**", "**")} className="p-2 rounded hover:bg-white/10 text-white/80 transition-colors" title="Bold (Cmd+B)">
        <Bold size={16} />
      </button>
      <button onClick={() => insertMarkdown("*", "*")} className="p-2 rounded hover:bg-white/10 text-white/80 transition-colors" title="Italic (Cmd+I)">
        <Italic size={16} />
      </button>
      <button onClick={() => insertMarkdown("~~", "~~")} className="p-2 rounded hover:bg-white/10 text-white/80 transition-colors" title="Strikethrough">
        <Strikethrough size={16} />
      </button>
      <div className="w-px h-6 bg-white/10 mx-1" />
      <button onClick={() => insertMarkdown("# ", "")} className="p-2 rounded hover:bg-white/10 text-white/80 transition-colors" title="Header 1">
        <Heading1 size={16} />
      </button>
      <button onClick={() => insertMarkdown("## ", "")} className="p-2 rounded hover:bg-white/10 text-white/80 transition-colors" title="Header 2">
        <Heading2 size={16} />
      </button>
      <button onClick={() => insertMarkdown("### ", "")} className="p-2 rounded hover:bg-white/10 text-white/80 transition-colors" title="Header 3">
        <Heading3 size={16} />
      </button>
      <div className="w-px h-6 bg-white/10 mx-1" />
      <button onClick={() => insertMarkdown("`", "`")} className="p-2 rounded hover:bg-white/10 text-white/80 transition-colors" title="Code (Cmd+E)">
        <Code size={16} />
      </button>
      <button onClick={() => insertMarkdown("[", "](url)")} className="p-2 rounded hover:bg-white/10 text-white/80 transition-colors" title="Link">
        <Link size={16} />
      </button>
      <button onClick={() => insertMarkdown("[[", "]]", true)} className="p-2 rounded hover:bg-white/10 text-white/80 transition-colors" title="Wiki Link (Cmd+K)">
        <FileText size={16} />
      </button>
      <div className="w-px h-6 bg-white/10 mx-1" />
      <button onClick={() => insertMarkdown("\n- ", "")} className="p-2 rounded hover:bg-white/10 text-white/80 transition-colors" title="Bullet List">
        <List size={16} />
      </button>
      <button onClick={() => insertMarkdown("\n1. ", "")} className="p-2 rounded hover:bg-white/10 text-white/80 transition-colors" title="Numbered List">
        <ListOrdered size={16} />
      </button>
      <button onClick={() => insertMarkdown("\n> ", "")} className="p-2 rounded hover:bg-white/10 text-white/80 transition-colors" title="Quote">
        <Quote size={16} />
      </button>
      <div className="w-px h-6 bg-white/10 mx-1" />
      <button onClick={() => setShowTemplates(!showTemplates)} className="p-2 rounded hover:bg-white/10 text-white/80 transition-colors" title="Templates (Cmd+Shift+T)">
        <Layout size={16} />
      </button>
    </div>
  ), [insertMarkdown, showTemplates]);

  // Memoized autocomplete dropdown
  const autocompleteDropdown = useMemo(() => {
    if (!isMounted || !autocompleteOpen || autocompleteSuggestions.length === 0) return null;

    return createPortal(
      <div
        ref={autocompleteRef}
        className="fixed z-[200] bg-gray-900 border border-purple-500/50 shadow-lg flex flex-col overflow-hidden rounded-lg"
        style={{
          top: `${autocompletePosition.top}px`,
          left: `${autocompletePosition.left}px`,
          minWidth: "300px",
          maxWidth: "400px",
          maxHeight: "256px",
        }}
      >
        <div className="border-b border-white/10 px-3 py-2 bg-white/5 text-xs text-white/60 flex-shrink-0">
          {autocompleteQuery ? `Search: "${autocompleteQuery}"` : "Recent cards"}
        </div>
        <div className="p-2 overflow-y-auto flex-1">
          {autocompleteSuggestions.map((note, index) => (
            <button
              key={note.id}
              onClick={() => note.title && insertAutocompleteSuggestion(note.title)}
              className={`w-full text-left px-3 py-2 rounded transition-colors ${
                index === selectedIndex ? "bg-purple-500/30 text-white" : "hover:bg-white/10 text-white/80"
              }`}
            >
              <div className="flex items-center gap-2">
                {note.type === "url" ? <Globe size={14} /> : <FileText size={14} />}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{note.title}</div>
                  {note.type === "url" ? (
                    <div className="text-xs text-white/50 truncate mt-0.5">{note.domain || note.url}</div>
                  ) : note.content ? (
                    <div className="text-xs text-white/50 truncate mt-0.5">{note.content.substring(0, 60)}...</div>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="border-t border-white/10 px-3 py-2 bg-white/5 text-xs text-white/60 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span>↑↓ navigate</span>
            <span>Enter to select</span>
            <span>Esc to close</span>
          </div>
        </div>
      </div>,
      document.body
    );
  }, [isMounted, autocompleteOpen, autocompleteSuggestions, autocompletePosition, autocompleteQuery, selectedIndex, insertAutocompleteSuggestion]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full h-full bg-gray-900 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
          {/* Title (editable) */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold text-white bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded px-2 py-1 flex-1 max-w-md"
            placeholder="Note title..."
          />

          {/* View Mode Toggles */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            {/* Split button hidden on mobile */}
            {!isMobile && (
              <button
                onClick={() => setViewMode("split")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === "split" ? "bg-purple-500/30 text-purple-300" : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
                title="Split view (Cmd+\)"
              >
                <Columns size={14} />
                <span className="hidden sm:inline">Split</span>
              </button>
            )}
            <button
              onClick={() => setViewMode("edit")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === "edit" ? "bg-purple-500/30 text-purple-300" : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
              title="Edit only"
            >
              <Edit3 size={14} />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === "preview" ? "bg-purple-500/30 text-purple-300" : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
              title="Preview only"
            >
              <Eye size={14} />
              <span className="hidden sm:inline">Preview</span>
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div ref={containerRef} className="flex-1 flex overflow-hidden relative" style={{ cursor: isDragging ? "col-resize" : "default" }}>
          {/* Editor Pane - inlined to prevent remounting */}
          {(viewMode === "split" || viewMode === "edit") && (
            <div
              className="h-full overflow-hidden border-r border-white/10 flex flex-col"
              style={{ width: viewMode === "split" ? `${dividerPosition}%` : "100%" }}
            >
              {toolbarElement}
              {/* Metadata + Save bar */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.02] border-b border-white/10 text-xs">
                <div className="flex items-center gap-3 text-white/50">
                  <span>{metadata.words} words</span>
                  <span>{metadata.characters} chars</span>
                  <span>{metadata.linkCount} links</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-white/50">
                    {saveStatus === "saving" && <><RefreshCw size={12} className="animate-spin" /> Saving...</>}
                    {saveStatus === "saved" && <><Check size={12} className="text-green-500" /> Saved</>}
                    {saveStatus === "unsaved" && <><Clock size={12} className="text-yellow-500" /> Unsaved</>}
                  </div>
                  <button
                    onClick={saveChanges}
                    disabled={saveStatus === "saved" || saveStatus === "saving"}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      saveStatus === "unsaved"
                        ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                        : "text-white/30 cursor-not-allowed"
                    }`}
                    title="Save (Cmd+S)"
                  >
                    <Save size={12} />
                    Save
                  </button>
                </div>
              </div>
              {showTemplates && (
                <div className="border-b border-white/10 bg-white/5 p-3">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-white">Choose a Template</h4>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {noteTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => insertTemplate(template)}
                          className="text-left p-2 rounded border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          <div className="font-medium text-sm text-white">{template.name}</div>
                          <div className="text-xs text-white/60">{template.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-hidden relative">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Start writing in Markdown...&#10;&#10;Use [[Note Title]] to link to other notes.&#10;Use #tag for hashtags.&#10;Use **bold** and *italic* for formatting."
                  className="w-full h-full p-4 bg-transparent text-white font-mono text-sm resize-none focus:outline-none"
                  style={{ lineHeight: "1.6" }}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Draggable Divider */}
          {viewMode === "split" && (
            <div
              className="w-2 h-full bg-white/5 hover:bg-purple-500/30 cursor-col-resize flex items-center justify-center transition-colors group"
              onMouseDown={handleDividerMouseDown}
              onDoubleClick={handleDividerDoubleClick}
              title="Drag to resize. Double-click to reset."
            >
              <GripVertical size={12} className="text-white/30 group-hover:text-purple-400 transition-colors" />
            </div>
          )}

          {/* Preview Pane - inlined to prevent remounting */}
          {(viewMode === "split" || viewMode === "preview") && (
            <div
              className="h-full overflow-hidden bg-black/20"
              style={{ width: viewMode === "split" ? `${100 - dividerPosition}%` : "100%" }}
            >
              <div className="h-full overflow-y-auto p-6 prose prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[
                    remarkGfm,
                    remarkBreaks,
                    [remarkWikiLink, {
                      aliasDivider: "|",
                      pageResolver: (name: string) => {
                        if (name.startsWith("card:") || name.startsWith("http://") || name.startsWith("https://")) {
                          return [name];
                        }
                        return [name.replace(/ /g, "-")];
                      },
                      hrefTemplate: (permalink: string) => `#/wiki/${permalink}`,
                    }],
                  ]}
                  components={markdownComponents}
                >
                  {content || "*No content to preview*"}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {autocompleteDropdown}
      </div>
    </div>
  );
}
