import {
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  Link2,
  FileText,
  StickyNote,
  Upload,
  Calendar,
  FolderPlus,
  Home,
  Library,
  Moon,
  PanelLeft,
  Folder,
  Hash,
} from 'lucide-react';
import type { ToastType } from '@/lib/stores/toast-store';
import type { LocalCard, LocalCollection } from '@/lib/db';

// =============================================================================
// TYPES
// =============================================================================

export interface SearchableAction {
  id: string;
  label: string;
  icon: typeof FileText;
  shortcut?: string;
  keywords: string[];
  action: string;
}

export interface SearchResults {
  cards: LocalCard[];
  collections: LocalCollection[];
  actions: SearchableAction[];
  tags?: string[];
}

export interface OmnibarProps {
  isCompact: boolean;
}

// =============================================================================
// SEARCHABLE ACTIONS
// =============================================================================

export const SEARCHABLE_ACTIONS: SearchableAction[] = [
  // Creation
  { id: 'new-note', label: 'New Note', icon: FileText, shortcut: '⌘⇧N',
    keywords: ['create', 'note', 'markdown', 'write', 'new'], action: 'note' },
  { id: 'new-bookmark', label: 'New Bookmark', icon: Link2, shortcut: '⌘⇧B',
    keywords: ['create', 'bookmark', 'url', 'link', 'save', 'new'], action: 'bookmark' },
  { id: 'new-collection', label: 'New Pawkit', icon: FolderPlus,
    keywords: ['create', 'collection', 'pawkit', 'folder', 'organize', 'new'], action: 'create-pawkit' },

  // Navigation - include route names as keywords for direct /command access
  { id: 'goto-library', label: 'Go to Library', icon: Library,
    keywords: ['library', 'view', 'all', 'cards', 'browse', 'bookmarks', 'notes'], action: 'navigate:/library' },
  { id: 'goto-calendar', label: 'Go to Calendar', icon: Calendar,
    keywords: ['calendar', 'view', 'schedule', 'events', 'date', 'dates'], action: 'navigate:/calendar' },
  { id: 'goto-home', label: 'Go to Home', icon: Home,
    keywords: ['home', 'view', 'dashboard', 'main', 'start'], action: 'navigate:/home' },
  { id: 'goto-pawkits', label: 'Go to Pawkits', icon: Folder,
    keywords: ['pawkits', 'collections', 'folders', 'organize'], action: 'navigate:/pawkits' },

  // Settings/UI
  { id: 'toggle-theme', label: 'Toggle Theme', icon: Moon,
    keywords: ['theme', 'dark', 'light', 'mode', 'color', 'appearance'], action: 'toggle-theme' },
  { id: 'toggle-sidebar', label: 'Toggle Sidebar', icon: PanelLeft,
    keywords: ['sidebar', 'panel', 'hide', 'show', 'left', 'menu'], action: 'toggle-sidebar' },
];

// =============================================================================
// TOAST MAPPINGS
// =============================================================================

export const toastIcons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

export const toastColors: Record<ToastType, string> = {
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-blue-400',
  warning: 'text-yellow-400',
};

// =============================================================================
// ADD MENU ITEMS
// =============================================================================

export const addMenuItems = [
  { icon: Link2, label: 'Add Bookmark', action: 'bookmark', shortcut: '⌘⇧B' },
  { icon: FileText, label: 'New Note', action: 'note', shortcut: '⌘⇧N' },
  { icon: StickyNote, label: 'Quick Note', action: 'quick-note' },
  { icon: Upload, label: 'Upload File', action: 'upload' },
  { icon: Calendar, label: 'New Event', action: 'event' },
  { icon: Hash, label: 'New Tag', action: 'tag' },
];
