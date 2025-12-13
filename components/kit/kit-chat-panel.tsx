'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Trash2, Sparkles, Loader2, Copy, FileText, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useKitStore } from '@/lib/hooks/use-kit-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { cn } from '@/lib/utils';

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

export function KitChatPanel() {
  const [input, setInput] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  } = useKitStore();

  const { addToast } = useToastStore();

  // Copy message content to clipboard
  const copyToClipboard = useCallback(async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      addToast({ type: 'success', message: 'Copied to clipboard' });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      addToast({ type: 'error', message: 'Failed to copy' });
    }
  }, [addToast]);

  // Create note from message (placeholder - will integrate with notes system)
  const saveAsNote = useCallback(async (content: string) => {
    // TODO: Integrate with notes creation system
    // For now, copy to clipboard with a note prompt
    try {
      await navigator.clipboard.writeText(content);
      addToast({ type: 'success', message: 'Content copied - create a new note to save it' });
    } catch {
      addToast({ type: 'error', message: 'Failed to copy content' });
    }
  }, [addToast]);

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
    await sendMessage(trimmedInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center justify-between p-3"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'hsla(var(--accent) / 0.2)' }}
          >
            <span className="text-lg">🐕</span>
          </div>
          <div>
            <h3 className="font-medium text-sm">Kit</h3>
            <p className="text-xs text-muted-foreground">Your Pawkit Assistant</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="p-2 hover:bg-[var(--bg-surface-3)] rounded-lg transition-colors"
            title="Clear chat"
          >
            <Trash2 size={16} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'var(--ds-accent-subtle)' }}
            >
              <Sparkles size={28} style={{ color: 'var(--ds-accent)' }} />
            </div>
            <h4 className="font-medium mb-1">Hey there! I&apos;m Kit 🐕</h4>
            <p className="text-sm text-muted-foreground mb-4">
              I can help you find, organize, and understand your saved content.
            </p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>Try asking me:</p>
              <div className="flex flex-wrap gap-1 justify-center">
                {[
                  "What did I save about React?",
                  "Summarize my recent bookmarks",
                  "Find articles about design",
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
            {messages.map((msg) => {
              // Context change marker
              if (msg.type === 'context-change') {
                return (
                  <div
                    key={msg.id}
                    className="w-full py-2 px-4 text-xs text-center rounded-lg my-2"
                    style={{
                      background: 'var(--bg-surface-1)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    📹 Context: &quot;{msg.content}&quot;
                  </div>
                );
              }

              // Summary card
              if (msg.type === 'summary-card') {
                return (
                  <div
                    key={msg.id}
                    className="rounded-xl p-4 my-2"
                    style={{
                      background: 'var(--bg-surface-2)',
                      boxShadow: 'var(--shadow-2)',
                      border: '1px solid var(--border-subtle)',
                      borderTopColor: 'var(--border-highlight-top)',
                      borderLeftColor: 'var(--border-highlight-left)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4" style={{ color: 'var(--ds-accent)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        AI Summary
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {msg.content}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                        style={{
                          background: 'var(--bg-surface-3)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                        {copiedId === msg.id ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => saveAsNote(msg.content)}
                        className="text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                        style={{
                          background: 'var(--bg-surface-3)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <FileText size={12} />
                        Save as note
                      </button>
                    </div>
                  </div>
                );
              }

              // Regular user/assistant messages
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col",
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
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
                  {/* Copy/Save buttons for assistant messages */}
                  {msg.role === 'assistant' && (
                    <div className="flex gap-1 mt-1 opacity-0 hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="text-xs p-1.5 rounded transition-all"
                        style={{ color: 'var(--text-muted)' }}
                        title="Copy"
                      >
                        {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                      <button
                        onClick={() => saveAsNote(msg.content)}
                        className="text-xs p-1.5 rounded transition-all"
                        style={{ color: 'var(--text-muted)' }}
                        title="Save as note"
                      >
                        <FileText size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl rounded-bl-md px-4 py-2 text-sm"
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
        className="flex-shrink-0 p-3"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
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
              "flex-1 px-4 py-2 rounded-xl text-sm",
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
              "px-4 py-2 rounded-xl text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors hover:opacity-90"
            )}
            style={{ background: 'var(--ds-accent)' }}
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
