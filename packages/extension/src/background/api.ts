/**
 * API helpers for background service worker
 * Handles all communication with Pawkit backend
 *
 * V2: Uses Supabase session cookies for auth (no more extension tokens)
 */

import browser from 'webextension-polyfill'
import type { CardPayload, Collection, CollectionApiResponse, Workspace } from '@/shared/types'

/**
 * Find a tab on getpawkit.com to use as a bridge for authenticated requests
 */
async function findPawkitTab(): Promise<number | null> {
  try {
    const tabs = await browser.tabs.query({ url: ['https://getpawkit.com/*', 'https://www.getpawkit.com/*'] })
    if (tabs.length > 0 && tabs[0].id) {
      return tabs[0].id
    }
    return null
  } catch (error) {
    console.error('Failed to find Pawkit tab:', error)
    return null
  }
}

/**
 * Make an API request via the content script bridge
 * This works because the content script runs in the page context where cookies are available
 */
async function apiViaBridge<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const tabId = await findPawkitTab()

  if (!tabId) {
    return {
      ok: false,
      error: 'Please open getpawkit.com in a tab and log in first.'
    }
  }

  try {
    const response = await browser.tabs.sendMessage(tabId, {
      type: 'API_REQUEST',
      method,
      path,
      body
    })
    return response as { ok: boolean; data?: T; error?: string }
  } catch (error) {
    console.error('Bridge request failed:', error)
    return {
      ok: false,
      error: 'Failed to communicate with Pawkit tab. Please refresh getpawkit.com and try again.'
    }
  }
}

/**
 * Get stored workspace from browser.storage
 */
export async function getWorkspace(): Promise<Workspace | null> {
  try {
    const result = await browser.storage.local.get('pawkit_workspace')
    return result.pawkit_workspace || null
  } catch (error) {
    console.error('Failed to get workspace:', error)
    return null
  }
}

/**
 * Store workspace in browser.storage
 */
export async function setWorkspace(workspace: Workspace): Promise<void> {
  await browser.storage.local.set({ pawkit_workspace: workspace })
}

/**
 * Clear stored workspace (on logout or error)
 */
export async function clearWorkspace(): Promise<void> {
  await browser.storage.local.remove('pawkit_workspace')
}

/**
 * Make authenticated POST request to Pawkit API
 * Uses content script bridge on getpawkit.com for cookie-based auth
 */
export async function apiPost<T = unknown>(
  path: string,
  body: CardPayload | FormData | Record<string, unknown>,
  isForm = false
): Promise<{ ok: boolean; data?: T; error?: string }> {
  // FormData not supported via bridge - would need different handling
  if (isForm) {
    return { ok: false, error: 'Form uploads not supported' }
  }

  return apiViaBridge<T>('POST', path, body)
}

/**
 * Make authenticated GET request to Pawkit API
 * Uses content script bridge on getpawkit.com for cookie-based auth
 */
export async function apiGet<T = unknown>(
  path: string
): Promise<{ ok: boolean; data?: T; error?: string }> {
  return apiViaBridge<T>('GET', path)
}

/**
 * Fetch metadata for a URL using the V2 API
 */
export async function fetchMetadata(url: string): Promise<{
  ok: boolean
  data?: {
    title: string | null
    description: string | null
    image: string | null
    favicon: string | null
    domain: string
  }
  error?: string
}> {
  return apiViaBridge('POST', '/metadata', { url })
}

/**
 * Fetch user's workspaces and return the default one
 */
export async function fetchDefaultWorkspace(): Promise<{ ok: boolean; data?: Workspace; error?: string }> {
  const result = await apiGet<{ workspaces: Workspace[] }>('/workspaces')

  if (result.ok && result.data?.workspaces) {
    // Find default workspace, or use the first one
    const defaultWorkspace = result.data.workspaces.find(w => w.isDefault) || result.data.workspaces[0]

    if (defaultWorkspace) {
      // Cache the workspace
      await setWorkspace(defaultWorkspace)
      return { ok: true, data: defaultWorkspace }
    }

    return { ok: false, error: 'No workspaces found' }
  }

  return { ok: false, error: result.error || 'Failed to fetch workspaces' }
}

/**
 * Get workspace ID, fetching from server if not cached
 */
export async function getWorkspaceId(): Promise<string | null> {
  // Try cached workspace first
  const cached = await getWorkspace()
  if (cached) {
    return cached.id
  }

  // Fetch from server
  const result = await fetchDefaultWorkspace()
  if (result.ok && result.data) {
    return result.data.id
  }

  return null
}

/**
 * Check if user is authenticated by trying to fetch workspaces
 */
export async function checkAuth(): Promise<{ ok: boolean; error?: string }> {
  const result = await apiGet('/workspaces')
  if (result.ok) {
    return { ok: true }
  }
  return { ok: false, error: result.error }
}

/**
 * Save a card to Pawkit
 * Automatically fetches metadata if not provided
 */
export async function saveCard(payload: CardPayload): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  // Get workspace ID
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return {
      ok: false,
      error: 'Not logged in. Please log in to Pawkit in your browser first.'
    }
  }

  const { meta, ...rest } = payload

  // Fetch metadata from API if not provided by extension
  let image = meta?.ogImage
  let description = meta?.description
  let favicon = meta?.favicon
  let fetchedTitle: string | null = null

  if (!image && payload.url) {
    console.log('[Extension] Fetching metadata for:', payload.url)
    const metadataResult = await fetchMetadata(payload.url)
    if (metadataResult.ok && metadataResult.data) {
      image = metadataResult.data.image || undefined
      description = metadataResult.data.description || undefined
      favicon = metadataResult.data.favicon || undefined
      fetchedTitle = metadataResult.data.title
      console.log('[Extension] Metadata fetched:', { image: !!image, description: !!description })
    }
  }

  return apiPost('/cards', {
    ...rest,
    // Use fetched title if the provided title is just the URL
    title: (rest.title === payload.url && fetchedTitle) ? fetchedTitle : rest.title,
    workspaceId,
    type: 'url',
    source: { type: 'webext' },
    image,
    description,
    favicon
  })
}

/**
 * Fetch user's collections (Pawkits) for the default workspace
 */
export async function getCollections(): Promise<{ ok: boolean; data?: Collection[]; error?: string }> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return {
      ok: false,
      error: 'Not logged in. Please log in to Pawkit in your browser first.'
    }
  }

  const result = await apiGet<{ collections: CollectionApiResponse[] }>(
    `/collections?workspaceId=${workspaceId}`
  )

  if (result.ok && result.data?.collections) {
    // Extract id, name, icon from the collections list
    const collections: Collection[] = result.data.collections.map(c => ({
      id: c.id,
      name: c.name,
      emoji: c.icon || null, // V2 API returns 'icon', we use 'emoji' internally
      slug: c.slug || c.id
    }))
    return { ok: true, data: collections }
  }

  return { ok: false, error: result.error || 'Failed to fetch collections' }
}
