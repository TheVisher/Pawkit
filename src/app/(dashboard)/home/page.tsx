'use client';

import { Bookmark, FolderOpen, FileText, Calendar as CalendarIcon, Coffee, Sun, Sunset, Moon } from 'lucide-react';
import { useCards, useCollections } from '@/lib/stores/data-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useGreeting } from '@/lib/hooks/use-greeting';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { ContentAreaContextMenu } from '@/components/context-menus';

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

  const subtitle = (
    <div className="flex items-center gap-1.5">
      <TimeIcon className="h-3.5 w-3.5" />
      <span>{mounted ? formattedDate : ''}</span>
    </div>
  );

  const title = (
    <>
      {message}, <span className="text-[var(--color-accent)]">{displayName || 'friend'}</span>
    </>
  );

  return (
    <ContentAreaContextMenu>
      <div className="flex-1">
        <PageHeader title={title} subtitle={subtitle} />

        {/* Page content */}
        <div className="px-6 pb-6 space-y-6">

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.key} className="border-border-subtle bg-bg-surface-2">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--color-accent)]/20">
                    <stat.icon className="h-5 w-5 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">
                      {counts[stat.key as keyof typeof counts]}
                    </p>
                    <p className="text-xs text-text-muted">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Getting Started */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">Get started</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-border-subtle bg-bg-surface-2 hover:border-[var(--color-accent)]/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <h3 className="font-medium text-text-primary mb-1">Add your first bookmark</h3>
                <p className="text-sm text-text-secondary">
                  Paste a URL or use the browser extension to save content.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border-subtle bg-bg-surface-2 hover:border-[var(--color-accent)]/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <h3 className="font-medium text-text-primary mb-1">Create a Pawkit</h3>
                <p className="text-sm text-text-secondary">
                  Organize your bookmarks into collections called Pawkits.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border-subtle bg-bg-surface-2 hover:border-[var(--color-accent)]/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <h3 className="font-medium text-text-primary mb-1">Write a note</h3>
                <p className="text-sm text-text-secondary">
                  Capture thoughts and ideas with markdown notes.
                </p>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </div>
    </ContentAreaContextMenu>
  );
}
