/**
 * API helpers for background service worker
 * Handles all communication with Pawkit backend
 *
 * V3.0: Uses Extension Token authentication
 *
 * Flow:
 * 1. User generates extension token in Pawkit settings
 * 2. User enters token in extension popup
 * 3. Token stored in browser.storage.local
 * 4. All API calls use Authorization: Bearer <token>
 * 5. Token is long-lived, no refresh needed
 */

import browser from 'webextension-polyfill'
import type { CardPayload, Collection, CollectionApiResponse, Workspace } from '@/shared/types'

// API base URL - use Convex HTTP endpoint
const API_BASE = 'https://beloved-spaniel-215.convex.site/api'

// =============================================================================
// TOKEN STORAGE
// =============================================================================

interface StoredSession {
  token: string
  user: {
    id: string
    email: string | null
  }
}

/**
 * Get stored session from browser.storage
 */
export async function getStoredSession(): Promise<StoredSession | null> {
  try {
    const result = await browser.storage.local.get('pawkit_session')
    return result.pawkit_session || null
  } catch (error) {
    console.error('[API] Failed to get stored session:', error)
    return null
  }
}

/**
 * Store session in browser.storage
 */
export async function storeSession(session: StoredSession): Promise<void> {
  await browser.storage.local.set({ pawkit_session: session })
  console.log('[API] Session stored for user:', session.user.email)
}

/**
 * Clear stored session (logout)
 */
export async function clearSession(): Promise<void> {
  await browser.storage.local.remove(['pawkit_session', 'pawkit_workspace'])
  console.log('[API] Session cleared')
}

/**
 * Get the access token for API requests
 */
async function getAccessToken(): Promise<string | null> {
  const session = await getStoredSession()
  return session?.token || null
}

// =============================================================================
// API REQUESTS
// =============================================================================

/**
 * Make an authenticated API request with Bearer token
 */
async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  timeoutMs = 15000
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const token = await getAccessToken()

  if (!token) {
    return {
      ok: false,
      error: 'Not logged in. Click the extension icon and enter your extension token.'
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    }

    if (body && (method === 'POST' || method === 'PATCH')) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(`${API_BASE}${path}`, options)
    clearTimeout(timeoutId)

    if (response.status === 401) {
      // Token is invalid
      await clearSession()
      return {
        ok: false,
        error: 'Extension token is invalid. Please enter a new token.'
      }
    }

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `API error: ${response.status}`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorJson.error || errorMessage
      } catch {
        // Use default error message
      }
      return { ok: false, error: errorMessage }
    }

    const data = await response.json()
    return { ok: true, data }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, error: 'Request timed out. Please try again.' }
    }
    console.error('[API] Request failed:', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network request failed'
    }
  }
}

// =============================================================================
// WORKSPACE
// =============================================================================

/**
 * Get stored workspace from browser.storage
 */
export async function getWorkspace(): Promise<Workspace | null> {
  try {
    const result = await browser.storage.local.get('pawkit_workspace')
    return result.pawkit_workspace || null
  } catch (error) {
    console.error('[API] Failed to get workspace:', error)
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
 * Clear stored workspace
 */
export async function clearWorkspace(): Promise<void> {
  await browser.storage.local.remove('pawkit_workspace')
}

/**
 * Fetch user's workspaces and return the default one
 */
export async function fetchDefaultWorkspace(): Promise<{ ok: boolean; data?: Workspace; error?: string }> {
  const result = await apiRequest<{ workspaces: Workspace[] }>('GET', '/workspaces')

  if (result.ok && result.data?.workspaces) {
    // Find default workspace, or use the first one
    const defaultWorkspace = result.data.workspaces.find(w => w.isDefault) || result.data.workspaces[0]

    if (defaultWorkspace) {
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

// =============================================================================
// AUTH
// =============================================================================

/**
 * Validate an extension token and store the session if valid
 */
export async function validateAndStoreToken(token: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/auth/extension`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    if (!response.ok) {
      return { ok: false, error: 'Failed to validate token' }
    }

    const data = await response.json()

    if (!data.authenticated || !data.user) {
      return { ok: false, error: 'Invalid extension token' }
    }

    // Store the session
    await storeSession({
      token,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    })

    // Fetch and cache the default workspace
    await fetchDefaultWorkspace()

    return { ok: true }
  } catch (error) {
    console.error('[API] Token validation error:', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Token validation failed'
    }
  }
}

/**
 * Check if user is authenticated
 */
export async function checkAuth(): Promise<{ ok: boolean; error?: string; user?: { email: string | null } }> {
  const session = await getStoredSession()

  if (!session) {
    return { ok: false, error: 'Not logged in' }
  }

  // Verify token is still valid by making a test request
  const result = await apiRequest<{ workspaces: Workspace[] }>('GET', '/workspaces')

  if (!result.ok) {
    if (result.error?.includes('401') || result.error?.includes('invalid')) {
      await clearSession()
      return { ok: false, error: 'Extension token is invalid' }
    }
    // Network error - assume still authenticated
    return { ok: true, user: { email: session.user.email } }
  }

  return { ok: true, user: { email: session.user.email } }
}

/**
 * Initiate login by opening the extension connect page
 */
export async function initiateLogin(): Promise<void> {
  // Open the one-click connect page
  await browser.tabs.create({ url: 'https://www.getpawkit.com/extension/connect' })
}

// =============================================================================
// CARDS
// =============================================================================

/**
 * Fetch metadata for a URL
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
  // Use a shorter timeout for metadata (it shouldn't block saves)
  return apiRequest('POST', '/metadata', { url }, 5000)
}

/**
 * Save a card to Pawkit
 * Automatically fetches metadata if not provided
 */
export async function saveCard(payload: CardPayload): Promise<{ ok: boolean; data?: { card: { id: string } }; error?: string }> {
  // Get workspace ID
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return {
      ok: false,
      error: 'Not logged in. Please enter your extension token first.'
    }
  }

  const { meta, ...rest } = payload

  // Prepare metadata fields
  let image = meta?.ogImage
  let description = meta?.description
  let favicon = meta?.favicon
  let fetchedTitle: string | null = null

  // Try to fetch metadata if no image provided (non-blocking with short timeout)
  if (!image && payload.url) {
    try {
      console.log('[API] Fetching metadata for:', payload.url)
      const metadataResult = await fetchMetadata(payload.url)
      if (metadataResult.ok && metadataResult.data) {
        image = metadataResult.data.image || undefined
        description = metadataResult.data.description || undefined
        favicon = metadataResult.data.favicon || undefined
        fetchedTitle = metadataResult.data.title
        console.log('[API] Metadata fetched:', { image: !!image, description: !!description })
      }
    } catch (error) {
      // Metadata fetch failed - continue with save anyway
      console.log('[API] Metadata fetch failed, saving without thumbnail')
    }
  }

  // Create the card
  return apiRequest('POST', '/cards', {
    ...rest,
    // Use fetched title if the provided title is just the URL
    title: (rest.title === payload.url && fetchedTitle) ? fetchedTitle : rest.title,
    workspaceId,
    type: 'url',
    image,
    description,
    favicon
  })
}

// =============================================================================
// COLLECTIONS
// =============================================================================

/**
 * Fetch user's collections (Pawkits) for the default workspace
 */
export async function getCollections(): Promise<{ ok: boolean; data?: Collection[]; error?: string }> {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return {
      ok: false,
      error: 'Not logged in. Please enter your extension token first.'
    }
  }

  const result = await apiRequest<{ collections: CollectionApiResponse[] }>(
    'GET',
    `/collections?workspaceId=${workspaceId}`
  )

  if (result.ok && result.data?.collections) {
    // Extract id, name, icon from the collections list
    // Filter out collections without a valid slug (data integrity issue)
    // Then map to Collection type - the filter ensures slug is always defined
    const collections: Collection[] = result.data.collections
      .filter((c): c is CollectionApiResponse & { slug: string } =>
        typeof c.slug === 'string' && c.slug.trim() !== ''
      )
      .map(c => ({
        id: c.id,
        name: c.name,
        emoji: c.icon || null,
        slug: c.slug
      }))
    return { ok: true, data: collections }
  }

  return { ok: false, error: result.error || 'Failed to fetch collections' }
}
