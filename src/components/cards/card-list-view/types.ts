import { Bookmark, FileText, Image as ImageIcon } from 'lucide-react';
import type { LocalCard } from '@/lib/db';
import type { SystemTag } from '@/lib/utils/system-tags';

// =============================================================================
// TYPES
// =============================================================================

export type ColumnId =
  | 'name'
  | 'type'
  | 'tags'
  | 'createdAt'
  | 'updatedAt'
  | 'url'
  | 'domain'
  | 'description'
  | 'collections'
  | 'status'
  | 'pinned'
  | 'scheduledDate'
  | 'thumbnail'
  | 'notes';

export type SortDirection = 'asc' | 'desc';

export interface CardGroup {
  key: string;
  label: string;
  cards: LocalCard[];
}

export interface CardListViewProps {
  cards: LocalCard[];
  groups?: CardGroup[];
  groupIcon?: React.ComponentType<{ className?: string }>;
  onReorder?: (reorderedIds: string[]) => void;
  currentCollection?: string;
  /** Called when a user tag in the footer is clicked (for filtering) */
  onTagClick?: (tag: string) => void;
  /** Called when a system tag in the footer is clicked (for filtering) */
  onSystemTagClick?: (tag: SystemTag) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_COLUMN_ORDER: ColumnId[] = ['name', 'type', 'tags', 'createdAt', 'updatedAt'];

export const ALL_COLUMNS: ColumnId[] = [
  'name',
  'type',
  'tags',
  'createdAt',
  'updatedAt',
  'url',
  'domain',
  'description',
  'collections',
  'status',
  'pinned',
  'scheduledDate',
  'thumbnail',
  'notes',
];

export const DEFAULT_COLUMN_WIDTHS: Record<ColumnId, number> = {
  name: 300,
  type: 100,
  tags: 150,
  createdAt: 120,
  updatedAt: 120,
  url: 200,
  domain: 120,
  description: 200,
  collections: 150,
  status: 80,
  pinned: 60,
  scheduledDate: 120,
  thumbnail: 80,
  notes: 200,
};

export const COLUMN_LABELS: Record<ColumnId, string> = {
  name: 'Name',
  type: 'Type',
  tags: 'Tags',
  createdAt: 'Created',
  updatedAt: 'Modified',
  url: 'URL',
  domain: 'Domain',
  description: 'Description',
  collections: 'Collections',
  status: 'Status',
  pinned: 'Pinned',
  scheduledDate: 'Scheduled',
  thumbnail: 'Thumbnail',
  notes: 'Notes',
};

export const MIN_COLUMN_WIDTH = 60;

// =============================================================================
// HELPERS
// =============================================================================

export function getCardType(card: LocalCard): string {
  switch (card.type) {
    case 'quick-note': return 'Quick Note';
    case 'md-note': return 'Note';
    case 'text-note': return 'Note';
    case 'note': return 'Note';
    case 'image': return 'Image';
    case 'url': return 'Bookmark';
    default: return 'Bookmark';
  }
}

export function getCardIcon(card: LocalCard) {
  switch (card.type) {
    case 'quick-note': return FileText;
    case 'md-note': return FileText;
    case 'text-note': return FileText;
    case 'note': return FileText;
    case 'image': return ImageIcon;
    default: return Bookmark;
  }
}
