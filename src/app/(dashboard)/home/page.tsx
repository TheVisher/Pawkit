'use client';

import { Bookmark, FolderOpen, FileText, Calendar } from 'lucide-react';
import { useCards, useCollections } from '@/lib/stores/data-store';
import { Card, CardContent } from '@/components/ui/card';

const stats = [
  { label: 'Bookmarks', icon: Bookmark, key: 'bookmarks' },
  { label: 'Pawkits', icon: FolderOpen, key: 'pawkits' },
  { label: 'Notes', icon: FileText, key: 'notes' },
  { label: 'Events', icon: Calendar, key: 'events' },
];

export default function HomePage() {
  const cards = useCards();
  const collections = useCollections();

  const counts = {
    bookmarks: cards.filter((c) => c.type === 'url').length,
    pawkits: collections.length,
    notes: cards.filter((c) => c.type === 'md-note' || c.type === 'text-note').length,
    events: 0, // TODO: calendar events
  };

  return (
    <div className="p-6 space-y-8">
      {/* Welcome */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-zinc-100">Welcome to Pawkit</h1>
        <p className="text-zinc-400">
          Your local-first bookmark manager and knowledge base.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.key} className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-600/20">
                  <stat.icon className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-100">
                    {counts[stat.key as keyof typeof counts]}
                  </p>
                  <p className="text-xs text-zinc-400">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Getting Started */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-200">Get started</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-zinc-800 bg-zinc-900/50 hover:border-purple-600/50 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <h3 className="font-medium text-zinc-100 mb-1">Add your first bookmark</h3>
              <p className="text-sm text-zinc-400">
                Paste a URL or use the browser extension to save content.
              </p>
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900/50 hover:border-purple-600/50 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <h3 className="font-medium text-zinc-100 mb-1">Create a Pawkit</h3>
              <p className="text-sm text-zinc-400">
                Organize your bookmarks into collections called Pawkits.
              </p>
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900/50 hover:border-purple-600/50 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <h3 className="font-medium text-zinc-100 mb-1">Write a note</h3>
              <p className="text-sm text-zinc-400">
                Capture thoughts and ideas with markdown notes.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
