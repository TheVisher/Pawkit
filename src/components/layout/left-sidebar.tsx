'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Library, Calendar, Trash2, LogOut, Settings, FolderOpen, ArrowLeftToLine, ArrowRightFromLine, Maximize2, Minimize2 } from 'lucide-react';
import { PawkitsTree } from '@/components/pawkits/pawkits-tree';
import { SidebarContextMenu } from '@/components/context-menus';
import { useLeftSidebar } from '@/lib/stores/ui-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
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
  const { isOpen, isAnchored, toggleAnchored, setOpen } = useLeftSidebar();
  const workspace = useCurrentWorkspace();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    const supabase = getClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleToggleOpen = () => {
    setOpen(!isOpen);
  };

  // Use default values during SSR to match initial client render
  const anchored = mounted ? isAnchored : false;
  const open = mounted ? isOpen : true;

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
                  className="h-7 w-7 text-text-muted hover:text-text-primary hover:bg-bg-surface-2"
                >
                  {anchored ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{anchored ? 'Float panel' : 'Anchor panel'}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleOpen}
                  className="h-7 w-7 text-text-muted hover:text-text-primary hover:bg-bg-surface-2"
                >
                  {open ? <ArrowLeftToLine className="h-5 w-5" /> : <ArrowRightFromLine className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{open ? 'Close sidebar' : 'Open sidebar'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-4 flex flex-col">
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
                <item.icon className="h-6 w-6 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Pawkits Section - context menu covers all remaining space */}
        <Separator className="my-4 bg-border-subtle" />
        <SidebarContextMenu>
          <div className="flex-1 py-2">
            <PawkitsTree />
          </div>
        </SidebarContextMenu>
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
