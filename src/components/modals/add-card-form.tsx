'use client';

import { useState, useEffect } from 'react';
import { Link2, FileText, Loader2 } from 'lucide-react';
import { useDataStore } from '@/lib/stores/data-store';
import { useCurrentWorkspaceId, useCollections } from '@/lib/stores';
import { useToast } from '@/lib/stores/toast-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddCardFormProps {
  defaultTab: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddCardForm({ defaultTab, onSuccess, onCancel }: AddCardFormProps) {
  const createCard = useDataStore((state) => state.createCard);
  const workspaceId = useCurrentWorkspaceId();
  const collections = useCollections();
  const { success, error } = useToast();

  // Bookmark form state
  const [bookmarkUrl, setBookmarkUrl] = useState('');
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkDescription, setBookmarkDescription] = useState('');
  const [bookmarkCollection, setBookmarkCollection] = useState<string>('');
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  // Note form state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCollection, setNoteCollection] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  // Mock metadata fetch
  const fetchMetadata = async (url: string) => {
    if (!url) return;
    setIsFetchingMetadata(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const mockTitle = pathParts.length > 0
        ? pathParts[pathParts.length - 1]
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .replace(/\.[^/.]+$/, '')
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        : domain;
      setBookmarkTitle(mockTitle || domain);
      setBookmarkDescription(`Content from ${domain}`);
    } catch {
      setBookmarkTitle(url);
    }
    setIsFetchingMetadata(false);
  };

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    setTimeout(() => fetchMetadata(pastedText), 100);
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchMetadata(bookmarkUrl);
    }
  };

  const handleSaveBookmark = async () => {
    if (!workspaceId || !bookmarkUrl) return;
    setIsSaving(true);
    try {
      let domain = '';
      try {
        domain = new URL(bookmarkUrl).hostname.replace('www.', '');
      } catch {}
      await createCard({
        workspaceId,
        type: 'url',
        url: bookmarkUrl,
        title: bookmarkTitle || bookmarkUrl,
        description: bookmarkDescription || undefined,
        domain,
        status: 'READY',
        tags: [],
        collections: bookmarkCollection ? [bookmarkCollection] : [],
        pinned: false,
        isFileCard: false,
      });
      success('Bookmark saved');
      onSuccess();
    } catch (err) {
      console.error('Failed to save bookmark:', err);
      error('Failed to save bookmark');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNote = async () => {
    if (!workspaceId || !noteTitle) return;
    setIsSaving(true);
    try {
      await createCard({
        workspaceId,
        type: 'md-note',
        url: '',
        title: noteTitle,
        content: noteContent || undefined,
        status: 'READY',
        tags: [],
        collections: noteCollection ? [noteCollection] : [],
        pinned: false,
        isFileCard: false,
      });
      success('Note created');
      onSuccess();
    } catch (err) {
      console.error('Failed to save note:', err);
      error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-[var(--glass-bg)] border border-[var(--glass-border)]">
        <TabsTrigger
          value="bookmark"
          className="data-[state=active]:bg-[var(--glass-bg-hover)] data-[state=active]:text-text-primary text-text-secondary"
        >
          <Link2 className="h-4 w-4 mr-2" />
          Bookmark
        </TabsTrigger>
        <TabsTrigger
          value="note"
          className="data-[state=active]:bg-[var(--glass-bg-hover)] data-[state=active]:text-text-primary text-text-secondary"
        >
          <FileText className="h-4 w-4 mr-2" />
          Note
        </TabsTrigger>
      </TabsList>

      {/* Bookmark Tab */}
      <TabsContent value="bookmark" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="url" className="text-text-secondary">URL</Label>
          <Input
            id="url"
            type="url"
            placeholder="https://example.com/article"
            value={bookmarkUrl}
            onChange={(e) => setBookmarkUrl(e.target.value)}
            onPaste={handleUrlPaste}
            onKeyDown={handleUrlKeyDown}
            className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-text-primary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="title" className="text-text-secondary">Title</Label>
          <div className="relative">
            <Input
              id="title"
              placeholder="Page title"
              value={bookmarkTitle}
              onChange={(e) => setBookmarkTitle(e.target.value)}
              disabled={isFetchingMetadata}
              className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-text-primary"
            />
            {isFetchingMetadata && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="collection" className="text-text-secondary">Collection (optional)</Label>
          <Select value={bookmarkCollection} onValueChange={setBookmarkCollection}>
            <SelectTrigger className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-text-primary">
              <SelectValue placeholder="Select a collection" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--glass-panel-bg)] backdrop-blur-[var(--glass-blur)] border-[var(--glass-border)]">
              {collections.map((collection) => (
                <SelectItem
                  key={collection.id}
                  value={collection.slug}
                  className="text-text-secondary"
                >
                  {collection.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={onCancel} className="text-text-secondary">Cancel</Button>
          <Button
            onClick={handleSaveBookmark}
            disabled={!bookmarkUrl || isSaving}
            className="bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/50 text-[var(--color-accent)]"
          >
            {isSaving ? 'Saving...' : 'Save Bookmark'}
          </Button>
        </div>
      </TabsContent>

      {/* Note Tab */}
      <TabsContent value="note" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="note-title" className="text-text-secondary">Title</Label>
          <Input
            id="note-title"
            placeholder="Note title"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-text-primary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note-content" className="text-text-secondary">Content</Label>
          <Textarea
            id="note-content"
            placeholder="Write your note..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            rows={6}
            className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-text-primary resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note-collection" className="text-text-secondary">Collection (optional)</Label>
          <Select value={noteCollection} onValueChange={setNoteCollection}>
            <SelectTrigger className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-text-primary">
              <SelectValue placeholder="Select a collection" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--glass-panel-bg)] backdrop-blur-[var(--glass-blur)] border-[var(--glass-border)]">
              {collections.map((collection) => (
                <SelectItem
                  key={collection.id}
                  value={collection.slug}
                  className="text-text-secondary"
                >
                  {collection.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={onCancel} className="text-text-secondary">Cancel</Button>
          <Button
            onClick={handleSaveNote}
            disabled={!noteTitle || isSaving}
            className="bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/50 text-[var(--color-accent)]"
          >
            {isSaving ? 'Saving...' : 'Save Note'}
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
