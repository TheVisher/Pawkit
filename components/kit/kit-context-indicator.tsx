'use client';

import { useCurrentContext } from '@/hooks/use-current-context';
import { usePanelStore } from '@/lib/hooks/use-panel-store';
import { useDataStore } from '@/lib/stores/data-store';
import { Library, FileText, Calendar, Folder, Home, Eye } from 'lucide-react';
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

  // Check if there's an active card being viewed (embedded in sidebar)
  const activeCardId = usePanelStore((state) => state.activeCardId);
  const cards = useDataStore((state) => state.cards);
  const activeCard = activeCardId ? cards.find(c => c.id === activeCardId) : null;

  // If there's an active card, show card context
  if (activeCard) {
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
        <Eye size={12} />
        <span className="truncate">
          Viewing:
          <span className="ml-1 font-medium" style={{ color: 'var(--ds-accent)' }}>
            {activeCard.title || 'Untitled'}
          </span>
        </span>
      </div>
    );
  }

  // Default context indicator
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
