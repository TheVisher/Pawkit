'use client';

import { useMemo } from 'react';
import { useDataStore } from '@/lib/stores/data-store';
import { useViewStore } from '@/lib/stores/view-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { CardGrid } from '@/components/cards/card-grid';
import { EmptyState } from '@/components/cards/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Bookmark, FileText, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

type ContentTab = 'all' | 'bookmarks' | 'notes';

export default function LibraryPage() {
  const cards = useDataStore((state) => state.cards);
  const isLoading = useDataStore((state) => state.isLoading);
  const layout = useViewStore((state) => state.layout);
  const contentFilter = useViewStore((state) => state.contentTypeFilter);
  const setContentFilter = useViewStore((state) => state.setContentTypeFilter);
  const openAddCard = useModalStore((state) => state.openAddCard);

  // Filter out deleted cards
  const activeCards = useMemo(() => cards.filter((card) => !card._deleted), [cards]);

  // Map content filter to tab state
  const currentTab: ContentTab = useMemo(() => {
    if (contentFilter === 'url') return 'bookmarks';
    if (contentFilter === 'md-note' || contentFilter === 'text-note' || contentFilter === 'quick-note') return 'notes';
    return 'all';
  }, [contentFilter]);

  // Filter cards by content type
  const filteredCards = useMemo(() => {
    if (currentTab === 'all') return activeCards;
    if (currentTab === 'bookmarks') {
      return activeCards.filter((card) => card.type === 'url');
    }
    // Notes include md-note, text-note, quick-note
    return activeCards.filter((card) =>
      card.type === 'md-note' || card.type === 'text-note' || card.type === 'quick-note'
    );
  }, [activeCards, currentTab]);

  // Handle tab change
  const handleTabChange = (tab: ContentTab) => {
    if (tab === 'all') setContentFilter('all');
    else if (tab === 'bookmarks') setContentFilter('url');
    else setContentFilter('md-note'); // Notes filter
  };

  // Sort cards by updatedAt (most recent first)
  const sortedCards = useMemo(() => {
    return [...filteredCards].sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });
  }, [filteredCards]);

  // Count cards by type
  const counts = useMemo(() => {
    const bookmarks = activeCards.filter((c) => c.type === 'url').length;
    const notes = activeCards.filter((c) =>
      c.type === 'md-note' || c.type === 'text-note' || c.type === 'quick-note'
    ).length;
    return {
      all: activeCards.length,
      bookmarks,
      notes,
    };
  }, [activeCards]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <PageHeader>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Library</h1>
            <p style={{ color: 'var(--text-muted)' }}>All your saved content</p>
          </div>
        </PageHeader>
        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-2xl animate-pulse"
                style={{ background: 'var(--bg-surface-2)' }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Library</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {activeCards.length === 0
              ? 'All your saved content'
              : `${filteredCards.length} item${filteredCards.length === 1 ? '' : 's'}`}
          </p>
        </div>
      </PageHeader>

      <div className="flex-1 p-6">

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <TabButton
          active={currentTab === 'all'}
          onClick={() => handleTabChange('all')}
          icon={Layers}
          label="All"
          count={counts.all}
        />
        <TabButton
          active={currentTab === 'bookmarks'}
          onClick={() => handleTabChange('bookmarks')}
          icon={Bookmark}
          label="Bookmarks"
          count={counts.bookmarks}
        />
        <TabButton
          active={currentTab === 'notes'}
          onClick={() => handleTabChange('notes')}
          icon={FileText}
          label="Notes"
          count={counts.notes}
        />
      </div>

      {/* Content */}
      {activeCards.length === 0 ? (
        // Only show empty state when truly no cards exist
        <EmptyState
          icon={Bookmark}
          title="No bookmarks yet"
          description="Save your first bookmark to get started. Use the + button above or press ⌘⇧B."
          actionLabel="Add bookmark"
          onAction={() => openAddCard('bookmark')}
        />
      ) : filteredCards.length === 0 ? (
        // Show filtered empty state
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--bg-surface-2)' }}
          >
            {currentTab === 'notes' ? (
              <FileText className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
            ) : (
              <Bookmark className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)' }} className="font-medium">
            No {currentTab === 'notes' ? 'notes' : 'bookmarks'} yet
          </p>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm mt-1">
            {currentTab === 'notes'
              ? 'Create a note to get started'
              : 'Save a URL to get started'}
          </p>
        </div>
      ) : (
        <CardGrid cards={sortedCards} layout={layout} />
      )}
      </div>
    </div>
  );
}

// Tab button component
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  count: number;
}

function TabButton({ active, onClick, icon: Icon, label, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
        'border backdrop-blur-sm'
      )}
      style={
        active
          ? {
              background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
              boxShadow: 'var(--raised-shadow), 0 0 20px hsla(var(--accent-h) var(--accent-s) 50% / 0.3)',
              border: '1px solid hsla(var(--accent-h) var(--accent-s) 50% / 0.5)',
              color: 'var(--ds-accent)',
            }
          : {
              background: 'var(--bg-surface-1)',
              boxShadow: 'var(--inset-shadow)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }
      }
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      <span
        className={cn(
          'px-1.5 py-0.5 text-xs rounded-md',
          active ? 'opacity-80' : 'opacity-60'
        )}
        style={{ background: 'var(--bg-surface-2)' }}
      >
        {count}
      </span>
    </button>
  );
}
