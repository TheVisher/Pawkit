'use client';

import { motion } from 'framer-motion';
import { Palette, User, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SettingsSection = 'appearance' | 'account' | 'data';

interface SettingsNavProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

const navItems: { id: SettingsSection; label: string; icon: typeof Palette }[] = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'account', label: 'Account', icon: User },
  { id: 'data', label: 'Data & Storage', icon: Database },
];

export function SettingsNav({ activeSection, onSectionChange }: SettingsNavProps) {
  return (
    <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 -mx-1 px-1">
      {navItems.map((item) => {
        const isActive = activeSection === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 text-sm transition-colors duration-200 group relative rounded-xl whitespace-nowrap',
              isActive
                ? 'text-text-primary font-medium'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {isActive && (
              <motion.div
                layoutId="active-settings-nav-item"
                className="absolute inset-0 rounded-xl bg-black/5 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.6)]"
                initial={false}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30,
                }}
              />
            )}
            <span className="relative z-10 flex items-center gap-3">
              <item.icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  isActive
                    ? 'text-[var(--color-accent)]'
                    : 'group-hover:text-[var(--color-accent)]/80',
                )}
              />
              <span>{item.label}</span>
            </span>
            {/* Hover glow line */}
            {!isActive && (
              <div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-accent)] via-50% to-transparent opacity-0 transition-all duration-300 group-hover:opacity-100 blur-[0.5px]" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
