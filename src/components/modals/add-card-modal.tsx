'use client';

import { useState, useEffect } from 'react';
import { Link2, FileText, Loader2 } from 'lucide-react';
import { useModalStore } from '@/lib/stores/modal-store';
import { useDataStore } from '@/lib/stores/data-store';
import { useCurrentWorkspaceId, useCollections } from '@/lib/stores';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export function AddCardModal() {
  const { isAddCardOpen, addCardDefaultTab, closeAddCard } = useModalStore();
  const createCard = useDataStore((state) => state.createCard);
  const workspaceId = useCurrentWorkspaceId();
  const collections = useCollections();

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
  const [activeTab, setActiveTab] = useState<string>(addCardDefaultTab);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isAddCardOpen) {
      setActiveTab(addCardDefaultTab);
    } else {
      // Reset all fields when modal closes
      setBookmarkUrl('');
      setBookmarkTitle('');
      setBookmarkDescription('');
      setBookmarkCollection('');
      setNoteTitle('');
      setNoteContent('');
      setNoteCollection('');
    }
  }, [isAddCardOpen, addCardDefaultTab]);

  // Mock metadata fetch
  const fetchMetadata = async (url: string) => {
    if (!url) return;

    setIsFetchingMetadata(true);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock metadata based on URL
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');

      // Generate mock title from URL
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const mockTitle = pathParts.length > 0
        ? pathParts[pathParts.length - 1]
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .replace(/\.[^/.]+$/, '') // Remove file extension
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        : domain;

      setBookmarkTitle(mockTitle || domain);
      setBookmarkDescription(`Content from ${domain}`);
    } catch {
      // Invalid URL, just use the URL as title
      setBookmarkTitle(url);
    }

    setIsFetchingMetadata(false);
  };

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    // Auto-fetch metadata after paste
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
      } catch {
        // Invalid URL
      }

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
      });

      closeAddCard();
    } catch (error) {
      console.error('Failed to save bookmark:', error);
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
      });

      closeAddCard();
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isAddCardOpen} onOpenChange={(open) => !open && closeAddCard()}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-900/95 backdrop-blur-xl border-zinc-800 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-zinc-100">Add New</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-800/50">
            <TabsTrigger
              value="bookmark"
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Bookmark
            </TabsTrigger>
            <TabsTrigger
              value="note"
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100"
            >
              <FileText className="h-4 w-4 mr-2" />
              Note
            </TabsTrigger>
          </TabsList>

          {/* Bookmark Tab */}
          <TabsContent value="bookmark" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="url" className="text-zinc-300">
                URL
              </Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/article"
                value={bookmarkUrl}
                onChange={(e) => setBookmarkUrl(e.target.value)}
                onPaste={handleUrlPaste}
                onKeyDown={handleUrlKeyDown}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-zinc-300">
                Title
              </Label>
              <div className="relative">
                <Input
                  id="title"
                  placeholder="Page title"
                  value={bookmarkTitle}
                  onChange={(e) => setBookmarkTitle(e.target.value)}
                  disabled={isFetchingMetadata}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                />
                {isFetchingMetadata && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="collection" className="text-zinc-300">
                Collection (optional)
              </Label>
              <Select value={bookmarkCollection} onValueChange={setBookmarkCollection}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue placeholder="Select a collection" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {collections.map((collection) => (
                    <SelectItem
                      key={collection.id}
                      value={collection.slug}
                      className="text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100"
                    >
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={closeAddCard}
                className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveBookmark}
                disabled={!bookmarkUrl || isSaving}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Bookmark'
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Note Tab */}
          <TabsContent value="note" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="note-title" className="text-zinc-300">
                Title
              </Label>
              <Input
                id="note-title"
                placeholder="Note title"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note-content" className="text-zinc-300">
                Content
              </Label>
              <Textarea
                id="note-content"
                placeholder="Write your note... (Markdown supported)"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={6}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note-collection" className="text-zinc-300">
                Collection (optional)
              </Label>
              <Select value={noteCollection} onValueChange={setNoteCollection}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue placeholder="Select a collection" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {collections.map((collection) => (
                    <SelectItem
                      key={collection.id}
                      value={collection.slug}
                      className="text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100"
                    >
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={closeAddCard}
                className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveNote}
                disabled={!noteTitle || isSaving}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Note'
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
