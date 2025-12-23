/**
 * Dexie Database Types
 * TypeScript interfaces for all local IndexedDB tables
 */

// =============================================================================
// SYNC METADATA (added to all synced entities)
// =============================================================================

export interface SyncMetadata {
  _synced: boolean;           // Has been synced to server
  _lastModified: Date;        // Local modification timestamp
  _deleted: boolean;          // Soft delete for sync (true = pending delete sync)
  _serverVersion?: string;    // Server's updatedAt for conflict detection
  _localOnly?: boolean;       // Created offline, never synced
}

// =============================================================================
// CORE ENTITIES
// =============================================================================

export interface LocalWorkspace extends SyncMetadata {
  id: string;
  name: string;
  icon?: string;
  userId: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalViewSettings extends SyncMetadata {
  id: string;
  workspaceId: string;
  viewKey: string;            // "library", "library:notes", "pawkit:{slug}", etc.
  layout: string;             // grid, masonry, list, timeline, board
  sortBy: string;
  sortOrder: string;          // asc, desc
  showTitles: boolean;
  showUrls: boolean;
  showTags: boolean;
  cardPadding: number;        // 0-40 pixels (slider)
  cardSpacing: number;        // 0-40 pixels (gap between cards)
  cardSize: string;           // small, medium, large, xl
  showMetadataFooter: boolean; // Toggle card footer (title, tags inside card)
  showUrlPill: boolean;       // Toggle URL pill overlay on thumbnail
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// CONTENT ENTITIES
// =============================================================================

export interface LocalCard extends SyncMetadata {
  id: string;
  workspaceId: string;

  // Content
  type: string;               // url, md-note, text-note, quick-note, file
  url: string;                // URL for bookmarks, "" for notes
  title?: string;
  description?: string;
  content?: string;           // Note content or extracted article
  notes?: string;             // User annotations

  // Metadata
  domain?: string;
  image?: string;             // Thumbnail URL
  favicon?: string;
  metadata?: Record<string, unknown>;
  status: string;             // PENDING, READY, ERROR
  transcriptSegments?: string; // JSON string of YouTube transcripts

  // AI (stored as JSON, vector not in IndexedDB)
  structuredData?: Record<string, unknown>;
  source?: Record<string, unknown>;

  // Organization
  tags: string[];
  collections: string[];      // Array of collection slugs
  pinned: boolean;

  // Scheduling
  scheduledDate?: Date;
  scheduledStartTime?: string;
  scheduledEndTime?: string;

  // Article/Reader
  articleContent?: string;
  summary?: string;
  summaryType?: string;

  // File support
  isFileCard: boolean;
  fileId?: string;

  // Cloud sync
  cloudId?: string;
  cloudProvider?: string;
  cloudSyncedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalCollection extends SyncMetadata {
  id: string;
  workspaceId: string;

  // Basic info
  name: string;
  slug: string;
  parentId?: string;
  position: number;

  // Display
  coverImage?: string;
  coverImagePosition?: number;
  icon?: string;

  // Flags
  isPrivate: boolean;
  isSystem: boolean;
  hidePreview: boolean;
  useCoverAsBackground: boolean;
  pinned: boolean;

  // Board config
  metadata?: {
    defaultView?: 'grid' | 'masonry' | 'list' | 'timeline' | 'board';
    boardColumns?: Array<{
      id: string;
      name: string;
      color: string;
    }>;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalCollectionNote extends SyncMetadata {
  id: string;
  collectionId: string;
  cardId: string;
  position: number;
  createdAt: Date;
}

// =============================================================================
// ORGANIZATION ENTITIES
// =============================================================================

export interface LocalCalendarEvent extends SyncMetadata {
  id: string;
  workspaceId: string;

  // Event details
  title: string;
  date: string;               // YYYY-MM-DD
  endDate?: string;
  startTime?: string;         // HH:mm
  endTime?: string;
  isAllDay: boolean;

  // Additional info
  description?: string;
  location?: string;
  url?: string;
  color?: string;

  // Recurrence
  recurrence?: {
    freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    byDay?: string[];         // ['MO', 'WE', 'FR']
    until?: string;           // YYYY-MM-DD
    count?: number;
  };
  recurrenceParentId?: string;
  excludedDates: string[];
  isException: boolean;

  // Source tracking
  source?: {
    type: 'manual' | 'card' | 'kit';
    cardId?: string;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalTodo extends SyncMetadata {
  id: string;
  workspaceId: string;

  text: string;
  completed: boolean;
  completedAt?: Date;
  dueDate?: Date;
  priority?: 'high' | 'medium' | 'low';
  linkedCardId?: string;

  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// SYNC & UTILITY ENTITIES
// =============================================================================

export interface SyncQueueItem {
  id?: number;                // Auto-increment
  entityType: 'card' | 'collection' | 'collectionNote' | 'event' | 'todo' | 'viewSettings' | 'workspace';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload?: Record<string, unknown>;
  retryCount: number;
  lastError?: string;
  createdAt: Date;
}

export interface MetadataEntry {
  key: string;
  value: unknown;
}

// =============================================================================
// WIKI-LINKS (for note interconnections)
// =============================================================================

export interface NoteLink {
  id: string;
  sourceNoteId: string;       // The note containing the [[link]]
  targetNoteId: string;       // The note being linked to
  linkText: string;           // The display text of the link
  createdAt: Date;
}

export interface NoteCardLink {
  id: string;
  sourceNoteId: string;       // The note containing the link
  targetCardId: string;       // The card being linked to
  linkText: string;
  createdAt: Date;
}

// =============================================================================
// IMAGE CACHE (for thumbnails with LRU eviction)
// =============================================================================

export interface CachedImage {
  id: string;                 // Normalized URL or image hash
  blob: Blob;
  mimeType: string;
  size: number;               // Bytes
  cachedAt: Date;
  lastAccessedAt: Date;
}

// Cache configuration
export const IMAGE_CACHE_MAX_SIZE_MB = 100;
export const IMAGE_CACHE_MAX_AGE_DAYS = 30;
