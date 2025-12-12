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

interface ToolbarButtonProps {
  icon: React.ElementType;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}

function ToolbarButton({ icon: Icon, onClick, active, disabled, title }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-2 rounded-lg transition-colors",
        active
          ? "bg-[var(--bg-surface-3)] text-[var(--ds-accent)]"
          : "text-muted-foreground hover:bg-[var(--bg-surface-3)] hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
      )}
    >
      <Icon size={16} />
    </button>
  );
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
    <div className="flex flex-col h-full relative">
      {/* Context header - ONE line, plain styling */}
      <div className="flex-shrink-0 px-3 py-2 text-sm text-muted-foreground border-b border-border">
        Viewing: <span className="font-medium text-foreground">{cardTitle}</span>
      </div>

      {/* Messages area - scrollable, flex-1 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'var(--ds-accent-subtle)' }}
            >
              <Sparkles size={24} style={{ color: 'var(--ds-accent)' }} />
            </div>
            <h4 className="font-medium mb-1 text-sm">Chat with Kit about this card</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Ask questions, get summaries, or explore related content.
            </p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex flex-wrap gap-1 justify-center">
                {[
                  "Summarize this",
                  "What's the key takeaway?",
                  "Find related cards",
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="px-2 py-1 bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] rounded-md transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
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
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    msg.role === 'user'
                      ? 'text-white rounded-br-md'
                      : 'rounded-bl-md kit-message'
                  )}
                  style={{
                    background: msg.role === 'user' ? 'var(--ds-accent)' : 'var(--bg-surface-2)',
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
                          <code className="px-1 py-0.5 rounded text-xs" style={{ background: 'var(--bg-surface-3)' }}>
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
                  className="rounded-2xl rounded-bl-md px-3 py-2 text-sm"
                  style={{ background: 'var(--bg-surface-2)' }}
                >
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" style={{ color: 'var(--ds-accent)' }} />
                    <span className="text-muted-foreground italic">{loadingMessage}</span>
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
        <div className="flex-shrink-0 px-3 py-2 text-xs text-red-400 bg-red-500/10 border-t border-red-500/20">
          {error}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex-shrink-0 px-3 py-2 border-t border-border"
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Kit anything..."
            disabled={isLoading}
            className={cn(
              "flex-1 px-3 py-2 rounded-xl text-sm",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-[hsla(var(--accent)/0.5)]",
              "disabled:opacity-50"
            )}
            style={{
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={cn(
              "px-3 py-2 rounded-xl text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors hover:opacity-90"
            )}
            style={{ background: 'var(--ds-accent)' }}
            title="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </form>

      {/* Kit toolbar - tight to input */}
      <div className="flex-shrink-0 flex items-center justify-around px-3 py-2 border-t border-border">
        <ToolbarButton
          icon={MessageSquare}
          onClick={toggleConversationSelector}
          active={isConversationSelectorOpen}
          title="Conversations"
        />
        <ToolbarButton
          icon={Paperclip}
          onClick={() => {}}
          disabled
          title="Attachments (coming soon)"
        />
        <ToolbarButton
          icon={Link2}
          onClick={() => {}}
          disabled
          title="Link cards (coming soon)"
        />
        <ToolbarButton
          icon={Settings}
          onClick={() => {}}
          disabled
          title="Kit Settings (coming soon)"
        />
        <ToolbarButton
          icon={ExternalLink}
          onClick={handlePopOut}
          title="Pop out to overlay"
        />
      </div>

      {/* Conversation selector overlay */}
      <KitConversationSelector />
    </div>
  );
}
