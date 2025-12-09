export type CardStatus = "PENDING" | "READY" | "ERROR";
export type CardType = "url" | "md-note" | "text-note" | "file";

// File categories for content type filtering (matches cloud folder structure)
// Note: PDF and spreadsheets are included in 'document' category
export type FileCategory = 'image' | 'document' | 'audio' | 'video' | 'other';

// Sync status for files with Filen cloud storage
export type FileSyncStatus = 'local' | 'synced' | 'uploading' | 'downloading' | 'cloud-only' | 'error';

// Stored file in IndexedDB
export type StoredFile = {
  id: string;
  userId: string;

  // File metadata
  filename: string;
  mimeType: string;
  size: number;             // bytes
  category: FileCategory;

  // Blob storage (null for cloud-only ghost files)
  blob: Blob | null;        // The actual file data

  // Thumbnail (for images/PDFs)
  thumbnailBlob?: Blob;     // Generated preview image

  // Relationship
  cardId?: string;          // If attached to a card (null = standalone file card)

  // Filen sync fields
  filenUuid?: string;       // UUID in Filen (if synced)
  filenPath?: string;       // Path in Filen
  syncStatus: FileSyncStatus;
  lastSyncedAt?: string;    // ISO date string

  // Metadata
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
  deletedAt?: string | null;
};

export type OldCardAgeThreshold = "1 day" | "12 hours" | "6 hours" | "1 hour";

export type UserModel = {
  id: string;
  email: string;
  displayName: string | null;
  denPasswordHash: string | null;
  denEncryptionEnabled: boolean;
  denSyncEnabled: boolean;
  serverSync: boolean;
  extensionToken: string | null;
  extensionTokenCreatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// PrismaUser matches the User type from Prisma (with Date objects instead of serialized strings)
// Used to replace @prisma/client User type when Prisma client is not generated
export type PrismaUser = {
  id: string;
  email: string;
  displayName: string | null;
  denPasswordHash: string | null;
  denEncryptionEnabled: boolean;
  denSyncEnabled: boolean;
  serverSync: boolean;
  extensionToken: string | null;
  extensionTokenCreatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// PrismaCard matches the Card type from Prisma (with Date objects instead of serialized strings)
// Used to replace @prisma/client Card type when Prisma client is not generated
export type PrismaCard = {
  id: string;
  type: string;
  url: string;
  title: string | null;
  notes: string | null;
  content: string | null;
  status: string;
  tags: string | null;
  collections: string | null;
  domain: string | null;
  image: string | null;
  description: string | null;
  metadata: string | null;
  articleContent: string | null;
  pinned: boolean;
  deleted: boolean;
  deletedAt: Date | null;
  inDen: boolean;
  encryptedContent: string | null;
  scheduledDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  // File card support
  isFileCard: boolean;
  fileId: string | null;
  // Cloud sync tracking
  cloudId: string | null;
  cloudProvider: string | null;
  cloudSyncedAt: Date | null;
};

// PrismaCollection matches the Collection type from Prisma
export type PrismaCollection = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  coverImage: string | null;
  coverImagePosition: number | null;
  hidePreview: boolean;
  useCoverAsBackground: boolean;
  pinned: boolean;
  deleted: boolean;
  deletedAt: Date | null;
  inDen: boolean;
  isPrivate: boolean;
  isSystem: boolean;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
};

// Extracted date from card metadata (for calendar suggestions)
export type ExtractedDate = {
  date: string;           // YYYY-MM-DD
  type: 'release' | 'event' | 'published' | 'deadline' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  source: 'json-ld' | 'open-graph' | 'meta' | 'schema';
  label?: string;         // Human-readable label like "Movie Release"
  endDate?: string;       // For events with duration
};

export type CardModel = {
  id: string;
  type: CardType;
  url: string;
  title: string | null;
  notes: string | null;
  content: string | null;
  status: CardStatus;
  tags: string[];
  collections: string[];
  domain: string | null;
  image: string | null;
  description: string | null;
  metadata: Record<string, unknown> | undefined;
  extractedDates?: ExtractedDate[];  // Dates found in metadata
  articleContent: string | null;
  pinned: boolean;
  deleted: boolean;
  deletedAt: string | null;
  inDen: boolean;
  encryptedContent: string | null;
  scheduledDate: string | null;
  createdAt: string;
  updatedAt: string;

  // File attachment support
  isFileCard?: boolean;         // true if this card IS a file (standalone)
  fileId?: string;              // reference to StoredFile (for standalone file cards)
  attachedFileIds?: string[];   // files attached TO this card

  // Cloud sync tracking (for notes)
  cloudId?: string | null;             // Provider-specific ID (e.g., Filen UUID)
  cloudProvider?: string | null;       // Provider name: "filen", "google-drive", etc.
  cloudSyncedAt?: string | null;       // ISO date string of last sync

  // Note folder organization (for type='md-note' or 'text-note')
  noteFolderId?: string | null;        // Reference to NoteFolder
};

export type CollectionNode = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  coverImage?: string | null;
  coverImagePosition?: number | null; // Vertical position percentage (0-100)
  pinned: boolean;
  deleted: boolean;
  deletedAt?: string | null;
  inDen?: boolean;
  isPrivate?: boolean;
  isSystem?: boolean;
  hidePreview?: boolean; // Hide card preview tiles on pawkit card
  useCoverAsBackground?: boolean; // Use cover image as pawkit card background
  userId: string;
  createdAt: string;
  updatedAt: string;
  children: CollectionNode[];
};

// Note linking types
export type NoteLink = {
  id: string;
  sourceNoteId: string;
  targetNoteId: string;
  linkText: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NoteCardLink = {
  id: string;
  noteId: string;
  cardId: string;
  context: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NoteTag = {
  id: string;
  noteId: string;
  tag: string;
  createdAt: string;
};

export type NoteWithLinks = CardModel & {
  noteLinks?: NoteLink[];
  cardLinks?: NoteCardLink[];
  tags?: NoteTag[];
  backlinks?: NoteLink[]; // Notes that link to this note
};

// Note folder organization (hierarchical)
export type NoteFolder = {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

// NoteFolder with children for tree structure
export type NoteFolderNode = NoteFolder & {
  children: NoteFolderNode[];
  noteCount?: number; // Optional: count of notes in this folder
};

// CollectionNote junction - notes appearing in Pawkits
export type CollectionNote = {
  id: string;
  collectionId: string;
  cardId: string;
  position: number;
  createdAt: string;
};
