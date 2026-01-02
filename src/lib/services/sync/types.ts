/**
 * Sync Service Types
 * Type definitions and constants for sync operations
 */

// =============================================================================
// CONSTANTS
// =============================================================================

export const SYNC_CHANNEL_NAME = 'pawkit-sync';
export const METADATA_LAST_SYNC_KEY = 'lastSyncTime';

// Entity sync order (critical for foreign key dependencies)
export const ENTITY_ORDER = ['workspaces', 'collections', 'cards', 'events', 'todos'] as const;
export type EntityName = (typeof ENTITY_ORDER)[number];

// Map entity names to queue entity types
export const ENTITY_TYPE_MAP: Record<EntityName, string> = {
  workspaces: 'workspace',
  collections: 'collection',
  cards: 'card',
  events: 'event',
  todos: 'todo',
};

// API endpoints for each entity
export const ENTITY_ENDPOINTS: Record<EntityName, string> = {
  workspaces: '/api/workspaces',
  collections: '/api/collections',
  cards: '/api/cards',
  events: '/api/events',
  todos: '/api/todos',
};

// =============================================================================
// SERVER ENTITY TYPES
// =============================================================================

export interface ServerWorkspace {
  id: string;
  name: string;
  icon?: string;
  userId: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServerCollection {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  parentId?: string;
  position: number;
  coverImage?: string;
  icon?: string;
  isPrivate: boolean;
  isSystem: boolean;
  hidePreview: boolean;
  pinned: boolean;
  deleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServerCard {
  id: string;
  workspaceId: string;
  type: string;
  url: string;
  title?: string;
  description?: string;
  content?: string;
  domain?: string;
  image?: string;
  favicon?: string;
  status: string;
  tags: string[];
  collections: string[];
  pinned: boolean;
  scheduledDate?: string;
  version: number; // For conflict detection
  deleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServerEvent {
  id: string;
  workspaceId: string;
  title: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isAllDay: boolean;
  description?: string;
  location?: string;
  url?: string;
  color?: string;
  recurrence?: Record<string, unknown>;
  recurrenceParentId?: string;
  excludedDates: string[];
  isException: boolean;
  deleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServerTodo {
  id: string;
  workspaceId: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  dueDate?: string;
  priority?: 'high' | 'medium' | 'low';
  linkedCardId?: string;
  deleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Union type for any server entity
export type ServerEntity = ServerWorkspace | ServerCollection | ServerCard | ServerEvent | ServerTodo;

// =============================================================================
// BROADCAST MESSAGE TYPES
// =============================================================================

export interface BroadcastMessage {
  type: 'sync-complete' | 'sync-start' | 'logout';
  data?: unknown;
}
