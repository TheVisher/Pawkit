'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Library, Calendar, Trash2, LogOut, Settings, FolderOpen, Pin, PinOff, X } from 'lucide-react';
import { useLeftSidebar } from '@/lib/stores/ui-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useCollections } from '@/lib/stores/data-store';
import { getClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/trash', label: 'Trash', icon: Trash2 },
];

export function LeftSidebar() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isAnchored, toggleAnchored, setOpen } = useLeftSidebar();
  const workspace = useCurrentWorkspace();
  const collections = useCollections();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    const supabase = getClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleClose = () => {
    setOpen(false);
  };

  // Use default values during SSR to match initial client render
  const anchored = mounted ? isAnchored : false;

  return (
    <div className="h-full flex flex-col">
      {/* Header with anchor/close buttons - uses border-b to align with TopBar */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-border-subtle">
        <Link href="/home" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="font-semibold text-text-primary">Pawkit</span>
        </Link>
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleAnchored}
                  className={cn(
                    'h-7 w-7 text-text-muted hover:text-text-primary hover:bg-bg-surface-2',
                    anchored && 'text-[var(--color-accent)]'
                  )}
                >
                  {anchored ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{anchored ? 'Unpin sidebar' : 'Pin sidebar'}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-7 w-7 text-text-muted hover:text-text-primary hover:bg-bg-surface-2"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Close sidebar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                    : 'text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Pawkits Section */}
        <Separator className="my-4 bg-border-subtle" />
        <div className="px-3 py-2">
          <h3 className="text-xs font-medium uppercase text-text-muted mb-2">Pawkits</h3>
          {collections.length === 0 ? (
            <p className="text-xs text-text-muted italic">No pawkits yet</p>
          ) : (
            <div className="space-y-1">
              {collections.slice(0, 10).map((collection) => (
                <Link
                  key={collection.id}
                  href={`/pawkit/${collection.slug}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
                    pathname === `/pawkit/${collection.slug}`
                      ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                      : 'text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary'
                  )}
                >
                  <FolderOpen className="h-4 w-4 shrink-0" />
                  <span className="truncate">{collection.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Separator className="bg-border-subtle" />

      {/* User Menu */}
      <div className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-bg-surface-3 text-text-secondary text-xs">
                  {workspace?.name?.charAt(0).toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm">{workspace?.name ?? 'Workspace'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-bg-surface-1 border-border-subtle">
            <DropdownMenuItem className="text-text-secondary focus:bg-bg-surface-2 focus:text-text-primary">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border-subtle" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-400 focus:bg-bg-surface-2 focus:text-red-400"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
