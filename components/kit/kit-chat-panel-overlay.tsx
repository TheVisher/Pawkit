'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { useKitStore } from '@/lib/hooks/use-kit-store';
import { useCurrentContext } from '@/hooks/use-current-context';
import { cn } from '@/lib/utils';

export function KitChatPanelOverlay() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { context, pawkitSlug } = useCurrentContext();

  const {
    messages,
    isLoading,
    error,
    sendMessage,
  } = useKitStore();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  return (
    <div className="flex flex-col h-full">
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
                    "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                    msg.role === 'user'
                      ? 'text-white rounded-br-md'
                      : 'rounded-bl-md'
                  )}
                  style={{
                    background: msg.role === 'user' ? 'var(--ds-accent)' : 'var(--bg-surface-2)',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl rounded-bl-md px-4 py-2 text-sm"
                  style={{ background: 'var(--bg-surface-2)' }}
                >
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-muted-foreground">Kit is thinking...</span>
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
