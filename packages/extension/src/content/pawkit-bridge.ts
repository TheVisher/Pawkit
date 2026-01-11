/**
 * Content script that runs on getpawkit.com
 * Acts as a bridge for making authenticated API requests
 * Since this runs in the page context, cookies are sent automatically
 */

import browser from 'webextension-polyfill'

const API_BASE = 'https://www.getpawkit.com/api'

// Listen for messages from the extension
browser.runtime.onMessage.addListener((message, _sender) => {
  if (message.type === 'API_REQUEST') {
    return handleApiRequest(message)
  }
  return undefined
})

async function handleApiRequest(message: {
  type: string
  method: 'GET' | 'POST'
  path: string
  body?: unknown
}): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const options: RequestInit = {
      method: message.method,
      credentials: 'include', // This works in content scripts on same-origin
      headers: {}
    }

    if (message.body && message.method === 'POST') {
      options.headers = { 'Content-Type': 'application/json' }
      options.body = JSON.stringify(message.body)
    }

    const response = await fetch(`${API_BASE}${message.path}`, options)

    if (response.status === 401) {
      return {
        ok: false,
        error: 'Not logged in. Please log in to Pawkit in your browser first.'
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
    console.error('API request failed:', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network request failed'
    }
  }
}

console.log('Pawkit bridge content script loaded')
