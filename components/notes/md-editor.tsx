"use client";

import { useState, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import remarkBreaks from "remark-breaks";
import { useDataStore } from "@/lib/stores/data-store";
import { noteTemplates, NoteTemplate } from "@/lib/templates/note-templates";
import { Bold, Italic, Strikethrough, Link, Code, List, ListOrdered, Quote, Eye, Edit, Maximize2, FileText, Bookmark, Globe, Layout } from "lucide-react";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cards = useDataStore((state) => state.cards);

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

  // Insert markdown formatting
  const insertMarkdown = (before: string, after: string = '') => {
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
      const newPosition = start + before.length + selectedText.length;
      textarea.setSelectionRange(newPosition, newPosition);
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

  // Custom renderer for wiki-links
  const components = {
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
          <div className="flex-1 overflow-hidden">
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
          </div>
        </>
      ) : (
        /* Preview */
        <div className="flex-1 overflow-y-auto p-4 prose prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[
              remarkGfm,
              remarkBreaks,
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
