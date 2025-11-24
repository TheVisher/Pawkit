import { supabase } from '../config/supabase';
import type { CardModel, CollectionNode } from '../types';
import * as Crypto from 'expo-crypto';
import { safeHost } from '../lib/utils';

// API Error class
export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper to parse comma-separated strings OR JSON arrays to arrays
function parseCommaSeparated(value: string | null): string[] {
  if (!value) return [];

  // Try to parse as JSON array first (e.g., '["tag1","tag2"]')
  if (value.startsWith('[') && value.endsWith(']')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch (e) {
      // Fall through to comma-separated parsing
    }
  }

  // Parse as comma-separated values (e.g., "tag1,tag2")
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

// Helper to convert database card to CardModel
function mapCardFromDb(dbCard: any): CardModel {
  return {
    ...dbCard,
    tags: parseCommaSeparated(dbCard.tags),
    collections: parseCommaSeparated(dbCard.collections),
    metadata: dbCard.metadata ? JSON.parse(dbCard.metadata) : undefined,
  };
}

// Cards API - Direct Supabase queries
export const cardsApi = {
  /**
   * List cards with optional filters
   */
  async list(params?: {
    q?: string;
    collection?: string;
    status?: 'PENDING' | 'READY' | 'ERROR';
    limit?: number;
  }): Promise<{ items: CardModel[] }> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new ApiError(401, 'Not authenticated');
    }

    let query = supabase
      .from('Card')
      .select('*')
      .eq('userId', user.id)
      .eq('deleted', false)
      .order('createdAt', { ascending: false });

    // Apply filters
    if (params?.status) {
      query = query.eq('status', params.status);
    }

    if (params?.collection) {
      query = query.like('collections', `%${params.collection}%`);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new ApiError(500, error.message, error);
    }

    // Filter by search query if provided (client-side for now)
    let items = data?.map(mapCardFromDb) || [];

    if (params?.q) {
      const searchLower = params.q.toLowerCase();
      items = items.filter(card =>
        card.title?.toLowerCase().includes(searchLower) ||
        card.url?.toLowerCase().includes(searchLower) ||
        card.notes?.toLowerCase().includes(searchLower) ||
        card.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    return { items };
  },

  /**
   * Get a single card by ID
   */
  async get(id: string): Promise<CardModel> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new ApiError(401, 'Not authenticated');
    }

    const { data, error } = await supabase
      .from('Card')
      .select('*')
      .eq('id', id)
      .eq('userId', user.id)
      .single();

    if (error) {
      throw new ApiError(error.code === 'PGRST116' ? 404 : 500, error.message, error);
    }

    return mapCardFromDb(data);
  },

  /**
   * Create a new card
   */
  async create(cardData: {
    type?: 'url' | 'md-note' | 'text-note';
    url: string;
    title?: string;
    content?: string;
    notes?: string;
    tags?: string[];
    collections?: string[];
  }): Promise<CardModel> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new ApiError(401, 'Not authenticated');
    }

    // Generate UUID client-side (matching web app pattern)
    const now = new Date().toISOString();
    const newCard = {
      id: Crypto.randomUUID(), // CLIENT-SIDE UUID GENERATION using expo-crypto
      userId: user.id,
      type: cardData.type || 'url',
      url: cardData.url,
      title: cardData.title || null,
      description: null,
      content: cardData.content || null,
      notes: cardData.notes || null,
      image: null,
      domain: safeHost(cardData.url) || null, // Extract domain from URL
      tags: cardData.tags && cardData.tags.length > 0 ? JSON.stringify(cardData.tags) : null,
      collections: cardData.collections && cardData.collections.length > 0 ? JSON.stringify(cardData.collections) : null,
      metadata: null,
      status: 'PENDING',
      deleted: false,
      pinned: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const { data, error } = await supabase
      .from('Card')
      .insert(newCard)
      .select()
      .single();

    if (error) {
      throw new ApiError(500, error.message, error);
    }

    return mapCardFromDb(data);
  },

  /**
   * Update a card
   */
  async update(
    id: string,
    updates: Partial<CardModel>
  ): Promise<CardModel> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new ApiError(401, 'Not authenticated');
    }

    // Convert arrays to comma-separated strings
    const dbUpdates: any = { ...updates };
    if (updates.tags) {
      dbUpdates.tags = updates.tags.join(',');
    }
    if (updates.collections) {
      dbUpdates.collections = updates.collections.join(',');
    }
    if (updates.metadata) {
      dbUpdates.metadata = JSON.stringify(updates.metadata);
    }

    const { data, error } = await supabase
      .from('Card')
      .update(dbUpdates)
      .eq('id', id)
      .eq('userId', user.id)
      .select()
      .single();

    if (error) {
      throw new ApiError(500, error.message, error);
    }

    return mapCardFromDb(data);
  },

  /**
   * Delete a card (soft delete)
   */
  async delete(id: string): Promise<{ ok: boolean; cardId: string; deleted: boolean }> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new ApiError(401, 'Not authenticated');
    }

    const { error } = await supabase
      .from('Card')
      .update({
        deleted: true,
        deletedAt: new Date().toISOString()
      })
      .eq('id', id)
      .eq('userId', user.id);

    if (error) {
      throw new ApiError(500, error.message, error);
    }

    return { ok: true, cardId: id, deleted: true };
  },

  /**
   * Toggle pinned status
   */
  async togglePin(id: string, pinned: boolean): Promise<CardModel> {
    return this.update(id, { pinned });
  },
};

// Collections (Pawkits) API - Direct Supabase queries
export const pawkitsApi = {
  /**
   * List all collections (returns tree structure)
   */
  async list(): Promise<{ tree: CollectionNode[] }> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new ApiError(401, 'Not authenticated');
    }

    const { data, error } = await supabase
      .from('Collection')
      .select('*')
      .eq('userId', user.id)
      .eq('deleted', false)
      .order('name', { ascending: true });

    if (error) {
      throw new ApiError(500, error.message, error);
    }

    // Build tree structure
    const collections = data || [];
    const collectionMap = new Map<string, CollectionNode>();
    const rootCollections: CollectionNode[] = [];

    // First pass: create nodes
    collections.forEach(col => {
      collectionMap.set(col.id, {
        ...col,
        children: [],
      });
    });

    // Second pass: build tree
    collections.forEach(col => {
      const node = collectionMap.get(col.id)!;
      if (col.parentId) {
        const parent = collectionMap.get(col.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        } else {
          // Parent not found, treat as root
          rootCollections.push(node);
        }
      } else {
        rootCollections.push(node);
      }
    });

    return { tree: rootCollections };
  },

  /**
   * Create a new collection
   */
  async create(collectionData: {
    name: string;
    parentId?: string;
    coverImage?: string;
  }): Promise<CollectionNode> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new ApiError(401, 'Not authenticated');
    }

    // Generate slug from name
    const slug = collectionData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Generate UUID client-side (matching web app pattern)
    const now = new Date().toISOString();
    const newCollection = {
      id: Crypto.randomUUID(), // CLIENT-SIDE UUID GENERATION using expo-crypto
      userId: user.id,
      name: collectionData.name,
      slug: slug,
      parentId: collectionData.parentId || null,
      coverImage: collectionData.coverImage || null,
      deleted: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const { data, error } = await supabase
      .from('Collection')
      .insert(newCollection)
      .select()
      .single();

    if (error) {
      throw new ApiError(500, error.message, error);
    }

    return { ...data, children: [] };
  },

  /**
   * Update a collection
   */
  async update(id: string, updates: Partial<CollectionNode>): Promise<CollectionNode> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new ApiError(401, 'Not authenticated');
    }

    const { data, error } = await supabase
      .from('Collection')
      .update(updates)
      .eq('id', id)
      .eq('userId', user.id)
      .select()
      .single();

    if (error) {
      throw new ApiError(500, error.message, error);
    }

    return { ...data, children: [] };
  },

  /**
   * Delete a collection (soft delete)
   */
  async delete(id: string): Promise<{ ok: boolean; collectionId: string }> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new ApiError(401, 'Not authenticated');
    }

    const { error } = await supabase
      .from('Collection')
      .update({
        deleted: true,
        deletedAt: new Date().toISOString()
      })
      .eq('id', id)
      .eq('userId', user.id);

    if (error) {
      throw new ApiError(500, error.message, error);
    }

    return { ok: true, collectionId: id };
  },
};

// User Settings API - Direct Supabase queries
export const userSettingsApi = {
  /**
   * Get user settings (creates default if not exists)
   */
  async get(): Promise<{ pinnedNoteIds: string[] }> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new ApiError(401, 'Not authenticated');
    }

    console.log('[UserSettings] Fetching settings for user:', user.id);

    // Try to get existing settings
    const { data, error } = await supabase
      .from('UserSettings')
      .select('*')
      .eq('userId', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[UserSettings] SELECT error:', error.code, error.message, error);
      throw new ApiError(500, `SELECT failed: ${error.message}`, error);
    }

    // If no settings exist, create default
    if (!data) {
      console.log('[UserSettings] No settings found, creating default...');
      const now = new Date().toISOString();
      const { data: newSettings, error: createError } = await supabase
        .from('UserSettings')
        .insert({
          id: Crypto.randomUUID(),
          userId: user.id,
          pinnedNoteIds: '[]',
          autoFetchMetadata: true,
          showThumbnails: true,
          previewServiceUrl: 'http://localhost:8787/preview?url={{url}}',
          theme: 'dark',
          accentColor: 'purple',
          notifications: true,
          autoSave: true,
          compactMode: false,
          showPreviews: true,
          autoSyncOnReconnect: true,
          cardSize: 3,
          displaySettings: '{}',
          recentHistory: '[]',
          createdAt: now,
          updatedAt: now,
        })
        .select()
        .single();

      if (createError) {
        console.error('[UserSettings] INSERT error:', createError.code, createError.message, createError);
        throw new ApiError(500, `INSERT failed: ${createError.message}`, createError);
      }

      console.log('[UserSettings] Created new settings successfully');
      return {
        pinnedNoteIds: [],
      };
    }

    // Parse pinnedNoteIds from JSON
    let pinnedNoteIds: string[] = [];
    try {
      pinnedNoteIds = JSON.parse(data.pinnedNoteIds || '[]');
    } catch (e) {
      console.error('[UserSettings] Failed to parse pinnedNoteIds:', e);
    }

    return {
      pinnedNoteIds,
    };
  },

  /**
   * Update pinned note IDs
   */
  async updatePinnedNotes(pinnedNoteIds: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new ApiError(401, 'Not authenticated');
    }

    const { error } = await supabase
      .from('UserSettings')
      .update({
        pinnedNoteIds: JSON.stringify(pinnedNoteIds),
        updatedAt: new Date().toISOString(),
      })
      .eq('userId', user.id);

    if (error) {
      throw new ApiError(500, error.message, error);
    }
  },
};
