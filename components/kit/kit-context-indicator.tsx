'use client';

import { useCurrentContext } from '@/hooks/use-current-context';
import { Library, FileText, Calendar, Folder, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const contextIcons = {
  library: Library,
  notes: FileText,
  calendar: Calendar,
  pawkit: Folder,
  home: Home,
};

const contextLabels = {
  library: 'Searching Library',
  notes: 'Searching Notes',
  calendar: 'Viewing Calendar',
  pawkit: 'In Pawkit:',
  home: 'Home',
};

export function KitContextIndicator() {
  const { context, pawkitName } = useCurrentContext();
  const Icon = contextIcons[context] || Library;
  const label = contextLabels[context] || 'Library';

  return (
    <div
      className={cn(
        "flex-shrink-0 flex items-center gap-2 px-3 py-1.5",
        "text-xs text-muted-foreground"
      )}
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface-2)',
      }}
    >
      <Icon size={12} />
      <span>
        {label}
        {context === 'pawkit' && pawkitName && (
          <span className="ml-1" style={{ color: 'var(--ds-accent)' }}>{pawkitName}</span>
        )}
      </span>
    </div>
  );
}
