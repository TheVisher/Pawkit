/**
 * API helpers for background service worker
 * Handles all communication with Pawkit backend
 *
 * V2.1: Uses Bearer token authentication (no more content script bridge)
 *
 * Flow:
 * 1. User logs in via getpawkit.com
 * 2. Extension grabs session tokens via /api/auth/extension
 * 3. Tokens stored in browser.storage.local
 * 4. All API calls use Authorization: Bearer <token>
 * 5. Automatic token refresh when expired
 */

import browser from 'webextension-polyfill'
import type { CardPayload, Collection, CollectionApiResponse, Workspace } from '@/shared/types'

// API base URL
const API_BASE = 'https://www.getpawkit.com/api'

// Buffer time before expiry to trigger refresh (5 minutes)
const TOKEN_REFRESH_BUFFER = 5 * 60

// =============================================================================
// TOKEN STORAGE
// =============================================================================

interface StoredSession {
  access_token: string
  refresh_token: string
  expires_at: number // Unix timestamp
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
  console.log('[API] Session stored, expires at:', new Date(session.expires_at * 1000).toISOString())
}

/**
 * Clear stored session (logout)
 */
export async function clearSession(): Promise<void> {
  await browser.storage.local.remove(['pawkit_session', 'pawkit_workspace'])
  console.log('[API] Session cleared')
}

/**
 * Check if token needs refresh
 */
function tokenNeedsRefresh(session: StoredSession): boolean {
  const now = Math.floor(Date.now() / 1000)
  return session.expires_at - now < TOKEN_REFRESH_BUFFER
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshToken(refreshToken: string): Promise<StoredSession | null> {
  try {
    console.log('[API] Refreshing access token...')

    const response = await fetch(`${API_BASE}/auth/extension`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!response.ok) {
      console.error('[API] Token refresh failed:', response.status)
      return null
    }

    const data = await response.json()

    if (!data.authenticated || !data.session) {
      console.error('[API] Token refresh returned invalid data')
      return null
    }

    const newSession: StoredSession = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: data.session.user,
    }

    await storeSession(newSession)
    console.log('[API] Token refreshed successfully')

    return newSession
  } catch (error) {
    console.error('[API] Token refresh error:', error)
    return null
  }
}

/**
 * Get a valid access token, refreshing if needed
 */
async function getValidAccessToken(): Promise<string | null> {
  const session = await getStoredSession()

  if (!session) {
    return null
  }

  // Check if token needs refresh
  if (tokenNeedsRefresh(session)) {
    const newSession = await refreshToken(session.refresh_token)
    if (newSession) {
      return newSession.access_token
    }
    // Refresh failed - clear session and return null
    await clearSession()
    return null
  }

  return session.access_token
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
  const accessToken = await getValidAccessToken()

  if (!accessToken) {
    return {
      ok: false,
      error: 'Not logged in. Click the extension icon and log in first.'
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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
      // Token might have been invalidated server-side
      await clearSession()
      return {
        ok: false,
        error: 'Session expired. Please log in again.'
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
 * Check if user is authenticated
 */
export async function checkAuth(): Promise<{ ok: boolean; error?: string; user?: { email: string | null } }> {
  const session = await getStoredSession()

  if (!session) {
    return { ok: false, error: 'Not logged in' }
  }

  // Validate token is still valid by checking expiry
  if (tokenNeedsRefresh(session)) {
    const newSession = await refreshToken(session.refresh_token)
    if (!newSession) {
      await clearSession()
      return { ok: false, error: 'Session expired' }
    }
    return { ok: true, user: { email: newSession.user.email } }
  }

  return { ok: true, user: { email: session.user.email } }
}

/**
 * Initiate login by opening Pawkit in a tab
 * The content script will handle grabbing the session
 */
export async function initiateLogin(): Promise<void> {
  // Check if there's already a Pawkit tab open
  const tabs = await browser.tabs.query({ url: ['https://getpawkit.com/*', 'https://www.getpawkit.com/*'] })

  if (tabs.length > 0 && tabs[0].id) {
    // Activate the existing tab
    await browser.tabs.update(tabs[0].id, { active: true })
    if (tabs[0].windowId) {
      await browser.windows.update(tabs[0].windowId, { focused: true })
    }
  } else {
    // Open a new tab to login
    await browser.tabs.create({ url: 'https://www.getpawkit.com/login' })
  }
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
      error: 'Not logged in. Please log in to Pawkit first.'
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
    status: image ? 'READY' : 'PENDING', // Let app know to fetch metadata if no image
    source: { type: 'webext' },
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
      error: 'Not logged in. Please log in to Pawkit first.'
    }
  }

  const result = await apiRequest<{ collections: CollectionApiResponse[] }>(
    'GET',
    `/collections?workspaceId=${workspaceId}`
  )

  if (result.ok && result.data?.collections) {
    // Extract id, name, icon from the collections list
    const collections: Collection[] = result.data.collections.map(c => ({
      id: c.id,
      name: c.name,
      emoji: c.icon || null,
      slug: c.slug || c.id
    }))
    return { ok: true, data: collections }
  }

  return { ok: false, error: result.error || 'Failed to fetch collections' }
}
