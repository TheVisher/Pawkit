'use client';

import { Suspense, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MoreVertical, Edit2, Trash2, ArrowUpDown } from 'lucide-react';
import { useCards } from '@/lib/contexts/convex-data-context';
import { useMutations } from '@/lib/contexts/convex-data-context';
import { TagBadge } from '@/components/tags/tag-badge';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useTagSidebar } from '@/lib/stores/ui-store';
import { useOmnibarCollision } from '@/lib/hooks/use-omnibar-collision';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { cn } from '@/lib/utils';

type SortBy = 'alphabetical' | 'count';

// Wrapper with Suspense for useSearchParams (Next.js 15+ requirement)
export default function TagsPage() {
  return (
    <Suspense fallback={<TagsPageLoading />}>
      <TagsPageContent />
    </Suspense>
  );
}

function TagsPageLoading() {
  return (
    <div className="flex-1">
      <div className="pt-5 pb-4 px-4 md:px-6">
        <div className="h-8 w-24 bg-bg-surface-2 rounded animate-pulse" />
      </div>
      <div className="px-4 md:px-6 pt-4 pb-6">
        <div className="text-center py-12 text-text-muted">Loading tags...</div>
      </div>
    </div>
  );
}

function TagsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspace = useCurrentWorkspace();
  const cards = useCards();
  const { bulkUpdateTags } = useMutations();

  // Derive unique tags and counts from cards
  const { uniqueTags, tagCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const card of cards) {
      if (card.deleted) continue;
      for (const tag of card.tags || []) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return {
      uniqueTags: Object.keys(counts),
      tagCounts: counts,
    };
  }, [cards]);

  // Get custom tag colors from workspace preferences
  const tagColors = useMemo(() => {
    return (workspace?.preferences?.tagColors as Record<string, string>) || {};
  }, [workspace?.preferences?.tagColors]);

  // Collision detection for omnibar
  const headerRef = useRef<HTMLDivElement>(null);
  const needsOffset = useOmnibarCollision(headerRef);

  // Get search query from URL params (set by omnibar)
  const searchQuery = searchParams.get('q') || '';

  // Tag sidebar state from UI store
  const { selectedTag, setSelectedTag } = useTagSidebar();

  // Local state
  const [sortBy, setSortBy] = useState<SortBy>('alphabetical');
  const [isProcessing, setIsProcessing] = useState(false);

  // Dialog states (for mobile/fallback)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToEdit, setTagToEdit] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');

  // Check for create=true query param - redirect to omnibar approach
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      router.replace('/tags');
    }
  }, [searchParams, router]);

  // Clear selected tag if it no longer exists
  useEffect(() => {
    if (selectedTag && !uniqueTags.includes(selectedTag)) {
      setSelectedTag(null);
    }
  }, [selectedTag, uniqueTags, setSelectedTag]);

  // Filter and sort tags
  const filteredTags = useMemo(() => {
    let tags = [...uniqueTags];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      tags = tags.filter((tag) => tag.toLowerCase().includes(query));
    }

    switch (sortBy) {
      case 'alphabetical':
        tags.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        break;
      case 'count':
        tags.sort((a, b) => (tagCounts[b] || 0) - (tagCounts[a] || 0));
        break;
    }

    return tags;
  }, [uniqueTags, tagCounts, searchQuery, sortBy]);

  // Group tags by first letter (only for alphabetical sort)
  const groupedTags = useMemo(() => {
    if (sortBy !== 'alphabetical') {
      return { '': filteredTags };
    }

    const groups: Record<string, string[]> = {};

    for (const tag of filteredTags) {
      const firstChar = tag.charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';

      if (!groups[letter]) {
        groups[letter] = [];
      }
      groups[letter].push(tag);
    }

    return groups;
  }, [filteredTags, sortBy]);

  // Get sorted letter keys
  const sortedLetters = useMemo(() => {
    return Object.keys(groupedTags).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      if (a === '') return -1;
      if (b === '') return 1;
      return a.localeCompare(b);
    });
  }, [groupedTags]);

  // Handlers for dialogs (mobile fallback)
  const openRenameDialog = (tag: string) => {
    setTagToEdit(tag);
    setNewTagName(tag);
    setRenameDialogOpen(true);
  };

  const openDeleteDialog = (tag: string) => {
    setTagToEdit(tag);
    setDeleteDialogOpen(true);
  };

  const handleRename = async () => {
    if (!tagToEdit || !newTagName.trim() || !workspace?._id) return;

    setIsProcessing(true);
    try {
      // Find all cards with this tag
      const cardsWithTag = cards.filter(c => !c.deleted && c.tags?.includes(tagToEdit));
      const cardIds = cardsWithTag.map(c => c._id);

      if (cardIds.length > 0) {
        // Use bulk update - remove old tag, add new tag
        await bulkUpdateTags(cardIds, [newTagName.trim()], [tagToEdit]);
      }

      setRenameDialogOpen(false);
      setTagToEdit(null);
      setNewTagName('');
    } catch (error) {
      console.error('Failed to rename tag:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!tagToEdit || !workspace?._id) return;

    setIsProcessing(true);
    try {
      // Find all cards with this tag
      const cardsWithTag = cards.filter(c => !c.deleted && c.tags?.includes(tagToEdit));
      const cardIds = cardsWithTag.map(c => c._id);

      if (cardIds.length > 0) {
        // Use bulk update - remove the tag
        await bulkUpdateTags(cardIds, [], [tagToEdit]);
      }

      setDeleteDialogOpen(false);
      setTagToEdit(null);
    } catch (error) {
      console.error('Failed to delete tag:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Tag click handler - sets selected tag in UI store for sidebar
  const handleTagClick = useCallback((tag: string) => {
    setSelectedTag(tag);
  }, [setSelectedTag]);

  const subtitle = uniqueTags.length === 0
    ? 'Organize your content'
    : `${uniqueTags.length} tag${uniqueTags.length === 1 ? '' : 's'}`;

  const headerActions = (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-sm">
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortBy === 'alphabetical' ? 'A-Z' : 'Count'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setSortBy('alphabetical')}>
            Alphabetical (A-Z)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSortBy('count')}>
            Usage count
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="flex-1">
      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        {/* Header with collision-aware offset */}
        <div className={cn('transition-[padding] duration-200', needsOffset && 'md:pt-20')}>
          {/* Custom header layout: title measured for collision, actions stay right */}
          <div className="pt-5 pb-4 px-4 md:px-6 min-h-[76px]">
            <div className="flex items-start justify-between gap-4">
              {/* Title area - measured for collision */}
              <div ref={headerRef} className="w-fit space-y-0.5">
                <div className="text-xs text-text-muted">{subtitle}</div>
                <h1 className="text-2xl font-semibold text-text-primary">Tags</h1>
              </div>
              {/* Actions - always on the right */}
              <div className="flex items-center gap-2 shrink-0">
                {headerActions}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-6 pt-4 pb-6">
          {filteredTags.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              {searchQuery ? 'No tags match your search' : 'No tags yet. Use + in the omnibar to create your first tag.'}
            </div>
          ) : (
            /* Wall-style layout like Capacities */
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-6">
              {sortedLetters.map((letter) => (
                <div key={letter || 'all'} className="break-inside-avoid mb-6">
                  {/* Letter Header */}
                  {sortBy === 'alphabetical' && letter && (
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="text-xl font-bold text-text-muted">{letter}</span>
                      <div className="flex-1 h-px bg-border-subtle" />
                    </div>
                  )}

                  {/* Tags as row items */}
                  <div className="space-y-1.5">
                    {groupedTags[letter].map((tag) => (
                      <div key={tag} className="group relative">
                        <button
                          onClick={() => handleTagClick(tag)}
                          className={cn(
                            'w-full flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg',
                            'text-left transition-all',
                            'hover:bg-bg-surface-2',
                            selectedTag === tag && 'bg-[var(--color-accent)]/10'
                          )}
                        >
                          {/* Tag badge - same as displayed on cards */}
                          <TagBadge tag={tag} size="sm" customColor={tagColors[tag]} />
                          <span className="text-text-muted text-xs tabular-nums shrink-0">
                            {tagCounts[tag] || 0}
                          </span>
                        </button>

                        {/* Mobile-only dropdown trigger */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={cn(
                                'absolute right-8 top-1/2 -translate-y-1/2',
                                'h-6 w-6 md:hidden flex items-center justify-center rounded-full',
                                'text-text-muted hover:text-text-primary hover:bg-bg-surface-2',
                                'opacity-0 group-hover:opacity-100 transition-opacity'
                              )}
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openRenameDialog(tag)}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(tag)}
                              className="text-red-400 focus:text-red-400"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Dialogs */}
      <ResponsiveDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        title="Rename Tag"
        description={`This will update all ${tagCounts[tagToEdit || ''] || 0} card(s) that use this tag.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isProcessing || !newTagName.trim()}>
              {isProcessing ? 'Renaming...' : 'Rename'}
            </Button>
          </>
        }
      >
        <div className="py-4">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="New tag name"
            className="bg-bg-surface-2"
            autoFocus
          />
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Tag"
        description={`This will remove the tag from ${tagCounts[tagToEdit || ''] || 0} card(s). The cards themselves will not be deleted.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isProcessing}
            >
              {isProcessing ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      >
        <div />
      </ResponsiveDialog>
    </div>
  );
}
