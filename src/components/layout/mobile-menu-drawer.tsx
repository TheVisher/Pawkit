'use client';

import { useRouter } from 'next/navigation';
import { Drawer } from 'vaul';
import {
  Settings,
  Tags,
  Folder,
  User,
  LogOut,
  Moon,
  Sun,
  SunMoon
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { PawkitsTree } from '@/components/pawkits/pawkits-tree';
import { TagTree } from '@/components/tags/tag-tree';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRightSidebarSettings } from '@/lib/stores/ui-store';
import { cn } from '@/lib/utils';

interface MobileMenuDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileMenuDrawer({ open, onOpenChange }: MobileMenuDrawerProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { toggleSettings } = useRightSidebarSettings();
  const userEmail = user?.email;
  
  const cycleTheme = () => {
    if (theme === 'system') setTheme('dark');
    else if (theme === 'dark') setTheme('light');
    else setTheme('system');
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : SunMoon;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[100] mt-24 flex h-[85%] flex-col rounded-t-[20px] bg-[var(--color-bg-surface-1)] border-t border-[var(--color-border-subtle)] outline-none">
          <div className="mx-auto mt-4 h-1.5 w-12 flex-shrink-0 rounded-full bg-[var(--color-text-muted)] opacity-20" />
          
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
            {/* User Profile Section */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white font-bold">
                  {userEmail?.[0].toUpperCase() || 'U'}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-text-primary truncate max-w-[150px]">
                    {userEmail}
                  </span>
                  <span className="text-xs text-text-muted">Pro Account</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={cycleTheme}>
                <ThemeIcon className="h-5 w-5 text-text-muted" />
              </Button>
            </div>

            {/* Pawkits Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-2 text-text-muted">
                <Folder className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Pawkits</span>
              </div>
              <div className="bg-bg-surface-2 rounded-xl p-2 border border-border-subtle">
                <PawkitsTree />
              </div>
            </div>

            {/* Tags Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-2 text-text-muted">
                <Tags className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Tags</span>
              </div>
              <div className="bg-bg-surface-2 rounded-xl p-2 border border-border-subtle">
                <TagTree />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 space-y-2">
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
              <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                <LogOut className="h-5 w-5" />
                <span>Log Out</span>
              </Button>
            </div>
          </div>
          
          {/* Safe area padding */}
          <div className="safe-area-pb" />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
