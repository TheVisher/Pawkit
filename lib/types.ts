export type CardStatus = "PENDING" | "READY" | "ERROR";
export type CardType = "url" | "md-note" | "text-note";

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
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
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
  articleContent: string | null;
  pinned: boolean;
  deleted: boolean;
  deletedAt: string | null;
  inDen: boolean;
  encryptedContent: string | null;
  scheduledDate: string | null;
  createdAt: string;
  updatedAt: string;
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
  inDen?: boolean;
  isPrivate?: boolean;
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
