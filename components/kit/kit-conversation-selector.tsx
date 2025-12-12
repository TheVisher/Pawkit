'use client';

import { useKitStore } from '@/lib/hooks/use-kit-store';
import { Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
    }
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function KitConversationSelector() {
  const isOpen = useKitStore((state) => state.isConversationSelectorOpen);
  const savedConversations = useKitStore((state) => state.savedConversations);
  const activeConversationId = useKitStore((state) => state.activeConversationId);
  const loadConversation = useKitStore((state) => state.loadConversation);
  const deleteConversation = useKitStore((state) => state.deleteConversation);
  const newConversation = useKitStore((state) => state.newConversation);
  const setConversationSelectorOpen = useKitStore((state) => state.setConversationSelectorOpen);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-[9]"
        onClick={() => setConversationSelectorOpen(false)}
      />

      {/* Panel */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-[52px] z-10",
          "rounded-t-xl overflow-hidden",
          "animate-in slide-in-from-bottom-4 duration-200"
        )}
        style={{
          background: 'var(--bg-surface-1)',
          border: '1px solid var(--border-subtle)',
          borderBottom: 'none',
          boxShadow: 'var(--shadow-4)',
          maxHeight: '60%',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <span className="text-sm font-medium">Conversations</span>
          <button
            onClick={newConversation}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors"
            style={{
              background: 'var(--ds-accent)',
              color: 'white',
            }}
          >
            <Plus size={12} />
            New Chat
          </button>
        </div>

        {/* Conversation list */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(60vh - 44px)' }}>
          {savedConversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No saved conversations yet
            </div>
          ) : (
            savedConversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "group flex items-center justify-between px-3 py-2 cursor-pointer transition-colors",
                  conv.id === activeConversationId
                    ? "bg-[var(--bg-surface-3)]"
                    : "hover:bg-[var(--bg-surface-2)]"
                )}
                onClick={() => loadConversation(conv.id)}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeDate(conv.updatedAt)}
                    {conv.cardId && ' · Card context'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--bg-surface-4)]"
                  title="Delete conversation"
                >
                  <Trash2 size={14} className="text-muted-foreground" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
