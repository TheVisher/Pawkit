'use client';

import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { usePathname, useRouter } from '@/lib/navigation';
import { Drawer } from 'vaul';
import {
  Home,
  Library,
  Calendar,
  FolderOpen,
  Tags,
  Settings,
  LogOut,
  Moon,
  Sun,
  SunMoon,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthActions } from '@convex-dev/auth/react';
import { PawkitsTree } from '@/components/pawkits/pawkits-tree';
import { TagTree } from '@/components/tags/tag-tree';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useConvexUser } from '@/lib/hooks/convex/use-convex-user';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useRightSidebarSettings } from '@/lib/stores/ui-store';
import { cn } from '@/lib/utils';

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
];

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user } = useConvexUser();
  const workspace = useCurrentWorkspace();
  const { toggleSettings } = useRightSidebarSettings();
  const { signOut } = useAuthActions();
  const [pawkitsExpanded, setPawkitsExpanded] = useState(true);
  const [tagsExpanded, setTagsExpanded] = useState(false);

  const cycleTheme = () => {
    if (theme === 'system') setTheme('dark');
    else if (theme === 'dark') setTheme('light');
    else setTheme('system');
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : SunMoon;

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  const handleNavClick = () => {
    onOpenChange(false);
  };

  // Check if we're on a pawkits route
  const isPawkitsActive = pathname === '/pawkits' || pathname.startsWith('/pawkits/');
  const isTagsActive = pathname === '/tags';

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="left">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed top-0 left-0 bottom-0 z-[100] flex w-[85%] max-w-[320px] flex-col bg-[var(--color-bg-surface-1)] border-r border-[var(--color-border-subtle)] outline-none"
          style={{ borderTopRightRadius: 20, borderBottomRightRadius: 20 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-border-subtle">
            <Link to="/home" onClick={handleNavClick} className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="font-semibold text-text-primary">Pawkit</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={cycleTheme}>
              <ThemeIcon className="h-5 w-5 text-text-muted" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-2 py-4">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      'flex items-center px-3 py-3 text-sm transition-colors duration-200 relative rounded-xl',
                      isActive
                        ? 'text-text-primary font-medium bg-black/5 dark:bg-white/5'
                        : 'text-text-secondary active:bg-black/5 dark:active:bg-white/5'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'h-5 w-5 mr-3 shrink-0',
                        isActive ? 'text-[var(--color-accent)]' : ''
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Pawkits Section */}
              <div>
                <div
                  className={cn(
                    'flex items-center px-3 py-3 text-sm transition-colors duration-200 relative rounded-xl',
                    isPawkitsActive
                      ? 'text-text-primary font-medium bg-black/5 dark:bg-white/5'
                      : 'text-text-secondary'
                  )}
                >
                  <Link
                    to="/pawkits"
                    onClick={handleNavClick}
                    className="flex items-center flex-1"
                  >
                    <FolderOpen
                      className={cn(
                        'h-5 w-5 mr-3 shrink-0',
                        isPawkitsActive ? 'text-[var(--color-accent)]' : ''
                      )}
                    />
                    <span>Pawkits</span>
                  </Link>
                  <button
                    onClick={() => setPawkitsExpanded(!pawkitsExpanded)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg active:bg-black/5 dark:active:bg-white/10"
                  >
                    {pawkitsExpanded ? (
                      <ChevronDown className="h-4 w-4 text-text-muted" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-text-muted" />
                    )}
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {pawkitsExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1 pl-4 pr-2">
                        <PawkitsTree />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Tags Section */}
              <div>
                <div
                  className={cn(
                    'flex items-center px-3 py-3 text-sm transition-colors duration-200 relative rounded-xl',
                    isTagsActive
                      ? 'text-text-primary font-medium bg-black/5 dark:bg-white/5'
                      : 'text-text-secondary'
                  )}
                >
                  <Link
                    to="/tags"
                    onClick={handleNavClick}
                    className="flex items-center flex-1"
                  >
                    <Tags
                      className={cn(
                        'h-5 w-5 mr-3 shrink-0',
                        isTagsActive ? 'text-[var(--color-accent)]' : ''
                      )}
                    />
                    <span>Tags</span>
                  </Link>
                  <button
                    onClick={() => setTagsExpanded(!tagsExpanded)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg active:bg-black/5 dark:active:bg-white/10"
                  >
                    {tagsExpanded ? (
                      <ChevronDown className="h-4 w-4 text-text-muted" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-text-muted" />
                    )}
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {tagsExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1 pl-4 pr-2">
                        <TagTree />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>
          </div>

          <Separator className="bg-border-subtle" />

          {/* User Menu */}
          <div className="p-2 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-text-secondary"
              onClick={() => {
                onOpenChange(false);
                toggleSettings();
              }}
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              <span>Sign out</span>
            </Button>
          </div>

          {/* Workspace info */}
          <div className="px-4 py-3 border-t border-border-subtle safe-area-pb">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-bg-surface-3 text-text-secondary text-xs">
                  {workspace?.name?.charAt(0).toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-text-primary truncate">
                  {workspace?.name ?? 'Workspace'}
                </span>
                <span className="text-xs text-text-muted truncate">
                  {user?.email}
                </span>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
