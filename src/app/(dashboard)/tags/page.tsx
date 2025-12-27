'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MoreVertical, Edit2, Trash2, ArrowUpDown } from 'lucide-react';
import { useTagStore } from '@/lib/stores/tag-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { PageHeader } from '@/components/layout/page-header';
import { TagBadge } from '@/components/tags/tag-badge';
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

export default function TagsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspace = useCurrentWorkspace();
  const uniqueTags = useTagStore((s) => s.uniqueTags);
  const tagCounts = useTagStore((s) => s.tagCounts);
  const isLoading = useTagStore((s) => s.isLoading);
  const refreshTags = useTagStore((s) => s.refreshTags);
  const renameTag = useTagStore((s) => s.renameTag);
  const deleteTag = useTagStore((s) => s.deleteTag);

  // Get search query from URL params (set by omnibar)
  const searchQuery = searchParams.get('q') || '';

  // Local state
  const [sortBy, setSortBy] = useState<SortBy>('alphabetical');

  // Dialog states
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToEdit, setTagToEdit] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Refresh tags on mount
  useEffect(() => {
    if (workspace?.id) {
      refreshTags(workspace.id);
    }
  }, [workspace?.id, refreshTags]);

  // Check for create=true query param - redirect to omnibar approach
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      router.replace('/tags');
    }
  }, [searchParams, router]);

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

  // Handlers
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
    if (!tagToEdit || !newTagName.trim() || !workspace?.id) return;

    setIsProcessing(true);
    try {
      await renameTag(workspace.id, tagToEdit, newTagName.trim());
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
    if (!tagToEdit || !workspace?.id) return;

    setIsProcessing(true);
    try {
      await deleteTag(workspace.id, tagToEdit);
      setDeleteDialogOpen(false);
      setTagToEdit(null);
    } catch (error) {
      console.error('Failed to delete tag:', error);
    } finally {
      setIsProcessing(false);
    }
  };

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
      <PageHeader
        title="Tags"
        subtitle={subtitle}
        actions={headerActions}
      />

      <div className="px-4 md:px-6 pt-4 pb-6">
        {isLoading ? (
          <div className="text-center py-12 text-text-muted">
            Loading tags...
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            {searchQuery ? 'No tags match your search' : 'No tags yet. Use + in the omnibar to create your first tag.'}
          </div>
        ) : (
          <div className="space-y-8">
            {sortedLetters.map((letter) => (
              <div key={letter || 'all'}>
                {sortBy === 'alphabetical' && letter && (
                  <h2 className="text-lg font-semibold text-text-muted mb-3">
                    {letter}
                  </h2>
                )}

                <div className="flex flex-wrap gap-2">
                  {groupedTags[letter].map((tag) => (
                    <div
                      key={tag}
                      className="group flex items-center gap-0.5"
                    >
                      <TagBadge tag={tag} size="md" />

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={cn(
                              'h-6 w-6 md:h-5 md:w-5 flex items-center justify-center rounded-full',
                              'text-text-muted hover:text-text-primary hover:bg-bg-surface-2',
                              // Visible on mobile (touch), hover-only on desktop
                              'opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity',
                              '-ml-0.5'
                            )}
                          >
                            <MoreVertical className="h-3.5 w-3.5 md:h-3 md:w-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
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