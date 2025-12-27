'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Library, Calendar, Sparkles, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileMenuDrawer } from './mobile-menu-drawer';

interface MobileNavProps {
  className?: string;
}

const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/rediscover', label: 'Rediscover', icon: Sparkles },
];

export function MobileNav({ className }: MobileNavProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <nav
        className={cn(
          'min-h-[4rem] bg-bg-surface-1 border-t border-border-subtle',
          'flex items-center justify-around px-2',
          'safe-area-pb', // For iOS safe area
          className
        )}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]',
                isActive
                  ? 'text-[var(--color-accent)]'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* Menu button for additional options */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px] text-text-muted hover:text-text-secondary"
        >
          <Menu className="h-5 w-5" />
          <span className="text-xs font-medium">More</span>
        </button>
      </nav>

      <MobileMenuDrawer open={isMenuOpen} onOpenChange={setIsMenuOpen} />
    </>
  );
}
