/**
 * API helpers for background service worker
 * Handles all communication with Pawkit backend
 */

import browser from 'webextension-polyfill'
import type { CardPayload } from '@/shared/types'

const API_BASE = 'https://www.getpawkit.com/api'

/**
 * Get stored auth token from browser.storage
 */
export async function getToken(): Promise<string | null> {
  try {
    const result = await browser.storage.local.get('pawkit_token')
    return result.pawkit_token || null
  } catch (error) {
    console.error('Failed to get token:', error)
    return null
  }
}

/**
 * Store auth token in browser.storage
 */
export async function setToken(token: string): Promise<void> {
  await browser.storage.local.set({ pawkit_token: token })
}

/**
 * Make authenticated POST request to Pawkit API
 */
export async function apiPost<T = any>(
  path: string,
  body: any,
  isForm = false
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const token = await getToken()

    if (!token) {
      return {
        ok: false,
        error: 'No authentication token found. Please set your token in the extension options.'
      }
    }

    const headers: HeadersInit = {
      Authorization: `Bearer ${token}`
    }

    let requestBody: string | FormData

    if (isForm) {
      requestBody = body as FormData
    } else {
      headers['Content-Type'] = 'application/json'
      requestBody = JSON.stringify(body)
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: requestBody
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `API error: ${response.status} ${response.statusText}`

      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorJson.error || errorMessage
      } catch {
        // Use default error message if response is not JSON
      }

      return {
        ok: false,
        error: errorMessage
      }
    }

    const data = await response.json()

    return {
      ok: true,
      data
    }
  } catch (error) {
    console.error('API request failed:', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network request failed'
    }
  }
}

/**
 * Save a card to Pawkit
 */
export async function saveCard(payload: CardPayload) {
  // Transform meta.ogImage to image field for API
  const { meta, ...rest } = payload
  return apiPost('/cards', {
    ...rest,
    source: 'webext',
    // Pass pre-fetched metadata directly as top-level fields
    image: meta?.ogImage,
    description: meta?.description
  })
}
