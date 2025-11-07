import { supabase } from '../config/supabase';
import { API_BASE_URL } from '../config/api';
import type { CardModel, CollectionNode } from '../types';

// API Error class
export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new ApiError(401, 'Not authenticated');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
}

// Generic fetch wrapper with auth
async function authenticatedFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const headers = await getAuthHeaders();
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorData.message || `HTTP ${response.status}: ${response.statusText}`,
      errorData
    );
  }

  return response.json();
}

// Cards API
export const cardsApi = {
  /**
   * List cards with optional filters
   */
  async list(params?: {
    q?: string;
    collection?: string;
    status?: 'PENDING' | 'READY' | 'ERROR';
    limit?: number;
    cursor?: string;
  }): Promise<{ items: CardModel[]; nextCursor?: string }> {
    const searchParams = new URLSearchParams();

    if (params?.q) searchParams.append('q', params.q);
    if (params?.collection) searchParams.append('collection', params.collection);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.cursor) searchParams.append('cursor', params.cursor);

    const query = searchParams.toString();
    const endpoint = `/api/cards${query ? `?${query}` : ''}`;

    return authenticatedFetch<{ items: CardModel[]; nextCursor?: string }>(endpoint);
  },

  /**
   * Get a single card by ID
   */
  async get(id: string): Promise<CardModel> {
    return authenticatedFetch<CardModel>(`/api/cards/${id}`);
  },

  /**
   * Create a new card
   */
  async create(data: {
    type?: 'url' | 'md-note' | 'text-note';
    url: string;
    title?: string;
    notes?: string;
    tags?: string[];
    collections?: string[];
  }): Promise<CardModel> {
    return authenticatedFetch<CardModel>('/api/cards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a card
   */
  async update(
    id: string,
    data: Partial<CardModel>,
    lastUpdated?: string
  ): Promise<CardModel> {
    const headers: HeadersInit = {};

    if (lastUpdated) {
      headers['If-Unmodified-Since'] = lastUpdated;
    }

    return authenticatedFetch<CardModel>(`/api/cards/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a card (soft delete)
   */
  async delete(id: string): Promise<{ ok: boolean; cardId: string; deleted: boolean }> {
    return authenticatedFetch<{ ok: boolean; cardId: string; deleted: boolean }>(
      `/api/cards/${id}`,
      { method: 'DELETE' }
    );
  },

  /**
   * Toggle pinned status
   */
  async togglePin(id: string, pinned: boolean): Promise<CardModel> {
    return this.update(id, { pinned });
  },
};

// Collections (Pawkits) API
export const pawkitsApi = {
  /**
   * List all collections (returns tree structure)
   */
  async list(): Promise<{ tree: CollectionNode[] }> {
    return authenticatedFetch<{ tree: CollectionNode[] }>('/api/pawkits');
  },

  /**
   * Create a new collection
   */
  async create(data: {
    name: string;
    parentId?: string;
    coverImage?: string;
  }): Promise<CollectionNode> {
    return authenticatedFetch<CollectionNode>('/api/pawkits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a collection
   */
  async update(id: string, data: Partial<CollectionNode>): Promise<CollectionNode> {
    return authenticatedFetch<CollectionNode>(`/api/pawkits/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a collection (soft delete)
   */
  async delete(id: string): Promise<{ ok: boolean; collectionId: string }> {
    return authenticatedFetch<{ ok: boolean; collectionId: string }>(
      `/api/pawkits/${id}`,
      { method: 'DELETE' }
    );
  },
};
