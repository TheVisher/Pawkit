'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Library, Calendar, Trash2, ChevronLeft, ChevronRight, LogOut, Settings, FolderOpen } from 'lucide-react';
import { useLeftSidebar } from '@/lib/stores/ui-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useCollections } from '@/lib/stores/data-store';
import { getClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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

const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/trash', label: 'Trash', icon: Trash2 },
];

export function LeftSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, toggle } = useLeftSidebar();
  const workspace = useCurrentWorkspace();
  const collections = useCollections();

  const handleSignOut = async () => {
    const supabase = getClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-zinc-800 bg-zinc-900/50 transition-all duration-200',
        isOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-4">
        {isOpen && (
          <Link href="/home" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="font-semibold text-zinc-100">Pawkit</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
        >
          {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
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
                    ? 'bg-purple-600/20 text-purple-400'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {isOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Pawkits Section */}
        {isOpen && (
          <>
            <Separator className="my-4 bg-zinc-800" />
            <div className="px-3 py-2">
              <h3 className="text-xs font-medium uppercase text-zinc-500 mb-2">Pawkits</h3>
              {collections.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No pawkits yet</p>
              ) : (
                <div className="space-y-1">
                  {collections.slice(0, 10).map((collection) => (
                    <Link
                      key={collection.id}
                      href={`/pawkit/${collection.slug}`}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
                        pathname === `/pawkit/${collection.slug}`
                          ? 'bg-purple-600/20 text-purple-400'
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                      )}
                    >
                      <FolderOpen className="h-4 w-4 shrink-0" />
                      <span className="truncate">{collection.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </ScrollArea>

      <Separator className="bg-zinc-800" />

      {/* User Menu */}
      <div className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
                !isOpen && 'justify-center px-0'
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-zinc-700 text-zinc-300 text-xs">
                  {workspace?.name?.charAt(0).toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
              {isOpen && (
                <span className="truncate text-sm">{workspace?.name ?? 'Workspace'}</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-zinc-900 border-zinc-800">
            <DropdownMenuItem className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-400 focus:bg-zinc-800 focus:text-red-400"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
