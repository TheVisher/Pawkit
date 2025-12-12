'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, MessageSquare, Paperclip, Link2, Settings, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useKitStore } from '@/lib/hooks/use-kit-store';
import { useCurrentContext } from '@/hooks/use-current-context';
import { cn } from '@/lib/utils';
import { KitConversationSelector } from './kit-conversation-selector';

const LOADING_MESSAGES = [
  "*sniff sniff*...",
  "Fetching...",
  "*digs around*...",
  "*ears perk up*...",
  "*tail wag*...",
  "On it!...",
  "Sniffing out an answer...",
  "*paws at keyboard*...",
  "Let me dig that up...",
  "One sec...",
];

function getRandomLoadingMessage() {
  return LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
}

interface KitSidebarEmbedProps {
  cardId: string;
  cardTitle: string;
}

export function KitSidebarEmbed({ cardTitle }: KitSidebarEmbedProps) {
  const [input, setInput] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { context, pawkitSlug } = useCurrentContext();

  const messages = useKitStore((state) => state.messages);
  const isLoading = useKitStore((state) => state.isLoading);
  const error = useKitStore((state) => state.error);
  const sendMessage = useKitStore((state) => state.sendMessage);
  const isConversationSelectorOpen = useKitStore((state) => state.isConversationSelectorOpen);
  const toggleConversationSelector = useKitStore((state) => state.toggleConversationSelector);
  const setEmbeddedInSidebar = useKitStore((state) => state.setEmbeddedInSidebar);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Update loading message when isLoading changes to true
  useEffect(() => {
    if (isLoading) {
      setLoadingMessage(getRandomLoadingMessage());
    }
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    setInput('');
    await sendMessage(trimmedInput, context, pawkitSlug);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handlePopOut = () => {
    setEmbeddedInSidebar(false);
  };

  return (
    <div
      className="flex flex-col h-full rounded-lg overflow-hidden relative"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
        borderTopColor: 'var(--border-highlight-top)',
        borderLeftColor: 'var(--border-highlight-left)',
      }}
    >
      {/* ===== HEADER - Inset depth (recessed look) ===== */}
      <div
        className="px-3 py-3 flex-shrink-0"
        style={{
          background: 'var(--bg-surface-1)',
          boxShadow: 'var(--inset-shadow)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span>🐕</span>
          <span>Kit</span>
        </div>
        <div
          className="text-xs truncate mt-0.5"
          style={{ color: 'var(--text-muted)' }}
        >
          Viewing: {cardTitle}
        </div>
      </div>

      {/* ===== CHAT MESSAGES - Scrollable area ===== */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3"
        style={{ background: 'var(--bg-surface-2)' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-2">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'var(--ds-accent-subtle)' }}
            >
              <Sparkles size={24} style={{ color: 'var(--ds-accent)' }} />
            </div>
            <h4 className="font-medium mb-1 text-sm" style={{ color: 'var(--text-primary)' }}>
              Chat with Kit about this card
            </h4>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Ask questions, get summaries, or explore related content.
            </p>
            <div className="flex flex-wrap gap-1 justify-center text-xs">
              {[
                "Summarize this",
                "Key takeaway?",
                "Related cards",
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setInput(suggestion)}
                  className="px-2 py-1 rounded-md transition-colors"
                  style={{
                    background: 'var(--bg-surface-1)',
                    color: 'var(--text-secondary)',
                    boxShadow: 'var(--raised-shadow-sm)',
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className="max-w-[85%] px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: msg.role === 'user' ? 'var(--ds-accent)' : 'var(--bg-surface-3)',
                    color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                    boxShadow: 'var(--raised-shadow-sm)',
                  }}
                >
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        code: ({ children }) => (
                          <code className="px-1 py-0.5 rounded text-xs" style={{ background: 'var(--bg-surface-1)' }}>
                            {children}
                          </code>
                        ),
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--ds-accent)' }}>
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: 'var(--bg-surface-3)',
                    color: 'var(--text-muted)',
                    boxShadow: 'var(--raised-shadow-sm)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" style={{ color: 'var(--ds-accent)' }} />
                    <span className="italic">{loadingMessage}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex-shrink-0 px-3 py-2 text-xs text-red-400 bg-red-500/10">
          {error}
        </div>
      )}

      {/* ===== INPUT + TOOLBAR - Raised depth ===== */}
      <div
        className="flex-shrink-0 px-3 py-3"
        style={{
          background: 'var(--bg-surface-2)',
          boxShadow: 'var(--raised-shadow-sm)',
          borderTop: '1px solid var(--border-highlight-top)',
        }}
      >
        {/* Input row */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Kit anything..."
            disabled={isLoading}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-shadow",
              "disabled:opacity-50"
            )}
            style={{
              background: 'var(--bg-surface-1)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              boxShadow: 'var(--inset-shadow)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = 'var(--glow-focus)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'var(--inset-shadow)';
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={cn(
              "p-2 rounded-lg transition-all",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            style={{
              background: 'var(--ds-accent)',
              color: 'white',
              boxShadow: 'var(--raised-shadow-sm)',
            }}
            title="Send message"
          >
            <Send size={16} />
          </button>
        </form>

        {/* Kit toolbar - NO border, part of same unit */}
        <div className="flex justify-around">
          <button
            onClick={toggleConversationSelector}
            className="p-2 rounded-lg transition-colors"
            style={{
              color: isConversationSelectorOpen ? 'var(--ds-accent)' : 'var(--text-muted)',
              background: isConversationSelectorOpen ? 'var(--bg-surface-3)' : 'transparent',
            }}
            title="Conversations"
          >
            <MessageSquare size={18} />
          </button>
          <button
            className="p-2 rounded-lg opacity-50 cursor-not-allowed"
            style={{ color: 'var(--text-muted)' }}
            title="Attachments (coming soon)"
            disabled
          >
            <Paperclip size={18} />
          </button>
          <button
            className="p-2 rounded-lg opacity-50 cursor-not-allowed"
            style={{ color: 'var(--text-muted)' }}
            title="Link cards (coming soon)"
            disabled
          >
            <Link2 size={18} />
          </button>
          <button
            className="p-2 rounded-lg opacity-50 cursor-not-allowed"
            style={{ color: 'var(--text-muted)' }}
            title="Kit Settings (coming soon)"
            disabled
          >
            <Settings size={18} />
          </button>
          <button
            onClick={handlePopOut}
            className="p-2 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'var(--text-muted)' }}
            title="Pop out to overlay"
          >
            <ExternalLink size={18} />
          </button>
        </div>
      </div>

      {/* Conversation selector overlay */}
      <KitConversationSelector />
    </div>
  );
}
