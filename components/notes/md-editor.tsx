"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import remarkBreaks from "remark-breaks";
import { useDataStore } from "@/lib/stores/data-store";
import { noteTemplates, NoteTemplate } from "@/lib/templates/note-templates";
import { Bold, Italic, Strikethrough, Link, Code, List, ListOrdered, Quote, Eye, Edit, Maximize2, FileText, Bookmark, Globe, Layout, RefreshCw, Check, Clock, Heading1, Heading2, Heading3 } from "lucide-react";

// Fuzzy search function for note titles
function fuzzySearch(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match gets highest score
  if (textLower === queryLower) return 1000;

  // Starts with gets high score
  if (textLower.startsWith(queryLower)) return 900;

  // Contains gets medium score
  if (textLower.includes(queryLower)) return 500;

  // Fuzzy match - check if all query chars appear in order
  let queryIndex = 0;
  let matchScore = 0;

  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      matchScore += (100 - i); // Earlier matches score higher
      queryIndex++;
    }
  }

  if (queryIndex === queryLower.length) {
    return matchScore;
  }

  return 0; // No match
}

type RichMDEditorProps = {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onNavigate?: (noteId: string) => void;
  onToggleFullscreen?: () => void;
  customComponents?: any; // Custom ReactMarkdown components for wiki-links
};

export function RichMDEditor({ content, onChange, placeholder, onNavigate, onToggleFullscreen, customComponents }: RichMDEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const [showTemplates, setShowTemplates] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cards = useDataStore((state) => state.cards);

  // Wiki-link autocomplete state
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [wikiLinkStartPos, setWikiLinkStartPos] = useState<number | null>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const justClosedRef = useRef(false);

  // Calculate metadata
  const metadata = useMemo(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const characters = content.length;
    const lines = content.split('\n').length;
    
    // Count links
    const linkMatches = content.match(/\[\[([^\]]+)\]\]/g) || [];
    const linkCount = linkMatches.length;
    
    // Count tags
    const tagMatches = content.match(/#([a-zA-Z0-9_-]+)/g) || [];
    const tagCount = tagMatches.length;
    
    return { words, characters, lines, linkCount, tagCount };
  }, [content]);

  // Create a map of note titles to IDs for quick lookup
  const noteTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    cards.forEach((card) => {
      if ((card.type === 'md-note' || card.type === 'text-note') && card.title) {
        map.set(card.title.toLowerCase(), card.id);
      }
    });
    return map;
  }, [cards]);

  // Get all notes for autocomplete (sorted by most recently updated)
  const allNotes = useMemo(() => {
    return cards
      .filter(card => (card.type === 'md-note' || card.type === 'text-note') && card.title && !card.inDen)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [cards]);

  // Filter and sort autocomplete suggestions
  const autocompleteSuggestions = useMemo(() => {
    if (!autocompleteQuery) {
      // Show recent notes when no query
      return allNotes.slice(0, 10);
    }

    // Fuzzy search through all notes
    const scored = allNotes
      .map(note => ({
        note,
        score: fuzzySearch(autocompleteQuery, note.title || '')
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, 10).map(item => item.note);
  }, [autocompleteQuery, allNotes]);

  // Close autocomplete when no suggestions
  useEffect(() => {
    if (autocompleteOpen && autocompleteSuggestions.length === 0) {
      setAutocompleteOpen(false);
      setWikiLinkStartPos(null);
    }
  }, [autocompleteOpen, autocompleteSuggestions.length]);

  // Insert markdown formatting
  const insertMarkdown = (before: string, after: string = '', openAutocomplete: boolean = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);

    onChange(newText);

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      // Place cursor AFTER the closing marker (after both selected text AND after string)
      const newPosition = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newPosition, newPosition);

      // Trigger autocomplete for wiki-links
      if (openAutocomplete && before === '[[' && after === ']]') {
        setWikiLinkStartPos(start);
        setAutocompleteQuery('');
        setSelectedIndex(0);
        setAutocompleteOpen(true);

        // Calculate position for dropdown
        const textareaRect = textarea.getBoundingClientRect();
        const lineHeight = 1.6 * 14;
        const textBeforeCursor = newText.substring(0, start);
        const lines = textBeforeCursor.split('\n');
        const currentLine = lines.length - 1;
        const top = textareaRect.top + (currentLine * lineHeight) + lineHeight * 2 + 4;
        const left = textareaRect.left + 16;

        setAutocompletePosition({ top, left });
      }
    }, 0);
  };

  // Insert template
  const insertTemplate = (template: NoteTemplate) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const newText = content.substring(0, start) + template.content + content.substring(start);
    onChange(newText);
    setShowTemplates(false);

    // Restore focus
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + template.content.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Insert autocomplete suggestion
  const insertAutocompleteSuggestion = (noteTitle: string) => {
    const textarea = textareaRef.current;
    if (!textarea || wikiLinkStartPos === null) return;

    const currentPos = textarea.selectionStart;
    const before = content.substring(0, wikiLinkStartPos);
    let after = content.substring(currentPos);

    // Check if there's a trailing ]] after cursor (from Cmd+K insertion)
    // Remove it if present to avoid duplicate ]]
    if (after.startsWith(']]')) {
      after = after.substring(2);
    }

    const newText = before + `[[${noteTitle}]]` + after;

    onChange(newText);
    setAutocompleteOpen(false);
    setWikiLinkStartPos(null);
    setAutocompleteQuery('');

    // Restore focus and place cursor after the inserted link
    setTimeout(() => {
      textarea.focus();
      const newPosition = wikiLinkStartPos + noteTitle.length + 4; // +4 for [[ and ]]
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Create a map of card titles to IDs for card reference resolution
  const cardTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    cards.forEach((card) => {
      if (card.title) {
        map.set(card.title.toLowerCase(), card.id);
      }
    });
    return map;
  }, [cards]);

  // Scroll selected item into view
  useEffect(() => {
    if (autocompleteOpen && autocompleteRef.current) {
      const container = autocompleteRef.current;
      const selectedButton = container.querySelectorAll('button')[selectedIndex];
      if (selectedButton) {
        selectedButton.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, autocompleteOpen]);

  // Keyboard shortcuts and autocomplete navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Cmd+/ for mode toggle - works in BOTH edit and preview modes
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setMode(mode === 'edit' ? 'preview' : 'edit');
        return;
      }

      // Only handle other shortcuts when in edit mode and textarea is focused
      if (mode !== "edit" || !textareaRef.current?.matches(':focus')) return;

      // Handle autocomplete navigation
      if (autocompleteOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % autocompleteSuggestions.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + autocompleteSuggestions.length) % autocompleteSuggestions.length);
          return;
        }
        if (e.key === 'Enter' && autocompleteSuggestions.length > 0) {
          e.preventDefault();
          const selected = autocompleteSuggestions[selectedIndex];
          if (selected?.title) {
            insertAutocompleteSuggestion(selected.title);
          }
          return;
        }
        if (e.key === 'Escape') {
          // IMPORTANT: stopPropagation prevents this from bubbling to parent modal
          e.preventDefault();
          e.stopPropagation();
          setAutocompleteOpen(false);
          setWikiLinkStartPos(null);
          setAutocompleteQuery('');
          // Set flag to prevent immediate reopening
          justClosedRef.current = true;
          setTimeout(() => {
            justClosedRef.current = false;
          }, 100);
          return;
        }
      }

      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        switch(e.key.toLowerCase()) {
          case 'b':
            insertMarkdown('**', '**');
            break;
          case 'i':
            insertMarkdown('*', '*');
            break;
          case 'k':
            insertMarkdown('[[', ']]', true); // true = open autocomplete
            break;
          case 'e':
            insertMarkdown('`', '`');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mode, autocompleteOpen, autocompleteSuggestions, selectedIndex, insertMarkdown]);

  // Detect [[ for autocomplete
  useEffect(() => {
    if (mode !== 'edit') return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPos);

    // Check if we just typed [[
    const lastTwoChars = textBeforeCursor.slice(-2);
    if (lastTwoChars === '[[' && !autocompleteOpen && !justClosedRef.current) {
      // Only open if not already open and not just closed (prevents re-opening after ESC)
      // Find the position of [[
      const wikiLinkStart = cursorPos - 2;
      setWikiLinkStartPos(wikiLinkStart);
      setAutocompleteQuery('');
      setSelectedIndex(0);
      setAutocompleteOpen(true);

      // Calculate position for dropdown - position below current line
      const textareaRect = textarea.getBoundingClientRect();
      const lineHeight = 1.6 * 14; // line-height * font-size (from textarea style)
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines.length - 1;

      // Position below the current line (add full lineHeight plus gap)
      const top = textareaRect.top + (currentLine * lineHeight) + lineHeight * 2 + 4;
      const left = textareaRect.left + 16; // padding offset

      setAutocompletePosition({ top, left });
    }
    // Check if we're typing inside a [[ ]] and autocomplete is open
    else if (wikiLinkStartPos !== null && cursorPos > wikiLinkStartPos && autocompleteOpen) {
      const query = content.substring(wikiLinkStartPos + 2, cursorPos);

      // Close autocomplete if we encounter ]] or newline
      if (query.includes(']]') || query.includes('\n')) {
        setAutocompleteOpen(false);
        setWikiLinkStartPos(null);
        setAutocompleteQuery('');
      } else {
        setAutocompleteQuery(query);
        setSelectedIndex(0); // Reset selection when query changes
      }
    }
    // Close if cursor moved outside wiki-link
    else if (wikiLinkStartPos !== null && cursorPos <= wikiLinkStartPos && autocompleteOpen) {
      setAutocompleteOpen(false);
      setWikiLinkStartPos(null);
      setAutocompleteQuery('');
    }
  }, [content, mode, wikiLinkStartPos, autocompleteOpen]);

  // Track content changes for save status
  useEffect(() => {
    if (content) {
      setSaveStatus('unsaved');
      const timeout = setTimeout(() => {
        setSaveStatus('saving');
        // Simulate save delay
        setTimeout(() => setSaveStatus('saved'), 500);
      }, 1000); // 1 second debounce

      return () => clearTimeout(timeout);
    }
  }, [content]);

  // Custom renderer for wiki-links and code
  const components = {
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
          
          if (cardId && onNavigate) {
            return (
              <button
                onClick={() => onNavigate(cardId)}
                className="!text-blue-400 hover:!text-blue-300 !underline !decoration-blue-400/50 hover:!decoration-blue-300 cursor-pointer !font-bold transition-colors inline-flex items-center gap-1"
                style={{ color: '#60a5fa', textDecoration: 'underline', textDecorationColor: '#60a5fa80' }}
                {...props}
              >
                <Bookmark size={14} />
                {children}
              </button>
            );
          } else {
            return (
              <span className="text-gray-500 italic inline-flex items-center gap-1" title="Card not found">
                <Bookmark size={14} />
                {children}
              </span>
            );
          }
        }
        
        // Check if this is a URL reference
        if (linkText.startsWith('http://') || linkText.startsWith('https://')) {
          return (
            <a
              href={linkText}
              target="_blank"
              rel="noopener noreferrer"
              className="!text-green-400 hover:!text-green-300 !underline !decoration-green-400/50 hover:!decoration-green-300 cursor-pointer !font-bold transition-colors inline-flex items-center gap-1"
              style={{ color: '#4ade80', textDecoration: 'underline', textDecorationColor: '#4ade8080' }}
              {...props}
            >
              <Globe size={14} />
              {children}
            </a>
          );
        }
        
        // Regular note link
        const noteId = noteTitleMap.get(linkText.toLowerCase());
        if (noteId && onNavigate) {
          return (
            <button
              onClick={() => onNavigate(noteId)}
              className="!text-purple-400 hover:!text-purple-300 !underline !decoration-purple-400/50 hover:!decoration-purple-300 cursor-pointer !font-bold transition-colors inline-flex items-center gap-1"
              style={{ color: '#a78bfa', textDecoration: 'underline', textDecorationColor: '#a78bfa80' }}
              {...props}
            >
              <FileText size={14} />
              {children}
            </button>
          );
        } else {
          // Note doesn't exist - show as broken link
          return (
            <span className="text-gray-500 italic inline-flex items-center gap-1" title="Note not found">
              <FileText size={14} />
              {children}
            </span>
          );
        }
      }

      // Regular link
      return <a href={href} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
    },
  };

  return (
    <div className="flex flex-col h-full bg-surface rounded-lg border border-subtle overflow-hidden">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-muted border-b border-subtle">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode("edit")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              mode === "edit"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-surface-soft"
            }`}
          >
            <Edit size={14} />
            Edit
          </button>
          <button
            onClick={() => setMode("preview")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              mode === "preview"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-surface-soft"
            }`}
          >
            <Eye size={14} />
            Preview
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{metadata.words} words</span>
          <span>{metadata.characters} chars</span>
          <span>{metadata.linkCount} links</span>
          <span>{metadata.tagCount} tags</span>
          <div className="flex items-center gap-1">
            {saveStatus === 'saving' && <><RefreshCw size={12} className="animate-spin" /> Saving...</>}
            {saveStatus === 'saved' && <><Check size={12} className="text-green-500" /> Saved</>}
            {saveStatus === 'unsaved' && <><Clock size={12} className="text-yellow-500" /> Unsaved</>}
          </div>
        </div>
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="p-2 rounded text-muted-foreground hover:bg-surface-soft hover:text-foreground transition-colors"
            title="Toggle fullscreen"
          >
            <Maximize2 size={16} />
          </button>
        )}
      </div>

      {mode === "edit" ? (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-1 px-3 py-2 bg-surface-muted border-b border-subtle flex-wrap">
            <button
              onClick={() => insertMarkdown('**', '**')}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Bold"
            >
              <Bold size={16} />
            </button>
            <button
              onClick={() => insertMarkdown('*', '*')}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Italic"
            >
              <Italic size={16} />
            </button>
            <button
              onClick={() => insertMarkdown('~~', '~~')}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Strikethrough"
            >
              <Strikethrough size={16} />
            </button>
            <div className="w-px h-6 bg-subtle mx-1" />
            <button
              onClick={() => insertMarkdown('# ', '')}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Header 1"
            >
              <Heading1 size={16} />
            </button>
            <button
              onClick={() => insertMarkdown('## ', '')}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Header 2"
            >
              <Heading2 size={16} />
            </button>
            <button
              onClick={() => insertMarkdown('### ', '')}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Header 3"
            >
              <Heading3 size={16} />
            </button>
            <div className="w-px h-6 bg-subtle mx-1" />
            <button
              onClick={() => insertMarkdown('`', '`')}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Code"
            >
              <Code size={16} />
            </button>
            <button
              onClick={() => insertMarkdown('[', '](url)')}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Link"
            >
              <Link size={16} />
            </button>
            <div className="w-px h-6 bg-subtle mx-1" />
            <button
              onClick={() => insertMarkdown('\n- ', '')}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Bullet List"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => insertMarkdown('\n1. ', '')}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Numbered List"
            >
              <ListOrdered size={16} />
            </button>
            <button
              onClick={() => insertMarkdown('\n> ', '')}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Quote"
            >
              <Quote size={16} />
            </button>
            <div className="w-px h-6 bg-subtle mx-1" />
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="p-2 rounded hover:bg-surface-soft text-foreground transition-colors"
              title="Templates"
            >
              <Layout size={16} />
            </button>
          </div>

          {/* Template Dropdown */}
          {showTemplates && (
            <div className="border-b border-subtle bg-surface-muted p-3">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Choose a Template</h4>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {noteTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => insertTemplate(template)}
                      className="text-left p-2 rounded border border-subtle hover:bg-surface-soft transition-colors"
                    >
                      <div className="font-medium text-sm text-foreground">{template.name}</div>
                      <div className="text-xs text-muted-foreground">{template.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {template.tags.map(tag => `#${tag}`).join(' ')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Editor */}
          <div className="flex-1 overflow-hidden relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder || "Start writing in Markdown...\n\nUse [[Note Title]] to link to other notes.\nUse #tag for hashtags.\nUse **bold** and *italic* for formatting."}
              className="w-full h-full p-4 bg-surface text-foreground font-mono text-sm resize-none focus:outline-none"
              style={{
                lineHeight: '1.6',
              }}
            />

            {/* Autocomplete Dropdown */}
            {autocompleteOpen && autocompleteSuggestions.length > 0 && (
              <div
                ref={autocompleteRef}
                className="fixed z-50 bg-surface-muted border border-accent shadow-lg flex flex-col overflow-hidden"
                style={{
                  top: `${autocompletePosition.top}px`,
                  left: `${autocompletePosition.left}px`,
                  minWidth: '300px',
                  maxWidth: '400px',
                  maxHeight: '256px',
                  borderRadius: '0.5rem',
                }}
              >
                {/* Sticky header */}
                <div className="border-b border-subtle px-3 py-2 bg-surface-muted text-xs text-muted-foreground flex-shrink-0">
                  {autocompleteQuery ? `Search: "${autocompleteQuery}"` : 'Recent notes'}
                </div>

                {/* Scrollable content area */}
                <div className="p-2 overflow-y-auto flex-1" style={{ scrollbarGutter: 'stable' }}>
                  {autocompleteSuggestions.map((note, index) => (
                    <button
                      key={note.id}
                      onClick={() => note.title && insertAutocompleteSuggestion(note.title)}
                      className={`w-full text-left px-3 py-2 rounded transition-colors ${
                        index === selectedIndex
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-surface-soft text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{note.title}</div>
                          {note.content && (
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {note.content.substring(0, 60)}...
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Sticky footer */}
                <div className="border-t border-subtle px-3 py-2 bg-surface-muted text-xs text-muted-foreground flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <span>↑↓ navigate</span>
                    <span>Enter to select</span>
                    <span>Esc to close</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Preview */
        <div className="flex-1 overflow-y-auto p-4 prose prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[
              remarkGfm,
              [remarkWikiLink, {
                aliasDivider: '|',
                pageResolver: (name: string) => {
                  // Preserve special syntax for card references and URLs
                  if (name.startsWith('card:') || name.startsWith('http://') || name.startsWith('https://')) {
                    return [name];
                  }
                  // Convert note titles to slugs
                  return [name.replace(/ /g, '-')];
                },
                hrefTemplate: (permalink: string) => `#/wiki/${permalink}`
              }]
            ]}
            components={customComponents || components}
          >
            {content || '*No content to preview*'}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
