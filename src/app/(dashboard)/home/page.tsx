'use client';

import { Bookmark, FolderOpen, FileText, Calendar as CalendarIcon, Coffee, Sun, Sunset, Moon } from 'lucide-react';
import { useCards, useCollections } from '@/lib/stores/data-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useGreeting } from '@/lib/hooks/use-greeting';
import { Card, CardContent } from '@/components/ui/card';

const stats = [
  { label: 'Bookmarks', icon: Bookmark, key: 'bookmarks' },
  { label: 'Pawkits', icon: FolderOpen, key: 'pawkits' },
  { label: 'Notes', icon: FileText, key: 'notes' },
  { label: 'Events', icon: CalendarIcon, key: 'events' },
];

// Time icon mapping
const timeIcons = {
  coffee: Coffee,
  sun: Sun,
  sunset: Sunset,
  moon: Moon,
};

export default function HomePage() {
  const cards = useCards();
  const collections = useCollections();
  const user = useAuthStore((s) => s.user);
  const { message, displayName, formattedDate, timeIcon, mounted } = useGreeting(user?.email);

  const counts = {
    bookmarks: cards.filter((c) => c.type === 'url').length,
    pawkits: collections.length,
    notes: cards.filter((c) => c.type === 'md-note' || c.type === 'text-note').length,
    events: 0, // TODO: calendar events
  };

  const TimeIcon = timeIcons[timeIcon as keyof typeof timeIcons] || Coffee;

  return (
    <div className="flex-1">
      {/* Header row - matches original PageHeader: pt-5 pb-4 px-6 min-h-[76px] */}
      <div className="pt-5 pb-4 px-6 min-h-[76px] space-y-0.5">
        {/* Date row - smaller and muted */}
        <div className="flex items-center gap-1.5 text-text-muted">
          <TimeIcon className="h-3.5 w-3.5" />
          <span className="text-xs">{mounted ? formattedDate : ''}</span>
        </div>
        {/* Greeting row */}
        <h1 className="text-2xl font-semibold text-text-primary">
          {message}, <span className="text-[var(--color-accent)]">{displayName || 'friend'}</span>
        </h1>
      </div>

      {/* Page content */}
      <div className="px-6 pb-6 space-y-6">

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
    </div>
  );
}
