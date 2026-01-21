/**
 * Convex Types
 *
 * Native Convex types for use throughout the application.
 * No compatibility shims - use Convex conventions directly:
 * - `_id` for document IDs
 * - `deleted` for soft-delete flag
 */

import { Doc, Id } from '../../../convex/_generated/dataModel';
import type { Descendant } from 'platejs';

// =============================================================================
// DOCUMENT TYPES (Native Convex)
// =============================================================================

/** Card document from Convex */
export type Card = Doc<'cards'>;

/** Collection document from Convex */
export type Collection = Doc<'collections'>;

/** Calendar event document from Convex */
export type CalendarEvent = Doc<'calendarEvents'>;

/** Workspace document from Convex */
export type Workspace = Doc<'workspaces'>;

/** Todo document from Convex */
export type Todo = Doc<'todos'>;

// =============================================================================
// INPUT TYPES (for mutations)
// =============================================================================

/**
 * Input type for creating a card (omits auto-generated fields)
 */
export type CardInput = {
  workspaceId: Id<'workspaces'>;
  type: string;
  title?: string;
  description?: string;
  url?: string;
  content?: Descendant[] | string;
  notes?: string;
  tags?: string[];
  pinned?: boolean;
  image?: string;
  images?: string[];
  favicon?: string;
  domain?: string;
  metadata?: Record<string, unknown>;
  isDailyNote?: boolean;
  scheduledDates?: string[];
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  isFileCard?: boolean;
  storageId?: Id<'_storage'>;
};

/**
 * Input type for updating a card (all fields optional)
 */
export type CardUpdate = Partial<
  Omit<Doc<'cards'>, '_id' | '_creationTime' | 'workspaceId' | 'createdAt'>
>;

/**
 * Input type for creating a collection
 */
export type CollectionInput = {
  workspaceId: Id<'workspaces'>;
  name: string;
  slug: string;
  parentId?: Id<'collections'>;
  position?: number;
  icon?: string;
  coverImage?: string;
  isPrivate?: boolean;
  isSystem?: boolean;
  hidePreview?: boolean;
  useCoverAsBackground?: boolean;
  pinned?: boolean;
};

/**
 * Input type for updating a collection
 */
export type CollectionUpdate = Partial<
  Omit<Doc<'collections'>, '_id' | '_creationTime' | 'workspaceId' | 'createdAt'>
>;

// =============================================================================
// RE-EXPORTS
// =============================================================================

export type { Doc, Id } from '../../../convex/_generated/dataModel';
